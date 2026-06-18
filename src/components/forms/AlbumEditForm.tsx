import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAudioStore, AudioMetadata } from '../../store/useAudioStore';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem } from '../ui/form';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Music, Save, X, Edit3 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '../../lib/utils';
import { calculateCommonMetadata, FormValues } from '../../lib/metadataUtils';
import { TrackList } from '../TrackList';
import { CoverArtUploader } from '../CoverArtUploader';
export const AlbumEditForm: React.FC = () => {
  const {
    musicFiles, selectedFiles,
    setPendingMetadata, setPendingArtworkPath,
    setCurrentArtworkBase64, saveChanges,
    isEditing, setIsEditing
  } = useAudioStore();

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
    } else {
      setCurrentArtworkBase64(null);
    }
  }, [selectedFiles, musicFiles, reset, setPendingArtworkPath, setPendingMetadata, setCurrentArtworkBase64]);

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
      <div className="flex flex-col gap-6 w-full h-full min-h-0">

        {/* Header (Title & Cover) - Max 35% viewport height */}
        <div className="flex flex-col shrink-0 max-h-[35vh] min-h-0 w-full gap-2">
          {/* Album Title */}
          <div className="flex flex-col gap-1 text-center px-2 shrink-0 pt-2">
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
                            className={cn(inputClass, "text-2xl font-bold text-center h-auto py-2 truncate")}
                          />
                        ) : (
                          <div
                            className={cn(inputClass, "text-2xl font-bold text-center h-auto py-2 px-3 truncate w-full")}
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

          {/* Cover Art Section - Ưu tiên hiển thị lớn */}
          <div className="flex-1 flex justify-center w-full items-center min-h-0 -mt-2">
            <CoverArtUploader
              isEditing={isEditing}
              setIsEditing={setIsEditing}
              maxSizeClassName="h-full max-h-[280px] !w-auto aspect-square shadow-2xl shadow-indigo-500/10"
            />
          </div>
        </div>

        {/* TrackList Section - Có thể cuộn */}
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-2">
          <TrackList
            files={musicFiles.filter(f => selectedFiles.includes(f.file_path))}
          />
        </div>

        <div className="pt-3 border-t border-white/5 shrink-0 flex flex-col gap-2">
          {!isEditing ? (
            <Button
              type="button"
              onClick={() => setIsEditing(true)}
              className="w-full gap-2 btn-gradient-primary cursor-pointer"
            >
              <Edit3 size={18} />
              Chỉnh sửa thông tin Album
            </Button>
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
    </Form>
  );
};
