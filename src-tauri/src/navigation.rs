use std::fs::read_dir;
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use unicode_normalization::UnicodeNormalization;

use crate::configuration::load_config;
use crate::management::Fileinfo;
use crate::utils::format_size;

fn normalize_name(s: &str) -> String {
    s.nfd() // Decompõe o caractere (ex: Á -> A + ´)
        .filter(|c| !matches!(c, '\u{0300}'..='\u{036f}')) // Remove os diacríticos
        .collect::<String>()
        .to_lowercase()
}

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
                                "folder".to_string()
                            } else if entry.path().is_file() {
                                let path = entry.path();

                                path.extension()
                                    .and_then(|e| e.to_str())
                                    .map(|s| s.to_ascii_lowercase())
                                    .unwrap_or_else(|| {
                                        // Fallback: Abre os primeiros bytes do arquivo para inferir o tipo real
                                        if let Ok(kind) = infer::get_from_path(&path) {
                                            if let Some(k) = kind {
                                                return k.extension().to_string();
                                                // ex: "png", "exe", "zip"
                                            }
                                        }

                                        // Se nem o infer descobrir (ex: arquivos de texto puro como .bash_history)
                                        "plain text".to_string()
                                    })
                            } else {
                                "unknown".to_string()
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
            .then_with(|| normalize_name(&a.name).cmp(&normalize_name(&b.name)))
    });
    Ok(list)
}

#[tauri::command]
pub fn back_dir(dir_path: &str) -> String {
    let mut path = PathBuf::from(dir_path);
    path.pop();
    path.to_string_lossy().to_string()
}
