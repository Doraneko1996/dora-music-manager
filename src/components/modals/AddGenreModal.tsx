import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useAudioStore } from '../../store/useAudioStore';
import { toast } from 'sonner';
import { Tag } from 'lucide-react';

interface AddGenreModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddGenreModal({ isOpen, onOpenChange }: AddGenreModalProps) {
  const [name, setName] = useState('');
  const { addCustomGenre } = useAudioStore();

  const handleOpenChange = (open: boolean) => {
    if (!open) setName('');
    onOpenChange(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    try {
      await addCustomGenre(name.trim());
      toast.success(`Đã thêm thể loại "${name.trim()}"`);
      handleOpenChange(false);
    } catch (err) {
      toast.error("Đã xảy ra lỗi khi lưu thể loại. Vui lòng thử lại!");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Tag className="text-indigo-400 w-5 h-5" />
            Thêm Thể Loại Mới
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="px-6 space-y-4">
            <Input 
              placeholder="Nhập tên thể loại..." 
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="bg-transparent border-white/10 text-zinc-300 hover:bg-white/5">
              Huỷ
            </Button>
            <Button type="submit" disabled={!name.trim()} className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
