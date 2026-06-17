use chrono::{DateTime, Local};
use fs_extra::dir::{CopyOptions, TransitProcessResult};
use serde::Serialize;
use std::fs::{create_dir_all, rename, File};
use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Instant;
use std::time::SystemTime;
use tauri::{AppHandle, Emitter};
use tokio;
use trash::delete_all;

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
    create_dir_all(dir_path).map_err(|e| e.to_string())?;
    Ok(())
}
#[tauri::command]
pub fn make_file(file_path: &str) -> Result<(), String> {
    File::create(file_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn rename_dir(dir_paths: Vec<String>, new_name: &str) -> Result<(), String> {
    for dir_path in &dir_paths {
        rename(dir_path, new_name).map_err(|e| format!("Erro ao renomear {} : {}", dir_path, e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn move_to_trash(dir_path: Vec<String>) {
    if let Err(e) = delete_all(&dir_path) {
        println!("Failed to delete: {}", e)
    };
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
        let id = copy_id.clone();

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
pub async fn move_items_to(
    _app: tauri::AppHandle,
    dir_paths: Vec<String>,
    target_path: String,
) -> Result<(), String> {
    for path_str in dir_paths {
        let src_path = Path::new(&path_str);

        // Extrai apenas o nome do arquivo/pasta (ex: "foto.jpg")
        let file_name = src_path
            .file_name()
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
