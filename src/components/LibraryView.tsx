import React from 'react';
import { useAudioStore, AlbumInfo } from '../store/useAudioStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { LockOverlay } from './ui/lock-overlay';
import { DataGrid } from './DataGrid';
import { Disc3, Users, LayoutGrid, Tag, Search, RefreshCw } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AlphabetScroller } from './ui/alphabet-scroller';

type AlbumVirtualRow = 
  | { type: 'header'; letter: string; }
  | { type: 'grid-row'; albums: AlbumInfo[]; };

export const LibraryView: React.FC = () => {
  const { 
    musicFiles, 
    aggregatedData, 
    directoryPath, 
    setSelectedFiles, 
    activeTab, 
    setActiveTab, 
    isEditing, 
    selectedEntityName, 
    setSelectedEntityName, 
    gridColumns, 
    setGridColumns, 
    searchQuery, 
    setSearchQuery,
    isScanning,
    refreshData
  } = useAudioStore();

  const filteredArtists = React.useMemo(() => {
    if (!aggregatedData?.artists) return [];
    return aggregatedData.artists.filter(artist =>
      artist.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [aggregatedData?.artists, searchQuery]);

  const albumVirtualRows = React.useMemo(() => {
    if (!aggregatedData?.albums) return [];
    
    // 1. Filter
    const filtered = aggregatedData.albums.filter(album => 
      album.album_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (filtered.length === 0) return [];
    
    // 2. Sort A-Z
    filtered.sort((a, b) => a.album_name.localeCompare(b.album_name));
    
    // 3. Group by first letter
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
    
    // 4. Flatten into rows
    const rows: AlbumVirtualRow[] = [];
    
    // Ensure # comes first, then A-Z
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

  const albumContainerRef = React.useRef<HTMLDivElement>(null);
  const [isAlbumScrubbing, setIsAlbumScrubbing] = React.useState(false);
  const [isAlbumScrollerVisible, setIsAlbumScrollerVisible] = React.useState(false);

  const albumRowVirtualizer = useVirtualizer({
    count: albumVirtualRows.length,
    getScrollElement: () => albumContainerRef.current,
    estimateSize: (index) => {
      const row = albumVirtualRows[index];
      if (row.type === 'header') return 60; // Chiều cao Header khoảng 60px
      return 250; // Ước lượng chiều cao mỗi Grid Row
    },
    overscan: 5,
  });

  const albumAlphabetMap = React.useMemo(() => {
    const map = new Map<string, number>();
    albumVirtualRows.forEach((row, index) => {
      if (row.type === 'header') {
        if (!map.has(row.letter)) {
          map.set(row.letter, index);
        }
      }
    });
    return map;
  }, [albumVirtualRows]);

  const artistContainerRef = React.useRef<HTMLDivElement>(null);
  const [isArtistScrubbing, setIsArtistScrubbing] = React.useState(false);
  const [isArtistScrollerVisible, setIsArtistScrollerVisible] = React.useState(false);

  const artistRowVirtualizer = useVirtualizer({
    count: filteredArtists.length,
    getScrollElement: () => artistContainerRef.current,
    estimateSize: () => 65,
    overscan: 10,
  });

  const artistAlphabetMap = React.useMemo(() => {
    const map = new Map<string, number>();
    filteredArtists.forEach((artist, index) => {
      let firstChar = artist.charAt(0).toUpperCase();
      if (!/[A-Z]/.test(firstChar)) {
        firstChar = '#';
      }
      if (!map.has(firstChar)) {
        map.set(firstChar, index);
      }
    });
    return map;
  }, [filteredArtists]);

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

  const handleGenreClick = (genreName: string) => {
    if (selectedEntityName === genreName) {
      setSelectedFiles([]);
      setSelectedEntityName('');
      return;
    }
    const filesByGenre = musicFiles.filter(f => f.genre?.includes(genreName)).map(f => f.file_path);
    setSelectedFiles(filesByGenre);
    setSelectedEntityName(genreName);
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full relative">
      <LockOverlay isLocked={isEditing} />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col h-full w-full absolute inset-0">
        
        {/* Tabs Header */}
        <div className="z-50 px-4 py-3 border-b border-white/5 bg-black/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <TabsList className="bg-zinc-950/80 shadow-lg shadow-black/20 border border-white/10 rounded-lg p-1">
            <TabsTrigger value="tracks" className="gap-2 px-4">
              <Disc3 size={16} /> Nhạc
            </TabsTrigger>
            <TabsTrigger value="albums" className="gap-2 px-4">
              <LayoutGrid size={16} /> Album
            </TabsTrigger>
            <TabsTrigger value="artists" className="gap-2 px-4">
              <Users size={16} /> Nghệ sĩ
            </TabsTrigger>
            <TabsTrigger value="genres" className="gap-2 px-4">
              <Tag size={16} /> Thể loại
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
            <div className="relative group max-w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors z-10" />
              <Input
                type="text"
                placeholder="Tìm kiếm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-[38px] w-full sm:w-48 lg:w-56 focus:w-full sm:focus:w-60 lg:focus:w-72 bg-zinc-950/80 shadow-lg shadow-black/20 border-white/10 text-zinc-200 focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 focus-visible:bg-zinc-900/80 rounded-lg transition-all"
              />
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={refreshData}
                  disabled={isScanning || !directoryPath}
                  className="h-[38px] w-[38px] bg-zinc-950/80 border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80 rounded-lg shadow-lg shadow-black/20"
                >
                  <RefreshCw size={16} className={isScanning ? "animate-spin text-indigo-400" : ""} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Làm mới dữ liệu</TooltipContent>
            </Tooltip>

          {/* Grid Size Control (Only show when on albums tab) */}
          {activeTab === 'albums' && (
            <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-lg border border-white/5">
              {[5, 6, 7].map(num => (
                <button
                  key={num}
                  onClick={() => setGridColumns(num)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${gridColumns === num ? 'bg-indigo-600 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                >
                  {num}
                </button>
              ))}
            </div>
          )}
          </div>
        </div>

        {/* Tab 1: Tracks */}
        <TabsContent value="tracks" className="flex-1 flex flex-col overflow-hidden m-0 data-[state=active]:flex">
          <div className="flex-1 px-2 pb-2 pt-2 overflow-hidden">
            <DataGrid />
          </div>
        </TabsContent>

        {/* Tab 2: Albums */}
        <TabsContent value="albums" className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col relative group/album-grid">
          {aggregatedData?.albums && aggregatedData.albums.length > 0 ? (
            albumVirtualRows.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
                <Search size={48} className="opacity-20" />
                <p>Không tìm thấy album nào phù hợp</p>
              </div>
            ) : (
              <div 
                className="flex-1 w-full h-full relative"
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
                  className="overflow-auto custom-scrollbar w-full h-full px-6 pb-6 pt-6"
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
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                                      )}
                                      {isSelected && (
                                        <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/40 via-transparent to-indigo-400/20 opacity-100 pointer-events-none"></div>
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
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
              <LayoutGrid size={48} className="opacity-20" />
              <p>Chưa có dữ liệu Album</p>
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Artists */}
        <TabsContent value="artists" className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col relative group/artist-grid">
          {aggregatedData?.artists && aggregatedData.artists.length > 0 ? (
            filteredArtists.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
                <Search size={48} className="opacity-20" />
                <p>Không tìm thấy nghệ sĩ nào phù hợp</p>
              </div>
            ) : (
              <div 
                className="flex-1 w-full h-full relative"
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
                  className="right-6 top-6 bottom-6"
                />
                <div
                  ref={artistContainerRef}
                  className="overflow-auto custom-scrollbar w-full h-full px-6 pb-6 pt-6"
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
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
              <Users size={48} className="opacity-20" />
              <p>Chưa có dữ liệu Nghệ sĩ</p>
            </div>
          )}
        </TabsContent>

        {/* Tab 4: Genres */}
        <TabsContent value="genres" className="flex-1 overflow-y-auto custom-scrollbar m-0 data-[state=active]:flex flex-col px-4 pb-4 pt-4">
           {aggregatedData?.genres && aggregatedData.genres.length > 0 ? (() => {
             const filteredGenres = aggregatedData.genres.filter(genre =>
               genre.toLowerCase().includes(searchQuery.toLowerCase())
             );

             if (filteredGenres.length === 0) {
               return (
                 <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
                   <Search size={48} className="opacity-20" />
                   <p>Không tìm thấy thể loại nào phù hợp</p>
                 </div>
               );
             }

             return (
               <div className="flex flex-wrap gap-3 content-start">
                 {filteredGenres.map((genre, idx) => {
                   const isSelected = selectedEntityName === genre;
                   return (
                     <div 
                       key={idx}
                       onClick={() => handleGenreClick(genre)}
                       className={`px-4 py-2 border cursor-pointer rounded-full transition-all duration-300 flex items-center gap-2 group backdrop-blur-xl ${
                         isSelected 
                           ? 'bg-indigo-500/40 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.5)] text-white' 
                           : 'bg-zinc-800/60 border-white/10 hover:border-indigo-400/50 hover:bg-indigo-500/20 text-zinc-200 hover:text-white hover:shadow-[0_0_15px_rgba(99,102,241,0.3)]'
                       }`}
                     >
                       <Tag size={14} className={`transition-colors duration-300 ${isSelected ? 'text-indigo-200' : 'text-zinc-400 group-hover:text-indigo-300'}`} />
                       <span className="font-medium text-[13px] tracking-wide">{genre}</span>
                     </div>
                   );
                 })}
               </div>
             );
           })() : (
             <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
               <Tag size={48} className="opacity-20" />
               <p>Chưa có dữ liệu Thể loại</p>
             </div>
           )}
        </TabsContent>

      </Tabs>
    </div>
  );
};
