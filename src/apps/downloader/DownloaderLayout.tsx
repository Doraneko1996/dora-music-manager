import React, { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Loader2, ChevronDown, Download, ListMusic, FolderOpen, RefreshCw, Link, Music, Pin, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "../../components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { useAppStore } from '../../store/useAppStore';
import { useAudioStore } from '../../store/useAudioStore';
import { FolderStatsPopup } from '../../components/FolderStatsPopup';
import { LockOverlay } from '../../components/ui/lock-overlay';
import { open } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';

// Mock data for Phase 2
const MOCK_QUEUE = [
  { id: 1, title: 'Shape of You - Ed Sheeran', progress: 45, status: 'downloading' },
  { id: 2, title: 'Blinding Lights - The Weeknd', progress: 100, status: 'completed' },
  { id: 3, title: 'Stay - The Kid LAROI, Justin Bieber', progress: 0, status: 'pending' },
];

export const DownloaderLayout: React.FC = () => {
  const { mode, isBusy, setMode } = useAppStore();
  const { directoryPath, setDirectoryPath, folderHistory, pinnedFolder, togglePinFolder, removeFolderFromHistory, musicFiles, setMusicFiles } = useAudioStore();
  const [url, setUrl] = useState('');

  const handleCloseFolder = () => {
    setDirectoryPath('');
    setMusicFiles([]);
  };

  const handleOpenFolder = async () => {
    try {
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: "Chọn thư mục lưu nhạc tải về",
      });

      if (selectedPath && typeof selectedPath === 'string') {
        setDirectoryPath(selectedPath);
        toast.success(`Đã chọn thư mục lưu: ${selectedPath}`);
      }
    } catch (error) {
      console.error("Lỗi khi mở thư mục:", error);
    }
  };

  const handleDownload = () => {
    if (!directoryPath) {
      toast.error("Vui lòng chọn thư mục lưu nhạc trước khi tải!");
      return;
    }
    if (!url) {
      toast.error("Vui lòng dán Link bài hát!");
      return;
    }
    toast.info("Đã thêm vào hàng đợi (Tính năng Backend sẽ được code ở Giai đoạn sau)");
    setUrl('');
  };

  const handleUpdateEngine = () => {
    toast.info("Đang kiểm tra bản cập nhật (Sẽ tích hợp Backend sau)");
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans selection:bg-rose-500/30">
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
                    className="relative group gap-2.5 px-3 h-10 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-rose-500/50 rounded-xl transition-all duration-300 ease-out shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:shadow-[0_0_20px_rgba(244,63,94,0.2)] overflow-hidden"
                    disabled={isBusy}
                  >
                    <div className="absolute inset-0 bg-linear-to-r from-rose-500/0 via-rose-500/10 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="w-7 h-7 rounded-lg bg-linear-to-br from-rose-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-[0_0_10px_rgba(244,63,94,0.5)] shrink-0 relative z-10 group-hover:scale-105 transition-transform duration-300">
                      {isBusy ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 text-white drop-shadow-md" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 relative z-10">
                      <h1 className="font-bold text-[15px] tracking-wide bg-clip-text text-transparent bg-linear-to-r from-white to-zinc-300 group-hover:to-white transition-all duration-300 drop-shadow-sm">Dora Music Downloader</h1>
                      <ChevronDown size={14} className="text-zinc-500 group-hover:text-rose-400 transition-colors duration-300" />
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

        {/* Center: Folder Info */}
        <div className="hidden md:flex justify-center flex-1 relative z-60">
          {directoryPath ? (
            <FolderStatsPopup
              directoryPath={directoryPath}
              musicFiles={musicFiles}
              handleCloseFolder={handleCloseFolder}
              theme="downloader"
            />
          ) : (
            <div className="text-xs text-rose-400/80 italic">Chưa chọn thư mục lưu nhạc</div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end gap-3 flex-1">
          <Button
            onClick={handleUpdateEngine}
            variant="outline"
            size="sm"
            className="gap-2 border-rose-500/30 hover:border-rose-500/60 bg-transparent hover:bg-rose-500/10 text-rose-100"
            disabled={isBusy}
          >
            <RefreshCw size={14} />
            Cập nhật Engine
          </Button>
          <div className="flex items-center btn-gradient-downloader rounded-md p-0">
            <Button
              onClick={handleOpenFolder}
              size="sm"
              className="gap-2 bg-transparent hover:bg-white/10 text-white rounded-r-none border-r border-white/20 shadow-none"
              disabled={isBusy}
            >
              <FolderOpen size={16} />
              Chọn thư mục lưu
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="bg-transparent hover:bg-white/10 text-white rounded-l-none px-2 shadow-none focus-visible:ring-0" disabled={isBusy}>
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
                      <div key={path} className="flex items-center group relative w-full rounded-lg hover:bg-white/5 hover:bg-linear-to-r hover:from-rose-500/0 hover:to-rose-500/15 hover:text-white transition-all p-1">
                        <DropdownMenuItem
                          className="flex-1 cursor-pointer truncate px-2 py-1.5 focus:bg-transparent focus:bg-none focus:from-transparent focus:to-transparent"
                          onClick={() => {
                            setDirectoryPath(path);
                            toast.success(`Đã chọn thư mục lưu: ${path}`);
                          }}
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
                              {isPinned ? "Bỏ ghim" : "Ghim thư mục"}
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
        <LockOverlay 
          isLocked={!directoryPath}
          title="Chưa chọn thư mục lưu"
          description="Vui lòng bấm nút 'Chọn thư mục lưu' ở góc trên bên phải để bắt đầu tải nhạc."
          icon={<FolderOpen className="w-12 h-12" />}
          theme="downloader"
        />
        <PanelGroup direction="horizontal">
          {/* Left Panel: Input URL */}
          <Panel minSize={30} defaultSize={60} className="bg-zinc-950 flex flex-col relative z-0 items-center justify-center p-8">
            <div className="w-full max-w-xl flex flex-col gap-8">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-linear-to-tr from-rose-500 to-orange-500 mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(244,63,94,0.3)]">
                  <Download className="w-8 h-8 text-white drop-shadow-lg" />
                </div>
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-white to-zinc-400">Tải nhạc chất lượng cao</h2>
                <p className="text-zinc-500">Hỗ trợ tự động phân tích và tải nhạc từ các nguồn Qobuz, Tidal, SoundCloud.</p>
              </div>

              <div className="flex flex-col gap-4 p-6 rounded-2xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-xl">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300 ml-1">Đường dẫn bài hát / Album</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Link className="h-5 w-5 text-zinc-500" />
                    </div>
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://tidal.com/browse/track/..."
                      className="pl-10 h-12 bg-black/50 border-white/10 focus-visible:ring-rose-500 text-base"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleDownload}
                  className="w-full h-12 text-base font-semibold bg-linear-to-r from-rose-500 hover:from-rose-400 to-orange-500 hover:to-orange-400 shadow-[0_0_20px_rgba(244,63,94,0.4)] transition-all"
                  disabled={isBusy}
                >
                  <Download className="mr-2 h-5 w-5" /> Bắt Đầu Tải
                </Button>
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-0.5 bg-white/5 hover:bg-rose-500/50 transition-colors cursor-col-resize active:bg-rose-500" />

          {/* Right Panel: Download Queue */}
          <Panel defaultSize={40} minSize={25} maxSize={60} className="bg-black/40 backdrop-blur-xl flex flex-col border-l border-white/5 shadow-2xl shadow-black/50 relative z-10">
            <div className="w-full h-full flex flex-col relative overflow-hidden">
              <div className="flex items-center justify-between py-3 px-4 border-b border-white/5 bg-black/40 backdrop-blur-md shrink-0 z-50">
                <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <RefreshCw size={14} className="text-rose-500" /> Hàng Đợi Tải
                </h2>
                <span className="text-xs text-zinc-500">{MOCK_QUEUE.length} mục</span>
              </div>

              <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto">
                {MOCK_QUEUE.map((item) => (
                  <div key={item.id} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Music size={14} className="text-zinc-500 shrink-0" />
                        <span className="text-sm font-medium text-zinc-200 truncate">{item.title}</span>
                      </div>
                      <span className="text-xs font-mono text-zinc-500">{item.progress}%</span>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden relative">
                      <div
                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${item.status === 'completed'
                            ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                            : 'bg-linear-to-r from-rose-500 to-orange-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                          }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>

                    <div className="mt-2 text-[10px] text-zinc-500 flex justify-between">
                      <span className="capitalize">{item.status === 'downloading' ? 'Đang tải...' : item.status === 'pending' ? 'Chờ xử lý' : 'Hoàn thành'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
};
