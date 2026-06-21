import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useAudioStore } from '../../store/useAudioStore';
import { toast } from 'sonner';
import { Disc3 } from 'lucide-react';
import { ImageUploader } from '../ui/image-uploader';
import { invoke } from '@tauri-apps/api/core';

interface AddAlbumModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAlbumModal({ isOpen, onOpenChange }: AddAlbumModalProps) {
  const [name, setName] = useState('');
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isValidImage, setIsValidImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { directoryPath, addCustomAlbum } = useAudioStore();

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSaving) {
      setName('');
      setPendingPath(null);
      setPreviewUrl(null);
      setIsValidImage(false);
      onOpenChange(false);
    } else if (open) {
      onOpenChange(true);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !pendingPath || !isValidImage) return;

    setIsSaving(true);
    try {
      let finalImagePath = pendingPath;

      if (!finalImagePath.toLowerCase().endsWith('.png')) {
        try {
          finalImagePath = await invoke('convert_image_to_png', { path: finalImagePath });
        } catch (err) {
          console.error("Lỗi khi chuyển đổi ảnh sang png", err);
        }
      }

      const relativePath: string = await invoke('save_custom_album_cover', {
        directoryPath: directoryPath,
        albumName: name.trim(),
        sourcePath: finalImagePath
      });

      await addCustomAlbum(name.trim(), relativePath);

      toast.success(`Đã thêm album "${name.trim()}"`);
      handleOpenChange(false);
    } catch (err) {
      console.error("Lỗi khi lưu album:", err);
      toast.error("Không thể lưu ảnh bìa album");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageSelect = (path: string, preview: string) => {
    setPendingPath(path);
    setPreviewUrl(preview);
  };

  const handleImageDelete = () => {
    setPendingPath(null);
    setPreviewUrl(null);
    setIsValidImage(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Disc3 className="text-indigo-400 w-5 h-5" />
            Thêm Album Mới
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="px-6 space-y-4">
            <Input
              placeholder="Nhập tên album..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />

            <div className="h-64">
              <ImageUploader
                imageSource={previewUrl}
                pendingPath={pendingPath}
                isEditing={true}
                maxSizeClassName="max-w-[240px]"
                onImageSelect={handleImageSelect}
                onImageDelete={handleImageDelete}
                onValidationChange={(valid) => setIsValidImage(valid)}
              />
            </div>
            {!previewUrl && (
              <p className="text-xs text-center text-zinc-400">Vui lòng chọn ảnh bìa cho Album (Bắt buộc)</p>
            )}
            {previewUrl && pendingPath && !pendingPath.toLowerCase().endsWith('.png') && (
              <p className="text-[13px] text-center text-indigo-400 font-medium italic mt-1">
                * Ảnh sẽ được tự động chuyển sang định dạng chuẩn PNG khi lưu
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => handleOpenChange(false)} className="bg-transparent border-white/10 text-zinc-300 hover:bg-white/5">
              Huỷ
            </Button>
            <Button type="submit" disabled={!name.trim() || !previewUrl || !isValidImage || isSaving} className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
              {isSaving ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
