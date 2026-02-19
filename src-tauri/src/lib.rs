use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use std::env;
use std::fs::{File,create_dir_all, read_dir, read_to_string,metadata, rename, write};
use fs_extra::dir::{TransitProcessResult,CopyOptions};
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use trash::delete_all;
use tauri::{AppHandle,Manager,Emitter};
use std::time::Instant;
use tauri_plugin_shell::ShellExt;
use std::sync::atomic::{AtomicBool, Ordering};
use tokio;
use std::io::ErrorKind;
use image::{ImageReader,codecs::jpeg::JpegEncoder};
use sha2::{Sha256, Digest};
use base64::{Engine as _, engine::general_purpose};

static CANCEL_FUNC: AtomicBool = AtomicBool::new(false);

#[derive(Serialize)]
struct Fileinfo {
    name: String,
    ftype: String,
    #[serde(serialize_with = "serialize_date")]
    last_modified: SystemTime,
    size: String,
    path: String,
}
fn serialize_date<S>(time: &SystemTime, serializer: S) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    let datetime: DateTime<Local> = (*time).into();
    serializer.serialize_str(&datetime.format("%Y-%m-%d").to_string())
}

#[derive(Serialize, Deserialize)]
struct Config {
    theme: String,
    toggle_hidden_files: bool,
    title_bar: bool,
}

#[tauri::command]
fn load_config(app: tauri::AppHandle) -> Config {
    let dir = match app.path().app_config_dir() {
        Ok(d) => d,
        Err(_) => {
            return Config {
                theme: "dark".into(),
                toggle_hidden_files: false,
                title_bar: true,
            }
        }
    };
    let path = dir.join("config.json");

    if let Ok(data) = read_to_string(&path) {
        if let Ok(cfg) = serde_json::from_str(&data) {
            return cfg;
        }
    }
    Config {
        theme: "dark".into(),
        toggle_hidden_files: false,
        title_bar: true,
    }
}

#[tauri::command]
fn get_home() -> String {
    env::var("HOME").unwrap_or_else(|_| "/".into())
}

#[tauri::command]
fn save_config(app: tauri::AppHandle, config: Config) -> Result<(), String> {
    // Resolva o diretório correto do SO para configs do app
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Falha ao resolver app_config_dir: {e}"))?;

    create_dir_all(&dir).map_err(|e| format!("Falha ao criar pasta de config: {e}"))?;

    let path = dir.join("config.json");
    let data = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Falha ao serializar config: {e}"))?;

    // Escrita atômica: grava em tmp e renomeia
    let tmp = path.with_extension("json.tmp");
    write(&tmp, data).map_err(|e| format!("Falha ao escrever temporário: {e}"))?;
    std::fs::rename(&tmp, &path).map_err(|e| format!("Falha ao renomear config: {e}"))?;

    Ok(())
}

