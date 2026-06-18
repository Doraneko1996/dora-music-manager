use base64::{engine::general_purpose, Engine as _};
use image::GenericImageView;
use lofty::picture::{MimeType, Picture, PictureType};
use lofty::prelude::*;
use lofty::probe::Probe;
use lofty::tag::{Accessor, Tag};
use rayon::prelude::*;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::Cursor;
use std::path::Path;
use walkdir::WalkDir;

#[cfg(windows)]
use std::process::Command;

/// DTO gửi về frontend
#[derive(Debug, Serialize, Deserialize)]
pub struct AudioMetadata {
    pub file_path: String,
    pub file_name: String,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub genre: Option<String>,
    pub year: Option<u32>,
    pub has_cover: bool,
    pub bitrate: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, Hash)]
pub struct AlbumInfo {
    pub album_name: String,
    pub cover_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AggregatedMetadata {
    pub artists: Vec<String>,
    pub albums: Vec<AlbumInfo>,
    pub genres: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanResult {
    pub files: Vec<AudioMetadata>,
    pub aggregated: AggregatedMetadata,
}

/// Trích xuất metadata từ một file đơn lẻ
fn process_file(
    path: &Path,
    dir_path: &str,
    albums_map: &mut HashMap<String, Option<String>>,
    artists_set: &mut HashSet<String>,
    genres_set: &mut HashSet<String>,
    re_feat: &Regex,
) -> Result<AudioMetadata, Box<dyn std::error::Error>> {
    let tagged_file = Probe::open(path)?.read()?;

    let file_path = path.to_string_lossy().to_string();
    let file_name = path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let tag = tagged_file
        .primary_tag()
        .or_else(|| tagged_file.first_tag());

    let mut meta = AudioMetadata {
        file_path,
        file_name,
        title: None,
        artist: None,
        album: None,
        genre: None,
        year: None,
        has_cover: false,
        bitrate: None,
    };

    let properties = tagged_file.properties();
    if let Some(br) = properties.audio_bitrate() {
        meta.bitrate = Some(br);
    }

    if let Some(t) = tag {
        meta.title = t.title().map(|s| s.into_owned());
        meta.artist = t.artist().map(|s| s.into_owned());
        meta.album = t.album().map(|s| s.into_owned());
        meta.genre = t.genre().map(|s| s.into_owned());
        meta.year = t.year();

        let mut extracted_cover_path: Option<String> = None;

        // Xử lý ảnh bìa
        let picture = t.pictures().iter().find(|p| {
            p.pic_type() == PictureType::CoverFront || p.pic_type() == PictureType::Other
        });
        if let Some(pic) = picture {
            meta.has_cover = true;
            if let Some(album_str) = &meta.album {
                if !albums_map.contains_key(album_str)
                    || albums_map.get(album_str).unwrap().is_none()
                {
                    let base_name = album_str.replace(
                        |c: char| {
                            c == '<'
                                || c == '>'
                                || c == ':'
                                || c == '"'
                                || c == '/'
                                || c == '\\'
                                || c == '|'
                                || c == '?'
                                || c == '*'
                        },
                        "_",
                    );

                    let ext = match pic.mime_type() {
                        Some(MimeType::Jpeg) => "jpg",
                        Some(MimeType::Png) => "png",
                        _ => "jpg",
                    };

                    let mut counter = 0;
                    let final_relative_path;
                    let final_full_path;

                    loop {
                        let filename = if counter == 0 {
                            format!("{}.{}", base_name, ext)
                        } else {
                            format!("{} ({}).{}", base_name, counter, ext)
                        };

                        let relative_path = format!(".dora_metadata/covers/{}", filename);
                        let full_path = Path::new(dir_path).join(&relative_path);

                        if full_path.exists() {
                            if let Ok(metadata) = std::fs::metadata(&full_path) {
                                if metadata.len() as usize == pic.data().len() {
                                    if let Ok(existing_data) = std::fs::read(&full_path) {
                                        if existing_data == pic.data() {
                                            final_relative_path = relative_path;
                                            final_full_path = full_path;
                                            break;
                                        }
                                    }
                                }
                            }
                            counter += 1;
                        } else {
                            final_relative_path = relative_path;
                            final_full_path = full_path;
                            break;
                        }
                    }

                    if !final_full_path.exists() {
                        if fs::write(&final_full_path, pic.data()).is_ok() {
                            extracted_cover_path = Some(final_relative_path);
                        }
                    } else {
                        extracted_cover_path = Some(final_relative_path);
                    }
                } else {
                    extracted_cover_path = albums_map.get(album_str).unwrap().clone();
                }
            }
        }

        // Map album -> cover_path
        if let Some(album_str) = &meta.album {
            if !albums_map.contains_key(album_str)
                || (extracted_cover_path.is_some() && albums_map.get(album_str).unwrap().is_none())
            {
                albums_map.insert(album_str.clone(), extracted_cover_path);
            }
        }

        // Parse artists
        if let Some(artist_str) = &meta.artist {
            let parts: Vec<&str> = re_feat.split(artist_str).collect();
            for part in parts {
                for artist in part.split(',') {
                    let trimmed = artist.trim();
                    if !trimmed.is_empty() {
                        artists_set.insert(trimmed.to_string());
                    }
                }
            }
        }

        // Parse genres
        if let Some(genre_str) = &meta.genre {
            genres_set.insert(genre_str.trim().to_string());
        }
    }

    Ok(meta)
}

/// Quét thư mục và trả về danh sách các file audio hợp lệ cùng metadata tổng hợp
pub fn scan_and_extract(dir_path: &str) -> ScanResult {
    let mut files_result = Vec::new();
    let allowed_extensions = ["mp3", "flac", "wav", "m4a"];

    // Tạo thư mục ẩn
    let dora_meta_dir = Path::new(dir_path).join(".dora_metadata");
    let covers_dir = dora_meta_dir.join("covers");
    let _ = fs::create_dir_all(&covers_dir);
    let removed_covers_dir = Path::new(dir_path).join("removed_covers");

    #[cfg(windows)]
    {
        // Ẩn thư mục trên Windows
        let _ = Command::new("attrib")
            .arg("+h")
            .arg(&dora_meta_dir)
            .status();
    }

    let mut albums_map: HashMap<String, Option<String>> = HashMap::new();
    let mut artists_set: HashSet<String> = HashSet::new();
    let mut genres_set: HashSet<String> = HashSet::new();
    let re_feat = Regex::new(r"(?i)\s+(?:ft\.|feat\.|featuring)\s+").unwrap();

    for entry in WalkDir::new(dir_path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();

        // Bỏ qua nếu thuộc thư mục .dora_metadata hoặc removed_covers
        if path.starts_with(&dora_meta_dir) || path.starts_with(&removed_covers_dir) {
            continue;
        }

        if path.is_file() {
            if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                let ext_lower = ext.to_lowercase();

                if allowed_extensions.contains(&ext_lower.as_str()) {
                    match process_file(
                        path,
                        dir_path,
                        &mut albums_map,
                        &mut artists_set,
                        &mut genres_set,
                        &re_feat,
                    ) {
                        Ok(metadata) => files_result.push(metadata),
                        Err(e) => eprintln!("Failed to read metadata for {:?}: {}", path, e),
                    }
                }
            }
        }
    }

    // Format aggregation
    let mut artists: Vec<String> = artists_set.into_iter().collect();
    artists.sort_by_key(|a| a.to_lowercase());

    let mut genres: Vec<String> = genres_set.into_iter().collect();
    genres.sort_by_key(|g| g.to_lowercase());

    // Logic dọn rác ảnh bìa (Garbage Collection)
    let active_covers: HashSet<String> = albums_map
        .values()
        .filter_map(|opt| opt.as_ref())
        .filter_map(|path_str| {
            Path::new(path_str)
                .file_name()
                .map(|os_str| os_str.to_string_lossy().to_string())
        })
        .collect();

    if let Ok(entries) = fs::read_dir(&covers_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_file() {
                if let Some(file_name) = path
                    .file_name()
                    .map(|os_str| os_str.to_string_lossy().to_string())
                {
                    if !active_covers.contains(&file_name) {
                        let _ = fs::create_dir_all(&removed_covers_dir);
                        let dest_path = removed_covers_dir.join(&file_name);
                        let _ = fs::rename(&path, &dest_path);
                    }
                }
            }
        }
    }

