import React, { useEffect, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { FolderOpen, Loader2, ChevronDown, Pin, X, Download, ListMusic } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "../../components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useAudioStore, ScanResult } from '../../store/useAudioStore';
import { toast } from 'sonner';
import { LibraryView } from '../../components/LibraryView';
import { EditForm } from '../../components/EditForm';
import { Toaster as CustomToaster } from '../../components/ui/sonner';
import { FolderStatsPopup } from '../../components/FolderStatsPopup';
import { useFileSystemWatcher } from '../../hooks/useFileSystemWatcher';
import { LockOverlay } from '../../components/ui/lock-overlay';
import { GlobalTooltip } from '../../components/GlobalTooltip';
import { useAppStore } from '../../store/useAppStore';

export const ManagerLayout: React.FC = () => {
  const {
    musicFiles,
    directoryPath, setDirectoryPath,
    setScanResult, isScanning, setIsScanning, isSyncing, resetStore,
    folderHistory, pinnedFolder, addFolderToHistory, togglePinFolder, removeFolderFromHistory
  } = useAudioStore();

  const { mode, isBusy, setMode } = useAppStore();

  const hasInitialized = useRef(false);

  const loadDirectory = async (path: string, isAutoOpen: boolean = false) => {
    try {
      setDirectoryPath(path);
      setIsScanning(true);
      const startTime = Date.now();
      
      const result: ScanResult = await invoke('scan_directory', { path });
      setScanResult(result);
      if (result.files.length === 0) {
        toast.info("Không tìm thấy file nhạc nào trong thư mục này.");
      }
      addFolderToHistory(path);

      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - elapsedTime));
      }

      if (isAutoOpen) {
        toast.success(`Đã tự động mở thư mục ghim.`);
      } else {
        toast.success(`Đã tải thành công ${result.files.length} files nhạc.`);
      }
    } catch (error) {
      console.error("Lỗi khi mở thư mục:", error);
      toast.error(isAutoOpen ? "Không thể tự động mở thư mục ghim." : "Lỗi hệ thống khi đọc thư mục.");
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (pinnedFolder && !directoryPath) {
      loadDirectory(pinnedFolder, true);
    }
  }, [pinnedFolder, directoryPath]);

  useFileSystemWatcher(directoryPath);

  const handleOpenFolder = async () => {
    try {
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: "Chọn thư mục chứa nhạc",
      });

      if (selectedPath && typeof selectedPath === 'string') {
        await loadDirectory(selectedPath);
      }
    } catch (error) {
      console.error("Lỗi khi mở thư mục:", error);
    }
  };

  const handleCloseFolder = () => {
    resetStore();
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-white/10 flex items-center px-4 justify-between bg-zinc-950/95 shrink-0 sticky top-0 z-50">
        {/* Left: App Title / Switcher */}
        <div className="flex items-center gap-2 flex-1">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="relative group gap-2.5 px-3 h-10 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/50 rounded-xl transition-all duration-300 ease-out shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] overflow-hidden" 
                    disabled={isBusy}
                  >
                    <div className="absolute inset-0 bg-linear-to-r from-indigo-500/0 via-indigo-500/10 to-violet-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-7 h-7 rounded-lg bg-linear-to-br from-indigo-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.5)] shrink-0 relative z-10 group-hover:scale-105 transition-transform duration-300">
                      {isBusy ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white drop-shadow-md"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 relative z-10">
                      <h1 className="font-bold text-[15px] tracking-wide bg-clip-text text-transparent bg-linear-to-r from-white to-zinc-300 group-hover:to-white transition-all duration-300 drop-shadow-sm">Dora Music Manager</h1>
                      <ChevronDown size={14} className="text-zinc-500 group-hover:text-indigo-400 transition-colors duration-300" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              {isBusy && (
                <TooltipContent side="bottom" className="bg-zinc-900 border-white/10">
                  Đang xử lý, không thể chuyển chế độ lúc này
                </TooltipContent>
              )}
            </Tooltip>
            
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Chuyển đổi chế độ</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setMode('manager')} className="flex items-center justify-between cursor-pointer">
                <span className="flex items-center gap-2"><ListMusic size={14}/> Quản lý thư viện</span>
                {mode === 'manager' && <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode('downloader')} className="flex items-center justify-between cursor-pointer focus:from-rose-500/0 focus:to-rose-500/15">
                <span className="flex items-center gap-2"><Download size={14}/> Tải nhạc mới</span>
                {mode === 'downloader' && <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center: Folder Path */}
        <div className="hidden md:flex justify-center flex-1 relative z-60">
          {directoryPath && (
            <FolderStatsPopup
              directoryPath={directoryPath}
              musicFiles={musicFiles}
              handleCloseFolder={handleCloseFolder}
            />
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end gap-3 flex-1">
          <div className="flex items-center btn-gradient-brand rounded-md p-0">
            <Button
              onClick={handleOpenFolder}
              size="sm"
              className="gap-2 bg-transparent hover:bg-white/10 text-white rounded-r-none border-r border-white/20 shadow-none"
              disabled={isScanning || isBusy}
            >
              <FolderOpen size={16} />
              Mở Thư Mục
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="bg-transparent hover:bg-white/10 text-white rounded-l-none px-2 shadow-none focus-visible:ring-0" disabled={isScanning || isBusy}>
                  <ChevronDown size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Lịch sử thư mục</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {folderHistory.length === 0 ? (
                  <div className="p-3 text-center text-xs text-zinc-500">Chưa có lịch sử</div>
                ) : (
                  folderHistory.map((path) => {
                    const isPinned = pinnedFolder?.replace(/\\/g, '/') === path.replace(/\\/g, '/');
                    const basename = path.split(/[/\\]/).filter(Boolean).pop() || path;

                    return (
                      <div key={path} className="flex items-center group relative w-full rounded-lg hover:bg-white/5 hover:bg-linear-to-r hover:from-indigo-500/0 hover:to-indigo-500/15 hover:text-white transition-all p-1">
                        <DropdownMenuItem
                          className="flex-1 cursor-pointer truncate px-2 py-1.5 focus:bg-transparent focus:bg-none focus:from-transparent focus:to-transparent"
                          onClick={() => loadDirectory(path)}
                        >
                          <div className="flex flex-col overflow-hidden w-full">
                            <span className="text-[13px] font-medium truncate text-zinc-200">{basename}</span>
                            <span className="text-[10px] text-zinc-500 truncate mt-0.5">{path}</span>
                          </div>
                        </DropdownMenuItem>
                        <div className="flex items-center pr-1 gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity shrink-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className={`h-7 w-7 rounded-md bg-transparent hover:bg-white/10 ${isPinned ? 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] opacity-100' : 'text-zinc-400 hover:text-zinc-200'}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePinFolder(path);
                                }}
                              >
                                <Pin size={14} className={isPinned ? "fill-current" : ""} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="bg-zinc-900 border-white/10 text-xs">
                              {isPinned ? "Bỏ ghim (Không tự động mở nữa)" : "Ghim (Tự động mở khi khởi động ứng dụng)"}
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-md bg-transparent hover:bg-white/10 text-zinc-400 hover:text-rose-400"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFolderFromHistory(path);
                                }}
                              >
                                <X size={14} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="bg-zinc-900 border-white/10 text-xs">
                              Xóa khỏi lịch sử
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content (Split Pane) */}
      <div className="flex-1 overflow-hidden relative">
        <PanelGroup direction="horizontal">
          {/* Left Panel: Library View */}
          <Panel minSize={30} defaultSize={75} className="bg-zinc-950 flex flex-col border-r border-white/5 relative z-0">
            <LibraryView />
          </Panel>

          <PanelResizeHandle className="w-0.5 bg-white/5 hover:bg-indigo-500/50 transition-colors cursor-col-resize active:bg-indigo-500" />

          {/* Right Panel: Edit Form & Album Art */}
          <Panel defaultSize={25} minSize={20} maxSize={50} className="bg-black/40 backdrop-blur-xl flex flex-col border-l border-white/5 shadow-2xl shadow-black/50 relative z-10">
            <div className="w-full h-full flex flex-col relative overflow-hidden">
              <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-widest py-3 px-4 border-b border-white/5 bg-black/40 backdrop-blur-md shrink-0 z-50">Thông Tin Chi Tiết</h2>
              <div className="flex-1 flex flex-col p-4 relative z-0 min-h-0">
                <EditForm />
              </div>
            </div>
          </Panel>
        </PanelGroup>

        {/* Scanning Overlay over Main Content */}
        <LockOverlay
          isLocked={isScanning}
          title="Đang quét thư mục..."
          description="Đang tải dữ liệu bài hát, vui lòng đợi."
          icon={<Loader2 className="w-12 h-12 animate-spin" />}
          className="absolute inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
        />
      </div>
      <CustomToaster />

      {/* Sync Lock Overlay */}
      <LockOverlay
        isLocked={isSyncing}
        title="Đang đồng bộ..."
        description="Đang xử lý thay đổi từ File System, vui lòng đợi."
        icon={<Loader2 className="w-12 h-12 animate-spin" />}
        className="fixed inset-0 z-9999 bg-black/40 backdrop-blur-[2px]"
      />
      <GlobalTooltip />
    </div>
  );
};
