// management.rs (ou um disks.rs novo)
use futures_util::StreamExt;
use nix::sys::statvfs::statvfs;
use serde::Serialize;
use std::collections::HashMap;
use std::collections::HashMap as StdHashMap;
use tauri::{AppHandle, Emitter};
use zbus::zvariant::Value;
use zbus::Connection;

use crate::udisks::{BlockProxy, DriveProxy, FilesystemProxy, ObjectManagerProxy};

#[derive(Serialize, Clone)]
pub struct PartitionInfo {
    pub object_path: String,
    pub mount_point: String,
    pub is_mounted: bool,
    pub file_system: String,
    pub total_space: u64,
    pub available_space: u64,
    pub used_space: u64,
}

#[derive(Serialize, Clone)]
pub struct DiskInfo {
    pub drive_object_path: String,
    pub name: String,
    pub vendor: String,
    pub is_removable: bool,
    pub kind: String,
    pub bus: String,
    pub partitions: Vec<PartitionInfo>, // <-- agora é uma lista
}

fn bytes_to_path(raw: &[u8]) -> String {
    // udisks2 retorna o mount point como bytes terminados em \0
    let end = raw.iter().position(|&b| b == 0).unwrap_or(raw.len());
    String::from_utf8_lossy(&raw[..end]).to_string()
}

#[tauri::command]
pub async fn list_disks() -> Result<Vec<DiskInfo>, String> {
    let conn = Connection::system().await.map_err(|e| e.to_string())?;
    let obj_manager = ObjectManagerProxy::new(&conn)
        .await
        .map_err(|e| e.to_string())?;
    let objects = obj_manager
        .get_managed_objects()
        .await
        .map_err(|e| e.to_string())?;

    let mut grouped: StdHashMap<String, DiskInfo> = StdHashMap::new();

    for (path, interfaces) in &objects {
        if !interfaces.contains_key("org.freedesktop.UDisks2.Filesystem") {
            continue;
        }

        let fs_proxy = FilesystemProxy::builder(&conn)
            .path(path.clone())
            .map_err(|e| e.to_string())?
            .build()
            .await
            .map_err(|e| e.to_string())?;

        let mount_points = fs_proxy.mount_points().await.unwrap_or_default();
        let is_mounted = !mount_points.is_empty();
        let mount_point = if is_mounted {
            bytes_to_path(&mount_points[0])
        } else {
            String::new()
        };

        let block_proxy = BlockProxy::builder(&conn)
            .path(path.clone())
            .map_err(|e| e.to_string())?
            .build()
            .await
            .map_err(|e| e.to_string())?;

        let file_system = block_proxy.id_type().await.unwrap_or_default();
        if file_system.is_empty() {
            continue;
        }

        let drive_path = block_proxy.drive().await.map_err(|e| e.to_string())?;
        if drive_path.as_str() == "/" {
            continue;
        }

        let drive_key = drive_path.to_string();

        // Se ainda não vimos esse drive, busca as infos dele uma única vez
        if !grouped.contains_key(&drive_key) {
            let drive_proxy = DriveProxy::builder(&conn)
                .path(drive_path.clone())
                .map_err(|e| e.to_string())?
                .build()
                .await
                .map_err(|e| e.to_string())?;

            let model = drive_proxy.model().await.unwrap_or_default();
            let vendor = drive_proxy.vendor().await.unwrap_or_default();
            let removable = drive_proxy.removable().await.unwrap_or(false);
            let bus = drive_proxy.connection_bus().await.unwrap_or_default();
            let rotation = drive_proxy.rotation_rate().await.unwrap_or(-1);

            let kind = match rotation {
                0 => "SSD".to_string(),
                r if r > 0 => "HDD".to_string(),
                _ => "Desconhecido".to_string(),
            };

            grouped.insert(
                drive_key.clone(),
                DiskInfo {
                    drive_object_path: drive_key.clone(),
                    name: model,
                    vendor,
                    is_removable: removable,
                    kind,
                    bus,
                    partitions: Vec::new(),
                },
            );
        }

        let (total, available) = if is_mounted {
            match statvfs(mount_point.as_str()) {
                Ok(stat) => {
                    let frag = stat.fragment_size() as u64;
                    (
                        stat.blocks() as u64 * frag,
                        stat.blocks_available() as u64 * frag,
                    )
                }
                Err(_) => (0, 0),
            }
        } else {
            (0, 0)
        };

        // Adiciona a partição no drive já existente no map
        if let Some(disk) = grouped.get_mut(&drive_key) {
            disk.partitions.push(PartitionInfo {
                object_path: path.to_string(),
                mount_point,
                is_mounted,
                file_system,
                total_space: total,
                available_space: available,
                used_space: total.saturating_sub(available),
            });
        }
    }

    Ok(grouped.into_values().collect())
}

