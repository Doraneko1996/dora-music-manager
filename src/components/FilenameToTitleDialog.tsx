import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from './ui/dialog';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { useAudioStore } from '../store/useAudioStore';
import { FileText, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface FilenameToTitleDialogProps {
  children?: React.ReactNode;
}

export const FilenameToTitleDialog: React.FC<FilenameToTitleDialogProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const { musicFiles, selectedFiles, applyFilenamesToTitles } = useAudioStore();

  const selectedMusicFiles = musicFiles.filter(f => selectedFiles.includes(f.file_path));

  const handleApply = async () => {
    await applyFilenamesToTitles();
    setOpen(false);
    toast.success(`Đã áp dụng Tên File thành Title cho ${selectedFiles.length} file.`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button 
            variant="secondary" 
            size="sm" 
            disabled={selectedFiles.length === 0}
            className="gap-2 bg-zinc-800/50 hover:bg-zinc-700/50 border border-white/5"
          >
            <FileText size={16} />
            Tên File -&gt; Title
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl text-zinc-100 p-0 flex flex-col max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Chuyển Tên File thành Title</DialogTitle>
            <DialogDescription>
              Hành động này sẽ lấy tên file (bỏ đuôi mở rộng) và áp dụng làm thuộc tính Title cho các file đã chọn.
            </DialogDescription>
          </DialogHeader>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-0 min-h-[200px]">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 p-4 text-xs font-medium text-zinc-400 uppercase tracking-wider sticky top-0 bg-zinc-950/95 backdrop-blur z-10 border-b border-white/5 shadow-md">
            <div>Tên File (Hiện tại)</div>
            <div className="w-8"></div>
            <div>Title (Mới)</div>
          </div>
          
          <div className="divide-y divide-white/5">
            {selectedMusicFiles.map(file => {
              const lastDotIndex = file.file_name.lastIndexOf('.');
              const baseName = lastDotIndex !== -1 ? file.file_name.substring(0, lastDotIndex) : file.file_name;
              
              return (
                <div key={file.file_path} className="grid grid-cols-[1fr_auto_1fr] gap-4 p-4 hover:bg-white/5 items-center transition-colors">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-sm truncate text-zinc-300">
                        {file.file_name}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{file.file_name}</TooltipContent>
                  </Tooltip>
                  <div className="flex items-center justify-center text-zinc-600">
                    <ArrowRight size={14} />
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-sm truncate font-medium text-indigo-300">
                        {baseName}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{baseName}</TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
            
            {selectedMusicFiles.length === 0 && (
              <div className="p-8 text-center text-zinc-500 text-sm">
                Không có file nào được chọn
              </div>
            )}
          </div>
        </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary" className="border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer">Hủy</Button>
            </DialogClose>
            <Button onClick={handleApply} className="btn-gradient-brand gap-2" disabled={selectedFiles.length === 0}>
              Áp dụng
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
