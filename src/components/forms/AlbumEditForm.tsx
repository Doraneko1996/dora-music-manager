import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAudioStore, AudioMetadata } from '../../store/useAudioStore';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem } from '../ui/form';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Music, Save, X, Edit3, Trash2, AlertTriangle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { cn } from '../../lib/utils';
import { calculateCommonMetadata, FormValues } from '../../lib/metadataUtils';
import { TrackList } from '../TrackList';
import { CoverArtUploader } from '../CoverArtUploader';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { HoldButton } from '../ui/hold-button';
import { toast } from 'sonner';
export const AlbumEditForm: React.FC = () => {
  const {
    musicFiles, selectedFiles,
    setPendingMetadata, setPendingArtworkPath,
    setCurrentArtworkBase64, saveChanges,
    isEditing, setIsEditing, selectedEntityName, customAlbums, directoryPath,
    save_folder_meta, refreshData
  } = useAudioStore();

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);

  const handleDeleteAlbum = async () => {
    if (!selectedEntityName) return;
    
    const albumFiles = musicFiles.filter(f => f.album === selectedEntityName).map(f => f.file_path);
    
    try {
      if (albumFiles.length > 0) {
        await invoke('process_and_embed_artwork', { files: albumFiles, imagePath: "" });
        
        const updates = albumFiles.map(path => ({
          file_path: path,
          album: "",
          file_name: musicFiles.find(f => f.file_path === path)?.file_name || "",
          has_cover: false
        }));
        
        await invoke('update_metadata_batch', { updates });
      }

      const newCustomAlbums = customAlbums.filter(a => a.album_name !== selectedEntityName);
      const { customArtists, customGenres } = useAudioStore.getState();
      await save_folder_meta(customArtists, newCustomAlbums, customGenres);
      
      setIsDeleteDialogOpen(false);
      toast.success(`Đã xoá album "${selectedEntityName}" khỏi hệ thống.`);
      
      const { setSelectedEntityName, setSelectedFiles } = useAudioStore.getState();
      setSelectedEntityName(null);
      setSelectedFiles([]);
      await refreshData(true);
      
    } catch (e) {
      console.error(e);
      toast.error(`Lỗi khi xoá album: ${e}`);
    }
  };

  const form = useForm<FormValues>({
    defaultValues: { title: '', artist: '', album: '', genre: '', year: '' }
  });

  const { reset, watch, control } = form;

  // Reset form khi thay đổi bài hát được chọn
  useEffect(() => {
    const common = calculateCommonMetadata(selectedFiles, musicFiles);
    if (selectedFiles.length === 0 && selectedEntityName) {
      common.album = selectedEntityName;
    }
    reset(common);
    setPendingArtworkPath(null);

    if (selectedFiles.length > 0 || selectedEntityName) {
      setPendingMetadata({ album: common.album } as Partial<AudioMetadata>);
    } else {
      setPendingMetadata({});
    }

    if (selectedFiles.length > 0) {
      // Load ảnh của bài đầu tiên làm đại diện cho Album
      invoke('get_cover_art', { path: selectedFiles[0] })
        .then((res: any) => setCurrentArtworkBase64(res || null))
        .catch((err) => {
          console.error("Lỗi khi load ảnh:", err);
          setCurrentArtworkBase64(null);
        });
    } else if (selectedEntityName) {
      const customAlbum = customAlbums.find(a => a.album_name === selectedEntityName);
      if (customAlbum && customAlbum.cover_path) {
        const separator = directoryPath.includes('\\') ? '\\' : '/';
        const coverUrl = convertFileSrc(`${directoryPath}${separator}${customAlbum.cover_path}`);
        setCurrentArtworkBase64(coverUrl);
      } else {
        setCurrentArtworkBase64(null);
      }
    } else {
      setCurrentArtworkBase64(null);
    }
  }, [selectedFiles, musicFiles, reset, setPendingArtworkPath, setPendingMetadata, setCurrentArtworkBase64, selectedEntityName, customAlbums, directoryPath]);

  // Đồng bộ giá trị form lên Zustand store khi người dùng nhập liệu
  useEffect(() => {
    const subscription = watch((value, { type }) => {
      if (selectedFiles.length > 0) {
        setPendingMetadata({ album: value.album } as Partial<AudioMetadata>);
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

  const isDisabled = selectedFiles.length === 0 && !selectedEntityName;

  const handleCancel = () => {
    const common = calculateCommonMetadata(selectedFiles, musicFiles);
    if (selectedFiles.length === 0 && selectedEntityName) {
      common.album = selectedEntityName;
    }
    reset(common);
    setPendingArtworkPath(null);
    setIsEditing(false);

    if (selectedFiles.length > 0 || selectedEntityName) {
      setPendingMetadata(common as unknown as Partial<AudioMetadata>);
    } else {
      setPendingMetadata({});
    }
  };

  const inputClass = cn(
    "transition-all duration-300",
    !isEditing && "border-transparent bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-transparent focus-visible:bg-transparent cursor-default select-text"
  );

  if (isDisabled) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-3 h-full">
        <Music size={48} className="opacity-30 mb-2" />
        <p className="text-sm font-medium text-center px-4">Hãy chọn một Album</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <div className="flex flex-col gap-4 w-full h-full min-h-0">

        {/* Header (Title & Cover) */}
        <div className="flex flex-col shrink-0 w-full gap-1">
          {/* Album Title */}
          <div className="flex flex-col text-center px-2 shrink-0">
            <FormField
              control={control}
              name="album"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {isEditing ? (
                          <Input
                            {...field}
                            id="album"
                            placeholder="Tên Album..."
                            className={cn(inputClass, "text-lg font-bold text-center h-8 py-0 truncate")}
                          />
                        ) : (
                          <div
                            className={cn(inputClass, "text-lg font-bold text-center h-8 py-0 px-3 truncate w-full flex items-center justify-center")}
                          >
                            {field.value || "Chưa có tên Album"}
                          </div>
                        )}
                      </TooltipTrigger>
                      {field.value && <TooltipContent>{field.value}</TooltipContent>}
                    </Tooltip>
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Cover Art Section */}
          <div className="flex justify-center w-full mt-1 mb-1">
            <CoverArtUploader
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              maxSizeClassName="w-24 h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 aspect-square shadow-2xl shadow-indigo-500/10"
            />
          </div>
        </div>

        {/* TrackList Section */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden pr-2 pb-2 mask-fade-y border-t border-white/5 pt-2">
          <TrackList
            files={musicFiles.filter(f => selectedFiles.includes(f.file_path))}
            className="flex-1 flex flex-col min-h-0"
          />
        </div>

        <div className="pt-3 border-t border-white/5 shrink-0 flex flex-col gap-2 mt-auto">
          {!isEditing ? (
            <div className="flex gap-2 w-full">
              <Button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex-1 gap-2 btn-gradient-primary cursor-pointer"
              >
                <Edit3 size={18} />
                Chỉnh sửa Album
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="gap-2 cursor-pointer bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-3"
              >
                <Trash2 size={18} />
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
                onClick={saveChanges}
                className="flex-1 gap-2 btn-gradient-success cursor-pointer"
              >
                <Save size={18} />
                Lưu Thay Đổi
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-500">
              <AlertTriangle size={18} />
              Xoá Album
            </DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xoá Album <strong className="text-white">{selectedEntityName}</strong> này? Thao tác này sẽ gỡ album và ảnh bìa khỏi tất cả bài hát thuộc album.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsDeleteDialogOpen(false)} className="cursor-pointer">
              Huỷ
            </Button>
            <HoldButton 
              onHold={handleDeleteAlbum} 
              holdDuration={3000} 
              className="btn-gradient-destructive cursor-pointer"
            >
              Đồng ý xoá
            </HoldButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Form>
  );
};
