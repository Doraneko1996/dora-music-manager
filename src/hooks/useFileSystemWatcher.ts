import { useEffect, useRef } from 'react';
import { watchImmediate, exists } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { useAudioStore, ScanResult } from '../store/useAudioStore';

const ALLOWED_EXTENSIONS = ['.mp3', '.flac', '.wav', '.m4a'];

export function useFileSystemWatcher(directoryPath: string) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingPathsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!directoryPath) return;

    let isCancelled = false;
    let unwatchFn: (() => void) | null = null;

    const processQueue = async () => {
      const paths = Array.from(pendingPathsRef.current);
      pendingPathsRef.current.clear();
      
      if (paths.length === 0) {
        useAudioStore.getState().setIsSyncing(false);
        return;
      }

      const pathsToRemove: string[] = [];
      const pathsToScan: string[] = [];

      for (const path of paths) {
        // Lọc các file không phải audio (tránh bắt nhầm thư mục hoặc rác)
        const lowerPath = path.toLowerCase();
        if (!ALLOWED_EXTENSIONS.some(ext => lowerPath.endsWith(ext))) {
          continue;
        }

        try {
          const fileExists = await exists(path);
          if (fileExists) {
            pathsToScan.push(path);
          } else {
            pathsToRemove.push(path);
          }
        } catch (e) {
          // Bỏ qua lỗi check tồn tại
        }
      }

      let scanResultFiles: any[] = [];
      let scanResultAggregated: any = null;

      if (pathsToScan.length > 0) {
        try {
          const result: ScanResult = await invoke('scan_specific_files', { 
            dirPath: directoryPath, 
            filePaths: pathsToScan 
          });
          
          scanResultFiles = result.files;
          scanResultAggregated = result.aggregated;
        } catch (error) {
          console.error("Lỗi khi quét file bị thay đổi:", error);
        }
      }

      if (pathsToRemove.length > 0 || scanResultFiles.length > 0) {
        useAudioStore.getState().syncFileSystemChanges(pathsToRemove, scanResultFiles, scanResultAggregated);
      }
      
      // Mở khóa UI sau khi hoàn tất
      useAudioStore.getState().setIsSyncing(false);
    };

    const setupWatcher = async () => {
      try {
        const fn = await watchImmediate(
          directoryPath,
          (event) => {
            // Bỏ qua sự kiện nếu ứng dụng đang quét toàn bộ thư mục (Tránh 2 loading cùng lúc)
            if (useAudioStore.getState().isScanning) return;

            // Lập tức khóa UI ngay khi có sự kiện (trước khi chờ debounce)
            useAudioStore.getState().setIsSyncing(true);
            
            console.log("File System Event:", event);
            // Gom nhóm tất cả đường dẫn bị ảnh hưởng (Thêm, Sửa, Xóa)
            event.paths.forEach(p => pendingPathsRef.current.add(p));

            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
            }
            
            // Đợi 1000ms sau khi sự kiện cuối cùng dừng lại mới bắt đầu xử lý (Debounce)
            timeoutRef.current = setTimeout(() => {
              processQueue();
            }, 1000);
          },
          { recursive: true }
        );
        
        if (isCancelled) {
          fn();
        } else {
          unwatchFn = fn;
        }
      } catch (error) {
        console.error("Lỗi khi khởi tạo File System Watcher:", error);
      }
    };

    setupWatcher();

    return () => {
      isCancelled = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (unwatchFn) {
        unwatchFn();
      }
    };
  }, [directoryPath]);
}
