import React from 'react';
import { useAudioStore } from '../store/useAudioStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { LockOverlay } from './ui/lock-overlay';
import { DataGrid } from './DataGrid';
import { Disc3, Users, LayoutGrid, Tag, Search, RefreshCw } from 'lucide-react';

// Import sub-components
import { AlbumsGrid } from './library/AlbumsGrid';
import { ArtistsList } from './library/ArtistsList';
import { GenresList } from './library/GenresList';

export const LibraryView: React.FC = () => {
  const {
    directoryPath,
    activeTab,
    setActiveTab,
    isEditing,
    gridColumns,
    setGridColumns,
    searchQuery,
    setSearchQuery,
    isScanning,
    refreshData
  } = useAudioStore();

  return (
    <div className="flex-1 flex flex-col h-full w-full relative">
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
                className="pl-9 h-9.5 w-full sm:w-48 lg:w-56 focus:w-full sm:focus:w-60 lg:focus:w-72 bg-zinc-950/80 shadow-lg shadow-black/20 border-white/10 text-zinc-200 focus-visible:ring-1 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 focus-visible:bg-zinc-900/80 rounded-lg transition-all"
              />
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={refreshData}
                  disabled={isScanning || !directoryPath}
                  className="h-9.5 w-9.5 bg-zinc-950/80 border-white/10 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80 rounded-lg shadow-lg shadow-black/20"
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
          <AlbumsGrid />
        </TabsContent>

        {/* Tab 3: Artists */}
        <TabsContent value="artists" className="flex-1 overflow-hidden m-0 data-[state=active]:flex flex-col relative group/artist-grid">
          <ArtistsList />
        </TabsContent>

        {/* Tab 4: Genres */}
        <TabsContent value="genres" className="flex-1 overflow-y-auto custom-scrollbar m-0 data-[state=active]:flex flex-col px-4 pb-4 pt-4">
          <GenresList />
        </TabsContent>

      </Tabs>
      <LockOverlay isLocked={isEditing} className="z-100" />
    </div>
  );
};
