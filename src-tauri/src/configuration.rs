use serde::{Deserialize, Serialize};
use std::fs::{create_dir_all, read_to_string, write};
use tauri::Manager;

#[derive(Serialize, Deserialize)]
pub struct Config {
    pub theme: String,
    pub toggle_hidden_files: bool,
    pub title_bar: bool,
}

#[tauri::command]
pub fn load_config(app: tauri::AppHandle) -> Config {
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
pub fn save_config(app: tauri::AppHandle, config: Config) -> Result<(), String> {
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
