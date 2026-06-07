import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import { AudioMetadata } from '../store/useAudioStore';
import { ListMusic, Music2 } from 'lucide-react';

interface TrackListProps {
  files: AudioMetadata[];
  selectedEntityName?: string | null;
  className?: string;
  title?: string;
}

import { TruncatedTooltip } from './ui/truncated-tooltip';

export const TrackList: React.FC<TrackListProps> = ({ files, selectedEntityName, className, title = "Danh sách bài hát" }) => {
  const highlightArtist = (text: string) => {
    if (!selectedEntityName) return text;
    const parts = text.split(new RegExp(`(${selectedEntityName})`, 'gi'));
    return parts.map((part, idx) => 
      part.toLowerCase() === selectedEntityName.toLowerCase() ? 
        <span key={idx} className="text-yellow-400">{part}</span> : part
    );
  };

  return (
    <TooltipProvider>
      <div className={className || "flex-1 flex flex-col min-h-0 mt-6 pt-4 border-t border-white/5"}>
        <div className="flex items-center gap-2 mb-3 px-2">
          <div className="p-1.5 rounded-md bg-indigo-500/20 text-indigo-400">
            <ListMusic size={14} />
          </div>
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-widest truncate">
            {title}
          </h3>
          <span className="text-[10px] font-bold bg-white/10 text-zinc-300 px-2.5 py-0.5 rounded-full ml-auto">
            {files.length}
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar border border-white/5 rounded-xl bg-black/20 p-2 shadow-inner">
          <div className="flex flex-col gap-1 w-full">
            {files.map((f, i) => {
              const displayName = f.title || f.file_name;
              
              let mainArtist = f.artist || 'Unknown';
              let featArtist = '';
              if (f.artist) {
                const match = f.artist.match(/^(.*?)\s*(?:ft\.|feat\.|featuring)\s*(.*)$/i);
                if (match) {
                  mainArtist = match[1];
                  featArtist = match[2];
                }
              }

              return (
                <div key={f.file_path} className="flex items-center gap-3 px-3 py-2.5 rounded-lg group transition-all duration-300 border cursor-default relative overflow-hidden w-full min-w-0 row-hover-bg">
                  <div className="row-gradient-overlay" />
                  
                  <div className="relative flex items-center justify-center w-5 shrink-0">
                    <span className="text-xs font-semibold text-zinc-400 group-hover:hidden transition-all">{i + 1}</span>
                    <Music2 size={14} className="text-indigo-400 hidden group-hover:block transition-all animate-pulse" />
                  </div>
                  
                  <div className="flex flex-col flex-1 min-w-0 z-10">
                    <TruncatedTooltip 
                      text={displayName} 
                      fullText={displayName}
                      className="text-sm font-medium text-zinc-200 truncate group-hover:text-indigo-300 transition-colors" 
                    />
                    <TruncatedTooltip 
                      text={highlightArtist(f.artist || 'Unknown')} 
                      fullText={f.artist || 'Unknown'}
                      className="text-[11px] text-zinc-500 truncate mt-0.5" 
                    />
                  </div>
                  
                  {featArtist && (
                    <div className="z-10 shrink-0 ml-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-yellow-500/30 text-yellow-500 bg-yellow-500/10 cursor-help">
                            Ft.
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-sm font-semibold text-zinc-100">{highlightArtist(mainArtist)}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">Ft. {highlightArtist(featArtist)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
