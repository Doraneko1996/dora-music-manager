import React from 'react';
import { Loader2, ChevronDown, Download, ListMusic } from 'lucide-react';
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
import { useAppStore } from '../../store/useAppStore';

export const DownloaderLayout: React.FC = () => {
  const { mode, isBusy, setMode } = useAppStore();

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
              <DropdownMenuItem onClick={() => setMode('manager')} className="flex items-center justify-between">
                <span className="flex items-center gap-2"><ListMusic size={14}/> Quản lý thư viện</span>
                {mode === 'manager' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMode('downloader')} className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Download size={14}/> Tải nhạc mới</span>
                {mode === 'downloader' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center: Future folder state / empty for now */}
        <div className="hidden md:flex justify-center flex-1 relative z-60">
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end gap-3 flex-1">
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative flex items-center justify-center text-zinc-500">
        <p>Giao diện Downloader (Đang xây dựng...)</p>
      </div>
    </div>
  );
};