#[tauri::command]
pub async fn watch_disks(app: AppHandle) -> Result<(), String> {
    let conn = Connection::system()
        .await
        .map_err(|e| format!("Erro ao conectar no D-Bus: {}", e))?;

    let obj_manager = ObjectManagerProxy::new(&conn)
        .await
        .map_err(|e| e.to_string())?;

    let mut added_stream = obj_manager
        .receive_interfaces_added()
        .await
        .map_err(|e| e.to_string())?;

    let mut removed_stream = obj_manager
        .receive_interfaces_removed()
        .await
        .map_err(|e| e.to_string())?;

    let app_added = app.clone();
    tokio::spawn(async move {
        while added_stream.next().await.is_some() {
            let _ = app_added.emit("disks_changed", ());
        }
    });

    tokio::spawn(async move {
        while removed_stream.next().await.is_some() {
            let _ = app.emit("disks_changed", ());
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn mount_disk(object_path: String) -> Result<String, String> {
    let conn = Connection::system()
        .await
        .map_err(|e| format!("Erro ao conectar no D-Bus: {}", e))?;

    let fs_proxy = FilesystemProxy::builder(&conn)
        .path(object_path.as_str())
        .map_err(|e| e.to_string())?
        .build()
        .await
        .map_err(|e| e.to_string())?;

    let options: HashMap<&str, &Value> = HashMap::new();

    fs_proxy
        .mount(options)
        .await
        .map_err(|e| format!("Erro ao montar dispositivo: {}", e))
}

#[tauri::command]
pub async fn unmount_disk(object_path: String) -> Result<(), String> {
    let conn = Connection::system()
        .await
        .map_err(|e| format!("Erro ao conectar no D-Bus: {}", e))?;

    let fs_proxy = FilesystemProxy::builder(&conn)
        .path(object_path.as_str())
        .map_err(|e| e.to_string())?
        .build()
        .await
        .map_err(|e| e.to_string())?;

    let options: HashMap<&str, &Value> = HashMap::new();

    fs_proxy
        .unmount(options)
        .await
        .map_err(|e| format!("Erro ao desmontar dispositivo: {}", e))
}

#[tauri::command]
pub async fn eject_disk(object_path: String, drive_object_path: String) -> Result<(), String> {
    let conn = Connection::system()
        .await
        .map_err(|e| format!("Erro ao conectar no D-Bus: {}", e))?;

    // 1. Primeiro desmonta (se estiver montado) — Eject sozinho às vezes falha se ainda montado
    let fs_proxy = FilesystemProxy::builder(&conn)
        .path(object_path.as_str())
        .map_err(|e| e.to_string())?
        .build()
        .await
        .map_err(|e| e.to_string())?;

    let empty_opts: HashMap<&str, &Value> = HashMap::new();
    let _ = fs_proxy.unmount(empty_opts).await; // ignora erro se já tava desmontado

    // 2. Agora ejeta o drive físico
    let drive_proxy = DriveProxy::builder(&conn)
        .path(drive_object_path.as_str())
        .map_err(|e| e.to_string())?
        .build()
        .await
        .map_err(|e| e.to_string())?;

    let eject_opts: HashMap<&str, &Value> = HashMap::new();

    drive_proxy
        .eject(eject_opts)
        .await
        .map_err(|e| format!("Erro ao ejetar dispositivo: {}", e))
}
