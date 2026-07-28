use std::fs;
use std::path::PathBuf;
use tauri::Manager;

const LAST_PATH_FILE: &str = "last-path.txt";
const WEB_ORIGIN_FILE: &str = "web-origin.txt";

fn data_file(app: &tauri::AppHandle, name: &str) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app data dir: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("create app data dir: {e}"))?;
    Ok(dir.join(name))
}

fn write_data(app: &tauri::AppHandle, name: &str, value: &str) -> Result<(), String> {
    let path = data_file(app, name)?;
    fs::write(path, value).map_err(|e| format!("write {name}: {e}"))
}

fn read_data(app: &tauri::AppHandle, name: &str) -> Result<Option<String>, String> {
    let path = data_file(app, name)?;
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(path).map_err(|e| format!("read {name}: {e}"))?;
    let trimmed = raw.trim().to_string();
    if trimmed.is_empty() {
        Ok(None)
    } else {
        Ok(Some(trimmed))
    }
}

#[tauri::command]
fn save_desktop_resume(
    app: tauri::AppHandle,
    path: String,
    origin: Option<String>,
) -> Result<(), String> {
    let path = path.trim();
    if !path.starts_with('/') {
        return Err("path must be absolute".into());
    }
    write_data(&app, LAST_PATH_FILE, path)?;
    if let Some(origin) = origin {
        let origin = origin.trim().trim_end_matches('/');
        if origin.starts_with("http://") || origin.starts_with("https://") {
            write_data(&app, WEB_ORIGIN_FILE, origin)?;
        }
    }
    Ok(())
}

#[tauri::command]
fn load_desktop_resume(app: tauri::AppHandle) -> Result<DesktopResume, String> {
    Ok(DesktopResume {
        path: read_data(&app, LAST_PATH_FILE)?,
        origin: read_data(&app, WEB_ORIGIN_FILE)?,
    })
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopResume {
    path: Option<String>,
    origin: Option<String>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            save_desktop_resume,
            load_desktop_resume
        ])
        .run(tauri::generate_context!())
        .expect("error while running iTestU desktop");
}
