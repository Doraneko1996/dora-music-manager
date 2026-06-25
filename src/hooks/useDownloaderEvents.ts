import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useDownloaderStore } from '../store/useDownloaderStore';
import { useAppStore } from '../store/useAppStore';

interface ProgressPayload {
  url: string;
  text: string;
}

export function useDownloaderEvents() {
  const { updateDownloadProgress, updateDownloadStatus, markDownloadFinished, downloads, setEngineStatus } = useDownloaderStore();
  const setIsBusy = useAppStore(state => state.setIsBusy);

  // Kiểm tra trạng thái Engine khi khởi động
  useEffect(() => {
    const checkEngine = async () => {
      try {
        setEngineStatus('checking');
        
        // Lấy local version
        const localVersion = await invoke<string | null>('get_local_engine_version');
        
        // Nếu chưa cài
        if (!localVersion || localVersion === 'unknown') {
          setEngineStatus('outdated');
          return;
        }

        // Kiểm tra update từ Github
        const release = await invoke<any>('check_engine_update');
        if (release && release.tag_name) {
          if (localVersion !== release.tag_name) {
            setEngineStatus('outdated');
          } else {
            setEngineStatus('up-to-date');
          }
        } else {
          // Lỗi lấy release -> vẫn cho là up-to-date tạm thời
          setEngineStatus('up-to-date');
        }
      } catch (error) {
        console.error("Lỗi kiểm tra engine:", error);
        setEngineStatus('up-to-date');
      }
    };
    
    checkEngine();
  }, [setEngineStatus]);

  // Cập nhật isBusy dựa trên số lượng download đang chạy
  useEffect(() => {
    const isDownloading = downloads.some(d => d.status === 'downloading' || d.status === 'pending');
    setIsBusy(isDownloading);
  }, [downloads, setIsBusy]);

  useEffect(() => {
    const unlistenProgress = listen<ProgressPayload>('download-progress', (event) => {
      updateDownloadProgress(event.payload.url, event.payload.text);
    });

    const unlistenStatus = listen<ProgressPayload>('download-status', (event) => {
      updateDownloadStatus(event.payload.url, event.payload.text);
    });

    const unlistenError = listen<ProgressPayload>('download-error', (event) => {
      updateDownloadStatus(event.payload.url, event.payload.text);
    });

    const unlistenFinished = listen<ProgressPayload>('download-finished', (event) => {
      const code = parseInt(event.payload.text) || 0;
      markDownloadFinished(event.payload.url, code);
    });

    return () => {
      unlistenProgress.then(f => f());
      unlistenStatus.then(f => f());
      unlistenError.then(f => f());
      unlistenFinished.then(f => f());
    };
  }, [updateDownloadProgress, updateDownloadStatus, markDownloadFinished]);
}
