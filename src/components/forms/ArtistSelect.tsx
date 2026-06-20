import React, { useState, useEffect } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Check, ChevronsUpDown, Plus, Users, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAudioStore } from '../../store/useAudioStore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { TruncatedTooltip } from '../ui/truncated-tooltip';

interface ArtistSelectProps {
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
  className?: string;
}

export function parseArtistString(artistStr: string) {
  if (!artistStr || artistStr === '<Keep>') return { mainArtist: artistStr || '', featArtists: [] };
  const match = artistStr.match(/(.*?)\s+(?:Ft\.|Feat\.|Featuring)\s+(.*)/i);
  if (match) {
    const mainArtist = match[1].trim();
    const featArtists = match[2].split(',').map(s => s.trim()).filter(Boolean);
    return { mainArtist, featArtists };
  }
  return { mainArtist: artistStr.trim(), featArtists: [] };
}

export function formatArtistString(mainArtist: string, featArtists: string[]) {
  if (!mainArtist || mainArtist === '<Keep>') return mainArtist;
  if (featArtists.length === 0) return mainArtist;
  return `${mainArtist} Ft. ${featArtists.join(', ')}`;
}

export const ArtistSelect: React.FC<ArtistSelectProps> = ({ value, onChange, isEditing, className }) => {
  const { aggregatedData } = useAudioStore();
  const allArtists = aggregatedData?.artists || [];

  const [parsed, setParsed] = useState(() => parseArtistString(value));

  // Sync state when external value changes (e.g. user selects a new track)
  useEffect(() => {
    setParsed(parseArtistString(value));
  }, [value]);

  const updateParent = (newMain: string, newFeats: string[]) => {
    setParsed({ mainArtist: newMain, featArtists: newFeats });
    onChange(formatArtistString(newMain, newFeats));
  };

  const [mainOpen, setMainOpen] = useState(false);
  const [mainSearch, setMainSearch] = useState("");
  const [featOpen, setFeatOpen] = useState(false);
  const [featSearch, setFeatSearch] = useState("");

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingNewArtist, setPendingNewArtist] = useState({ name: "", isFeat: false });

  const displayMainValue = parsed.mainArtist === '<Keep>' ? 'Giữ nguyên hiện tại...' : parsed.mainArtist;

  const handleCreateNew = (newName: string, isFeat: boolean) => {
    setPendingNewArtist({ name: newName, isFeat });
    setConfirmModalOpen(true);
  };

  const confirmCreate = () => {
    const { name, isFeat } = pendingNewArtist;
    if (isFeat) {
      if (!parsed.featArtists.includes(name)) {
        updateParent(parsed.mainArtist, [...parsed.featArtists, name]);
      }
      setFeatOpen(false);
    } else {
      updateParent(name, parsed.featArtists);
      setMainOpen(false);
    }
    setConfirmModalOpen(false);
  };

  const removeFeat = (featToRemove: string) => {
    updateParent(parsed.mainArtist, parsed.featArtists.filter(f => f !== featToRemove));
  };

  if (!isEditing) {
    return (
      <Input
        value={value === '<Keep>' ? 'Giữ nguyên hiện tại...' : value}
        readOnly
        className={cn("border-transparent bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-transparent focus-visible:bg-transparent cursor-default select-text truncate", className)}
        placeholder="Trống"
      />
    );
  }

  const showMainCreate = mainSearch.trim() !== "" && !allArtists.some(a => a.toLowerCase() === mainSearch.trim().toLowerCase());
  const showFeatCreate = featSearch.trim() !== "" && !allArtists.some(a => a.toLowerCase() === featSearch.trim().toLowerCase()) && !parsed.featArtists.some(f => f.toLowerCase() === featSearch.trim().toLowerCase());

  return (
    <div className="flex flex-col gap-3 w-full min-w-0">
      {/* 1. Main Artist Select */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-zinc-500 uppercase">Nghệ sĩ chính</span>
        <Popover open={mainOpen} onOpenChange={setMainOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={mainOpen}
              className={cn(
                "w-full h-10 justify-between bg-white/5 border-white/10 hover:bg-white/10 hover:text-white transition-all font-normal text-left overflow-hidden",
                mainOpen && "ring-2 ring-indigo-500/50 border-indigo-500 bg-white/10 text-white",
                className
              )}
            >
              <TruncatedTooltip
                className="truncate flex-1 min-w-0 text-left block"
                text={parsed.mainArtist ? displayMainValue : "Chọn nghệ sĩ chính..."}
                fullText={parsed.mainArtist ? displayMainValue : "Chọn nghệ sĩ chính..."}
              />
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent usePortal={false} align="start" className="min-w-60 w-(--radix-popover-trigger-width) p-1 border border-white/10 bg-black/70 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] rounded-xl">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Tìm hoặc thêm mới..."
                value={mainSearch}
                onValueChange={setMainSearch}
                className="border-none focus:ring-0 text-zinc-100 placeholder:text-zinc-500 h-10"
              />
              <CommandList className="max-h-75 custom-scrollbar">
                {allArtists.length === 0 && !showMainCreate && (
                  <CommandEmpty className="text-zinc-500 py-6 text-center">Không có dữ liệu nghệ sĩ</CommandEmpty>
                )}

                {showMainCreate && (
                  <div className="p-2 border-b border-white/5">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 text-indigo-400 hover:text-indigo-300 bg-linear-to-r from-transparent to-transparent hover:from-indigo-500/0 hover:to-indigo-500/15 hover:bg-white/5 border border-transparent hover:border-white/5 cursor-pointer transition-all"
                      onClick={() => handleCreateNew(mainSearch.trim(), false)}
                    >
                      <Plus size={16} />
                      Tạo mới: "{mainSearch.trim()}"
                    </Button>
                  </div>
                )}

                <CommandGroup>
                  {allArtists.filter(a => a.toLowerCase().includes(mainSearch.toLowerCase())).map((artist) => {
                    const isSelected = parsed.mainArtist === artist;
                    return (
                      <CommandItem
                        key={artist}
                        value={artist}
                        onSelect={(currentValue) => {
                          updateParent(currentValue, parsed.featArtists);
                          setMainOpen(false);
                        }}
                        className={cn(
                          "mb-1 cursor-pointer",
                          isSelected && "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-medium"
                        )}
                      >
                        <Users size={16} className={isSelected ? "text-indigo-400" : "text-zinc-500"} />
                        <span className="flex-1 truncate">
                          {artist}
                        </span>
                        {isSelected && <Check className="h-4 w-4 shrink-0 text-indigo-400" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* 2. Feat Artists Select (Multi-select) */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-zinc-500 uppercase">Nghệ sĩ tham gia (Feat)</span>
        <Popover open={featOpen} onOpenChange={setFeatOpen}>
          <PopoverTrigger asChild>
            <div
              role="combobox"
              aria-expanded={featOpen}
              className={cn(
                "w-full min-h-9.5 flex items-center flex-wrap gap-1.5 p-1.5 px-3 bg-white/5 border border-white/10 hover:bg-white/10 transition-all rounded-md cursor-pointer",
                featOpen && "ring-2 ring-indigo-500/50 border-indigo-500 bg-white/10",
                className
              )}
            >
              {parsed.featArtists.length === 0 ? (
                <span className="text-zinc-400 text-sm py-1 flex-1">Thêm nghệ sĩ feat...</span>
              ) : (
                <>
                  {parsed.featArtists.map(feat => (
                    <Badge key={feat} variant="secondary" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-white/10 pr-1 py-1 flex items-center gap-1 font-normal">
                      {feat}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); removeFeat(feat); }}
                        className="rounded-full p-0.5 hover:bg-white/20 transition-colors ml-1"
                      >
                        <X size={12} />
                      </div>
                    </Badge>
                  ))}
                  <div className="flex-1 min-w-12.5 flex items-center justify-end">
                    <ChevronsUpDown className="h-4 w-4 opacity-50 text-white" />
                  </div>
                </>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent usePortal={false} align="start" className="min-w-60 w-(--radix-popover-trigger-width) p-1 border border-white/10 bg-black/70 backdrop-blur-2xl shadow-2xl rounded-xl">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Tìm hoặc thêm mới..."
                value={featSearch}
                onValueChange={setFeatSearch}
                className="border-none focus:ring-0 text-zinc-100 placeholder:text-zinc-500 h-10"
              />
              <CommandList className="max-h-75 custom-scrollbar">
                {showFeatCreate && (
                  <div className="p-2 border-b border-white/5">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 text-indigo-400 hover:text-indigo-300 bg-linear-to-r from-transparent to-transparent hover:from-indigo-500/0 hover:to-indigo-500/15 hover:bg-white/5 border border-transparent hover:border-white/5 cursor-pointer transition-all"
                      onClick={() => handleCreateNew(featSearch.trim(), true)}
                    >
                      <Plus size={16} />
                      Thêm "{featSearch.trim()}"
                    </Button>
                  </div>
                )}

                <CommandGroup>
                  {allArtists
                    .filter(a => a !== parsed.mainArtist && !parsed.featArtists.includes(a))
                    .filter(a => a.toLowerCase().includes(featSearch.toLowerCase()))
                    .map((artist) => {
                      return (
                        <CommandItem
                          key={artist}
                          value={artist}
                          onSelect={(currentValue) => {
                            if (!parsed.featArtists.includes(currentValue)) {
                              updateParent(parsed.mainArtist, [...parsed.featArtists, currentValue]);
                            }
                            setFeatSearch("");
                          }}
                          className="mb-1 cursor-pointer"
                        >
                          <Plus size={16} className="text-zinc-500 opacity-70" />
                          <span className="flex-1 truncate">
                            {artist}
                          </span>
                        </CommandItem>
                      );
                    })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-100">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <Users className="text-indigo-400 w-5 h-5" />
              Xác nhận tạo Nghệ sĩ mới
            </DialogTitle>
            <DialogDescription className="text-zinc-400 pt-3">
              Nghệ sĩ <span className="font-bold text-white">"{pendingNewArtist.name}"</span> hiện chưa có trong cơ sở dữ liệu. Bạn có chắc chắn muốn tạo mới không?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="secondary" onClick={() => setConfirmModalOpen(false)} className="border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300">
              Hủy
            </Button>
            <Button onClick={confirmCreate} className="btn-gradient-success px-6">
              Đồng ý
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