    let mut albums = Vec::new();
    for (album_name, cover_path) in albums_map {
        albums.push(AlbumInfo {
            album_name,
            cover_path,
        });
    }
    albums.sort_by_key(|a| a.album_name.to_lowercase());

    let aggregated = AggregatedMetadata {
        artists,
        albums,
        genres,
    };

    // Save to JSON
    let json_path = dora_meta_dir.join("meta.json");
    if let Ok(json_str) = serde_json::to_string_pretty(&aggregated) {
        let _ = fs::write(json_path, json_str);
    }

    ScanResult {
        files: files_result,
        aggregated,
    }
}

pub fn update_metadata_logic(files: Vec<String>, metadata: &AudioMetadata) -> Result<(), String> {
    let errors: Vec<String> = files
        .par_iter()
        .filter_map(|file| {
            let path = Path::new(file);

            let mut tagged_file = match Probe::open(path).and_then(|p| p.read()) {
                Ok(tf) => tf,
                Err(e) => return Some(format!("{}: {}", file, e)),
            };

            // Xoá thẻ ID3v1 và APE vật lý khỏi đĩa để tránh Windows Explorer đọc nhầm rác cũ
            if let Ok(mut file) = std::fs::OpenOptions::new()
                .read(true)
                .write(true)
                .open(path)
            {
                let _ = lofty::tag::TagType::Id3v1.remove_from(&mut file);
                let _ = lofty::tag::TagType::Ape.remove_from(&mut file);
            }
            tagged_file.remove(lofty::tag::TagType::Id3v1);
            tagged_file.remove(lofty::tag::TagType::Ape);

            let tag_type = tagged_file.primary_tag_type();
            if !tagged_file.contains_tag_type(tag_type) {
                tagged_file.insert_tag(Tag::new(tag_type));
            }

            // Cập nhật trên TẤT CẢ các thẻ còn lại (chủ yếu là ID3v2, Vorbis...)
            let tag_types: Vec<_> = tagged_file.tags().iter().map(|t| t.tag_type()).collect();
            for t_type in tag_types {
                if let Some(tag) = tagged_file.tag_mut(t_type) {
                    if let Some(title) = &metadata.title {
                        if title.trim().is_empty() {
                            tag.remove_title();
                        } else {
                            tag.set_title(title.clone());
                        }
                    }
                    if let Some(artist) = &metadata.artist {
                        if artist.trim().is_empty() {
                            tag.remove_artist();
                            tag.remove_key(&lofty::tag::ItemKey::AlbumArtist);
                            tag.remove_key(&lofty::tag::ItemKey::OriginalArtist);
                            tag.remove_key(&lofty::tag::ItemKey::Composer);
                            tag.remove_key(&lofty::tag::ItemKey::Performer);
                        } else {
                            tag.set_artist(artist.clone());
                        }
                    }
                    if let Some(album) = &metadata.album {
                        if album.trim().is_empty() {
                            tag.remove_album();
                            tag.remove_key(&lofty::tag::ItemKey::OriginalAlbumTitle);
                        } else {
                            tag.set_album(album.clone());
                        }
                    }
                    if let Some(genre) = &metadata.genre {
                        if genre.trim().is_empty() {
                            tag.remove_genre();
                        } else {
                            tag.set_genre(genre.clone());
                        }
                    }
                    if let Some(year) = metadata.year {
                        if year == 0 {
                            tag.remove_year();
                        } else {
                            tag.set_year(year);
                        }
                    }
                }
            }

            if let Err(e) = tagged_file.save_to_path(path, lofty::config::WriteOptions::new()) {
                return Some(format!("Lỗi khi lưu {}: {}", file, e));
            }

            None
        })
        .collect();

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors.join("\n"))
    }
}

