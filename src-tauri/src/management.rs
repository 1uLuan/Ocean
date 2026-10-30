use chrono::{DateTime, Local};
use serde::Serialize;
use std::fs::{create_dir_all, rename, File};
use std::time::{SystemTime};
use trash::delete_all;

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
