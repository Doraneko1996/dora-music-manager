<div align="center">
  <h1>🎵 Dora Music Manager</h1>
  
  <p>A high-performance, cinematic desktop application for audio metadata management.</p>

  <!-- Badges -->
  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Tauri-FFC131?style=for-the-badge&logo=tauri&logoColor=white" alt="Tauri" />
    <img src="https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white" alt="Rust" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License" />
  </p>
</div>

---

## 📑 Table of Contents

- [🎵 Tổng Quan Dự Án (Project Overview)](#-tổng-quan-dự-án-project-overview)
- [🚀 Tính Năng (Features)](#-tính-năng-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [🏗️ Kiến Trúc & Luồng Dữ Liệu (Architecture & Data Flow)](#️-kiến-trúc--luồng-dữ-liệu-architecture--data-flow)
- [📂 Cấu Trúc Dự Án (Project Structure)](#-cấu-trúc-dự-án-project-structure)
- [💻 Local Development Setup](#-local-development-setup)

---

## 🎵 Tổng Quan Dự Án (Project Overview)

**Dora Music Manager** là một ứng dụng desktop đa nền tảng, hiện đại, được thiết kế để cung cấp cho người dùng toàn quyền kiểm soát thư viện âm thanh cục bộ. Được xây dựng với framework thế hệ mới **Tauri 2.0**, ứng dụng kết hợp sức mạnh xử lý siêu tốc của backend Rust với giao diện frontend cực kỳ mượt mà bằng React.

Ứng dụng sở hữu **giao diện dark mode mang phong cách điện ảnh (cinematic)**, **danh sách ảo hóa hiệu năng cao (virtualized grid)** vô cùng mượt mà để xử lý các thư viện nhạc khổng lồ, và phương pháp **chỉnh sửa siêu dữ liệu an toàn hàng đầu** đảm bảo các file âm thanh quý giá của bạn không bao giờ bị hỏng.

---

## 🚀 Tính Năng (Features)

### 🎧 Quản lý Thư viện (Library Management)
Duyệt qua thư viện nhạc một cách mượt mà bằng **Giao diện Tab (Tabbed Interface)** trực quan. Dễ dàng chuyển đổi giữa các chế độ xem **Tracks, Artists, Albums, và Genres** để tìm chính xác những gì bạn cần, bất kể bộ sưu tập của bạn lớn đến mức nào.

### ✍️ Chỉnh sửa Hàng loạt (Bulk Editing)
Chỉnh sửa các thư viện nhạc lớn trở nên dễ dàng với các công cụ chỉnh sửa hàng loạt thông minh:
- **Từ Tên file sang Tiêu đề (Filename to Title):** Tự động phân tích và điền tiêu đề bài hát trực tiếp từ tên file.
- **Logic Đa chọn (Multi-Select & Keep):** Chọn nhiều bài hát và chỉnh sửa các trường cụ thể trong khi vẫn giữ nguyên (Keep) dữ liệu cũ ở những nơi cần thiết mà không bị ghi đè.

### 🎬 Giao diện Điện ảnh (Cinematic UI)
Giao diện được thiết kế vừa đẹp mắt vừa đề cao tính năng. Tận hưởng trải nghiệm **dark mode** sống động và phản hồi cực nhanh. Việc thêm hoặc cập nhật ảnh bìa album (cover art) vô cùng đơn giản chỉ bằng thao tác **kéo-thả (drag-and-drop)**.

### 🛡️ An toàn Dữ liệu (Data Safety)
Chúng tôi đặt tính toàn vẹn của các file nhạc của bạn lên hàng đầu.
- **Chế độ Chỉ Đọc (Read-Only Mode):** Duyệt và kiểm tra thư viện mà không sợ vô tình làm thay đổi dữ liệu.
- **Các Bước Bảo vệ:** Ứng dụng thực thi việc xác thực nghiêm ngặt và hiển thị các cảnh báo bảo vệ trước khi xóa hoặc ghi đè các siêu dữ liệu quan trọng.

### ⚡ Bộ Nhớ Cache Di động (Portable Cache)
Dora Music Manager ghi nhớ siêu dữ liệu thư viện của bạn ngay lập tức. Bằng cách tạo một file ẩn `.dora_meta.json` trực tiếp bên trong thư mục nhạc, thư viện của bạn sẽ tải ngay lập tức ở các lần mở sau. Nó hoàn toàn mang tính di động nếu bạn di chuyển thư mục nhạc của mình sang ổ cứng khác, mọi cấu hình vẫn được giữ nguyên.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19 | UI Library |
| | Vite | Build Tool |
| | Zustand | Global State Management |
| | shadcn/ui | Component Library (Radix UI) |
| | Tailwind CSS | Styling & Theming |
| **Backend** | Rust | Core Logic & File IO |
| | Tauri 2.0 | Desktop Application Framework |
| | Lofty | Audio Metadata Parsing & Editing |
| | Image | Cover Art Processing |

---

## 🏗️ Kiến Trúc & Luồng Dữ Liệu (Architecture & Data Flow)

Dora Music Manager áp dụng kiến trúc decoupled (tách biệt) hiện đại, đảm bảo tính an toàn và hiệu năng tối đa:

> **React (Frontend) ↔ Tauri IPC (Inter-Process Communication) ↔ Rust (Backend)**

1. **Quản lý Trạng thái (State Management):** **Zustand** đóng vai trò là nguồn dữ liệu tin cậy duy nhất (single source of truth) trên frontend, quản lý các file được chọn trên toàn cục, các tab đang hoạt động và danh sách thư viện được tổng hợp (nghệ sĩ, album, v.v.).
2. **Giao tiếp (Communication):** Khi người dùng thực hiện một hành động (ví dụ: cập nhật tiêu đề bài hát qua `TrackEditForm`), React sẽ gửi một sự kiện bất đồng bộ thông qua các **Tauri IPC Commands**.
3. **Thực thi (Execution):** Backend Rust nhận lệnh, tiến hành đọc/ghi file âm thanh vật lý một cách an toàn bằng thư viện `lofty`, chỉnh sửa siêu dữ liệu và trả về kết quả thành công/thất bại cho giao diện React để cập nhật trạng thái UI.

---

## 📂 Cấu Trúc Dự Án (Project Structure)

<details>
<summary><b>Nhấp để mở rộng Sơ đồ Cây Thư mục (ASCII Folder Tree)</b></summary>

```text
dora-music-manager/
├── src/                      # React Frontend Source
│   ├── assets/               # Static assets (images, icons)
│   ├── components/           # React Components (UI, forms, tables)
│   │   ├── forms/            # Track/Album editing forms
│   │   └── ...               
│   ├── lib/                  # Utility functions and helpers
│   ├── store/                # Zustand global state definitions
│   ├── App.tsx               # Main React Application entry
│   └── main.tsx              # React DOM rendering
├── src-tauri/                # Rust/Tauri Backend Source
│   ├── src/                  
│   │   ├── audio_meta.rs     # Lofty integration and metadata logic
│   │   ├── lib.rs            # Tauri application setup & IPC commands mapping
│   │   └── main.rs           # Entry point for the Rust binary
│   ├── Cargo.toml            # Rust dependencies (tauri, lofty, image, etc.)
│   └── tauri.conf.json       # Tauri configuration and window settings
├── package.json              # Node.js dependencies and scripts
├── tailwind.config.js        # Tailwind CSS configuration
└── vite.config.ts            # Vite bundler configuration
```
</details>

**Các Thư mục Chính (Key Directories):**
- `src/components`: Chứa các thành phần UI phức tạp, độc lập như `TrackEditForm`, `LibraryView`, và `CoverArtUploader`.
- `src/store`: Chứa các module của Zustand giúp giữ cho giao diện UI đồng bộ hoàn hảo với các thao tác lựa chọn/chỉnh sửa hàng loạt của người dùng.
- `src-tauri/src`: Backend Rust mạnh mẽ, nơi xử lý các tác vụ nặng (đọc ghi File, thao tác siêu dữ liệu meta) một cách an toàn và xử lý đồng thời (concurrently).

---

## 💻 Local Development Setup

Follow these steps to get a local development environment running.

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://www.rust-lang.org/tools/install)
- OS-specific build dependencies for Tauri (see [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/))

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/dora-music-manager.git
   cd dora-music-manager
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run tauri dev
   ```
   *This command will start the Vite frontend dev server, compile the Rust backend, and launch the desktop application.*
