use base64::{engine::general_purpose, Engine as _};
use image::{codecs::jpeg::JpegEncoder, ImageReader};
use sha2::{Digest, Sha256};
use std::env;
use std::fs::{create_dir_all, metadata, File};
use std::path::{Path, PathBuf};
use tauri_plugin_shell::ShellExt;
use tokio;

#[tauri::command]
pub fn get_home() -> String {
    env::var("HOME").unwrap_or_else(|_| "/".into())
}

#[tauri::command]
pub fn format_size(bytes: u64) -> String {
    let units = ["B", "KiB", "MiB", "GiB", "TiB"];

    // Calcula a unidade maior
    let mut value = bytes as f64;
    let mut i = 0;
    while value >= 1024.0 && i < units.len() - 1 {
        value /= 1024.0;
        i += 1;
    }

    // Pega o restante em bytes e calcula a unidade menor
    let remainder_bytes = bytes % 1024u64.pow(i as u32);
    let mut remainder = remainder_bytes as f64;
    let mut j = 0;
    while remainder >= 1024.0 && j < i {
        remainder /= 1024.0;
        j += 1;
    }

    if remainder > 0.0 && j < i {
        format!("{:.0},{}{}", value, remainder.trunc(), units[i])
    } else {
        format!("{:.2}{}", value, units[i])
    }
}

pub fn generate_unique_path(target_dir: &Path, file_name: &str) -> PathBuf {
    let mut unique_target = target_dir.join(file_name);
    let mut counter = 1;

    while unique_target.exists() {
        // Separar nome e extensão
        let path = Path::new(file_name);
        let stem = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or(file_name);
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
pub async fn open_terminal(app: tauri::AppHandle, path: String) -> Result<(), String> {
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

#[tauri::command]
pub fn get_path_name(paths: Vec<String>) -> Vec<String> {
    paths
        .iter()
        .filter_map(|path| {
            if path == "/" {
                return Some("Root".to_string()); // ou String::from("/")
            }
            Path::new(path)
                .file_stem()
                .and_then(|s| s.to_str())
                .map(|s| s.to_string())
        })
        .collect()
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
    let result = hasher.finalize();
    let hex_string = result
        .iter()
        .map(|b| format!("{:02x}", b))
        .collect::<String>();
    format!("{}.jpg", hex_string)
}

#[tauri::command]
pub async fn get_thumbnail_cached(path: String, max_size: u32) -> Result<String, String> {
    // Detecta se é SVG
    let extension = std::path::Path::new(&path)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");

    if extension.to_lowercase() == "svg" {
        let svg_content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let encoded = general_purpose::STANDARD.encode(svg_content.as_bytes());
        return Ok(format!("data:image/svg+xml;base64,{}", encoded));
    }

    let cache_dir = get_cache_dir();
    let cache_name = path_to_cache_name(&path);
    let cache_path = cache_dir.join(&cache_name);

    // Verifica se thumbnail existe E está atualizada
    if cache_path.exists() {
        let original_modified = metadata(&path).and_then(|m| m.modified()).ok();
        let cache_modified = metadata(&cache_path).and_then(|m| m.modified()).ok();

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

        let file = File::create(&cache_path_clone).map_err(|e| e.to_string())?;

        JpegEncoder::new_with_quality(file, 75)
            .encode_image(&rgb)
            .map_err(|e| e.to_string())?;

        Ok(cache_path_clone.to_string_lossy().to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}
