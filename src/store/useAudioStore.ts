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
  lockedFiles: string[];
  directoryPath: string;
  isScanning: boolean;
  isSyncing: boolean;
  isEditing: boolean;
  activeTab: string;
  selectedEntityName: string | null;
  
  pendingMetadata: Partial<AudioMetadata>;
  pendingArtworkPath: string | null;
  currentArtworkBase64: string | null;
  gridColumns: number;
  searchQuery: string;
  folderHistory: string[];
  pinnedFolder: string | null;
  
  // Actions
  setMusicFiles: (files: AudioMetadata[]) => void;
  setAggregatedData: (data: AggregatedMetadata | null) => void;
  setSelectedFiles: (files: string[]) => void;
  setDirectoryPath: (path: string) => void;
  setIsScanning: (scanning: boolean) => void;
  setIsSyncing: (syncing: boolean) => void;
  setIsEditing: (editing: boolean) => void;
  setActiveTab: (tab: string) => void;
  setSelectedEntityName: (name: string | null) => void;
  setPendingMetadata: (meta: Partial<AudioMetadata>) => void;
  setPendingArtworkPath: (path: string | null) => void;
  setCurrentArtworkBase64: (b64: string | null) => void;
  setGridColumns: (cols: number) => void;
  setSearchQuery: (query: string) => void;
  addFolderToHistory: (path: string) => void;
  togglePinFolder: (path: string) => void;
  removeFolderFromHistory: (path: string) => void;
  saveChanges: () => Promise<void>;
  applyFilenamesToTitles: () => Promise<void>;
  clearMetadata: () => Promise<void>;
  refreshData: (silent?: boolean) => Promise<void>;
  syncFileSystemChanges: (removedPaths: string[], updatedFiles: AudioMetadata[], partialAggregated: AggregatedMetadata | null) => void;
  toggleLock: (paths: string[], isLocked: boolean) => void;
  removeFiles: (paths: string[]) => Promise<void>;
  resetStore: () => void;
}

