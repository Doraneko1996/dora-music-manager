import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

export interface AudioMetadata {
  file_path: string;
  file_name: string;
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  has_cover?: boolean;
  bitrate?: number;
}

export interface AlbumInfo {
  album_name: string;
  cover_path: string | null;
}

export interface AggregatedMetadata {
  artists: string[];
  albums: AlbumInfo[];
  genres: string[];
}

export interface ScanResult {
  files: AudioMetadata[];
  aggregated: AggregatedMetadata;
}

interface AudioStoreState {
  musicFiles: AudioMetadata[];
  aggregatedData: AggregatedMetadata | null;
  selectedFiles: string[];
  directoryPath: string;
  isScanning: boolean;
  isEditing: boolean;
  activeTab: string;
  selectedEntityName: string | null;
  
  pendingMetadata: Partial<AudioMetadata>;
  pendingArtworkPath: string | null;
  currentArtworkBase64: string | null;
  gridColumns: number;
  searchQuery: string;
  
  // Actions
  setMusicFiles: (files: AudioMetadata[]) => void;
  setAggregatedData: (data: AggregatedMetadata | null) => void;
  setSelectedFiles: (files: string[]) => void;
  setDirectoryPath: (path: string) => void;
  setIsScanning: (scanning: boolean) => void;
  setIsEditing: (editing: boolean) => void;
  setActiveTab: (tab: string) => void;
  setSelectedEntityName: (name: string | null) => void;
  setPendingMetadata: (meta: Partial<AudioMetadata>) => void;
  setPendingArtworkPath: (path: string | null) => void;
  setCurrentArtworkBase64: (b64: string | null) => void;
  setGridColumns: (cols: number) => void;
  setSearchQuery: (query: string) => void;
  saveChanges: () => Promise<void>;
  applyFilenamesToTitles: () => Promise<void>;
  clearMetadata: () => Promise<void>;
  refreshData: () => Promise<void>;
}

