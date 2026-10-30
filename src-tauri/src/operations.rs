//! src-tauri/src/operations.rs
//!
//! Copiar, mover, compactar e extrair com progresso padronizado.
//!
//! Todas as operações:
//!  - rodam inteiras em `spawn_blocking` (scan + I/O), sem travar o runtime async;
//!  - usam o MESMO laço de I/O (`pump`) com buffer de 1 MiB;
//!  - emitem o MESMO evento `file_op_progress` (com throttle);
//!  - são canceláveis individualmente por `op_id` (`cancel_op`);
//!  - removem arquivos parciais em caso de erro ou cancelamento.
//!
//! Semântica de "item" no payload:
//!  - copy / move: cada item selecionado (arquivo ou pasta de nível superior)
//!  - compress / extract: cada entrada do zip

use crate::utils::generate_unique_path;
use serde::Serialize;
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{self, BufWriter, ErrorKind, Read, Write};
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use walkdir::WalkDir;
use zip::write::FileOptions;
use zip::{CompressionMethod, ZipArchive, ZipWriter};

const EVENT: &str = "file_op_progress";
const EMIT_INTERVAL: Duration = Duration::from_millis(80);
const BUF_SIZE: usize = 1024 * 1024;

// ───────────────────────────── cancelamento ─────────────────────────────

static CANCEL_FLAGS: OnceLock<Mutex<HashMap<String, Arc<AtomicBool>>>> = OnceLock::new();

fn registry() -> &'static Mutex<HashMap<String, Arc<AtomicBool>>> {
    CANCEL_FLAGS.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Registra a operação ao ser criado e se remove sozinho ao sair de escopo.
struct CancelToken {
    id: String,
    flag: Arc<AtomicBool>,
}

impl CancelToken {
    fn register(id: &str) -> Self {
        let flag = Arc::new(AtomicBool::new(false));
        if let Ok(mut map) = registry().lock() {
            map.insert(id.to_string(), flag.clone());
        }
        Self {
            id: id.to_string(),
            flag,
        }
    }

    fn is_cancelled(&self) -> bool {
        self.flag.load(Ordering::Relaxed)
    }
}

impl Drop for CancelToken {
    fn drop(&mut self) {
        if let Ok(mut map) = registry().lock() {
            map.remove(&self.id);
        }
    }
}

#[tauri::command]
pub fn cancel_op(op_id: String) {
    if let Ok(map) = registry().lock() {
        if let Some(flag) = map.get(&op_id) {
            flag.store(true, Ordering::SeqCst);
        }
    }
}

#[derive(Debug)]
struct Cancelled;

impl std::fmt::Display for Cancelled {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str("Operação cancelada pelo usuário")
    }
}

impl std::error::Error for Cancelled {}

fn cancelled() -> io::Error {
    io::Error::new(ErrorKind::Other, Cancelled)
}

fn is_cancelled(e: &io::Error) -> bool {
    e.get_ref().map_or(false, |inner| inner.is::<Cancelled>())
}

/// Adiciona o caminho à mensagem de erro (sem mexer no erro de cancelamento).
fn ctx<P: AsRef<Path>>(p: P) -> impl FnOnce(io::Error) -> io::Error {
    move |e| {
        if is_cancelled(&e) {
            e
        } else {
            io::Error::new(e.kind(), format!("{}: {}", p.as_ref().display(), e))
        }
    }
}

// ───────────────────────────── progresso ─────────────────────────────

#[derive(Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum OpKind {
    Copy,
    Move,
    Compress,
    Extract,
}

#[derive(Clone, Serialize)]
struct ProgressPayload {
    op_id: String,
    kind: OpKind,
    file: String,
    current_item: usize,
    total_items: usize,
    processed_bytes: u64,
    total_bytes: u64,
    percent: f64,
    elapsed_secs: f64,
    bytes_per_sec: f64,
}

struct Op {
    app: AppHandle,
    id: String,
    kind: OpKind,
    cancel: CancelToken,
    total_items: usize,
    total_bytes: u64,
    processed: u64,
    current_item: usize,
    file: String,
    start: Instant,
    last_emit: Instant,
}

impl Op {
    fn new(
        app: AppHandle,
        id: String,
        kind: OpKind,
        cancel: CancelToken,
        total_items: usize,
        total_bytes: u64,
    ) -> Self {
        let now = Instant::now();
        let mut op = Self {
            app,
            id,
            kind,
            cancel,
            total_items,
            total_bytes,
            processed: 0,
            current_item: 0,
            file: String::new(),
            start: now,
            last_emit: now,
        };
        op.emit(true); // o popup já aparece com os totais
        op
    }

