import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { FolderOpen, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useAudioStore, ScanResult } from '../store/useAudioStore';
import { toast } from 'sonner';
import { LibraryView } from './LibraryView';
import { EditForm } from './EditForm';
import { Toaster as CustomToaster } from './ui/sonner';

export const Layout: React.FC = () => {
  const {
    directoryPath, setDirectoryPath,
    setMusicFiles, setAggregatedData, isScanning, setIsScanning
  } = useAudioStore();

  const handleOpenFolder = async () => {
    try {
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: "Chọn thư mục chứa nhạc",
      });

      if (selectedPath && typeof selectedPath === 'string') {
        setDirectoryPath(selectedPath);
        setIsScanning(true);

        const result: ScanResult = await invoke('scan_directory', { path: selectedPath });
        setMusicFiles(result.files);
        setAggregatedData(result.aggregated);

        toast.success(`Đã tải thành công ${result.files.length} files nhạc.`);
      }
    } catch (error) {
      console.error("Lỗi khi mở thư mục:", error);
      toast.error("Lỗi hệ thống khi đọc thư mục.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleCloseFolder = () => {
    setDirectoryPath('');
    setMusicFiles([]);
    setAggregatedData(null);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-white/10 flex items-center px-4 justify-between bg-zinc-950/80 backdrop-blur-md shrink-0 sticky top-0 z-50 relative">
        {/* Left: App Title */}
        <div className="flex items-center gap-2 w-1/3">
          <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-white"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
          </div>
          <h1 className="font-semibold text-[15px] tracking-tight text-zinc-100">Dora Music Manager</h1>
        </div>

        {/* Center: Folder Path */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center justify-center w-1/3">
          {directoryPath && (
            <div className="group flex items-center gap-2 bg-zinc-900/80 backdrop-blur-3xl hover:bg-indigo-500/10 border border-white/10 hover:border-indigo-500/50 px-4 py-1.5 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(99,102,241,0.25)] transition-all duration-300">
              <FolderOpen size={14} className="text-zinc-400 group-hover:text-indigo-400 transition-colors duration-300" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-[13px] font-medium text-zinc-300 group-hover:text-indigo-200 truncate max-w-[250px] transition-colors duration-300">
                    {directoryPath}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{directoryPath}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleCloseFolder}
                    className="ml-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/20 rounded-full p-1 transition-all"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Đóng thư mục</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end gap-3 w-1/3">
          <Button onClick={handleOpenFolder} size="sm" className="gap-2 btn-gradient-brand" disabled={isScanning}>
            <FolderOpen size={16} />
            Mở Thư Mục
          </Button>
        </div>
      </header>

      {/* Main Content (Split Pane) */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* Left Panel: Library View */}
          <Panel minSize={30} defaultSize={75} className="bg-zinc-950 flex flex-col border-r border-white/5 relative z-0">
            <LibraryView />
          </Panel>

          <PanelResizeHandle className="w-[2px] bg-white/5 hover:bg-indigo-500/50 transition-colors cursor-col-resize active:bg-indigo-500" />

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
      </div>
      <CustomToaster />
    </div>
  );
};

