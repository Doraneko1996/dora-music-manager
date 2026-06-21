import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAudioStore, AudioMetadata } from '../../store/useAudioStore';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem } from '../ui/form';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Music, Save, X, Edit3 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { calculateCommonMetadata, FormValues } from '../../lib/metadataUtils';
import { TrackList } from '../TrackList';

export const ArtistEditForm: React.FC = () => {
  const {
    musicFiles, selectedFiles,
    setPendingMetadata, saveChanges,
    isEditing, setIsEditing, selectedEntityName
  } = useAudioStore();


  const form = useForm<FormValues>({
    defaultValues: { title: '', artist: '', album: '', genre: '', year: '' }
  });

  const { reset, watch } = form;

  useEffect(() => {
    const common = calculateCommonMetadata(selectedFiles, musicFiles);
    let defaultArtist = common.artist || '';

    if (selectedFiles.length === 0 && selectedEntityName) {
      defaultArtist = selectedEntityName;
    } else if (selectedEntityName) {
      defaultArtist = selectedEntityName;
    }

    reset({ artist: defaultArtist });

    if (selectedFiles.length > 0 || selectedEntityName) {
      setPendingMetadata({ artist: defaultArtist } as Partial<AudioMetadata>);
    } else {
      setPendingMetadata({});
    }
  }, [selectedFiles, musicFiles, reset, setPendingMetadata, selectedEntityName]);

  // Đồng bộ giá trị form lên Zustand store khi người dùng nhập liệu
  useEffect(() => {
    const subscription = watch((value, { type }) => {
      if (selectedFiles.length > 0) {
        setPendingMetadata({ artist: value.artist } as Partial<AudioMetadata>);
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
    };
  }, [setIsEditing, setPendingMetadata]);

  const handleCancel = () => {
    const common = calculateCommonMetadata(selectedFiles, musicFiles);
    const defaultArtist = selectedEntityName || common.artist || '';
    reset({ artist: defaultArtist });
    setIsEditing(false);

    if (selectedFiles.length > 0) {
      setPendingMetadata({ artist: defaultArtist } as Partial<AudioMetadata>);
    } else {
      setPendingMetadata({});
    }
  };

  const isDisabled = selectedFiles.length === 0 && !selectedEntityName;

  if (isDisabled) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-3 h-full">
        <Music size={48} className="opacity-30 mb-2" />
        <p className="text-sm font-medium text-center px-4">Hãy chọn một Nghệ sĩ</p>
      </div>
    );
  }

  const inputClass = cn(
    "transition-all duration-300",
    !isEditing && "border-transparent bg-transparent shadow-none focus-visible:ring-0 focus-visible:border-transparent focus-visible:bg-transparent cursor-default select-text"
  );

  return (
    <Form {...form}>
      <div className="flex flex-col gap-4 w-full h-full min-h-0">
        <div className="flex flex-col gap-4 flex-1 min-h-[50%] shrink-0 overflow-y-auto custom-scrollbar pr-2 py-4 -my-4 mask-fade-y min-w-0">
          <div className="flex flex-col gap-2 mt-4 text-center px-2">
            <Label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider text-center">Nghệ Sĩ</Label>
            <FormField
              control={form.control}
              name="artist"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {isEditing ? (
                          <Input
                            {...field}
                            id="artist"
                            placeholder="Nhập tên nghệ sĩ..."
                            className={cn(inputClass, "text-2xl font-bold text-center h-auto py-2 truncate")}
                          />
                        ) : (
                          <div
                            className={cn(inputClass, "text-2xl font-bold text-center h-auto py-2 px-3 truncate w-full")}
                          >
                            {field.value || "Chưa có tên nghệ sĩ"}
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

          <TrackList 
            files={musicFiles.filter(f => selectedFiles.includes(f.file_path))} 
            selectedEntityName={selectedEntityName} 
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
              Đổi tên Nghệ Sĩ
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
