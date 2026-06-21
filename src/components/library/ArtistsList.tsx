import React, { useRef, useState, useMemo } from 'react';
import { useAudioStore } from '../../store/useAudioStore';
import { Users, Search, Plus } from 'lucide-react';
import { AddArtistModal } from '../modals/AddArtistModal';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AlphabetScroller } from '../ui/alphabet-scroller';
import { FloatingActionButton } from '../ui/floating-action-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { useAlphabetMap } from '../../hooks/useAlphabetMap';

export const ArtistsList: React.FC = () => {
  const {
    musicFiles,
    aggregatedData,
    setSelectedFiles,
    selectedEntityName,
    setSelectedEntityName,
    searchQuery,
  } = useAudioStore();

  const filteredArtists = useMemo(() => {
    if (!aggregatedData?.artists) return [];
    return aggregatedData.artists.filter(artist =>
      artist.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [aggregatedData?.artists, searchQuery]);

  const artistContainerRef = useRef<HTMLDivElement>(null);
  const [isArtistScrubbing, setIsArtistScrubbing] = useState(false);
  const [isArtistScrollerVisible, setIsArtistScrollerVisible] = useState(false);

  const artistRowVirtualizer = useVirtualizer({
    count: filteredArtists.length,
    getScrollElement: () => artistContainerRef.current,
    estimateSize: () => 65,
    overscan: 10,
  });

  const artistAlphabetMap = useAlphabetMap(
    filteredArtists,
    (artist) => artist
  );

  const handleArtistClick = (artistName: string) => {
    if (selectedEntityName === artistName) {
      setSelectedFiles([]);
      setSelectedEntityName('');
      return;
    }
    const filesByArtist = musicFiles.filter(f => f.artist?.includes(artistName)).map(f => f.file_path);
    setSelectedFiles(filesByArtist);
    setSelectedEntityName(artistName);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col relative w-full h-full">
      {(!aggregatedData?.artists || aggregatedData.artists.length === 0) ? (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
          <Users size={48} className="opacity-20" />
          <p>Chưa có dữ liệu Nghệ sĩ</p>
        </div>
      ) : filteredArtists.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
          <Search size={48} className="opacity-20" />
          <p>Không tìm thấy nghệ sĩ nào phù hợp</p>
        </div>
      ) : (
        <div
          className="flex-1 w-full h-full relative group/artist-grid"
          onPointerMove={(e) => {
            if (isArtistScrubbing) return;
            const scrollContainer = artistContainerRef.current;
            if (!scrollContainer || scrollContainer.scrollHeight <= scrollContainer.clientHeight) {
              if (isArtistScrollerVisible) setIsArtistScrollerVisible(false);
              return;
            }

            const rect = e.currentTarget.getBoundingClientRect();
            const distanceFromRight = rect.right - e.clientX;
            if (distanceFromRight <= 80) {
              if (!isArtistScrollerVisible) setIsArtistScrollerVisible(true);
            } else {
              if (isArtistScrollerVisible) setIsArtistScrollerVisible(false);
            }
          }}
          onPointerLeave={() => {
            if (!isArtistScrubbing) setIsArtistScrollerVisible(false);
          }}
        >
          <AlphabetScroller
            alphabetMap={artistAlphabetMap}
            onScrollTo={(index) => artistRowVirtualizer.scrollToIndex(index, { align: 'start' })}
            isVisible={isArtistScrollerVisible}
            onScrubStateChange={setIsArtistScrubbing}
            className="right-2 top-6 bottom-6"
          />
          <div
            ref={artistContainerRef}
            className="overflow-auto custom-scrollbar w-full h-full px-6 pb-6 pt-6 mask-fade-y"
          >
            <div style={{ height: `${artistRowVirtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${artistRowVirtualizer.getVirtualItems()[0]?.start ?? 0}px)`,
                }}
              >
                {artistRowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const artist = filteredArtists[virtualRow.index];
                  const isSelected = selectedEntityName === artist;
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={artistRowVirtualizer.measureElement}
                      onClick={() => handleArtistClick(artist)}
                      className={`px-4 py-3 border-b border-white/5 transition-colors flex items-center gap-4 rounded-lg min-w-0 group relative overflow-hidden cursor-pointer select-none ${isSelected ? 'row-active-bg' : 'row-hover-bg'}`}
                    >
                      <div className="row-gradient-overlay" />
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm border transition-colors ${isSelected ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-zinc-800 text-zinc-400 border-white/5'}`}>
                        <Users size={18} />
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`font-medium truncate flex-1 transition-colors ${isSelected ? 'text-indigo-400' : 'text-zinc-200 group-hover:text-white'}`}>{artist}</span>
                        </TooltipTrigger>
                        <TooltipContent>{artist}</TooltipContent>
                      </Tooltip>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <FloatingActionButton 
        onClick={() => setIsModalOpen(true)}
        label="Thêm Nghệ Sĩ"
      />

      <AddArtistModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
};
