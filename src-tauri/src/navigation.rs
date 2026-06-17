use std::fs::read_dir;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

use crate::configuration::load_config;
use crate::management::Fileinfo;
use crate::utils::format_size;

#[tauri::command]
pub async fn hunt_dir(app: tauri::AppHandle, dir_path: &str) -> Result<Vec<Fileinfo>, String> {
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

#[tauri::command]
pub fn back_dir(dir_path: &str) -> String {
    let mut path = PathBuf::from(dir_path);
    path.pop();
    path.to_string_lossy().to_string()
}
