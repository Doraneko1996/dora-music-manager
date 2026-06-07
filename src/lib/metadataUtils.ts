import { AudioMetadata } from '../store/useAudioStore';

export interface FormValues {
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: string;
}

export const calculateCommonMetadata = (selectedFiles: string[], musicFiles: AudioMetadata[]): FormValues => {
  if (selectedFiles.length === 0) {
    return { title: '', artist: '', album: '', genre: '', year: '' };
  }

  const selected = musicFiles.filter(f => selectedFiles.includes(f.file_path));
  if (selected.length === 0) {
    return { title: '', artist: '', album: '', genre: '', year: '' };
  }

  const result: any = {};
  const fields: (keyof AudioMetadata)[] = ['title', 'artist', 'album', 'genre', 'year'];

  fields.forEach(field => {
    const firstVal = selected[0][field];
    const allSame = selected.every(f => f[field] === firstVal);

    if (allSame) {
      result[field] = firstVal !== null && firstVal !== undefined ? String(firstVal) : '';
    } else {
      result[field] = '<Keep>';
    }
  });

  return result as FormValues;
};