pub fn update_metadata_batch_logic(updates: Vec<AudioMetadata>) -> Result<(), String> {
    let errors: Vec<String> = updates
        .par_iter()
        .filter_map(|update| {
            let path = Path::new(&update.file_path);

            let mut tagged_file = match Probe::open(path).and_then(|p| p.read()) {
                Ok(tf) => tf,
                Err(e) => return Some(format!("{}: {}", update.file_path, e)),
            };

            // Xoá thẻ ID3v1 và APE vật lý khỏi đĩa để tránh Windows Explorer đọc nhầm rác cũ
            if let Ok(mut file) = std::fs::OpenOptions::new()
                .read(true)
                .write(true)
                .open(path)
            {
                let _ = lofty::tag::TagType::Id3v1.remove_from(&mut file);
                let _ = lofty::tag::TagType::Ape.remove_from(&mut file);
            }
            tagged_file.remove(lofty::tag::TagType::Id3v1);
            tagged_file.remove(lofty::tag::TagType::Ape);

            let tag_type = tagged_file.primary_tag_type();
            if !tagged_file.contains_tag_type(tag_type) {
                tagged_file.insert_tag(Tag::new(tag_type));
            }

            let tag_types: Vec<_> = tagged_file.tags().iter().map(|t| t.tag_type()).collect();
            for t_type in tag_types {
                if let Some(tag) = tagged_file.tag_mut(t_type) {
                    if let Some(title) = &update.title {
                        if title.trim().is_empty() {
                            tag.remove_title();
                        } else {
                            tag.set_title(title.clone());
                        }
                    }
                    if let Some(artist) = &update.artist {
                        if artist.trim().is_empty() {
                            tag.remove_artist();
                            tag.remove_key(&lofty::tag::ItemKey::AlbumArtist);
                            tag.remove_key(&lofty::tag::ItemKey::OriginalArtist);
                            tag.remove_key(&lofty::tag::ItemKey::Composer);
                            tag.remove_key(&lofty::tag::ItemKey::Performer);
                        } else {
                            tag.set_artist(artist.clone());
                        }
                    }
                    if let Some(album) = &update.album {
                        if album.trim().is_empty() {
                            tag.remove_album();
                            tag.remove_key(&lofty::tag::ItemKey::OriginalAlbumTitle);
                        } else {
                            tag.set_album(album.clone());
                        }
                    }
                    if let Some(genre) = &update.genre {
                        if genre.trim().is_empty() {
                            tag.remove_genre();
                        } else {
                            tag.set_genre(genre.clone());
                        }
                    }
                    if let Some(year) = update.year {
                        if year == 0 {
                            tag.remove_year();
                        } else {
                            tag.set_year(year);
                        }
                    }
                }
            }

            if let Err(e) = tagged_file.save_to_path(path, lofty::config::WriteOptions::new()) {
                return Some(format!("Lỗi khi lưu {}: {}", update.file_path, e));
            }

            None
        })
        .collect();

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors.join("\n"))
    }
}

