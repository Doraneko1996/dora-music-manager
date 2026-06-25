import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

export interface DownloadItem {
  id: string;
  url: string;
  title: string;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'error';
  statusText: string;
}

interface DownloaderState {
  downloads: DownloadItem[];
  isEngineUpdating: boolean;
  engineStatus: 'checking' | 'outdated' | 'up-to-date';
  // Cloudflare settings
  cfClearance: string;
  userAgent: string;
  isCloudflareBlocked: boolean;

  // Actions
  setIsEngineUpdating: (isUpdating: boolean) => void;
  setEngineStatus: (status: 'checking' | 'outdated' | 'up-to-date') => void;
  setCloudflareConfig: (cfClearance: string, userAgent: string) => void;
  setIsCloudflareBlocked: (isBlocked: boolean) => void;
  addDownload: (url: string) => void;
  updateDownloadStatus: (url: string, text: string) => void;
  updateDownloadProgress: (url: string, text: string) => void;
  markDownloadFinished: (url: string, code: number) => void;
  removeDownload: (id: string) => void;
  clearCompleted: () => void;
}

export const useDownloaderStore = create<DownloaderState>()(
  persist(
    (set) => ({
      downloads: [],
      isEngineUpdating: false,
      engineStatus: 'checking',
      cfClearance: '',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      isCloudflareBlocked: false,

      setIsEngineUpdating: (isUpdating) => set({ isEngineUpdating: isUpdating }),
      setEngineStatus: (status) => set({ engineStatus: status }),
      setCloudflareConfig: (cfClearance, userAgent) => set({ cfClearance, userAgent, isCloudflareBlocked: false }),
      setIsCloudflareBlocked: (isBlocked) => set({ isCloudflareBlocked: isBlocked }),

  addDownload: (url) => set((state) => {
    // Nếu url đã tồn tại và đang tải, bỏ qua
    const existing = state.downloads.find(d => d.url === url);
    if (existing && (existing.status === 'downloading' || existing.status === 'pending')) {
      return state;
    }
    
    const newItem: DownloadItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      url,
      title: url, // Ban đầu lấy url làm title, sau này parse log để lấy tên bài thật
      progress: 0,
      status: 'pending',
      statusText: 'Đang chờ xử lý...'
    };
    
    // Nếu url đã từng tải xong/lỗi, ghi đè lại
    const filtered = state.downloads.filter(d => d.url !== url);
    return { downloads: [newItem, ...filtered] };
  }),

  updateDownloadStatus: (url, text) => set((state) => {
    // Bỏ qua event từ tiến trình "zombie" nếu user đã xóa khỏi hàng đợi
    const exists = state.downloads.some(d => d.url === url);
    if (!exists) return state;

    // Nếu có thông báo bị chặn bởi Cloudflare, tự động kích hoạt LockOverlay
    const lowerText = text.toLowerCase();
    const isBlocked = lowerText.includes('cf_clearance') || 
                      lowerText.includes('captcha') || 
                      lowerText.includes('--user-agent argument to the value');
    
    return {
      isCloudflareBlocked: isBlocked ? true : state.isCloudflareBlocked,
      downloads: state.downloads.map(item => 
        item.url === url 
          ? { ...item, statusText: text, status: 'downloading' } 
          : item
      )
    };
  }),

  updateDownloadProgress: (url, text) => set((state) => {
    const exists = state.downloads.some(d => d.url === url);
    if (!exists) return state;

    return {
      downloads: state.downloads.map(item => {
        if (item.url !== url) return item;
        
        let newProgress = item.progress;
        let newTitle = item.title;
        let newStatusText = text;

        // Trích xuất % nếu có (ví dụ: "45.2%")
        const progressMatch = text.match(/(\d+(\.\d+)?)%/);
        if (progressMatch) {
          newProgress = parseFloat(progressMatch[1]);
        }
        
        // Trích xuất tên bài (ví dụ: "Downloading: Tên bài hát")
        // Tùy thuộc vào output của lucida, có thể điều chỉnh regex sau
        const titleMatch = text.match(/Downloading:\s+(.+)/i);
        if (titleMatch) {
          newTitle = titleMatch[1].trim();
        }

        return {
          ...item,
          progress: newProgress,
          statusText: newStatusText,
          title: newTitle,
          status: 'downloading'
        };
      })
    };
  }),

  markDownloadFinished: (url, code) => set((state) => {
    const exists = state.downloads.some(d => d.url === url);
    if (!exists) return state;

    return {
      downloads: state.downloads.map(item => 
        item.url === url 
          ? { 
              ...item, 
              status: code === 0 ? 'completed' : 'error',
              progress: code === 0 ? 100 : item.progress,
              statusText: code === 0 
                ? 'Hoàn tất' 
                : (item.statusText.startsWith('Lỗi:') || item.statusText.startsWith('Không thể') 
                    ? `${item.statusText} (Code: ${code})` 
                    : `Lỗi (Code: ${code})`)
            } 
          : item
      )
    };
  }),
  
  removeDownload: (id) => set((state) => {
    const item = state.downloads.find(d => d.id === id);
    if (item && (item.status === 'downloading' || item.status === 'pending')) {
      // Gọi backend để kill process nếu đang tải
      invoke('cancel_download', { url: item.url }).catch(console.error);
    }
    return {
      downloads: state.downloads.filter(d => d.id !== id)
    };
  }),
  
  clearCompleted: () => set((state) => ({
    downloads: state.downloads.filter(item => item.status !== 'completed')
  }))
}),
{
  name: 'downloader-storage',
  partialize: (state) => ({ cfClearance: state.cfClearance, userAgent: state.userAgent }),
}
));