    fn check_cancel(&self) -> io::Result<()> {
        if self.cancel.is_cancelled() {
            Err(cancelled())
        } else {
            Ok(())
        }
    }

    fn begin_item(&mut self, index: usize, name: &str) {
        self.current_item = index;
        self.file.clear();
        self.file.push_str(name);
        self.emit(false);
    }

    fn add(&mut self, bytes: u64) {
        self.processed += bytes;
        self.emit(false);
    }

    fn finish(&mut self) {
        self.processed = self.processed.max(self.total_bytes);
        self.current_item = self.total_items;
        self.emit(true);
    }

    fn emit(&mut self, force: bool) {
        if !force && self.last_emit.elapsed() < EMIT_INTERVAL {
            return;
        }
        self.last_emit = Instant::now();

        let elapsed = self.start.elapsed().as_secs_f64();
        let percent = if self.total_bytes > 0 {
            self.processed as f64 / self.total_bytes as f64 * 100.0
        } else if self.total_items > 0 {
            self.current_item as f64 / self.total_items as f64 * 100.0
        } else {
            0.0
        };

        let _ = self.app.emit(
            EVENT,
            ProgressPayload {
                op_id: self.id.clone(),
                kind: self.kind,
                file: self.file.clone(),
                current_item: self.current_item,
                total_items: self.total_items,
                processed_bytes: self.processed,
                total_bytes: self.total_bytes,
                percent: percent.min(100.0),
                elapsed_secs: elapsed,
                bytes_per_sec: if elapsed > 0.0 {
                    self.processed as f64 / elapsed
                } else {
                    0.0
                },
            },
        );
    }
}

// ───────────────────────────── helpers de I/O ─────────────────────────────

fn new_buf() -> Vec<u8> {
    vec![0u8; BUF_SIZE]
}

/// Laço único de cópia: lê, escreve, conta bytes e checa cancelamento.
fn pump<R: Read, W: Write>(
    reader: &mut R,
    writer: &mut W,
    op: &mut Op,
    buf: &mut [u8],
) -> io::Result<u64> {
    let mut total = 0u64;
    loop {
        op.check_cancel()?;
        let n = match reader.read(buf) {
            Ok(0) => break,
            Ok(n) => n,
            Err(e) if e.kind() == ErrorKind::Interrupted => continue,
            Err(e) => return Err(e),
        };
        writer.write_all(&buf[..n])?;
        op.add(n as u64);
        total += n as u64;
    }
    Ok(total)
}

async fn run_blocking<F>(f: F) -> Result<(), String>
where
    F: FnOnce() -> io::Result<()> + Send + 'static,
{
    tokio::task::spawn_blocking(f)
        .await
        .map_err(|e| format!("Erro na thread: {e}"))?
        .map_err(|e| e.to_string())
}

fn file_name_of(p: &Path) -> io::Result<String> {
    p.file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .ok_or_else(|| {
            io::Error::new(
                ErrorKind::InvalidInput,
                format!("Caminho inválido: {}", p.display()),
            )
        })
}

fn tree_size(path: &Path) -> u64 {
    WalkDir::new(path)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|e| e.file_type().is_file())
        .filter_map(|e| e.metadata().ok())
        .map(|m| m.len())
        .sum()
}

fn remove_any(p: &Path) -> io::Result<()> {
    match fs::symlink_metadata(p) {
        Ok(m) if m.is_dir() => fs::remove_dir_all(p),
        Ok(_) => fs::remove_file(p),
        Err(_) => Ok(()),
    }
}

fn ensure_not_into_self(src: &Path, target_dir: &Path) -> io::Result<()> {
    if src.is_dir() {
        let s = fs::canonicalize(src)?;
        let t = fs::canonicalize(target_dir)?;
        if t.starts_with(&s) {
            return Err(io::Error::new(
                ErrorKind::InvalidInput,
                "Não é possível copiar/mover uma pasta para dentro de si mesma",
            ));
        }
    }
    Ok(())
}

fn same_device(a: &Path, b: &Path) -> bool {
    use std::os::unix::fs::MetadataExt;
    match (fs::symlink_metadata(a), fs::metadata(b)) {
        (Ok(x), Ok(y)) => x.dev() == y.dev(),
        _ => true,
    }
}

fn is_cross_device(e: &io::Error) -> bool {
    // 18 = EXDEV no Linux
    e.kind() == ErrorKind::CrossesDevices || e.raw_os_error() == Some(18)
}

// ───────────────────────────── copiar ─────────────────────────────

