import React from 'react';
import { useAudioStore } from '../store/useAudioStore';
import { TrackEditForm } from './forms/TrackEditForm';
import { AlbumEditForm } from './forms/AlbumEditForm';
import { ArtistEditForm } from './forms/ArtistEditForm';
import { GenreEditForm } from './forms/GenreEditForm';

export const EditForm: React.FC = () => {
  const { activeTab } = useAudioStore();

  // Router điều hướng hiển thị Form tương ứng với Tab hiện tại
  switch (activeTab) {
    case 'albums':
      return <AlbumEditForm />;
    case 'artists':
      return <ArtistEditForm />;
    case 'genres':
      return <GenreEditForm />;
    case 'tracks':
    default:
      return <TrackEditForm />;
  }
};
