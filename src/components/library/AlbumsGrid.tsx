import React, { useRef, useState, useMemo } from 'react';
import { useAudioStore, AlbumInfo } from '../../store/useAudioStore';
import { Disc3, Search } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AlphabetScroller } from '../ui/alphabet-scroller';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { useAlphabetMap } from '../../hooks/useAlphabetMap';

type AlbumVirtualRow =
  | { type: 'header'; letter: string; }
  | { type: 'grid-row'; albums: AlbumInfo[]; };

export const AlbumsGrid: React.FC = () => {
  const {
    musicFiles,
    aggregatedData,
    directoryPath,
    setSelectedFiles,
    selectedEntityName,
    setSelectedEntityName,
    gridColumns,
    searchQuery,
  } = useAudioStore();

  const albumVirtualRows = useMemo(() => {
    if (!aggregatedData?.albums) return [];

    const filtered = aggregatedData.albums.filter(album =>
      album.album_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (filtered.length === 0) return [];

    filtered.sort((a, b) => a.album_name.localeCompare(b.album_name));

    const groups = new Map<string, AlbumInfo[]>();
    filtered.forEach(album => {
      let letter = album.album_name.charAt(0).toUpperCase();
      if (!/[A-Z]/.test(letter)) {
        letter = '#';
      }
      if (!groups.has(letter)) {
        groups.set(letter, []);
      }
      groups.get(letter)!.push(album);
    });

    const rows: AlbumVirtualRow[] = [];

    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
      if (a === '#') return -1;
      if (b === '#') return 1;
      return a.localeCompare(b);
    });

    sortedKeys.forEach(letter => {
      rows.push({ type: 'header', letter });
      const albumsInGroup = groups.get(letter)!;
      for (let i = 0; i < albumsInGroup.length; i += gridColumns) {
        rows.push({ type: 'grid-row', albums: albumsInGroup.slice(i, i + gridColumns) });
      }
    });

    return rows;
  }, [aggregatedData?.albums, searchQuery, gridColumns]);

  const albumContainerRef = useRef<HTMLDivElement>(null);
  const [isAlbumScrubbing, setIsAlbumScrubbing] = useState(false);
  const [isAlbumScrollerVisible, setIsAlbumScrollerVisible] = useState(false);

  const albumRowVirtualizer = useVirtualizer({
    count: albumVirtualRows.length,
    getScrollElement: () => albumContainerRef.current,
    estimateSize: (index) => {
      const row = albumVirtualRows[index];
      if (row.type === 'header') return 60;
      return 250;
    },
    overscan: 5,
  });

  const albumAlphabetMap = useAlphabetMap(
    albumVirtualRows,
    (row) => row.type === 'header' ? row.letter : null
  );

  const handleAlbumClick = (albumName: string) => {
    if (selectedEntityName === albumName) {
      setSelectedFiles([]);
      setSelectedEntityName('');
      return;
    }
    const filesInAlbum = musicFiles.filter(f => f.album === albumName).map(f => f.file_path);
    setSelectedFiles(filesInAlbum);
    setSelectedEntityName(albumName);
  };

  if (!aggregatedData?.albums || aggregatedData.albums.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
        <Disc3 size={48} className="opacity-20" />
        <p>Chưa có dữ liệu Album</p>
      </div>
    );
  }

  if (albumVirtualRows.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
        <Search size={48} className="opacity-20" />
        <p>Không tìm thấy album nào phù hợp</p>
      </div>
    );
  }

  return (
    <div
      className="flex-1 w-full h-full relative group/album-grid"
      onPointerMove={(e) => {
        if (isAlbumScrubbing) return;
        const scrollContainer = albumContainerRef.current;
        if (!scrollContainer || scrollContainer.scrollHeight <= scrollContainer.clientHeight) {
          if (isAlbumScrollerVisible) setIsAlbumScrollerVisible(false);
          return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const distanceFromRight = rect.right - e.clientX;
        if (distanceFromRight <= 80) {
          if (!isAlbumScrollerVisible) setIsAlbumScrollerVisible(true);
        } else {
          if (isAlbumScrollerVisible) setIsAlbumScrollerVisible(false);
        }
      }}
      onPointerLeave={() => {
        if (!isAlbumScrubbing) setIsAlbumScrollerVisible(false);
      }}
    >
      <AlphabetScroller
        alphabetMap={albumAlphabetMap}
        onScrollTo={(index) => albumRowVirtualizer.scrollToIndex(index, { align: 'start' })}
        isVisible={isAlbumScrollerVisible}
        onScrubStateChange={setIsAlbumScrubbing}
        className="right-6 top-6 bottom-6"
      />

      <div
        ref={albumContainerRef}
        className="overflow-auto custom-scrollbar w-full h-full px-6 pb-6 pt-6 mask-fade-y"
      >
        <div style={{ height: `${albumRowVirtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${albumRowVirtualizer.getVirtualItems()[0]?.start ?? 0}px)`,
            }}
          >
            {albumRowVirtualizer.getVirtualItems().map((virtualRow) => {
              const rowData = albumVirtualRows[virtualRow.index];

              if (rowData.type === 'header') {
                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={albumRowVirtualizer.measureElement}
                    className="pt-6 pb-2 mb-4 border-b border-white/10 flex items-center gap-3"
                  >
                    <h2 className="text-2xl font-bold text-white/90 font-['Inter',sans-serif] tracking-tight">{rowData.letter}</h2>
                  </div>
                );
              }

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={albumRowVirtualizer.measureElement}
                  className="pb-6"
                >
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`, gap: '1.5rem' }}>
                    {rowData.albums.map((album, idx) => {
                      const separator = directoryPath.includes('\\') ? '\\' : '/';
                      const fullPath = album.cover_path ? `${directoryPath}${separator}${album.cover_path.replace(/\\|\//g, separator)}` : '';
                      const coverUrl = album.cover_path ? convertFileSrc(fullPath) : null;
                      const isSelected = selectedEntityName === album.album_name;

                      return (
                        <div
                          key={idx}
                          className="group flex flex-col cursor-pointer min-w-0 relative"
                          onClick={() => handleAlbumClick(album.album_name)}
                        >
                          <div className={`aspect-square w-full bg-zinc-800/40 rounded-[14px] overflow-hidden mb-2.5 transition-all duration-300 ease-out relative will-change-transform ${isSelected ? 'border-2 border-indigo-400 ring-4 ring-indigo-500/30 scale-[1.04] -translate-y-1 shadow-[0_20px_40px_rgba(99,102,241,0.25)]' : 'border border-white/10 shadow-lg shadow-black/40 group-hover:-translate-y-1 group-hover:scale-[1.04] group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)] group-hover:border-white/50 group-hover:ring-2 group-hover:ring-white/20'}`}>
                            {coverUrl ? (
                              <img src={coverUrl} alt={album.album_name} className={`w-full h-full object-cover transition-transform duration-500 ${isSelected ? 'scale-105' : 'group-hover:scale-105'}`} />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                <Disc3 size={48} strokeWidth={1} />
                              </div>
                            )}
                            {!isSelected && (
                              <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                            )}
                            {isSelected && (
                              <div className="absolute inset-0 bg-linear-to-t from-indigo-900/40 via-transparent to-indigo-400/20 opacity-100 pointer-events-none"></div>
                            )}
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <h3 className={`w-full text-[13.5px] truncate leading-tight transition-all duration-300 ${isSelected ? 'text-indigo-400 font-bold' : 'text-zinc-300 font-medium group-hover:text-white'}`}>
                                {album.album_name}
                              </h3>
                            </TooltipTrigger>
                            <TooltipContent>{album.album_name}</TooltipContent>
                          </Tooltip>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
