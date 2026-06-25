use serde::{Deserialize, Serialize};
use reqwest::Client;
use std::fs::File;
use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio};
use std::thread;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tauri::{AppHandle, Emitter, Manager};

pub struct DownloadState(pub Arc<Mutex<HashMap<String, u32>>>);

#[derive(Serialize, Deserialize, Debug)]
pub struct GithubRelease {
    pub tag_name: String,
    pub name: String,
    pub body: Option<String>,
    pub assets: Vec<GithubAsset>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GithubAsset {
    pub name: String,
    pub browser_download_url: String,
}

#[tauri::command]
pub async fn check_engine_update() -> Result<Option<GithubRelease>, String> {
    let client = Client::builder()
        .user_agent("Dora-Music-Manager")
        .build()
        .map_err(|e| e.to_string())?;

    let url = "https://api.github.com/repos/Doraneko1996/lucidar-downloader-for-dora-music-manager/releases/latest";
    
    let response = client.get(url).send().await.map_err(|e| e.to_string())?;
    
    if response.status().is_success() {
        let release: GithubRelease = response.json().await.map_err(|e| e.to_string())?;
        Ok(Some(release))
    } else {
        Err(format!("Lỗi khi lấy thông tin update: {}", response.status()))
    }
}

#[tauri::command]
pub async fn download_engine(app: AppHandle, download_url: String, tag_name: String) -> Result<String, String> {
    let client = Client::builder()
        .user_agent("Dora-Music-Manager")
        .build()
        .map_err(|e| e.to_string())?;
        
    let response = client.get(&download_url).send().await.map_err(|e| e.to_string())?;
    
    if !response.status().is_success() {
        return Err(format!("Lỗi khi tải file: {}", response.status()));
    }
    
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    
    // Save to AppData folder
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    
    // Ensure dir exists
    std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
    
    let engine_path = app_data_dir.join("lucida.exe");
    
    let mut file = File::create(&engine_path).map_err(|e| e.to_string())?;
    file.write_all(&bytes).map_err(|e| e.to_string())?;
    
    // Save version tag
    let version_path = app_data_dir.join(".engine_version");
    let mut version_file = File::create(&version_path).map_err(|e| e.to_string())?;
    version_file.write_all(tag_name.as_bytes()).map_err(|e| e.to_string())?;
    
    Ok(engine_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_local_engine_version(app: AppHandle) -> Result<Option<String>, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let engine_path = app_data_dir.join("lucida.exe");
    let version_path = app_data_dir.join(".engine_version");
    
    if !engine_path.exists() {
        return Ok(None); // Engine does not exist
    }
    
    if !version_path.exists() {
        return Ok(Some("unknown".to_string())); // Engine exists but no version file
    }
    
    let version = std::fs::read_to_string(version_path).map_err(|e| e.to_string())?;
    Ok(Some(version.trim().to_string()))
}

#[derive(Clone, Serialize)]
struct ProgressPayload {
    url: String,
    text: String,
}

#[tauri::command]
pub async fn start_download_music(
    app: AppHandle, 
    state: tauri::State<'_, DownloadState>,
    url: String, 
    output_dir: String,
    cf_clearance: String,
    user_agent: String
) -> Result<(), String> {
    // 1. Get the path to lucida.exe
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let engine_path = app_data_dir.join("lucida.exe");
    
    if !engine_path.exists() {
        return Err("Engine (lucida.exe) chưa được cài đặt. Vui lòng cập nhật engine.".to_string());
    }
    
    // Emit start event
    let _ = app.emit("download-status", ProgressPayload {
        url: url.clone(),
        text: format!("Đang khởi tạo tải xuống từ: {}", url)
    });
    
    let state_inner = state.0.clone();
    
    // 2. Spawn thread to run the process so we don't block
    thread::spawn(move || {
        let mut command = Command::new(&engine_path);
        command.arg(&url).arg("-o").arg(&output_dir);
        
        if !cf_clearance.is_empty() {
            command.arg("--cf-clearance").arg(&cf_clearance);
        }
        if !user_agent.is_empty() {
            command.arg("--user-agent").arg(&user_agent);
        }
        
        let mut child = match command
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn() {
                Ok(child) => child,
                Err(e) => {
                    let _ = app.emit("download-error", ProgressPayload {
                        url: url.clone(),
                        text: format!("Không thể khởi chạy engine: {}", e)
                    });
                    return;
                }
            };
            
        let pid = child.id();
        {
            let mut map = state_inner.lock().unwrap();
            map.insert(url.clone(), pid);
        }
            
        let stdout = child.stdout.take().expect("Failed to open stdout");
        let stderr = child.stderr.take().expect("Failed to open stderr");
        
        let url_clone_stdout = url.clone();
        let app_clone_stdout = app.clone();
        
        let stdout_thread = thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(text) = line {
                    let _ = app_clone_stdout.emit("download-progress", ProgressPayload {
                        url: url_clone_stdout.clone(),
                        text,
                    });
                }
            }
        });
        
        let url_clone_stderr = url.clone();
        let app_clone_stderr = app.clone();
        
        let stderr_thread = thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(text) = line {
                    let _ = app_clone_stderr.emit("download-error", ProgressPayload {
                        url: url_clone_stderr.clone(),
                        text,
                    });
                }
            }
        });
        
        // Wait for stdout and stderr to finish
        let _ = stdout_thread.join();
        let _ = stderr_thread.join();
        
        // Wait for process to finish
        let status = child.wait().expect("Failed to wait on child");
        
        let _ = app.emit("download-finished", ProgressPayload {
            url: url.clone(),
            text: status.code().unwrap_or(0).to_string(),
        });
        
        {
            let mut map = state_inner.lock().unwrap();
            map.remove(&url);
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn cancel_download(state: tauri::State<'_, DownloadState>, url: String) -> Result<(), String> {
    let pid = {
        let map = state.0.lock().unwrap();
        map.get(&url).copied()
    };
    
    if let Some(pid) = pid {
        #[cfg(target_os = "windows")]
        {
            let _ = Command::new("taskkill")
                .args(["/F", "/T", "/PID", &pid.to_string()])
                .status();
        }
        
        #[cfg(not(target_os = "windows"))]
        {
            let _ = Command::new("kill")
                .args(["-9", &pid.to_string()])
                .status();
        }
        
        let mut map = state.0.lock().unwrap();
        map.remove(&url);
    }
    
    Ok(())
}
