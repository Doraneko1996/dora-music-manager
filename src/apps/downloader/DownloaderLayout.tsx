import React, { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Loader2, ChevronDown, Download, ListMusic, FolderOpen, RefreshCw, Link, Music, Pin, X, CheckCircle2, XCircle } from 'lucide-react';
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
import { useAudioStore, ScanResult } from '../../store/useAudioStore';
import { useDownloaderStore } from '../../store/useDownloaderStore';
import { invoke } from '@tauri-apps/api/core';
import { FolderStatsPopup } from '../../components/FolderStatsPopup';
import { LockOverlay } from '../../components/ui/lock-overlay';
import { open } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';

export const DownloaderLayout: React.FC = () => {
  const { mode, isBusy, setMode } = useAppStore();
  const {
    directoryPath, setDirectoryPath, folderHistory, pinnedFolder,
    togglePinFolder, removeFolderFromHistory, musicFiles,
    setScanResult, setIsScanning, addFolderToHistory, resetStore
  } = useAudioStore();
  const {
    downloads, addDownload, removeDownload, isEngineUpdating, setIsEngineUpdating,
    engineStatus, setEngineStatus,
    cfClearance, userAgent, isCloudflareBlocked, setCloudflareConfig, setIsCloudflareBlocked
  } = useDownloaderStore();
  const [url, setUrl] = useState('');

  // Local state for CF config inputs
  const [tempCf, setTempCf] = useState(cfClearance);
  const [tempUa, setTempUa] = useState(userAgent);

  const handleCloseFolder = () => {
    resetStore();
  };

  const handleSaveCloudflareConfig = async () => {
    if (!tempCf.trim()) {
      toast.error("Vui lòng dán chuỗi Cookie cf_clearance!");
      return;
    }

    let finalCf = tempCf.trim();
    // Tự động trích xuất đúng giá trị cf_clearance nếu người dùng dán cả cụm "cf_clearance=..." hoặc cả dòng Cookie dài
    const match = finalCf.match(/cf_clearance=([^;]+)/);
    if (match) {
      finalCf = match[1];
    } else if (finalCf.startsWith('cf_clearance=')) {
      finalCf = finalCf.substring('cf_clearance='.length);
    }

    let finalUa = tempUa.trim();
    const uaMatch = finalUa.match(/user-agent:\s*(.+)/i);
    if (uaMatch) {
      finalUa = uaMatch[1].trim();
    }

    setCloudflareConfig(finalCf, finalUa);
    toast.success("Đã lưu Cookie & User-Agent! Đang tự động thử tải lại...");

    // Tìm các bài bị lỗi (khả năng cao do Cloudflare) để tải lại
    const failedDownloads = downloads.filter(d => d.status === 'error');

    for (const item of failedDownloads) {
      // addDownload sẽ tự reset trạng thái của item về pending và progress = 0
      addDownload(item.url);
      try {
        await invoke('start_download_music', {
          url: item.url,
          outputDir: directoryPath,
          cfClearance: finalCf,
          userAgent: finalUa
        });
      } catch (error) {
        toast.error(`Lỗi tải lại ${item.url}: ${error}`);
      }
    }
  };

  const loadDirectory = async (path: string) => {
    try {
      setDirectoryPath(path);
      setIsScanning(true);
      const startTime = Date.now();

      const result: ScanResult = await invoke('scan_directory', { path });
      setScanResult(result);
      addFolderToHistory(path);

      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - elapsedTime));
      }

      toast.success(`Đã chọn thư mục lưu: ${path}. (Quét được ${result.files.length} bài hát)`);
    } catch (error) {
      console.error("Lỗi khi mở thư mục:", error);
      toast.error("Lỗi hệ thống khi đọc thư mục.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleOpenFolder = async () => {
    try {
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: "Chọn thư mục lưu nhạc tải về",
      });

      if (selectedPath && typeof selectedPath === 'string') {
        await loadDirectory(selectedPath);
      }
    } catch (error) {
      console.error("Lỗi khi mở thư mục:", error);
    }
  };

  const handleDownload = async () => {
    if (!directoryPath) {
      toast.error("Vui lòng chọn thư mục lưu nhạc trước khi tải!");
      return;
    }
    if (!url) {
      toast.error("Vui lòng dán Link bài hát!");
      return;
    }

    // Thêm vào UI Queue
    addDownload(url);
    const downloadUrl = url;
    setUrl(''); // Xóa ô input

    // Gọi xuống Rust
    try {
      await invoke('start_download_music', {
        url: downloadUrl,
        outputDir: directoryPath,
        cfClearance,
        userAgent
      });
    } catch (error) {
      console.error("Lỗi khi gọi lệnh tải:", error);
      toast.error(`Lỗi khi tải: ${error}`);
    }
  };

  const handleUpdateEngine = () => {
    const toastId = toast("Đang xử lý cập nhật Engine...", {
      icon: <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />,
      duration: 100000, // keep it open while downloading
    });

    const updatePromise = async () => {
      setIsEngineUpdating(true);
      try {
        const release = await invoke<any>('check_engine_update');
        if (release && release.assets && release.assets.length > 0) {
          const asset = release.assets.find((a: any) => a.name.endsWith('.exe')) || release.assets[0];
          const downloadUrl = asset.browser_download_url;
          const tagName = release.tag_name;

          await invoke('download_engine', { downloadUrl, tagName });
          setEngineStatus('up-to-date');
          toast.success("Cập nhật Engine thành công!", {
            id: toastId,
            duration: 4000,
            icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          });
        } else {
          toast.success("Engine đang ở phiên bản mới nhất!", {
            id: toastId,
            duration: 4000,
            icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          });
        }
      } catch (err) {
        toast.error(`Lỗi cập nhật Engine: ${err}`, {
          id: toastId,
          duration: 5000,
          icon: <XCircle className="w-4 h-4 text-rose-500" />
        });
      } finally {
        setIsEngineUpdating(false);
      }
    };

    updatePromise();
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
                <span className="flex items-center gap-2"><ListMusic size={14} /> Quản lý thư viện</span>
                {mode === 'manager' && <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode('downloader')} className="flex items-center justify-between cursor-pointer focus:from-rose-500/0 focus:to-rose-500/15">
                <span className="flex items-center gap-2"><Download size={14} /> Tải nhạc mới</span>
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
          {engineStatus !== 'up-to-date' && (
            <Button
              onClick={handleUpdateEngine}
              variant="outline"
              size="sm"
              className={`gap-2 border-rose-500/30 bg-transparent text-rose-100 ${engineStatus === 'outdated'
                ? 'hover:border-rose-500/60 hover:bg-rose-500/10 animate-pulse border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.4)] text-rose-400'
                : ''
                }`}
              disabled={isBusy || isEngineUpdating || engineStatus === 'checking'}
            >
              {isEngineUpdating || engineStatus === 'checking' ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {engineStatus === 'checking' ? 'Đang kiểm tra Engine' : 'Cập nhật Engine'}
            </Button>
          )}
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
        {directoryPath && engineStatus === 'outdated' && !isCloudflareBlocked && (
          <LockOverlay
            isLocked={true}
            title="Thiếu Engine Tải Nhạc"
            description="Bạn cần cập nhật Engine (Lucida) để có thể phân tích và tải nhạc. Vui lòng bấm nút 'Cập nhật Engine' ở góc phải."
            icon={<Download className="w-12 h-12 text-rose-500" />}
            theme="downloader"
          />
        )}
        {isCloudflareBlocked && (
          <LockOverlay
            isLocked={true}
            title="Cloudflare Bắt Xác Minh Captcha"
            description={
              <div className="text-left mt-2 space-y-2">
                <p>1. Mở trình duyệt web (Chrome/Edge) truy cập vào <a href="https://lucida.to" target="_blank" className="text-rose-400 hover:underline">lucida.to</a> và giải Captcha.</p>
                <p>2. Bấm F12 mở DevTools -&gt; tab Network -&gt; F5 tải lại trang.</p>
                <p>3. Chọn một dòng request <span className="font-mono text-rose-300">lucida.to</span> -&gt; chuyển sang tab <span className="font-mono text-rose-300">Headers</span>.</p>
                <p>4. Tìm mục <strong>Request Headers</strong>, copy phần Cookie bắt đầu bằng <span className="font-mono text-rose-300">cf_clearance=</span> và <span className="font-mono text-rose-300">user-agent</span> dán vào 2 ô dưới đây:</p>
              </div>
            }
            icon={<XCircle className="w-12 h-12 text-rose-500" />}
            theme="downloader"
            innerClassName="max-w-xl"
            onClose={() => {
              setTempCf(cfClearance);
              setTempUa(userAgent);
              setIsCloudflareBlocked(false);
            }}
          >
            <div className="flex flex-col gap-3 mt-2 text-left">
              <div className="space-y-1">
                <Input
                  as="textarea"
                  clearable
                  onClear={() => setTempCf('')}
                  value={tempCf}
                  onChange={e => setTempCf(e.target.value)}
                  placeholder="cf_clearance=abc123xyz..."
                  className="bg-black/40 border-white/10 text-sm font-mono break-all min-h-30"
                />
              </div>
              <div className="space-y-1">
                <Input
                  as="textarea"
                  clearable
                  onClear={() => setTempUa('')}
                  value={tempUa}
                  onChange={e => setTempUa(e.target.value)}
                  placeholder="user-agent: Mozilla/5.0..."
                  className="bg-black/40 border-white/10 text-sm font-mono break-all min-h-20"
                />
              </div>
              <Button
                onClick={handleSaveCloudflareConfig}
                className="mt-2 w-full bg-rose-500 hover:bg-rose-600 text-white"
              >
                Lưu Cookie và Tiếp tục tải
              </Button>
            </div>
          </LockOverlay>
        )}
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
                      clearable
                      onClear={() => setUrl('')}
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

              {/* Utility Buttons */}
              <div className="flex justify-center gap-4 mt-2">
                <Button
                  onClick={handleUpdateEngine}
                  variant="ghost"
                  size="sm"
                  className="text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                  disabled={isEngineUpdating}
                >
                  {isEngineUpdating ? <Loader2 size={14} className="mr-2 animate-spin" /> : <RefreshCw size={14} className="mr-2" />}
                  Cập nhật Engine
                </Button>
                <Button
                  onClick={() => setIsCloudflareBlocked(true)}
                  variant="ghost"
                  size="sm"
                  className="text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                >
                  <Link size={14} className="mr-2" /> Cập nhật Cookie
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
                <span className="text-xs text-zinc-500">{downloads.length} mục</span>
              </div>

              <div className="flex-1 flex flex-col p-4 gap-3 overflow-y-auto">
                {downloads.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-2">
                    <Music className="w-8 h-8 opacity-20" />
                    <p className="text-sm">Hàng đợi trống</p>
                  </div>
                ) : (
                  downloads.map((item) => (
                    <div key={item.id} className="p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                          <Music size={14} className="text-zinc-500 shrink-0" />
                          <span className="text-sm font-medium text-zinc-200 truncate" title={item.title}>{item.title}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-mono text-zinc-500">{item.progress}%</span>
                          <button
                            onClick={() => removeDownload(item.id)}
                            className="text-zinc-500 hover:text-rose-500 transition-colors p-1 -mr-1 rounded-md hover:bg-white/5"
                            title={item.status === 'downloading' || item.status === 'pending' ? "Huỷ tải nhạc" : "Xoá khỏi hàng đợi"}
                          >
                            <X size={14} />
                          </button>
                        </div>
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
                        <span className="capitalize">{item.statusText}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
};