pub fn get_cover_art_logic(file_path: &str) -> Result<Option<String>, String> {
    let path = Path::new(file_path);
    let tagged_file = match Probe::open(path).and_then(|p| p.read()) {
        Ok(tf) => tf,
        Err(e) => return Err(e.to_string()),
    };

    let tag = tagged_file
        .primary_tag()
        .or_else(|| tagged_file.first_tag());

    if let Some(t) = tag {
        for pic in t.pictures() {
            if pic.pic_type() == PictureType::CoverFront || pic.pic_type() == PictureType::Other {
                let data = pic.data();
                let mime = pic.mime_type().unwrap_or(&MimeType::Png);
                let mime_str = mime.as_str();
                let b64 = general_purpose::STANDARD.encode(data);
                return Ok(Some(format!("data:{};base64,{}", mime_str, b64)));
            }
        }
    }

    Ok(None)
}

pub fn process_and_embed_artwork_logic(files: Vec<String>, image_path: &str) -> Result<(), String> {
    let picture = if !image_path.is_empty() {
        let img = image::open(image_path).map_err(|e| format!("Không thể mở ảnh: {}", e))?;

        let (width, height) = img.dimensions();
        let size = width.min(height);
        let x = (width - size) / 2;
        let y = (height - size) / 2;

        let cropped = img.crop_imm(x, y, size, size);
        let resized = cropped.resize_exact(500, 500, image::imageops::FilterType::Lanczos3);

        let mut png_data = Cursor::new(Vec::new());
        resized
            .write_to(&mut png_data, image::ImageFormat::Png)
            .map_err(|e| e.to_string())?;
        let png_bytes = png_data.into_inner();

        Some(Picture::new_unchecked(
            PictureType::CoverFront,
            Some(MimeType::Png),
            None,
            png_bytes,
        ))
    } else {
        None
    };

    let errors: Vec<String> = files
        .par_iter()
        .filter_map(|file| {
            let path = Path::new(file);
            let mut tagged_file = match Probe::open(path).and_then(|p| p.read()) {
                Ok(tf) => tf,
                Err(e) => return Some(format!("{}: {}", file, e)),
            };

            let tag_type = tagged_file.primary_tag_type();
            if !tagged_file.contains_tag_type(tag_type) {
                tagged_file.insert_tag(Tag::new(tag_type));
            }

            // Cập nhật ảnh bìa cho tất cả các thẻ có trong file
            let tag_types: Vec<_> = tagged_file.tags().iter().map(|t| t.tag_type()).collect();
            for t_type in tag_types {
                if let Some(tag) = tagged_file.tag_mut(t_type) {
                    tag.remove_picture_type(PictureType::CoverFront);
                    if let Some(pic) = &picture {
                        tag.push_picture(pic.clone());
                    }
                }
            }

            if let Err(e) = tagged_file.save_to_path(path, lofty::config::WriteOptions::new()) {
                return Some(format!("Lỗi khi lưu ảnh {}: {}", file, e));
            }

            None
        })
        .collect();

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors.join("\n"))
    }
}