#[tauri::command]
async fn hunt_dir(app: tauri::AppHandle, dir_path: &str) -> Result<Vec<Fileinfo>, String> {
    let conf = load_config(app);

    let the_path = Path::new(dir_path);
    let mut list: Vec<Fileinfo> = Vec::new();

    if the_path.is_dir() {
        if let Ok(entries) = read_dir(the_path) {
            for entry in entries {
                match entry {
                    Ok(entry) => {
                        if let Some(name) = entry.file_name().to_str() {
                            if !conf.toggle_hidden_files && name.starts_with('.') {
                                continue;
                            }
                            let ftype = if entry.path().is_dir() {
                                "Folder"
                            } else if entry.path().is_file() {
                                if let Some(ext) = entry
                                    .path()
                                    .extension()
                                    .and_then(|e| e.to_str())
                                    .map(|s| s.to_ascii_lowercase())
                                {
                                    if [
                                        "png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "tiff",
                                        "tif", "heic", "heif", "avif", "ico",
                                    ]
                                    .contains(&ext.as_str())
                                    {
                                        "Image"
                                    } else if &ext.as_str() == &"Txt" {
                                        "Text"
                                    } else if [
                                        "mp4", "mkv", "mov", "avi", "webm", "m4v", "3gp", "flv",
                                        "wmv", "mpeg", "mpg", "ts", "m2ts", "mts", "ogv",
                                    ]
                                    .contains(&ext.as_str())
                                    {
                                        "Video"
                                    } else if [
                                        "mp3", "wav", "flac", "aac", "ogg", "oga", "m4a", "opus",
                                        "wma", "aiff", "aif", "mid", "midi", "amr",
                                    ]
                                    .contains(&ext.as_str())
                                    {
                                        "Audio"
                                    } else if [
                                        "sh", "bash", "zsh", "fish", "run", "bin", "out",
                                        "appimage",
                                    ]
                                    .contains(&ext.as_str())
                                    {
                                        "Executavel"
                                    } else {
                                        "Unknown"
                                    }
                                } else {
                                    "Unknown"
                                }
                            } else {
                                "Unknown"
                            };
                            if let Ok(metadata) = entry.metadata() {
                                let last_modified =
                                    metadata.modified().unwrap_or(SystemTime::UNIX_EPOCH);
                                let size = format_size(metadata.len());
                                let path: String = entry.path().to_string_lossy().to_string();
                                list.push(Fileinfo {
                                    name: name.into(),
                                    ftype: ftype.into(),
                                    last_modified: last_modified,
                                    size: size,
                                    path: path,
                                });
                            }
                        }
                    }
                    Err(e) => {
                        eprintln!("ERROR: {e}");
                    }
                }
            }
        }
    }
    list.sort_by(|a, b| {
        let a_is_folder = a.ftype == "folder";
        let b_is_folder = b.ftype == "folder";

        a_is_folder
            .cmp(&b_is_folder)
            .reverse()
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(list)
}

fn format_size(mut bytes: u64) -> String {
    let units = ["B", "KB", "MB", "GB", "TB"];
    let mut i = 0;
    while bytes >= 1024 && i < units.len() {
        bytes /= 1024;
        i += 1;
    }
    format!("{:.2} {}", bytes, units[i]).to_string()
}

#[tauri::command]
fn back_dir(dir_path: &str) -> String {
    let mut path = PathBuf::from(dir_path);
    path.pop();
    path.to_string_lossy().to_string()
}

#[tauri::command]
fn make_dir(dir_path: &str) -> Result<(), String> {
    create_dir_all(dir_path).map_err(|e| e.to_string())?;
    Ok(())
}
#[tauri::command]
fn make_file(file_path: &str) -> Result<(), String> { 
    File::create(file_path).map_err(|e| e.to_string())?;
    Ok(())
}

fn generate_unique_path(target_dir: &Path, file_name: &str) -> PathBuf {
    let mut unique_target = target_dir.join(file_name);
    let mut counter = 1;

    while unique_target.exists() {
        // Separar nome e extensão
        let path = Path::new(file_name);
        let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or(file_name);
        let extension = path.extension().and_then(|e| e.to_str());

        let new_name = if let Some(ext) = extension {
            format!("{}({}).{}", stem, counter, ext)
        } else {
            format!("{}({})", stem, counter)
        };

        unique_target = target_dir.join(new_name);
        counter += 1;
    }

    unique_target
}

#[tauri::command]
async fn copy_items_to(app: AppHandle, dir_paths: Vec<String>, target_path: String) -> Result<(), String> {
    if dir_paths.is_empty() {
        return Err("Nenhum item para copiar".to_string());
    }
    CANCEL_FUNC.store(false, Ordering::SeqCst);
    let total = dir_paths.len();
    let start = Instant::now();
    let target_dir = Path::new(&target_path);
    if !target_dir.exists() {
        create_dir_all(&target_dir)
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
        
        let mut options_dir = fs_extra::dir::CopyOptions::new();
        options_dir.copy_inside = true;
        options_dir.overwrite = false;

        let mut options_file = fs_extra::file::CopyOptions::new();
        options_file.overwrite = false;

        
        // Função de callback de progresso
        let app_clone = app.clone();
        let file_name_owned = file_name.to_string();
        let current_index = i + 1;

        // Executar cópia em thread bloqueante
        let source_clone = source_path.clone();
        let target_clone = unique_target.to_string_lossy().to_string();
        
        tokio::task::spawn_blocking(move || {
            if source_clone.is_dir() {
                let callback_dir = move |tp: fs_extra::dir::TransitProcess| {
                    if CANCEL_FUNC.load(Ordering::SeqCst) {
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
                    source_clone,
                    target_clone,
                    &options_dir,
                    callback_dir,
                )
            } else {
                let callback_file = move |tp: fs_extra::file::TransitProcess| {
                    if CANCEL_FUNC.load(Ordering::SeqCst) {
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
                    source_clone,
                    target_clone,
                    &options_file,
                    callback_file,
                )
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
async fn move_items_to(_app: tauri::AppHandle, dir_paths: Vec<String>, target_path: String) -> Result<(), String> {
    for path_str in dir_paths {
        let src_path = Path::new(&path_str);
        
        // Extrai apenas o nome do arquivo/pasta (ex: "foto.jpg")
        let file_name = src_path.file_name()
            .ok_or_else(|| format!("Caminho inválido: {}", path_str))?;
        
        // Constrói o caminho de destino corretamente usando PathBuf
        let mut dest_path = PathBuf::from(&target_path);
        dest_path.push(file_name);

        // 1. Tenta o Rename (Operação Atômica e Rápida)
        match rename(&src_path, &dest_path) {
            Ok(_) => println!("Movido via metadados: {:?}", file_name),
            
            // 2. Fallback para Cross-Device (Discos diferentes)
            Err(e) if e.kind() == ErrorKind::CrossesDevices || e.raw_os_error() == Some(18) => {
                let target_dir = Path::new(&target_path);
                if !target_dir.exists() {
                    create_dir_all(target_dir)
                        .map_err(|e| format!("Erro ao criar diretório: {}", e))?;
                }

                let options = CopyOptions {
                    overwrite: true,
                    skip_exist: false,
                    ..Default::default()
                };

                let src_path_clone = src_path.to_path_buf();
                let target_path_clone = PathBuf::from(&target_path);

                // Rodar a cópia pesada em uma thread separada para não travar o app
                tokio::task::spawn_blocking(move || {
                    // fs_extra::move_items aceita uma lista de itens
                    fs_extra::move_items(&[src_path_clone], &target_path_clone, &options)
                })
                .await
                .map_err(|e| format!("Erro de concorrência: {}", e))?
                .map_err(|e| format!("Erro ao mover fisicamente: {}", e))?;
            }
            
            Err(e) => return Err(format!("Erro ao mover {:?}: {}", file_name, e)),
        }
    }
    Ok(())
}

#[tauri::command]
fn cancel_func() {
    CANCEL_FUNC.store(true, Ordering::SeqCst);
}

#[tauri::command]
async fn move_to_trash(dir_path: Vec<String>) {
    if let Err(e) = delete_all(&dir_path) {
        println!("Failed to delete: {}", e)
    };
}
#[tauri::command]
async fn delete(dir_path: Vec<String>) -> Result<(), String> {
    use tokio::fs;

    for path in dir_path {
        let metadata = fs::metadata(&path).await.map_err(|e| format!("failed to read metadata from {}. Err: {}",path, e))?;
        if metadata.is_dir() {
            fs::remove_dir_all(&path).await
        }
        else {
            fs::remove_file(&path).await
        }
        .map_err(|e| format!("failed to delete {}. Err: {}",path, e))?;
    }
    Ok(())
}

#[tauri::command]
fn get_path_name(paths: Vec<String>) -> Vec<String> {
    paths
        .iter()
        .filter_map(|path| {
            Path::new(path)
                .file_stem()
                .and_then(|s| s.to_str())
                .map(|s| s.to_string())
        })
        .collect()
}

#[tauri::command]
fn rename_dir(dir_paths: Vec<String>, new_name: &str) -> Result<(), String> {
    for dir_path in &dir_paths {
        rename(dir_path, new_name).map_err(|e| format!("Erro ao renomear {} : {}", dir_path, e))?;
    }
    Ok(())
}
#[tauri::command]
async fn open_terminal(app: tauri::AppHandle, path: String) -> Result<(), String> {

    #[cfg(target_os = "linux")]
    {
        app.shell()
            .command("kitty")
            .args(["--working-directory", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn get_cache_dir() -> PathBuf {
    let cache = dirs::cache_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("ocean")
        .join("thumbnails");
    
    create_dir_all(&cache).ok();
    cache
}

fn path_to_cache_name(path: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(path.as_bytes());
    format!("{:x}.jpg", hasher.finalize())
}

#[tauri::command]
async fn get_thumbnail_cached(path: String, max_size: u32) -> Result<String, String> {
    // Detecta se é SVG
    let extension = std::path::Path::new(&path)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    
    if extension.to_lowercase() == "svg" {
        let svg_content = std::fs::read_to_string(&path)
            .map_err(|e| e.to_string())?;
        let encoded = general_purpose::STANDARD.encode(svg_content.as_bytes());
        return Ok(format!("data:image/svg+xml;base64,{}", encoded));
    }   
    
    let cache_dir = get_cache_dir();
    let cache_name = path_to_cache_name(&path);
    let cache_path = cache_dir.join(&cache_name);

    // Verifica se thumbnail existe E está atualizada
    if cache_path.exists() {
        let original_modified = metadata(&path)
            .and_then(|m| m.modified())
            .ok();
        let cache_modified = metadata(&cache_path)
            .and_then(|m| m.modified())
            .ok();

        // Se thumbnail é mais recente que o arquivo original, retorna o caminho
        if let (Some(orig), Some(cache)) = (original_modified, cache_modified) {
            if cache >= orig {
                return Ok(cache_path.to_string_lossy().to_string());
            }
        }
    }

    // Gera thumbnail em thread separada
    let path_clone = path.clone();
    let cache_path_clone = cache_path.clone();
    
    tokio::task::spawn_blocking(move || {
        let img = ImageReader::open(&path_clone)
            .map_err(|e| e.to_string())?
            .with_guessed_format()
            .map_err(|e| e.to_string())?
            .decode()
            .map_err(|e| e.to_string())?;

        let thumb = img.thumbnail(max_size, max_size);
        let rgb = thumb.into_rgb8();

        let file = File::create(&cache_path_clone)
            .map_err(|e| e.to_string())?;
        
        JpegEncoder::new_with_quality(file, 75)
            .encode_image(&rgb)
            .map_err(|e| e.to_string())?;

        Ok(cache_path_clone.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            hunt_dir,
            back_dir,
            make_dir,
            make_file,
            copy_items_to,
            cancel_func,
            rename_dir,
            move_to_trash,
            delete,
            get_home,
            load_config,
            save_config,
            open_terminal,
            move_items_to,
            get_path_name,
            get_thumbnail_cached
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
