import React, { useState } from 'react';
import { useAudioStore } from '../../store/useAudioStore';
import { Tag, Search, Plus } from 'lucide-react';
import { AddGenreModal } from '../modals/AddGenreModal';
import { FloatingActionButton } from '../ui/floating-action-button';

export const GenresList: React.FC = () => {
  const {
    musicFiles,
    aggregatedData,
    setSelectedFiles,
    selectedEntityName,
    setSelectedEntityName,
    searchQuery,
  } = useAudioStore();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredGenres = aggregatedData?.genres ? aggregatedData.genres.filter(genre =>
    genre.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

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
    <div className="flex-1 flex flex-col relative w-full h-full">
      {(!aggregatedData?.genres || aggregatedData.genres.length === 0) ? (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
          <Tag size={48} className="opacity-20" />
          <p>Chưa có dữ liệu Thể loại</p>
        </div>
      ) : filteredGenres.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
          <Search size={48} className="opacity-20" />
          <p>Không tìm thấy thể loại nào phù hợp</p>
        </div>
      ) : (
        <div className="flex-1 w-full h-full overflow-auto custom-scrollbar p-6 mask-fade-y">
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
        </div>
      )}

      {/* Floating Action Button */}
      <FloatingActionButton 
        onClick={() => setIsModalOpen(true)}
        label="Thêm Thể Loại"
      />

      <AddGenreModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
};