pub fn convert_image_to_png_logic(image_path: &str) -> Result<String, String> {
    let img = if image_path.starts_with("data:image/") {
        let parts: Vec<&str> = image_path.split(',').collect();
        if parts.len() != 2 {
            return Err("Dữ liệu Base64 không hợp lệ".to_string());
        }
        let image_bytes = base64::engine::general_purpose::STANDARD
            .decode(parts[1])
            .map_err(|e| format!("Lỗi giải mã Base64: {}", e))?;
        image::load_from_memory(&image_bytes)
            .map_err(|e| format!("Không thể đọc ảnh từ Base64: {}", e))?
    } else {
        image::open(image_path).map_err(|e| format!("Không thể mở ảnh: {}", e))?
    };

    let mut temp_path = std::env::temp_dir();
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis();
    let file_name = format!("dora_converted_{}.png", timestamp);
    temp_path.push(file_name);

    img.save_with_format(&temp_path, image::ImageFormat::Png)
        .map_err(|e| format!("Lỗi lưu ảnh PNG: {}", e))?;

    // Trả về dạng chuẩn cho tauri asset:// protocol trên web: thêm file:// prefix
    // Tuy nhiên Tauri v2 thường nhận đường dẫn tuyệt đối thẳng, nên ta cứ trả về string
    Ok(temp_path.to_string_lossy().to_string())
}

/// Quét một danh sách các file cụ thể (Dùng cho File System Watcher)
pub fn scan_specific_files_logic(dir_path: &str, file_paths: Vec<String>) -> ScanResult {
    let mut files_result = Vec::new();
    let allowed_extensions = ["mp3", "flac", "wav", "m4a"];

    let dora_meta_dir = Path::new(dir_path).join(".dora_metadata");
    let covers_dir = dora_meta_dir.join("covers");
    let _ = fs::create_dir_all(&covers_dir);

    let mut albums_map: HashMap<String, Option<String>> = HashMap::new();
    let mut artists_set: HashSet<String> = HashSet::new();
    let mut genres_set: HashSet<String> = HashSet::new();
    let re_feat = Regex::new(r"(?i)\s+(?:ft\.|feat\.|featuring)\s+").unwrap();

    for path_str in file_paths {
        let path = Path::new(&path_str);
        if path.is_file() {
            if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
                let ext_lower = ext.to_lowercase();
                if allowed_extensions.contains(&ext_lower.as_str()) {
                    match process_file(
                        path,
                        dir_path,
                        &mut albums_map,
                        &mut artists_set,
                        &mut genres_set,
                        &re_feat,
                    ) {
                        Ok(metadata) => files_result.push(metadata),
                        Err(e) => eprintln!("Failed to read metadata for {:?}: {}", path, e),
                    }
                }
            }
        }
    }

    let mut artists: Vec<String> = artists_set.into_iter().collect();
    artists.sort_by_key(|a| a.to_lowercase());

    let mut genres: Vec<String> = genres_set.into_iter().collect();
    genres.sort_by_key(|g| g.to_lowercase());

    let mut albums = Vec::new();
    for (album_name, cover_path) in albums_map {
        albums.push(AlbumInfo {
            album_name,
            cover_path,
        });
    }
    albums.sort_by_key(|a| a.album_name.to_lowercase());

    let aggregated = AggregatedMetadata {
        artists,
        albums,
        genres,
    };

    ScanResult {
        files: files_result,
        aggregated,
    }
}