fn copy_file(src: &Path, dst: &Path, op: &mut Op, buf: &mut [u8]) -> io::Result<()> {
    let mut reader = File::open(src).map_err(ctx(src))?;
    let perms = reader.metadata().map_err(ctx(src))?.permissions();
    let mut writer = File::create(dst).map_err(ctx(dst))?;

    let res = pump(&mut reader, &mut writer, op, buf);
    drop(writer);

    match res {
        Ok(_) => {
            let _ = fs::set_permissions(dst, perms);
            Ok(())
        }
        Err(e) => {
            let _ = fs::remove_file(dst);
            Err(ctx(src)(e))
        }
    }
}

/// Copia um arquivo, pasta ou symlink. `dst` é o caminho FINAL do item raiz.
fn copy_tree(src: &Path, dst: &Path, op: &mut Op, buf: &mut [u8]) -> io::Result<()> {
    for entry in WalkDir::new(src) {
        let entry = entry?;
        let rel = entry.path().strip_prefix(src).unwrap_or(Path::new(""));
        let target = if rel.as_os_str().is_empty() {
            dst.to_path_buf()
        } else {
            dst.join(rel)
        };

        let ft = entry.file_type();
        if ft.is_dir() {
            fs::create_dir_all(&target).map_err(ctx(&target))?;
        } else if ft.is_symlink() {
            let link = fs::read_link(entry.path()).map_err(ctx(entry.path()))?;
            std::os::unix::fs::symlink(link, &target).map_err(ctx(&target))?;
        } else if ft.is_file() {
            copy_file(entry.path(), &target, op, buf)?;
        }
        // sockets, fifos e dispositivos são ignorados
    }
    Ok(())
}

#[tauri::command]
pub async fn copy_items_to(
    app: AppHandle,
    dir_paths: Vec<String>,
    target_path: String,
    op_id: String,
) -> Result<(), String> {
    if dir_paths.is_empty() {
        return Err("Nenhum item para copiar".to_string());
    }
    let cancel = CancelToken::register(&op_id);

    run_blocking(move || {
        let sources: Vec<PathBuf> = dir_paths.into_iter().map(PathBuf::from).collect();
        let target_dir = PathBuf::from(target_path);
        fs::create_dir_all(&target_dir).map_err(ctx(&target_dir))?;

        let total_bytes: u64 = sources.iter().map(|p| tree_size(p)).sum();
        let mut op = Op::new(app, op_id, OpKind::Copy, cancel, sources.len(), total_bytes);
        let mut buf = new_buf();

        for (i, src) in sources.iter().enumerate() {
            op.check_cancel()?;
            let name = file_name_of(src)?;
            op.begin_item(i + 1, &name);
            ensure_not_into_self(src, &target_dir)?;

            let dst = generate_unique_path(&target_dir, &name);
            if let Err(e) = copy_tree(src, &dst, &mut op, &mut buf) {
                let _ = remove_any(&dst); // dst é novo (nome único), seguro remover
                return Err(e);
            }
        }

        op.finish();
        Ok(())
    })
    .await
}

// ───────────────────────────── mover ─────────────────────────────

fn move_across_devices(src: &Path, dst: &Path, op: &mut Op, buf: &mut [u8]) -> io::Result<()> {
    if let Err(e) = copy_tree(src, dst, op, buf) {
        let _ = remove_any(dst); // origem permanece intacta
        return Err(e);
    }
    remove_any(src).map_err(|e| {
        io::Error::new(
            e.kind(),
            format!(
                "Copiado, mas não foi possível apagar a origem {}: {}",
                src.display(),
                e
            ),
        )
    })
}

#[tauri::command]
pub async fn move_items_to(
    app: AppHandle,
    dir_paths: Vec<String>,
    target_path: String,
    op_id: String,
) -> Result<(), String> {
    if dir_paths.is_empty() {
        return Err("Nenhum item para mover".to_string());
    }
    let cancel = CancelToken::register(&op_id);

    run_blocking(move || {
        let sources: Vec<PathBuf> = dir_paths.into_iter().map(PathBuf::from).collect();
        let target_dir = PathBuf::from(target_path);
        fs::create_dir_all(&target_dir).map_err(ctx(&target_dir))?;

        // Só itens em outro dispositivo têm bytes a copiar; o resto é rename instantâneo.
        let cross: Vec<bool> = sources
            .iter()
            .map(|s| !same_device(s, &target_dir))
            .collect();
        let total_bytes: u64 = sources
            .iter()
            .zip(&cross)
            .filter(|(_, c)| **c)
            .map(|(s, _)| tree_size(s))
            .sum();

        let mut op = Op::new(app, op_id, OpKind::Move, cancel, sources.len(), total_bytes);
        let mut buf = new_buf();

        for (i, src) in sources.iter().enumerate() {
            op.check_cancel()?;
            let name = file_name_of(src)?;
            op.begin_item(i + 1, &name);

            if src.parent() == Some(target_dir.as_path()) {
                continue; // já está na pasta de destino
            }
            ensure_not_into_self(src, &target_dir)?;
            let dst = generate_unique_path(&target_dir, &name);

            match fs::rename(src, &dst) {
                Ok(()) => {}
                Err(e) if is_cross_device(&e) => {
                    // ex.: bind mounts, onde o st_dev é igual mas o rename falha
                    if !cross[i] {
                        op.total_bytes += tree_size(src);
                    }
                    move_across_devices(src, &dst, &mut op, &mut buf)?;
                }
                Err(e) => return Err(ctx(src)(e)),
            }
        }

        op.finish();
        Ok(())
    })
    .await
}

