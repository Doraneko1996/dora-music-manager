mod audio_meta;
use audio_meta::{
    convert_image_to_png_logic, update_metadata_batch_logic,
    update_metadata_logic, AudioMetadata, ScanResult,
};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
            convert_image_to_png
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
