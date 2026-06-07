import React from 'react';
import { useAudioStore } from '../store/useAudioStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { LockOverlay } from './ui/lock-overlay';
import { DataGrid } from './DataGrid';
import { Disc3, Users, LayoutGrid, Tag, Search, RefreshCw } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/core';

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

            <Button
              variant="outline"
              size="icon"
              onClick={refreshData}
              disabled={isScanning || !directoryPath}
              className="h-[38px] w-[38px] bg-zinc-950/80 border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80 rounded-lg shadow-lg shadow-black/20"
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={16} className={isScanning ? "animate-spin text-indigo-400" : ""} />
            </Button>

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
        <TabsContent value="albums" className="flex-1 overflow-y-auto custom-scrollbar m-0 data-[state=active]:flex flex-col px-6 pb-6 pt-6">
          {aggregatedData?.albums && aggregatedData.albums.length > 0 ? (() => {
            const filteredAlbums = aggregatedData.albums.filter(album => 
              album.album_name.toLowerCase().includes(searchQuery.toLowerCase())
            );
            
            if (filteredAlbums.length === 0) {
              return (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
                  <Search size={48} className="opacity-20" />
                  <p>Không tìm thấy album nào phù hợp</p>
                </div>
              );
            }

            return (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`, gap: '1.5rem' }}>
              {filteredAlbums.map((album, idx) => {
                const separator = directoryPath.includes('\\') ? '\\' : '/';
                const fullPath = album.cover_path ? `${directoryPath}${separator}${album.cover_path.replace(/\\|\//g, separator)}` : '';
                const coverUrl = album.cover_path ? convertFileSrc(fullPath) : null;

                const isSelected = selectedEntityName === album.album_name;

                return (
                  <div 
                    key={idx} 
                    className="group flex flex-col cursor-pointer transition-all duration-300 hover:scale-[1.03] min-w-0 relative"
                    onClick={() => handleAlbumClick(album.album_name)}
                  >
                    <div className={`aspect-square w-full bg-zinc-800/50 rounded-xl overflow-hidden mb-3 border transition-all relative ${isSelected ? 'border-indigo-500 shadow-xl shadow-indigo-500/20 ring-2 ring-indigo-500/30' : 'border-white/5 shadow-lg shadow-black/60 group-hover:border-indigo-500/50 group-hover:shadow-indigo-500/10'}`}>
                      {coverUrl ? (
                        <img src={coverUrl} alt={album.album_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                          <Disc3 size={48} strokeWidth={1} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    <h3 className={`w-full font-semibold text-[14px] truncate leading-tight transition-colors ${isSelected ? 'text-indigo-400' : 'text-zinc-200 group-hover:text-white'}`} title={album.album_name}>
                      {album.album_name}
                    </h3>
                  </div>
                );
              })}
            </div>
            );
          })() : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
              <LayoutGrid size={48} className="opacity-20" />
              <p>Chưa có dữ liệu Album</p>
            </div>
          )}
        </TabsContent>

        {/* Tab 3: Artists */}
        <TabsContent value="artists" className="flex-1 overflow-y-auto custom-scrollbar m-0 data-[state=active]:flex flex-col px-6 pb-6 pt-6">
          {aggregatedData?.artists && aggregatedData.artists.length > 0 ? (() => {
             const filteredArtists = aggregatedData.artists.filter(artist =>
               artist.toLowerCase().includes(searchQuery.toLowerCase())
             );

             if (filteredArtists.length === 0) {
               return (
                 <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
                   <Search size={48} className="opacity-20" />
                   <p>Không tìm thấy nghệ sĩ nào phù hợp</p>
                 </div>
               );
             }

             return (
             <div className="flex flex-col">
               {filteredArtists.map((artist, idx) => {
                 const isSelected = selectedEntityName === artist;
                 return (
                   <div 
                     key={idx}
                     onClick={() => handleArtistClick(artist)}
                     className={`px-4 py-3 border-b transition-colors flex items-center gap-4 rounded-lg min-w-0 group relative overflow-hidden ${isSelected ? 'row-active-bg' : 'row-hover-bg'}`}
                   >
                     <div className="row-gradient-overlay" />
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm border transition-colors ${isSelected ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' : 'bg-zinc-800 text-zinc-400 border-white/5'}`}>
                       <Users size={18} />
                     </div>
                     <span className={`font-medium truncate flex-1 transition-colors ${isSelected ? 'text-indigo-400' : 'text-zinc-200 group-hover:text-white'}`} title={artist}>{artist}</span>
                   </div>
                 );
               })}
             </div>
             );
           })() : (
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