// ───────────────────────────── compactar ─────────────────────────────

struct ZipEntry {
    path: PathBuf,
    name: String,
    size: u64,
    mode: u32,
    is_dir: bool,
}

fn zip_name(base: &str, rel: &Path) -> String {
    let mut parts = vec![base.to_string()];
    parts.extend(
        rel.components()
            .map(|c| c.as_os_str().to_string_lossy().into_owned()),
    );
    parts.join("/")
}

fn collect_zip_entries(roots: &[PathBuf]) -> io::Result<Vec<ZipEntry>> {
    let mut out = Vec::new();
    for root in roots {
        let base = file_name_of(root)?;
        for entry in WalkDir::new(root) {
            let entry = entry?;
            let ft = entry.file_type();
            if !ft.is_dir() && !ft.is_file() {
                continue; // symlinks e arquivos especiais ficam de fora
            }
            let meta = entry.metadata()?;
            let rel = entry.path().strip_prefix(root).unwrap_or(Path::new(""));
            out.push(ZipEntry {
                path: entry.path().to_path_buf(),
                name: zip_name(&base, rel),
                size: if ft.is_file() { meta.len() } else { 0 },
                mode: meta.permissions().mode() & 0o777,
                is_dir: ft.is_dir(),
            });
        }
    }
    Ok(out)
}

/// Formatos que já são comprimidos: Deflate só gasta CPU.
fn is_already_compressed(path: &Path) -> bool {
    const EXT: &[&str] = &[
        "zip", "gz", "xz", "bz2", "zst", "7z", "rar", "jpg", "jpeg", "png", "webp", "avif",
        "heic", "mp3", "aac", "ogg", "opus", "flac", "mp4", "mkv", "webm", "mov", "avi", "pdf",
        "docx", "xlsx", "pptx", "jar", "apk",
    ];
    match path.extension().and_then(|e| e.to_str()) {
        Some(ext) => {
            let ext = ext.to_ascii_lowercase();
            EXT.contains(&ext.as_str())
        }
        None => false,
    }
}

fn compress_inner(entries: &[ZipEntry], out: &Path, op: &mut Op, buf: &mut [u8]) -> io::Result<()> {
    let file = File::create(out).map_err(ctx(out))?;
    let mut zip = ZipWriter::new(BufWriter::with_capacity(256 * 1024, file));

    for (i, e) in entries.iter().enumerate() {
        op.check_cancel()?;
        op.begin_item(i + 1, &e.name);

        if e.is_dir {
            let opts: FileOptions<()> = FileOptions::default().unix_permissions(e.mode);
            zip.add_directory(e.name.as_str(), opts)?;
            continue;
        }

        let method = if is_already_compressed(&e.path) {
            CompressionMethod::Stored
        } else {
            CompressionMethod::Deflated
        };
        let opts: FileOptions<()> = FileOptions::default()
            .compression_method(method)
            .unix_permissions(e.mode)
            .large_file(e.size >= u32::MAX as u64);

        zip.start_file(e.name.as_str(), opts)?;
        let mut src = File::open(&e.path).map_err(ctx(&e.path))?;
        pump(&mut src, &mut zip, op, buf).map_err(ctx(&e.path))?;
    }

    zip.finish()?.flush()?;
    Ok(())
}

