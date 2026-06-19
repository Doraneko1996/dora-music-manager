import React, { useState, useMemo, useRef } from 'react';
import { Popover, PopoverContent, PopoverAnchor } from './ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import { FolderOpen, X, Music2, Disc3, Users, Tags, FileAudio } from 'lucide-react';
import { AudioMetadata } from '../store/useAudioStore';

interface FolderStatsPopupProps {
  directoryPath: string;
  musicFiles: AudioMetadata[];
  handleCloseFolder: () => void;
}

export const FolderStatsPopup: React.FC<FolderStatsPopupProps> = ({ directoryPath, musicFiles, handleCloseFolder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (!isPinned) setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isPinned) setIsOpen(false);
    }, 150);
  };

  const handleClick = () => {
    // Only toggle pin state if clicking on the trigger area
    if (isPinned) {
      setIsPinned(false);
      // Wait a moment before closing to allow smooth unpin transition if desired
      setTimeout(() => setIsOpen(false), 50);
    } else {
      setIsPinned(true);
      setIsOpen(true);
    }
  };

  const stats = useMemo(() => {
    let lossless = 0;
    let hq = 0;
    let standard = 0;
    let unknownQuality = 0;

    const formats: Record<string, number> = {};
    const artists = new Set<string>();
    const albums = new Set<string>();
    const genres = new Set<string>();

    musicFiles.forEach(file => {
      // Quality
      const bitrate = file.bitrate || 0;
      if (bitrate > 320) lossless++;
      else if (Math.round(bitrate) === 320) hq++;
      else if (bitrate > 0 && bitrate < 320) standard++;
      else unknownQuality++;

      // Format
      if (file.file_name) {
        const parts = file.file_name.split('.');
        if (parts.length > 1) {
          const ext = parts.pop()?.toUpperCase() || 'UNKNOWN';
          formats[ext] = (formats[ext] || 0) + 1;
        }
      }

      // Metadata
      if (file.artist) artists.add(file.artist);
      if (file.album) albums.add(file.album);
      if (file.genre) genres.add(file.genre);
    });

    const total = musicFiles.length;

    return {
      total,
      quality: {
        lossless,
        hq,
        standard,
        unknown: unknownQuality,
        losslessPct: total ? (lossless / total) * 100 : 0,
        hqPct: total ? (hq / total) * 100 : 0,
        standardPct: total ? (standard / total) * 100 : 0,
        unknownPct: total ? (unknownQuality / total) * 100 : 0,
      },
      formats: Object.entries(formats).sort((a, b) => b[1] - a[1]),
      artistsCount: artists.size,
      albumsCount: albums.size,
      genresCount: genres.size,
    };
  }, [musicFiles]);

  return (
    <>
      {isPinned && (
        <div
          className="fixed inset-0 z-45 bg-black/40 backdrop-blur-[2px] transition-all animate-in fade-in duration-300"
          aria-hidden="true"
        />
      )}
      <Popover open={isOpen || isPinned} onOpenChange={(open) => {
        if (!open) {
          setIsPinned(false);
          setIsOpen(false);
        }
      }}>
        <PopoverAnchor asChild>
          <div
            ref={triggerRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            className={`relative z-50 group flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all duration-300 cursor-pointer backdrop-blur-3xl shadow-[0_0_20px_rgba(0,0,0,0.3)] 
            ${isPinned || isOpen
                ? 'bg-indigo-500/20 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.3)]'
                : 'bg-zinc-900/80 border-white/10 hover:bg-indigo-500/10 hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.25)]'}`}
          >
            <FolderOpen size={14} className={`transition-colors duration-300 ${isPinned || isOpen ? 'text-indigo-400' : 'text-zinc-400 group-hover:text-indigo-400'}`} />
            <span className={`text-[13px] font-medium truncate max-w-62.5 transition-colors duration-300 ${isPinned || isOpen ? 'text-indigo-200' : 'text-zinc-300 group-hover:text-indigo-200'}`}>
              {directoryPath}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCloseFolder();
              }}
              className="ml-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/20 rounded-full p-1 transition-all"
              title="Đóng thư mục"
            >
              <X size={12} strokeWidth={3} />
            </button>
          </div>
        </PopoverAnchor>

        <PopoverContent
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onInteractOutside={(e) => {
            // If click is on the trigger, let the trigger's onClick handle it
            const target = e.target as Node;
            if (triggerRef.current?.contains(target)) {
              e.preventDefault();
              return;
            }

            if (isPinned) {
              setIsPinned(false);
              setIsOpen(false);
            }
          }}
          sideOffset={12}
          className="w-85 bg-zinc-950/85 backdrop-blur-3xl border border-white/10 shadow-2xl rounded-2xl p-0 overflow-hidden z-100 text-zinc-200"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/5 bg-white/5 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/20 blur-2xl rounded-full" />
            <h3 className="font-semibold text-sm text-zinc-100 flex items-center gap-2 relative z-10">
              <FolderOpen size={16} className="text-indigo-400" />
              Thống kê thư mục
            </h3>
            <p className="text-[11px] text-zinc-400 mt-1 truncate relative z-10" title={directoryPath}>
              {directoryPath}
            </p>

            {isPinned && (
              <div className="absolute top-4 right-4 flex items-center justify-center" title="Đã ghim (Pin)">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
              </div>
            )}
          </div>

          <div className="p-5 flex flex-col gap-6">
            {/* Quality Distribution */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-zinc-300 flex items-center gap-1.5"><Music2 size={13} className="text-indigo-400/80" /> Phân bổ chất lượng</span>
                <span className="text-zinc-500 font-bold">{stats.total} Bài hát</span>
              </div>

              <TooltipProvider delayDuration={100}>
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
                  {stats.quality.standardPct > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div style={{ width: `${stats.quality.standardPct}%` }} className="bg-zinc-600 hover:brightness-110 transition-all border-r border-zinc-900/50" />
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={8}>Standard (&lt;320kbps): <span className="font-bold">{stats.quality.standard} Bài hát</span></TooltipContent>
                    </Tooltip>
                  )}
                  {stats.quality.hqPct > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div style={{ width: `${stats.quality.hqPct}%` }} className="bg-pink-600 hover:brightness-110 transition-all border-r border-zinc-900/50" />
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={8}>High Quality (320kbps): <span className="font-bold">{stats.quality.hq} Bài hát</span></TooltipContent>
                    </Tooltip>
                  )}
                  {stats.quality.losslessPct > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div style={{ width: `${stats.quality.losslessPct}%` }} className="bg-amber-600 hover:brightness-110 transition-all" />
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={8}>Lossless (&gt;320kbps): <span className="font-bold">{stats.quality.lossless} Bài hát</span></TooltipContent>
                    </Tooltip>
                  )}
                  {stats.quality.unknownPct > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div style={{ width: `${stats.quality.unknownPct}%` }} className="bg-zinc-800 hover:brightness-110 transition-all border-l border-zinc-900/50" />
                      </TooltipTrigger>
                      <TooltipContent side="top" sideOffset={8}>Unknown: <span className="font-bold">{stats.quality.unknown} Bài hát</span></TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TooltipProvider>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1">
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-zinc-600" /> Standard <span className="text-zinc-500 ml-0.5 font-bold">{stats.quality.standard}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-pink-600 shadow-[0_0_8px_rgba(219,39,119,0.5)]" /> 320kbps <span className="text-zinc-500 ml-0.5 font-bold">{stats.quality.hq}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-600 shadow-[0_0_8px_rgba(217,119,6,0.5)]" /> Lossless <span className="text-zinc-500 ml-0.5 font-bold">{stats.quality.lossless}</span>
                </div>
              </div>
            </div>

            {/* Formats Grid */}
            <div className="flex flex-col gap-2.5">
              <div className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <FileAudio size={13} className="text-indigo-400/80" /> Định dạng file
              </div>
              <div className="flex flex-wrap gap-2">
                {stats.formats.map(([ext, count]) => {
                  let colorClass = 'text-indigo-300 border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]';
                  if (ext === 'FLAC') colorClass = 'text-emerald-300 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]';
                  if (ext === 'MP3') colorClass = 'text-blue-300 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]';
                  if (ext === 'WAV') colorClass = 'text-rose-300 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]';
                  if (ext === 'M4A') colorClass = 'text-purple-300 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]';

                  return (
                    <div key={ext} className={`px-2 py-1 rounded-md border text-[10px] font-bold flex items-center gap-1.5 bg-black/20 ${colorClass}`}>
                      {ext} <span className="opacity-70 text-[9px] bg-white/10 px-1 py-0.5 rounded">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Metadata Stats */}
            <div className="grid grid-cols-3 gap-3 border-t border-white/5 pt-5">
              <div className="flex flex-col items-center justify-center bg-black/20 border border-white/5 rounded-xl p-2 gap-1 relative overflow-hidden group transition-colors shadow-inner">
                <Users size={14} className="text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                <span className="text-base font-bold text-zinc-100">{stats.artistsCount}</span>
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">Nghệ sĩ</span>
              </div>
              <div className="flex flex-col items-center justify-center bg-black/20 border border-white/5 rounded-xl p-2 gap-1 relative overflow-hidden group transition-colors shadow-inner">
                <Disc3 size={14} className="text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                <span className="text-base font-bold text-zinc-100">{stats.albumsCount}</span>
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">Album</span>
              </div>
              <div className="flex flex-col items-center justify-center bg-black/20 border border-white/5 rounded-xl p-2 gap-1 relative overflow-hidden group transition-colors shadow-inner">
                <Tags size={14} className="text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                <span className="text-base font-bold text-zinc-100">{stats.genresCount}</span>
                <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-semibold">Thể loại</span>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};
