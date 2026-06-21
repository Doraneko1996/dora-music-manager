import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { Trash2, Image as ImageIcon, Music, AlertTriangle, RefreshCcw } from 'lucide-react';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';

export interface ImageUploaderProps {
  imageSource: string | null;
  pendingPath: string | null;
  isEditing: boolean;
  disabled?: boolean;
  maxSizeClassName?: string;
  onImageSelect: (path: string, previewUrl: string) => void;
  onImageDelete: () => void;
  onValidationChange?: (isValid: boolean) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  imageSource,
  pendingPath,
  isEditing,
  disabled = false,
  maxSizeClassName = "max-w-[320px]",
  onImageSelect,
  onImageDelete,
  onValidationChange
}) => {
  const [imageWarning, setImageWarning] = React.useState<{ format: string, width: number, height: number, isSquare: boolean } | null>(null);
  const [canConvert, setCanConvert] = React.useState<boolean>(false);
  const [isConverting, setIsConverting] = React.useState(false);

  React.useEffect(() => {
    setImageWarning(null);
    setCanConvert(false);
    if (onValidationChange && !imageSource) {
      onValidationChange(false); // Tuỳ context parent xử lý nếu bắt buộc, ở đây chỉ báo warning rỗng
    }
  }, [imageSource, onValidationChange]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const path = (file as any).path; // Lấy path thật trên Tauri
      if (path) {
        onImageSelect(path, URL.createObjectURL(file));
      }
    }
  }, [onImageSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
    disabled: !isEditing || disabled,
    noClick: true,
  });

  const handleDeleteImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageDelete();
  };

  const handleSelectImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing || disabled) return;
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Images',
          extensions: ['png', 'jpg', 'jpeg', 'webp']
        }]
      });
      if (selected && typeof selected === 'string') {
        onImageSelect(selected, convertFileSrc(selected));
      }
    } catch (error) {
      console.error("Lỗi khi mở hộp thoại chọn ảnh:", error);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const width = img.naturalWidth;
    const height = img.naturalHeight;

    let isPng = false;
    let format = "UNK";

    if (pendingPath) {
      isPng = pendingPath.toLowerCase().endsWith('.png');
      format = pendingPath.split('.').pop()?.toUpperCase() || "UNK";
    } else if (imageSource) {
      if (imageSource.startsWith('data:image/')) {
        isPng = imageSource.startsWith('data:image/png');
        format = isPng ? "PNG" : "JPG";
      } else {
        // Có thể là asset:// hoặc blob://, hoặc đường dẫn http thông thường
        // Lấy từ đuôi mở rộng (nếu có)
        const urlWithoutQuery = imageSource.split('?')[0];
        isPng = urlWithoutQuery.toLowerCase().endsWith('.png');
        format = isPng ? "PNG" : (urlWithoutQuery.split('.').pop()?.toUpperCase() || "UNK");
        
        // Default to JPG if still UNK and no valid extension found
        if (format !== "PNG" && format !== "JPG" && format !== "JPEG" && format !== "WEBP") {
          format = "JPG";
        }
      }
    }

    const isSquare = width === height;
    const isValidSize = width >= 500 && height >= 500;

    if (!isSquare || !isValidSize) {
      setImageWarning({ format, width, height, isSquare });
      setCanConvert(false);
      if (onValidationChange) onValidationChange(false);
    } else {
      if (!isPng) {
        setImageWarning({ format, width, height, isSquare });
        setCanConvert(true);
        if (onValidationChange) onValidationChange(true);
      } else {
        setImageWarning(null);
        setCanConvert(false);
        if (onValidationChange) onValidationChange(true);
      }
    }
  };

  const handleConvertToPng = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const pathOrData = pendingPath || imageSource;
    if (!pathOrData || isConverting) return;

    try {
      setIsConverting(true);
      const newPath: string = await invoke('convert_image_to_png', { path: pathOrData });
      onImageSelect(newPath, convertFileSrc(newPath));
    } catch (err) {
      console.error("Lỗi khi chuyển đổi ảnh qua Backend", err);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="pt-6 pb-2 flex justify-center w-full h-full min-h-0">
      <div className={`relative w-full h-full ${maxSizeClassName} aspect-square`}>
        {/* Ambient Glow */}
        {imageSource && (
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] blur-3xl rounded-full pointer-events-none z-0 transition-colors duration-1000 ${imageWarning ? 'bg-amber-500/40' : 'bg-indigo-500/50'
            }`} />
        )}

        <div
          {...getRootProps()}
          className={`w-full h-full rounded-2xl flex flex-col items-center justify-center transition-all duration-500 overflow-hidden relative group/dropzone z-10
            ${isEditing && !disabled ? 'cursor-pointer' : 'cursor-default'}
            ${isDragActive ? 'border-2 border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/20' : imageSource ? (imageWarning ? 'border border-amber-500/30 shadow-2xl shadow-amber-900/30 ring-1 ring-amber-500/20' : 'border border-white/5 shadow-2xl shadow-indigo-900/50 ring-1 ring-white/10') : 'border border-white/10'}
            ${isEditing && !disabled && !isDragActive ? (imageWarning ? 'hover:border-amber-500/60 hover:bg-zinc-900/50 hover:shadow-lg hover:shadow-amber-500/20' : 'hover:border-indigo-500/50 hover:bg-zinc-900/50 hover:shadow-lg hover:shadow-indigo-500/10') : ''}
          `}
        >
          <input id="image-upload" {...getInputProps()} />

          {imageSource ? (
            <div className="w-full h-full relative group">
              <img src={imageSource} alt="Cover" onLoad={handleImageLoad} className="w-full h-full object-cover" />

              {/* Hover Overlay - Chỉ kích hoạt khi đang ở chế độ edit */}
              {isEditing && !disabled && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <TooltipProvider>
                    {canConvert && (
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={handleConvertToPng}
                            className="relative group/btn p-3.5 bg-emerald-500/90 border border-emerald-400/50 hover:border-emerald-300 hover:bg-emerald-400 text-white rounded-full transition-all duration-300 shadow-lg shadow-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.6)] hover:scale-110"
                          >
                            <RefreshCcw size={22} className={isConverting ? "animate-spin" : ""} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={8}>
                          <p className="text-[11px] font-medium">Chuyển sang PNG</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={handleSelectImage}
                          className="relative group/btn p-3.5 bg-indigo-500/90 border border-indigo-400/50 hover:border-indigo-300 hover:bg-indigo-400 text-white rounded-full transition-all duration-300 shadow-lg shadow-indigo-500/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.6)] hover:scale-110"
                        >
                          <ImageIcon size={22} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={8}>
                        <p className="text-[11px] font-medium">Thay đổi ảnh</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={handleDeleteImage}
                          className="relative group/btn p-3.5 bg-rose-500/90 border border-rose-400/50 hover:border-rose-300 hover:bg-rose-400 text-white rounded-full transition-all duration-300 shadow-lg shadow-rose-500/30 hover:shadow-[0_0_20px_rgba(244,63,94,0.6)] hover:scale-110"
                        >
                          <Trash2 size={22} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={8}>
                        <p className="text-[11px] font-medium">Xoá ảnh</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          ) : (
            isEditing && !disabled ? (
              <div onClick={handleSelectImage} className="flex flex-col items-center justify-center cursor-pointer w-full h-full">
                <div className="p-4 rounded-full bg-white/5 group-hover/dropzone:bg-indigo-500/20 transition-colors mb-3">
                  <ImageIcon size={32} className="text-zinc-500 group-hover/dropzone:text-indigo-400 transition-colors" />
                </div>
                <p className="text-sm text-zinc-400 font-medium text-center px-4">
                  {isDragActive ? "Thả ảnh vào đây..." : "Nhấn hoặc kéo thả ảnh bìa mới"}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full">
                <Music size={32} className="text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-500 text-center px-4">
                  Không có ảnh bìa
                </p>
              </div>
            )
          )}
        </div>

        {/* Warning Badge */}
        {imageSource && imageWarning && (
          <div className="absolute top-3 right-3 z-20 group/warning cursor-help">
            <div className="bg-zinc-900 border-2 border-amber-500/70 rounded-full p-2 shadow-lg shadow-black/40 transition-all duration-300 group-hover/warning:opacity-0 group-hover/warning:scale-75 absolute top-0 right-0">
              <AlertTriangle size={16} className="text-amber-500" strokeWidth={2.5} />
            </div>

            <div className="bg-zinc-900 border-2 border-amber-500/80 rounded-xl p-3.5 shadow-xl opacity-0 invisible scale-95 transition-all duration-300 origin-top-right group-hover/warning:opacity-100 group-hover/warning:visible group-hover/warning:scale-100 flex flex-col w-60 absolute top-0 -right-6 pointer-events-none group-hover/warning:pointer-events-auto">
              <div className="flex items-center mb-1.5">
                <AlertTriangle size={16} className="text-amber-500 shrink-0" strokeWidth={2.5} />
                <span className="font-bold ml-2 text-zinc-50 text-xs">Ảnh chưa đạt chuẩn</span>
              </div>
              <p className="text-[11px] font-medium text-zinc-300 leading-relaxed whitespace-normal wrap-break-word mt-1">
                Yêu cầu: ảnh <span className="text-zinc-100 font-semibold">Vuông (PNG)</span>, tối thiểu <span className="text-zinc-100 font-semibold">500x500px</span>.<br />
                Hiện tại: <span className={imageWarning.format !== 'PNG' ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>{imageWarning.format}</span>,{' '}
                <span className={(imageWarning.width < 500 || imageWarning.height < 500 || !imageWarning.isSquare) ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>{imageWarning.width}x{imageWarning.height}px</span>.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