const getInitialLockedFiles = (): string[] => {
  try {
    const data = localStorage.getItem('dora-locked-files');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const getInitialFolderHistory = (): string[] => {
  try {
    const data = localStorage.getItem('dora-folder-history');
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const getInitialPinnedFolder = (): string | null => {
  return localStorage.getItem('dora-pinned-folder') || null;
};

export const useAudioStore = create<AudioStoreState>((set, get) => ({
  musicFiles: [],
  aggregatedData: null,
  selectedFiles: [],
  lockedFiles: getInitialLockedFiles(),
  directoryPath: '',
  isScanning: false,
  isSyncing: false,
  isEditing: false,
  activeTab: 'tracks',
  selectedEntityName: null,
  pendingMetadata: {},
  pendingArtworkPath: null,
  currentArtworkBase64: null,
  gridColumns: Number(localStorage.getItem('dora-grid-columns')) || 5,
  searchQuery: '',
  folderHistory: getInitialFolderHistory(),
  pinnedFolder: getInitialPinnedFolder(),
  
  // Actions
  setMusicFiles: (files) => set({ musicFiles: files }),
  setAggregatedData: (data) => set({ aggregatedData: data }),
  setSelectedFiles: (files) => set({ selectedFiles: files }),
  setDirectoryPath: (path) => set({ directoryPath: path }),
  setIsScanning: (scanning) => set({ isScanning: scanning }),
  setIsSyncing: (syncing) => set({ isSyncing: syncing }),
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
  
  addFolderToHistory: (path) => set((state) => {
    // Chỉ thêm vào nếu khác directoryPath hiện tại hoặc state chưa có
    const normalizedPath = path.replace(/\\/g, '/');
    const newHistory = state.folderHistory.filter(p => p.replace(/\\/g, '/') !== normalizedPath);
    newHistory.unshift(path);
    const finalHistory = newHistory.slice(0, 10); // Keep max 10
    
    localStorage.setItem('dora-folder-history', JSON.stringify(finalHistory));
    return { folderHistory: finalHistory };
  }),

  togglePinFolder: (path) => set((state) => {
    const isCurrentlyPinned = state.pinnedFolder?.replace(/\\/g, '/') === path.replace(/\\/g, '/');
    const newPinned = isCurrentlyPinned ? null : path;
    
    if (newPinned) {
      localStorage.setItem('dora-pinned-folder', newPinned);
    } else {
      localStorage.removeItem('dora-pinned-folder');
    }
    
    return { pinnedFolder: newPinned };
  }),

  removeFolderFromHistory: (path) => set((state) => {
    const normalizedPath = path.replace(/\\/g, '/');
    const newHistory = state.folderHistory.filter(p => p.replace(/\\/g, '/') !== normalizedPath);
    localStorage.setItem('dora-folder-history', JSON.stringify(newHistory));
    
    const updates: Partial<AudioStoreState> = { folderHistory: newHistory };
    
    // Nếu đang xóa thư mục ghim thì gỡ ghim luôn
    if (state.pinnedFolder?.replace(/\\/g, '/') === normalizedPath) {
      localStorage.removeItem('dora-pinned-folder');
      updates.pinnedFolder = null;
    }
    
    return updates;
  }),

  resetStore: () => set({
    musicFiles: [],
    aggregatedData: null,
    selectedFiles: [],
    directoryPath: '',
    isScanning: false,
    isSyncing: false,
    isEditing: false,
    selectedEntityName: null,
    pendingMetadata: {},
    pendingArtworkPath: null,
    currentArtworkBase64: null,
    searchQuery: ''
  }),

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
      }

      if (state.pendingArtworkPath !== null) {
        await invoke('process_and_embed_artwork', { files: state.selectedFiles, imagePath: state.pendingArtworkPath });
      }

      if ((hasChanges && updates.length > 0) || state.pendingArtworkPath !== null) {
        let newEntityName = state.selectedEntityName;
        if (hasChanges && state.selectedEntityName) {
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

  refreshData: async (silent = false) => {
    const state = get();
    if (!state.directoryPath) return;

    set({ isScanning: true });
    try {
      const result: ScanResult = await invoke('scan_directory', { path: state.directoryPath });
      set({
        musicFiles: result.files,
        aggregatedData: result.aggregated
      });
      if (!silent) toast.success("Đã làm mới dữ liệu nhạc");
    } catch (error) {
      console.error("Lỗi khi làm mới dữ liệu:", error);
      if (!silent) toast.error(`Lỗi làm mới: ${error}`);
    } finally {
      set({ isScanning: false });
    }
  },

  syncFileSystemChanges: (removedPaths, updatedFiles, partialAggregated) => {
    const state = get();
    let hasChanges = false;
    let newMusicFiles = [...state.musicFiles];
    let newSelectedFiles = [...state.selectedFiles];

    // Normalize paths to prevent slash/case mismatch on Windows
    const normalize = (p: string) => p.replace(/\\/g, '/').toLowerCase();

    // Remove deleted files
    if (removedPaths.length > 0) {
      const initialLength = newMusicFiles.length;
      const normalizedRemoved = removedPaths.map(normalize);
      newMusicFiles = newMusicFiles.filter(f => !normalizedRemoved.includes(normalize(f.file_path)));
      newSelectedFiles = newSelectedFiles.filter(p => !normalizedRemoved.includes(normalize(p)));
      if (newMusicFiles.length !== initialLength) hasChanges = true;
    }

    // Upsert modified/added files
    if (updatedFiles.length > 0) {
      hasChanges = true;
      updatedFiles.forEach(updatedFile => {
        const idx = newMusicFiles.findIndex(f => normalize(f.file_path) === normalize(updatedFile.file_path));
        if (idx !== -1) {
          newMusicFiles[idx] = updatedFile;
        } else {
          newMusicFiles.push(updatedFile);
        }
      });
    }

    if (!hasChanges) return;

    // Recompute Aggregated Data locally
    const artistsSet = new Set<string>();
    const genresSet = new Set<string>();
    const uniqueAlbums = new Set<string>();

    const reFeat = /\s+(?:ft\.|feat\.|featuring)\s+/i;

    newMusicFiles.forEach(file => {
      // Artists
      if (file.artist) {
        const parts = file.artist.split(reFeat);
        parts.forEach(part => {
          part.split(',').forEach(artist => {
            const trimmed = artist.trim();
            if (trimmed) artistsSet.add(trimmed);
          });
        });
      }
      // Genres
      if (file.genre) {
        genresSet.add(file.genre.trim());
      }
      // Albums
      if (file.album) {
        uniqueAlbums.add(file.album);
      }
    });

    const artists = Array.from(artistsSet).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    const genres = Array.from(genresSet).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    // Map old covers and new covers
    const coverMap = new Map<string, string | null>();
    if (state.aggregatedData?.albums) {
      state.aggregatedData.albums.forEach(a => coverMap.set(a.album_name, a.cover_path));
    }
    if (partialAggregated?.albums) {
      partialAggregated.albums.forEach(a => coverMap.set(a.album_name, a.cover_path));
    }

    const albums: AlbumInfo[] = Array.from(uniqueAlbums).map(album_name => ({
      album_name,
      cover_path: coverMap.get(album_name) || null
    })).sort((a, b) => a.album_name.toLowerCase().localeCompare(b.album_name.toLowerCase()));

    const stateUpdates: any = {
      musicFiles: newMusicFiles,
      aggregatedData: { artists, albums, genres }
    };

    if (newSelectedFiles.length !== state.selectedFiles.length) {
      stateUpdates.selectedFiles = newSelectedFiles;
      if (newSelectedFiles.length === 0) {
        stateUpdates.isEditing = false;
        stateUpdates.pendingMetadata = {};
        stateUpdates.pendingArtworkPath = null;
      }
    }

    set(stateUpdates);
  },

  toggleLock: (paths: string[], isLocked: boolean) => {
    const state = get();
    let newLockedFiles = [...state.lockedFiles];
    
    if (isLocked) {
      const toAdd = paths.filter(p => !newLockedFiles.includes(p));
      newLockedFiles = [...newLockedFiles, ...toAdd];
    } else {
      newLockedFiles = newLockedFiles.filter(p => !paths.includes(p));
    }
    
    localStorage.setItem('dora-locked-files', JSON.stringify(newLockedFiles));
    set({ lockedFiles: newLockedFiles });
  },

  removeFiles: async (paths: string[]) => {
    const state = get();
    try {
      set({ isScanning: true });
      await invoke('move_to_trash', { paths });
      
      const newMusicFiles = state.musicFiles.filter(f => !paths.includes(f.file_path));
      const newSelectedFiles = state.selectedFiles.filter(f => !paths.includes(f));
      
      set({ 
        musicFiles: newMusicFiles,
        selectedFiles: newSelectedFiles,
      });
      
      if (newSelectedFiles.length === 0) {
        set({ isEditing: false, pendingMetadata: {}, pendingArtworkPath: null });
      }
      
      toast.success(`Đã đưa ${paths.length} file vào thùng rác.`);
      
      // Khởi chạy ngầm đồng bộ hoá lại thư mục (không hiện toast thứ 2)
      get().refreshData(true);
      
    } catch (error) {
      console.error("Lỗi khi xoá file:", error);
      toast.error(`Lỗi khi xoá: ${error}`);
    } finally {
      set({ isScanning: false });
    }
  }
}));
