mod audio_meta;
mod downloader;
use audio_meta::{
    convert_image_to_png_logic, update_metadata_batch_logic,
    update_metadata_logic, AudioMetadata, ScanResult,
};
use downloader::{check_engine_update, download_engine, start_download_music, get_local_engine_version, cancel_download, DownloadState};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn scan_directory(path: String) -> Result<ScanResult, String> {
    let result = audio_meta::scan_and_extract(&path);
    Ok(result)
}

#[tauri::command]
async fn scan_specific_files(dir_path: String, file_paths: Vec<String>) -> Result<ScanResult, String> {
    let result = audio_meta::scan_specific_files_logic(&dir_path, file_paths);
    Ok(result)
}

#[tauri::command]
async fn update_metadata(files: Vec<String>, metadata: AudioMetadata) -> Result<(), String> {
    update_metadata_logic(files, &metadata)
}

#[tauri::command]
async fn update_metadata_batch(updates: Vec<AudioMetadata>) -> Result<(), String> {
    update_metadata_batch_logic(updates)
}

#[tauri::command]
fn process_and_embed_artwork(files: Vec<String>, image_path: String) -> Result<(), String> {
    audio_meta::process_and_embed_artwork_logic(files, &image_path)
}

#[tauri::command]
fn get_cover_art(path: String) -> Result<Option<String>, String> {
    audio_meta::get_cover_art_logic(&path)
}

#[tauri::command]
fn convert_image_to_png(path: String) -> Result<String, String> {
    convert_image_to_png_logic(&path)
}

#[tauri::command]
async fn move_to_trash(paths: Vec<String>) -> Result<(), String> {
    for path in paths {
        if let Err(e) = trash::delete(&path) {
            return Err(format!("Lỗi khi xoá {}: {}", path, e));
        }
    }
    Ok(())
}

#[tauri::command]
fn save_custom_album_cover(directory_path: String, album_name: String, source_path: String) -> Result<String, String> {
    audio_meta::save_custom_album_cover_logic(&directory_path, &album_name, &source_path)
}

#[tauri::command]
fn save_folder_meta(directory_path: String, artists: Vec<String>, albums: Vec<audio_meta::AlbumInfo>, genres: Vec<String>) -> Result<(), String> {
    audio_meta::save_folder_meta_logic(&directory_path, artists, albums, genres)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(DownloadState(Arc::new(Mutex::new(HashMap::new()))))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            scan_directory,
            scan_specific_files,
            update_metadata,
            update_metadata_batch,
            process_and_embed_artwork,
            get_cover_art,
            convert_image_to_png,
            move_to_trash,
            save_custom_album_cover,
            save_folder_meta,
            check_engine_update,
            download_engine,
            start_download_music,
            get_local_engine_version,
            cancel_download
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