export const useAudioStore = create<AudioStoreState>((set, get) => ({
  musicFiles: [],
  aggregatedData: null,
  selectedFiles: [],
  directoryPath: '',
  isScanning: false,
  isEditing: false,
  activeTab: 'tracks',
  selectedEntityName: null,
  pendingMetadata: {},
  pendingArtworkPath: null,
  currentArtworkBase64: null,
  gridColumns: Number(localStorage.getItem('dora-grid-columns')) || 5,
  searchQuery: '',
  
  // Actions
  setMusicFiles: (files) => set({ musicFiles: files }),
  setAggregatedData: (data) => set({ aggregatedData: data }),
  setSelectedFiles: (files) => set({ selectedFiles: files }),
  setDirectoryPath: (path) => set({ directoryPath: path }),
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  setIsEditing: (editing) => set({ isEditing: editing }),
  setActiveTab: (tab) => set({ 
    activeTab: tab,
    selectedFiles: [],
    selectedEntityName: null,
    isEditing: false,
    pendingMetadata: {}
  }),
  setSelectedEntityName: (name) => set({ selectedEntityName: name }),
  setPendingMetadata: (meta) => set((state) => ({ pendingMetadata: { ...state.pendingMetadata, ...meta } })),
  setPendingArtworkPath: (path) => set({ pendingArtworkPath: path }),
  setCurrentArtworkBase64: (b64) => set({ currentArtworkBase64: b64 }),
  setGridColumns: (cols) => {
    localStorage.setItem('dora-grid-columns', cols.toString());
    set({ gridColumns: cols });
  },
  setSearchQuery: (query) => set({ searchQuery: query }),

  applyFilenamesToTitles: async () => {
    const state = get();
    if (state.selectedFiles.length === 0) return;

    set({ isScanning: true });
    try {
      const updates: any[] = [];
      const updatedFiles = state.musicFiles.map(file => {
        if (state.selectedFiles.includes(file.file_path)) {
          const lastDotIndex = file.file_name.lastIndexOf('.');
          const baseName = lastDotIndex !== -1 ? file.file_name.substring(0, lastDotIndex) : file.file_name;
          
          if (file.title !== baseName) {
            updates.push({
              file_path: file.file_path,
              title: baseName,
              file_name: file.file_name || "",
              has_cover: false // Dựa theo struct Rust, required
            });
          }
          return { ...file, title: baseName };
        }
        return file;
      });

      if (updates.length > 0) {
        await invoke('update_metadata_batch', { updates });
        const result: any = await invoke('scan_directory', { path: state.directoryPath });
        set({
           musicFiles: result.files,
           aggregatedData: result.aggregated
        });
      } else {
        set({ musicFiles: updatedFiles });
      }
    } catch (error) {
      console.error("Lỗi khi áp dụng Tên File:", error);
      toast.error(`Lỗi: ${error}`);
    } finally {
      set({ isScanning: false });
    }
  },

  clearMetadata: async () => {
    const state = get();
    if (state.selectedFiles.length === 0) return;

    set({ isScanning: true });
    try {
      const updates: any[] = [];
      state.musicFiles.forEach(file => {
        if (state.selectedFiles.includes(file.file_path)) {
          updates.push({
            file_path: file.file_path,
            title: "",
            artist: "",
            album: "",
            genre: "",
            year: 0,
            file_name: file.file_name || "",
            has_cover: false
          });
        }
      });

      if (updates.length > 0) {
        await invoke('update_metadata_batch', { updates });
        const result: any = await invoke('scan_directory', { path: state.directoryPath });
        set({
           musicFiles: result.files,
           aggregatedData: result.aggregated
        });
        toast.success(`Đã xoá metadata cho ${state.selectedFiles.length} file.`);
      }
    } catch (error) {
      console.error("Lỗi khi xoá metadata:", error);
      toast.error(`Lỗi: ${error}`);
    } finally {
      set({ isScanning: false });
    }
  },

  saveChanges: async () => {
    const state = get();
    if (state.selectedFiles.length === 0) return;
    
    state.setIsScanning(true);
    try {
      const fields: (keyof AudioMetadata)[] = ['title', 'artist', 'album', 'genre', 'year'];
      
      let hasChanges = state.isEditing;
      const updates: any[] = [];
      const filesToUpdate = state.musicFiles.filter(f => state.selectedFiles.includes(f.file_path));

      filesToUpdate.forEach(file => {
        const fileUpdate: any = { file_path: file.file_path, file_name: file.file_name || "", has_cover: false };
        let fileHasChanges = state.isEditing;

        fields.forEach(field => {
          const val = state.pendingMetadata[field];
          const currentFileVal = file[field] !== null && file[field] !== undefined ? String(file[field]) : '';
          
          let newValue = currentFileVal;

          if (val !== '<Keep>' && val !== undefined && val !== currentFileVal) {
            newValue = String(val);
            hasChanges = true;
            fileHasChanges = true;
          }
          
          if (field === 'year') {
            fileUpdate.year = newValue ? parseInt(newValue, 10) || 0 : 0;
          } else if (field === 'artist' && state.activeTab === 'artists' && state.selectedEntityName) {
            const originalArtist = file.artist || '';
            if (val !== '<Keep>' && val !== undefined && originalArtist.includes(state.selectedEntityName)) {
              fileUpdate.artist = originalArtist.replace(state.selectedEntityName, newValue);
            } else {
              fileUpdate.artist = newValue;
            }
          } else {
            fileUpdate[field] = newValue;
          }
        });

        if (fileHasChanges) {
          updates.push(fileUpdate);
        }
      });

      if (hasChanges && updates.length > 0) {
        await invoke('update_metadata_batch', { updates });
        
        let newEntityName = state.selectedEntityName;
        if (state.selectedEntityName) {
          let updatedValue = undefined;
          if (state.activeTab === 'artists') updatedValue = state.pendingMetadata.artist;
          else if (state.activeTab === 'albums') updatedValue = state.pendingMetadata.album;
          else if (state.activeTab === 'genres') updatedValue = state.pendingMetadata.genre;
          
          if (updatedValue && updatedValue !== '<Keep>' && updatedValue !== state.selectedEntityName) {
             newEntityName = updatedValue as string;
          }
        }
        
        const result: ScanResult = await invoke('scan_directory', { path: state.directoryPath });
        set({
           musicFiles: result.files,
           aggregatedData: result.aggregated,
           selectedEntityName: newEntityName
        });
      }

      if (state.pendingArtworkPath !== null) {
        await invoke('process_and_embed_artwork', { files: state.selectedFiles, imagePath: state.pendingArtworkPath });
        // Refresh data again if we updated artwork but not metadata
        if (!hasChanges) {
          const result: ScanResult = await invoke('scan_directory', { path: state.directoryPath });
          set({ musicFiles: result.files, aggregatedData: result.aggregated });
        }
      }

      if (hasChanges || state.pendingArtworkPath !== null) {
        toast.success(`Đã lưu thay đổi cho ${state.selectedFiles.length} file.`);
        state.setIsEditing(false);
      } else {
        toast.info("Không có thay đổi nào để lưu.");
      }
    } catch (error) {
      console.error("Lỗi khi lưu:", error);
      toast.error(`Lỗi khi lưu: ${error}`);
    } finally {
      state.setIsScanning(false);
    }
  },

  refreshData: async () => {
    const state = get();
    if (!state.directoryPath) return;

    set({ isScanning: true });
    try {
      const result: ScanResult = await invoke('scan_directory', { path: state.directoryPath });
      set({
        musicFiles: result.files,
        aggregatedData: result.aggregated
      });
      toast.success("Đã làm mới dữ liệu nhạc");
    } catch (error) {
      console.error("Lỗi khi làm mới dữ liệu:", error);
      toast.error(`Lỗi làm mới: ${error}`);
    } finally {
      set({ isScanning: false });
    }
  }
}));