#[tauri::command]
pub async fn compress_to_zip(
    app: AppHandle,
    file_paths: Vec<String>,
    output_path: String,
    op_id: String,
) -> Result<(), String> {
    if file_paths.is_empty() {
        return Err("Nenhum item para compactar".to_string());
    }
    let cancel = CancelToken::register(&op_id);

    run_blocking(move || {
        let sources: Vec<PathBuf> = file_paths.into_iter().map(PathBuf::from).collect();
        let entries = collect_zip_entries(&sources)?;
        let total_bytes: u64 = entries.iter().map(|e| e.size).sum();

        // não sobrescreve um .zip existente
        let requested = PathBuf::from(output_path);
        let parent = requested
            .parent()
            .ok_or_else(|| io::Error::new(ErrorKind::InvalidInput, "Destino inválido"))?
            .to_path_buf();
        fs::create_dir_all(&parent).map_err(ctx(&parent))?;
        let out = generate_unique_path(&parent, &file_name_of(&requested)?);

        let mut op = Op::new(app, op_id, OpKind::Compress, cancel, entries.len(), total_bytes);
        let mut buf = new_buf();

        if let Err(e) = compress_inner(&entries, &out, &mut op, &mut buf) {
            let _ = fs::remove_file(&out);
            return Err(e);
        }

        op.finish();
        Ok(())
    })
    .await
}

// ───────────────────────────── extrair ─────────────────────────────

fn extract_archive(
    archive: &mut ZipArchive<File>,
    target: &Path,
    op: &mut Op,
    buf: &mut [u8],
    counter: &mut usize,
) -> io::Result<()> {
    for i in 0..archive.len() {
        op.check_cancel()?;
        let mut entry = archive.by_index(i)?;
        *counter += 1;

        // enclosed_name() descarta caminhos com ".." / absolutos (zip-slip)
        let Some(rel) = entry.enclosed_name() else {
            continue;
        };
        let out_path = target.join(&rel);
        op.begin_item(*counter, &rel.to_string_lossy());

        if entry.is_dir() {
            fs::create_dir_all(&out_path).map_err(ctx(&out_path))?;
            continue;
        }

        // Symlinks são ignorados de propósito: um link apontando para fora do
        // destino, seguido de uma entrada "link/arquivo", escaparia da pasta.
        let mode = entry.unix_mode();
        if mode.map_or(false, |m| m & 0o170000 == 0o120000) {
            continue;
        }

        if let Some(parent) = out_path.parent() {
            fs::create_dir_all(parent).map_err(ctx(parent))?;
        }
        let mut out = File::create(&out_path).map_err(ctx(&out_path))?;
        let res = pump(&mut entry, &mut out, op, buf);
        drop(out);

        if let Err(e) = res {
            let _ = fs::remove_file(&out_path);
            return Err(ctx(&out_path)(e));
        }
        if let Some(m) = mode {
            // & 0o777: nunca restaura setuid/setgid vindos de um zip
            let _ = fs::set_permissions(&out_path, fs::Permissions::from_mode(m & 0o777));
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn extract_zip(
    app: AppHandle,
    zip_paths: Vec<String>,
    output_path: String,
    op_id: String,
) -> Result<(), String> {
    if zip_paths.is_empty() {
        return Err("Nenhum zip para extrair".to_string());
    }
    let cancel = CancelToken::register(&op_id);

    run_blocking(move || {
        let out_dir = PathBuf::from(output_path);
        fs::create_dir_all(&out_dir).map_err(ctx(&out_dir))?;

        // Abre cada zip uma única vez e soma os tamanhos sem criar decompressor.
        let mut archives: Vec<(PathBuf, ZipArchive<File>)> = Vec::new();
        let mut total_bytes = 0u64;
        let mut total_items = 0usize;
        for p in &zip_paths {
            let path = PathBuf::from(p);
            let file = File::open(&path).map_err(ctx(&path))?;
            let mut archive = ZipArchive::new(file).map_err(|e| {
                io::Error::new(ErrorKind::InvalidData, format!("{}: {}", path.display(), e))
            })?;
            for i in 0..archive.len() {
                total_bytes += archive.by_index_raw(i)?.size();
            }
            total_items += archive.len();
            archives.push((path, archive));
        }

        let mut op = Op::new(app, op_id, OpKind::Extract, cancel, total_items, total_bytes);
        let mut buf = new_buf();
        let mut counter = 0usize;

        for (path, mut archive) in archives {
            let stem = path
                .file_stem()
                .map(|s| s.to_string_lossy().into_owned())
                .unwrap_or_else(|| "extraido".to_string());
            let target = generate_unique_path(&out_dir, &stem);
            fs::create_dir_all(&target).map_err(ctx(&target))?;

            if let Err(e) = extract_archive(&mut archive, &target, &mut op, &mut buf, &mut counter)
            {
                let _ = fs::remove_dir_all(&target);
                return Err(e);
            }
        }

        op.finish();
        Ok(())
    })
    .await
}
