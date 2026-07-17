use chrono::{DateTime, Local};
use fs_extra::dir::{CopyOptions, TransitProcessResult};
use serde::Serialize;
use std::fs::{self, create_dir_all, rename, File};
use std::io::{self, BufReader, ErrorKind, Read};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering as AtomicOrdering, Ordering};
use std::time::{Instant, SystemTime};
use tauri::{AppHandle, Emitter};
use trash::delete_all;
use walkdir::WalkDir;
use zip::write::FileOptions;
use zip::ZipWriter;

use crate::utils::generate_unique_path;

static CANCEL_FUNC: AtomicBool = AtomicBool::new(false);

#[tauri::command]
pub fn cancel_func() {
    CANCEL_FUNC.store(true, Ordering::SeqCst);
}

#[derive(Serialize)]
pub struct Fileinfo {
    pub name: String,
    pub ftype: String,
    #[serde(serialize_with = "serialize_date")]
    pub last_modified: SystemTime,
    pub size: String,
    pub path: String,
}

fn serialize_date<S>(time: &SystemTime, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    let datetime: DateTime<Local> = (*time).into();
    serializer.serialize_str(&datetime.format("%Y-%m-%d").to_string())
}

#[tauri::command]
pub fn make_dir(dir_path: &str) -> Result<(), String> {
    create_dir_all(dir_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn make_file(file_path: &str) -> Result<(), String> {
    File::create(file_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn rename_dir(dir_paths: Vec<String>, new_name: &str) -> Result<(), String> {
    let mut counter = 0;
    for dir_path in dir_paths {
        rename(
            &dir_path,
            if counter == 0 {
                new_name.to_string()
            } else {
                format!("{}{}", new_name, counter)
            },
        )
        .map_err(|e| format!("Erro ao renomear {} : {}", &dir_path, e))?;
        counter += 1;
    }
    Ok(())
}

#[tauri::command]
pub async fn move_to_trash(dir_paths: Vec<String>) {
    // Executar em bloco de thread secundária pois trash::delete_all é síncrono e bloqueante!
    let _ = tokio::task::spawn_blocking(move || {
        if let Err(e) = delete_all(&dir_paths) {
            eprintln!("Failed to delete: {}", e);
        }
    })
    .await;
}

#[tauri::command]
pub async fn delete(dir_path: Vec<String>) -> Result<(), String> {
    use tokio::fs;

    for path in dir_path {
        let metadata = fs::metadata(&path)
            .await
            .map_err(|e| format!("failed to read metadata from {}. Err: {}", path, e))?;

        if metadata.is_dir() {
            fs::remove_dir_all(&path).await
        } else {
            fs::remove_file(&path).await
        }
        .map_err(|e| format!("failed to delete {}. Err: {}", path, e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn copy_items_to(
    app: AppHandle,
    dir_paths: Vec<String>,
    target_path: String,
    copy_id: String,
) -> Result<(), String> {
    if dir_paths.is_empty() {
        return Err("Nenhum item para copiar".to_string());
    }

    CANCEL_FUNC.store(false, Ordering::SeqCst);
    let total = dir_paths.len();
    let start = Instant::now();
    let target_dir = Path::new(&target_path);

    if !target_dir.exists() {
        create_dir_all(target_dir)
            .map_err(|e| format!("Erro ao criar destino {}: {}", target_path, e))?;
    }

    for (i, dir_path) in dir_paths.into_iter().enumerate() {
        if CANCEL_FUNC.load(Ordering::Relaxed) {
            CANCEL_FUNC.store(false, Ordering::SeqCst);
            return Err("Operação cancelada pelo usuario".to_string());
        }

        let source_path = PathBuf::from(&dir_path);
        if !source_path.exists() {
            return Err(format!("Caminho não existe: {}", dir_path));
        }

        let file_name = source_path
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| format!("Nome de arquivo inválido: {}", dir_path))?;

        let unique_target = generate_unique_path(target_dir, file_name);
        let current_index = i + 1;

        // --- CORREÇÃO AQUI: Clones locais para serem movidos para a thread ---
        let source_path_clone = source_path.clone(); // <--- Clonando o PathBuf de origem
        let unique_target_clone = unique_target.clone(); // <--- Clonando o destino para a thread
        let app_clone = app.clone();
        let file_name_owned = file_name.to_string();
        let id = copy_id.clone();

        tokio::task::spawn_blocking(move || {
            // Agora usamos as variáveis clonadas que pertencem exclusivamente a esta thread
            if source_path_clone.is_dir() {
                let mut options_dir = CopyOptions::new();
                options_dir.copy_inside = true;
                options_dir.overwrite = false;

                let callback_dir = |tp: fs_extra::dir::TransitProcess| {
                    if CANCEL_FUNC.load(Ordering::Relaxed) {
                        return TransitProcessResult::Abort;
                    }
                    let file_progress = if tp.total_bytes > 0 {
                        (tp.copied_bytes as f64 / tp.total_bytes as f64) * 100.0
                    } else {
                        0.0
                    };

                    let _ = app_clone.emit(
                        "copy_progress",
                        serde_json::json!({
                            "copy_id": id,
                            "current": current_index,
                            "file": file_name_owned,
                            "file_percent": file_progress,
                            "total": total,
                            "elapsed_secs": start.elapsed().as_secs_f64(),
                            "copied_bytes": tp.copied_bytes,
                            "total_bytes": tp.total_bytes,
                        }),
                    );
                    TransitProcessResult::ContinueOrAbort
                };

                fs_extra::dir::copy_with_progress(
                    source_path_clone,
                    unique_target_clone,
                    &options_dir,
                    callback_dir,
                )
                .map(|_| ())
            } else {
                let mut options_file = fs_extra::file::CopyOptions::new();
                options_file.overwrite = false;

                let callback_file = |tp: fs_extra::file::TransitProcess| {
                    if CANCEL_FUNC.load(Ordering::Relaxed) {
                        return;
                    }
                    let file_progress = if tp.total_bytes > 0 {
                        (tp.copied_bytes as f64 / tp.total_bytes as f64) * 100.0
                    } else {
                        0.0
                    };

                    let _ = app_clone.emit(
                        "copy_progress",
                        serde_json::json!({
                            "copy_id": id,
                            "current": current_index,
                            "file": file_name_owned,
                            "file_percent": file_progress,
                            "total": total,
                            "elapsed_secs": start.elapsed().as_secs_f64(),
                            "copied_bytes": tp.copied_bytes,
                            "total_bytes": tp.total_bytes,
                        }),
                    );
                };

                fs_extra::file::copy_with_progress(
                    source_path_clone,
                    unique_target_clone,
                    &options_file,
                    callback_file,
                )
                .map(|_| ())
            }
        })
        .await
        .map_err(|e| format!("Erro no spawn da thread: {}", e))?
        .map_err(|e| format!("Erro ao copiar '{}': {}", file_name, e))?;
    }

    CANCEL_FUNC.store(false, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub async fn move_items_to(
    _app: tauri::AppHandle,
    dir_paths: Vec<String>,
    target_path: String,
) -> Result<(), String> {
    let mut cross_device_sources = Vec::new();
    let target_dir = Path::new(&target_path);

    for path_str in dir_paths {
        let src_path = Path::new(&path_str);
        let file_name = src_path
            .file_name()
            .ok_or_else(|| format!("Caminho inválido: {}", path_str))?;

        let dest_path = target_dir.join(file_name);

        // 1. Tenta o Rename rápido por metadados
        match rename(src_path, &dest_path) {
            Ok(_) => println!("Movido via metadados: {:?}", file_name),

            // 2. Coleta itens que estão em partições/discos diferentes
            Err(e) if e.kind() == ErrorKind::CrossesDevices || e.raw_os_error() == Some(18) => {
                cross_device_sources.push(src_path.to_path_buf());
            }
            Err(e) => return Err(format!("Erro ao mover {:?}: {}", file_name, e)),
        }
    }

    // 3. Se houver itens Cross-Device, move TODOS juntos de uma vez só!
    if !cross_device_sources.is_empty() {
        if !target_dir.exists() {
            create_dir_all(target_dir)
                .map_err(|e| format!("Erro ao criar diretório destino: {}", e))?;
        }

        let options = CopyOptions {
            overwrite: true,
            skip_exist: false,
            ..Default::default()
        };

        let target_path_clone = PathBuf::from(&target_path);

        tokio::task::spawn_blocking(move || {
            fs_extra::move_items(&cross_device_sources, &target_path_clone, &options)
        })
        .await
        .map_err(|e| format!("Erro de concorrência: {}", e))?
        .map_err(|e| format!("Erro ao mover fisicamente os itens: {}", e))?;
    }

    Ok(())
}

// --- Wrapper para contar bytes lidos/escritos e emitir progresso ---

struct ProgressReader<'a, R> {
    inner: R,
    app: &'a AppHandle,
    op_id: &'a str,
    file_name: String,
    total_bytes: u64,
    processed: &'a AtomicU64,
    grand_total: u64,
    start: Instant,
    event_name: &'static str,
}

impl<'a, R: Read> Read for ProgressReader<'a, R> {
    fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
        let n = self.inner.read(buf)?;
        if n > 0 {
            let total_processed =
                self.processed.fetch_add(n as u64, AtomicOrdering::Relaxed) + n as u64;
            let percent = if self.grand_total > 0 {
                (total_processed as f64 / self.grand_total as f64) * 100.0
            } else {
                0.0
            };

            let _ = self.app.emit(
                self.event_name,
                serde_json::json!({
                    "op_id": self.op_id,
                    "file": self.file_name,
                    "processed_bytes": total_processed,
                    "total_bytes": self.grand_total,
                    "percent": percent,
                    "elapsed_secs": self.start.elapsed().as_secs_f64(),
                }),
            );
        }
        Ok(n)
    }
}

// --- Compress ---

#[tauri::command]
pub async fn compress_to_zip(
    app: AppHandle,
    file_paths: Vec<String>,
    output_path: String,
    op_id: String,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        compress_to_zip_blocking(app, file_paths, output_path, op_id)
    })
    .await
    .map_err(|e| format!("Erro no spawn da thread: {}", e))?
}

fn compress_to_zip_blocking(
    app: AppHandle,
    file_paths: Vec<String>,
    output_path: String,
    op_id: String,
) -> Result<(), String> {
    if let Some(parent) = Path::new(&output_path).parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Erro ao criar pasta de destino: {}", e))?;
    }

    CANCEL_FUNC.store(false, Ordering::SeqCst);

    // 1. Monta a lista final de (caminho_real, nome_no_zip) e soma o total de bytes
    let mut entries: Vec<(std::path::PathBuf, String, u64)> = Vec::new();
    let mut grand_total: u64 = 0;

    for path_str in &file_paths {
        if CANCEL_FUNC.load(Ordering::Relaxed) {
            CANCEL_FUNC.store(false, Ordering::SeqCst);
            return Err("Operação cancelada pelo usuario".to_string());
        }
        let path = Path::new(path_str);

        if path.is_dir() {
            let base_name = path
                .file_name()
                .and_then(|n| n.to_str())
                .ok_or_else(|| format!("Nome de diretório inválido: {}", path_str))?;

            for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
                let entry_path = entry.path();
                if entry_path.is_dir() {
                    continue;
                }
                let relative_path = entry_path
                    .strip_prefix(path)
                    .map_err(|e| format!("Erro ao calcular caminho relativo: {}", e))?;
                let zip_entry_name = format!("{}/{}", base_name, relative_path.to_string_lossy());
                let size = entry.metadata().map(|m| m.len()).unwrap_or(0);

                grand_total += size;
                entries.push((entry_path.to_path_buf(), zip_entry_name, size));
            }
        } else {
            let file_name = path
                .file_name()
                .and_then(|n| n.to_str())
                .ok_or_else(|| format!("Nome de arquivo inválido: {}", path_str))?;
            let size = fs::metadata(path).map(|m| m.len()).unwrap_or(0);

            grand_total += size;
            entries.push((path.to_path_buf(), file_name.to_string(), size));
        }
    }

    // 2. Cria o zip e vai escrevendo, emitindo progresso a cada leitura
    let output_file =
        File::create(&output_path).map_err(|e| format!("Erro ao criar arquivo de saída: {}", e))?;

    let mut zip = ZipWriter::new(output_file);
    let options: FileOptions<()> = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .unix_permissions(0o755);

    let processed = AtomicU64::new(0);
    let start = Instant::now();

    for (real_path, zip_name, _size) in entries {
        if CANCEL_FUNC.load(Ordering::Relaxed) {
            CANCEL_FUNC.store(false, Ordering::SeqCst);
            let _ = fs::remove_file(&output_path);
            return Err("Operação cancelada pelo usuario".to_string());
        }

        zip.start_file(&zip_name, options)
            .map_err(|e| format!("Erro ao iniciar entrada no zip: {}", e))?;

        let file =
            File::open(&real_path).map_err(|e| format!("Erro ao abrir {:?}: {}", real_path, e))?;

        let mut reader = ProgressReader {
            inner: BufReader::new(file),
            app: &app,
            op_id: &op_id,
            file_name: zip_name.clone(),
            total_bytes: _size,
            processed: &processed,
            grand_total,
            start,
            event_name: "compress_progress",
        };

        io::copy(&mut reader, &mut zip)
            .map_err(|e| format!("Erro ao escrever {} no zip: {}", zip_name, e))?;
    }

    zip.finish()
        .map_err(|e| format!("Erro ao finalizar zip: {}", e))?;

    Ok(())
}

// --- Extract ---

#[tauri::command]
pub async fn extract_zip(
    app: AppHandle,
    zip_paths: Vec<String>,
    output_path: String,
    op_id: String,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || extract_zip_blocking(app, zip_paths, output_path, op_id))
        .await
        .map_err(|e| format!("Erro no spawn da thread: {}", e))?
}

fn extract_zip_blocking(
    app: AppHandle,
    zip_paths: Vec<String>,
    output_path: String,
    op_id: String,
) -> Result<(), String> {
    let output_dir = Path::new(&output_path);
    fs::create_dir_all(output_dir).map_err(|e| format!("Erro ao criar pasta de destino: {}", e))?;

    CANCEL_FUNC.store(false, Ordering::SeqCst);

    // 1. Soma o tamanho total descompactado de todos os zips
    let mut grand_total: u64 = 0;
    for zip_path in &zip_paths {
        let file = File::open(zip_path)
            .map_err(|e| format!("Erro ao abrir arquivo zip {}: {}", zip_path, e))?;
        let mut archive = zip::ZipArchive::new(file)
            .map_err(|e| format!("Erro ao ler arquivo zip {}: {}", zip_path, e))?;

        for i in 0..archive.len() {
            let entry = archive
                .by_index(i)
                .map_err(|e| format!("Erro ao acessar item {} do zip {}: {}", i, zip_path, e))?;
            grand_total += entry.size();
        }
    }

    let processed = AtomicU64::new(0);
    let start = Instant::now();

    for zip_path in zip_paths {
        let file = File::open(&zip_path)
            .map_err(|e| format!("Erro ao abrir arquivo zip {}: {}", zip_path, e))?;

        let mut archive = zip::ZipArchive::new(file)
            .map_err(|e| format!("Erro ao ler arquivo zip {}: {}", zip_path, e))?;

        let zip_stem = Path::new(&zip_path)
            .file_stem()
            .and_then(|s| s.to_str())
            .ok_or_else(|| format!("Nome de arquivo inválido: {}", zip_path))?;

        let target_dir = output_dir.join(zip_stem);
        fs::create_dir_all(&target_dir)
            .map_err(|e| format!("Erro ao criar diretório {:?}: {}", target_dir, e))?;

        for i in 0..archive.len() {
            if CANCEL_FUNC.load(Ordering::Relaxed) {
                CANCEL_FUNC.store(false, Ordering::SeqCst);
                return Err("Operação cancelada pelo usuario".to_string());
            }

            let mut entry = archive
                .by_index(i)
                .map_err(|e| format!("Erro ao acessar item {} do zip {}: {}", i, zip_path, e))?;

            let entry_path = match entry.enclosed_name() {
                Some(path) => path,
                None => continue,
            };

            let out_path = target_dir.join(&entry_path);
            let entry_size = entry.size();
            let entry_name = entry_path.to_string_lossy().to_string();

            if entry.is_dir() {
                fs::create_dir_all(&out_path)
                    .map_err(|e| format!("Erro ao criar diretório {:?}: {}", out_path, e))?;
            } else {
                if let Some(parent) = out_path.parent() {
                    if !parent.exists() {
                        fs::create_dir_all(parent)
                            .map_err(|e| format!("Erro ao criar diretório {:?}: {}", parent, e))?;
                    }
                }

                let mut out_file = File::create(&out_path)
                    .map_err(|e| format!("Erro ao criar arquivo {:?}: {}", out_path, e))?;

                let mut reader = ProgressReader {
                    inner: &mut entry,
                    app: &app,
                    op_id: &op_id,
                    file_name: entry_name.clone(),
                    total_bytes: entry_size,
                    processed: &processed,
                    grand_total,
                    start,
                    event_name: "extract_progress",
                };

                io::copy(&mut reader, &mut out_file)
                    .map_err(|e| format!("Erro ao extrair {:?}: {}", out_path, e))?;
            }

            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                if let Some(mode) = entry.unix_mode() {
                    let _ = fs::set_permissions(&out_path, fs::Permissions::from_mode(mode));
                }
            }
        }
    }

    Ok(())
}
