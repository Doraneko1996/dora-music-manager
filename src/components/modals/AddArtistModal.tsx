import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useAudioStore } from '../../store/useAudioStore';
import { toast } from 'sonner';
import { Users } from 'lucide-react';

interface AddArtistModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddArtistModal({ isOpen, onOpenChange }: AddArtistModalProps) {
  const [name, setName] = useState('');
  const { addCustomArtist } = useAudioStore();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName('');
    }
    onOpenChange(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    try {
      await addCustomArtist(name.trim());
      toast.success(`Đã thêm nghệ sĩ "${name.trim()}"`);
      handleOpenChange(false);
    } catch (err) {
      toast.error("Đã xảy ra lỗi khi lưu nghệ sĩ. Vui lòng thử lại!");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Users className="text-indigo-400 w-5 h-5" />
            Thêm Nghệ Sĩ Mới
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="px-6 space-y-4">
            <Input 
              placeholder="Nhập tên nghệ sĩ..." 
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
