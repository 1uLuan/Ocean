mod configuration;
mod disks;
mod management;
mod navigation;
mod udisks;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            navigation::hunt_dir,
            navigation::back_dir,
            management::make_dir,
            management::make_file,
            management::copy_items_to,
            management::move_items_to,
            management::cancel_func,
            management::rename_dir,
            management::move_to_trash,
            management::delete,
            management::compress_to_zip,
            management::extract_zip,
            configuration::load_config,
            configuration::save_config,
            utils::get_home,
            utils::open_terminal,
            utils::get_path_name,
            utils::get_thumbnail_cached,
            utils::format_size,
            disks::list_disks,
            disks::watch_disks,
            disks::mount_disk,
            disks::unmount_disk,
            disks::eject_disk,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
