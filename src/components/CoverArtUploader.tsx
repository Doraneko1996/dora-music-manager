import React from 'react';
import { useAudioStore } from '../store/useAudioStore';
import { ImageUploader } from './ui/image-uploader';

interface CoverArtUploaderProps {
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  maxSizeClassName?: string;
}

export const CoverArtUploader: React.FC<CoverArtUploaderProps> = ({
  isEditing,
  setIsEditing,
  maxSizeClassName = "max-w-[320px]"
}) => {
  const {
    selectedFiles,
    pendingArtworkPath, setPendingArtworkPath,
    currentArtworkBase64, setCurrentArtworkBase64,
  } = useAudioStore();

  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isEditing) {
      setPreviewUrl(null);
    }
  }, [isEditing]);

  React.useEffect(() => {
    setPreviewUrl(null);
  }, [selectedFiles]);

  const handleImageSelect = (path: string, preview: string) => {
    setPendingArtworkPath(path);
    setPreviewUrl(preview);
    setIsEditing(true);
    setCurrentArtworkBase64(null);
  };

  const handleImageDelete = () => {
    setPreviewUrl(null);
    setCurrentArtworkBase64(null);
    setPendingArtworkPath("");
  };

  const imageSource = previewUrl || currentArtworkBase64 || null;

  return (
    <ImageUploader
      imageSource={imageSource}
      pendingPath={pendingArtworkPath || null}
      isEditing={isEditing}
      disabled={selectedFiles.length === 0}
      maxSizeClassName={maxSizeClassName}
      onImageSelect={handleImageSelect}
      onImageDelete={handleImageDelete}
    />
  );
};
