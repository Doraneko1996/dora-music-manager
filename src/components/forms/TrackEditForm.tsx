import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAudioStore, AudioMetadata } from '../../store/useAudioStore';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem } from '../ui/form';
import { Music, Save, X, Edit3, Trash2, FileText } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '../../lib/utils';
import { calculateCommonMetadata, FormValues } from '../../lib/metadataUtils';
import { CoverArtUploader } from '../CoverArtUploader';
import { TrackList } from '../TrackList';
import { FilenameToTitleDialog } from '../FilenameToTitleDialog';
import { ArtistSelect } from './ArtistSelect';
import { AlbumSelect } from './AlbumSelect';
import { GenreSelect } from './GenreSelect';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "../ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

export const TrackEditForm: React.FC = () => {
  const {
    musicFiles, selectedFiles, clearMetadata,
    setPendingMetadata, setPendingArtworkPath,
    setCurrentArtworkBase64, saveChanges,
    isEditing, setIsEditing
  } = useAudioStore();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: { title: '', artist: '', album: '', genre: '', year: '' }
  });

  const { reset, watch, control } = form;

  // Reset form khi thay đổi bài hát được chọn
  useEffect(() => {
    const common = calculateCommonMetadata(selectedFiles, musicFiles);
    reset(common);
    setPendingArtworkPath(null);

    if (selectedFiles.length > 0) {
      setPendingMetadata(common as unknown as Partial<AudioMetadata>);
    } else {
      setPendingMetadata({});
    }

    // Tải ảnh bìa hiện tại nếu chỉ chọn 1 file
    if (selectedFiles.length === 1) {
      invoke('get_cover_art', { path: selectedFiles[0] })
        .then((res: any) => setCurrentArtworkBase64(res || null))
        .catch((err) => {
          console.error("Lỗi khi load ảnh:", err);
          setCurrentArtworkBase64(null);
        });
    } else {
      setCurrentArtworkBase64(null);
    }
  }, [selectedFiles, musicFiles, reset, setPendingArtworkPath, setPendingMetadata, setCurrentArtworkBase64]);

  // Đồng bộ giá trị form lên Zustand store khi người dùng nhập liệu
  useEffect(() => {
    const subscription = watch((value, { type }) => {
      if (selectedFiles.length > 0) {
        setPendingMetadata(value as Partial<AudioMetadata>);
        if (type === 'change') {
          setIsEditing(true);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, selectedFiles, setPendingMetadata, setIsEditing]);

  // Xóa state khi đổi tab (unmount component)
  useEffect(() => {
    return () => {
      setIsEditing(false);
      setPendingMetadata({});
      setPendingArtworkPath(null);
      setCurrentArtworkBase64(null);
    };
  }, [setIsEditing, setPendingMetadata, setPendingArtworkPath, setCurrentArtworkBase64]);

  const isDisabled = selectedFiles.length === 0;

  const handleCancel = () => {
    const common = calculateCommonMetadata(selectedFiles, musicFiles);
    reset(common);
    setPendingArtworkPath(null);
    setIsEditing(false);

    if (selectedFiles.length > 0) {
      setPendingMetadata(common as unknown as Partial<AudioMetadata>);
    } else {
      setPendingMetadata({});
    }
  };

  const handleClearAllMetadata = async () => {
    setIsConfirmOpen(false);
    
    const emptyMetadata: Partial<AudioMetadata> = {
      title: "",
      artist: "",
      album: "",
      genre: "",
      year: undefined,
    };
    
    setPendingMetadata(emptyMetadata);
    setPendingArtworkPath(""); 
    
    // Gọi hàm lưu nhưng với dữ liệu trống
    await saveChanges();
  };

  if (isDisabled) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-3 h-full">
        <Music size={48} className="opacity-30 mb-2" />
        <p className="text-sm font-medium text-center px-4">Thông tin bài hát hiển thị ở đây</p>
      </div>
    );
  }

  const inputClass = cn(
    "transition-all duration-300 w-full",
    isEditing 
      ? "bg-white/5 border-white/10 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 focus-visible:bg-white/10" 
      : "border-transparent bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-transparent focus-visible:bg-transparent cursor-default select-text"
  );

  if (selectedFiles.length > 1) {
    return (
      <div className="flex flex-col gap-4 w-full h-[calc(100vh-160px)]">
        <TrackList 
          files={musicFiles.filter(f => selectedFiles.includes(f.file_path))} 
          className="flex-1 flex flex-col min-h-0 w-full overflow-hidden" 
          title="Danh sách bài hát đang chọn"
        />
        
        <div className="flex items-center gap-3 shrink-0 mt-2">
          <FilenameToTitleDialog>
            <Button variant="default" className="w-full h-10 gap-2 btn-gradient-brand cursor-pointer" disabled={selectedFiles.length === 0}>
              <FileText size={16} />
              Tên File ➔ Title
            </Button>
          </FilenameToTitleDialog>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" className="w-full h-10 gap-2 btn-gradient-destructive cursor-pointer" disabled={selectedFiles.length === 0}>
                <Trash2 size={16} />
                Xoá Metadata
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-106.25 bg-zinc-950 border border-white/10 text-white shadow-2xl shadow-black">
              <DialogHeader>
                <DialogTitle className="text-zinc-100 flex items-center gap-2 text-[17px]">
                  <Trash2 className="text-red-400 w-5 h-5" />
                  Xoá dữ liệu metadata
                </DialogTitle>
                <DialogDescription className="text-zinc-400 pt-2 text-sm leading-relaxed">
                  Bạn sắp xoá toàn bộ thông tin metadata (Title, Artist, Album, Genre, Year) của <span className="font-bold text-white">{selectedFiles.length} bài hát</span>. Hành động này sẽ thay đổi nội dung file gốc và không thể hoàn tác. Bạn có chắc chắn không?
                </DialogDescription>
              </DialogHeader>
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary" className="border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer">Hủy</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="destructive" onClick={clearMetadata} className="btn-gradient-destructive cursor-pointer px-5">Xoá Dữ Liệu</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  const file = musicFiles.find(f => f.file_path === selectedFiles[0]);
  let baseName = '';
  if (file && file.file_name) {
    const lastDotIndex = file.file_name.lastIndexOf('.');
    baseName = lastDotIndex !== -1 ? file.file_name.substring(0, lastDotIndex) : file.file_name;
  }
  const currentTitle = watch('title');
  const isTitleSameAsFileName = currentTitle === baseName;

  return (
    <Form {...form}>
      <div className="flex flex-col gap-4 w-full h-full min-h-0">
        <div className="flex flex-col gap-4 flex-1 min-h-[50%] shrink-0 overflow-y-auto custom-scrollbar pr-2 py-4 -my-4 mask-fade-y min-w-0">
          <div className="grid gap-2 min-w-0">
            <div className="flex items-center justify-between">
              <Label htmlFor="title" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Title</Label>
              {isEditing && !isTitleSameAsFileName && (
                <button
                  type="button"
                  onClick={() => {
                    if (baseName) {
                      form.setValue('title', baseName, { shouldDirty: true, shouldValidate: true });
                    }
                  }}
                  className="text-[11px] font-medium text-indigo-200 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer bg-indigo-500/20 hover:bg-indigo-500/40 px-2.5 py-1 rounded-md border border-indigo-500/30 shadow-sm hover:shadow-indigo-500/20"
                  title="Lấy tên file làm tiêu đề"
                >
                  <FileText size={10} />
                  Dùng tên file
                </button>
              )}
            </div>
            <FormField
              control={control}
              name="title"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormControl>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Input
                          {...field}
                          id="title"
                          readOnly={!isEditing}
                          placeholder={isEditing ? "Nhập tiêu đề..." : "Trống"}
                          className={cn(inputClass, "truncate")}
                        />
                      </TooltipTrigger>
                      {field.value && <TooltipContent>{field.value}</TooltipContent>}
                    </Tooltip>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-2 min-w-0">
            <Label htmlFor="artist" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Artist</Label>
            <FormField
              control={control}
              name="artist"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormControl>
                    <ArtistSelect 
                      value={field.value || ""} 
                      onChange={field.onChange} 
                      isEditing={isEditing} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-2 min-w-0">
            <Label htmlFor="album" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Album</Label>
            <FormField
              control={control}
              name="album"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <FormControl>
                    <AlbumSelect 
                      value={field.value || ""} 
                      onChange={field.onChange} 
                      isEditing={isEditing} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="flex gap-4">
            <div className="grid gap-2 flex-1 min-w-0">
              <Label htmlFor="year" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Year</Label>
              <FormField
                control={control}
                name="year"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormControl>
                      <Input
                        {...field}
                        id="year"
                        type="text"
                        readOnly={!isEditing}
                        placeholder={isEditing ? "Năm..." : "Trống"}
                        className={inputClass}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-2 flex-1 min-w-0">
              <Label htmlFor="genre" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Genre</Label>
              <FormField
                control={control}
                name="genre"
                render={({ field }) => (
                  <FormItem className="min-w-0">
                    <FormControl>
                      <GenreSelect 
                        value={field.value || ""} 
                        onChange={field.onChange} 
                        isEditing={isEditing} 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
        <div className="flex-1 shrink flex justify-center w-full min-h-0 items-center">
          <CoverArtUploader 
            isEditing={isEditing} 
            setIsEditing={setIsEditing} 
            maxSizeClassName="max-h-[260px] sm:max-h-[320px] !w-auto aspect-square"
          />
        </div>

        <div className="pt-3 border-t border-white/5 shrink-0 flex flex-col gap-2">
          {!isEditing ? (
            <div className="flex flex-wrap gap-2 w-full">
              <Button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex-1 gap-2 btn-gradient-primary cursor-pointer"
              >
                <Edit3 size={18} />
                Chỉnh sửa
              </Button>
              <Button
                type="button"
                onClick={() => setIsConfirmOpen(true)}
                variant="destructive"
                className="flex-1 gap-2 bg-linear-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-500/20 border-0 transition-all cursor-pointer"
              >
                <Trash2 size={18} />
                Xóa metadata
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 w-full">
              <Button
                type="button"
                onClick={handleCancel}
                variant="secondary"
                className="flex-1 gap-2 border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-zinc-100 transition-all cursor-pointer"
              >
                <X size={18} />
                Hủy
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const currentAlbum = watch('album');
                  const { aggregatedData, pendingArtworkPath, currentArtworkBase64 } = useAudioStore.getState();
                  const isNewAlbum = currentAlbum && !aggregatedData?.albums?.some(a => a.album_name === currentAlbum);
                  
                  if (isNewAlbum && !pendingArtworkPath && !currentArtworkBase64) {
                    import('sonner').then(({ toast }) => {
                      toast.error('Cần thêm ảnh bìa', {
                        description: `Album "${currentAlbum}" là album mới. Bạn bắt buộc phải thêm ảnh bìa cho bài hát để làm ảnh bìa cho album này.`
                      });
                    });
                    return;
                  }
                  
                  saveChanges();
                }}
                className="flex-1 gap-2 btn-gradient-success cursor-pointer"
              >
                <Save size={18} />
                Lưu Thay Đổi
              </Button>
            </div>
          )}
        </div>

        <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <DialogContent className="sm:max-w-100 bg-zinc-950 border border-white/10 text-white shadow-2xl shadow-black">
            <DialogHeader>
              <DialogTitle className="text-zinc-100 flex items-center gap-2 text-[17px]">
                <Trash2 className="text-red-400 w-5 h-5" />
                Xác nhận xóa metadata
              </DialogTitle>
              <DialogDescription className="text-zinc-400 pt-2 text-sm leading-relaxed">
                Bạn có chắc chắn muốn xóa sạch metadata và ảnh bìa của bài hát này? Hành động này không thể hoàn tác.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsConfirmOpen(false)}
                className="border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer"
              >
                Hủy
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleClearAllMetadata}
                  className="btn-gradient-destructive cursor-pointer px-5"
                >
                  Xác nhận xóa
                </Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Form>
  );
};
