import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Check, ChevronsUpDown, Plus, Tag } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAudioStore } from '../../store/useAudioStore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { TruncatedTooltip } from '../ui/truncated-tooltip';

interface GenreSelectProps {
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
  className?: string;
}

export const GenreSelect: React.FC<GenreSelectProps> = ({ value, onChange, isEditing, className }) => {
  const { aggregatedData } = useAudioStore();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [pendingNewGenre, setPendingNewGenre] = useState("");

  const genres = aggregatedData?.genres || [];

  const displayValue = value === '<Keep>' ? 'Giữ nguyên hiện tại...' : value;

  const handleCreateNew = (newGenre: string) => {
    setPendingNewGenre(newGenre);
    setConfirmModalOpen(true);
  };

  const confirmCreate = () => {
    onChange(pendingNewGenre);
    setConfirmModalOpen(false);
    setOpen(false);
  };

  if (!isEditing) {
    return (
      <Input
        value={displayValue}
        readOnly
        className={cn("border-transparent bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-transparent focus-visible:bg-transparent cursor-default select-text truncate", className)}
        placeholder="Trống"
      />
    );
  }

  const showCreateOption = searchValue.trim() !== "" && !genres.some(g => g.toLowerCase() === searchValue.trim().toLowerCase());

  return (
    <div className="w-full min-w-0">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full h-10 justify-between bg-white/5 border-white/10 hover:bg-white/10 hover:text-white transition-all font-normal text-left overflow-hidden",
              open && "ring-2 ring-indigo-500/50 border-indigo-500 bg-white/10 text-white",
              className
            )}
          >
            <TruncatedTooltip
              className="truncate flex-1 min-w-0 text-left block"
              text={value ? displayValue : "Chọn hoặc nhập tên thể loại..."}
              fullText={value ? displayValue : "Chọn hoặc nhập tên thể loại..."}
            />
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent usePortal={false} align="start" className="min-w-60 w-(--radix-popover-trigger-width) p-1 border border-white/10 bg-black/70 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] rounded-xl">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Tìm hoặc thêm mới..."
              value={searchValue}
              onValueChange={setSearchValue}
              className="border-none focus:ring-0 text-zinc-100 placeholder:text-zinc-500 h-10"
            />
            <CommandList className="max-h-75 overflow-y-auto custom-scrollbar">
              {genres.length === 0 && !showCreateOption && (
                <CommandEmpty className="text-zinc-500 py-6 text-center">Không có dữ liệu thể loại</CommandEmpty>
              )}

              {showCreateOption && (
                <div className="p-2 border-b border-white/5">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-indigo-400 hover:text-indigo-300 bg-linear-to-r from-transparent to-transparent hover:from-indigo-500/0 hover:to-indigo-500/15 hover:bg-white/5 border border-transparent hover:border-white/5 cursor-pointer transition-all"
                    onClick={() => handleCreateNew(searchValue.trim())}
                  >
                    <Plus size={16} />
                    Tạo mới: "{searchValue.trim()}"
                  </Button>
                </div>
              )}

              <CommandGroup>
                {genres.filter(g => g.toLowerCase().includes(searchValue.toLowerCase())).map((genre) => {
                  const isSelected = value === genre;

                  return (
                    <CommandItem
                      key={genre}
                      value={genre}
                      onSelect={(currentValue) => {
                        onChange(currentValue);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 cursor-pointer py-2 px-3 transition-all rounded-md mb-1 text-zinc-300 border border-transparent",
                        isSelected
                          ? "bg-indigo-500/10 border-indigo-500/30 text-white shadow-md shadow-indigo-500/5 font-medium"
                          : "hover:bg-white/5 hover:border-white/5 hover:bg-linear-to-r hover:from-indigo-500/0 hover:to-indigo-500/15"
                      )}
                    >
                      <Tag size={16} className={isSelected ? "text-indigo-400" : "text-zinc-500"} />
                      <span className="flex-1 truncate">
                        {genre}
                      </span>
                      {isSelected && (
                        <Check className="h-4 w-4 shrink-0 text-indigo-400" />
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-100 bg-zinc-950 border border-white/10 text-white shadow-2xl shadow-black">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <Tag className="text-indigo-400 w-5 h-5" />
              Xác nhận tạo Thể loại mới
            </DialogTitle>
            <DialogDescription className="text-zinc-400 pt-3">
              Thể loại <span className="font-bold text-white">"{pendingNewGenre}"</span> hiện chưa có trong cơ sở dữ liệu. Bạn có chắc chắn muốn tạo mới không?
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
