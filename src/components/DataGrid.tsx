import React, { useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  ColumnFiltersState,
  SortingState,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAudioStore, AudioMetadata } from '../store/useAudioStore';
import { Loader2, ListMusic, Filter, ArrowDownAZ, ArrowUpZA, X, FilterX, FileAudio, Activity, Users, Search } from 'lucide-react';
import { AlphabetScroller } from './ui/alphabet-scroller';
import { useAlphabetMap } from '../hooks/useAlphabetMap';
import { useDataGridTooltip } from '../hooks/useDataGridTooltip';

const getExtensionTextColor = (ext: string) => {
  switch (ext) {
    case 'FLAC': return 'text-emerald-400';
    case 'MP3': return 'text-blue-400';
    case 'WAV': return 'text-rose-400';
    case 'M4A': return 'text-purple-400';
    default: return 'text-indigo-400';
  }
};

const getSolidBitrateColor = (bitrate?: number | null) => {
  if (!bitrate) return 'bg-zinc-600';
  if (bitrate >= 1000) return 'bg-amber-600';
  if (bitrate >= 320) return 'bg-pink-600';
  return 'bg-zinc-600';
};
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from "./ui/dropdown-menu";
import { Checkbox } from './ui/checkbox';

export const DataGrid: React.FC = () => {
  const { musicFiles, selectedFiles, setSelectedFiles, isScanning, isEditing, directoryPath, searchQuery } = useAudioStore();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useDataGridTooltip(tableContainerRef);

  const [isScrubbing, setIsScrubbing] = React.useState(false);
  const [isScrollerVisible, setIsScrollerVisible] = React.useState(false);

  const filteredMusicFiles = useMemo(() => {
    if (!searchQuery) return musicFiles;
    const lowerQuery = searchQuery.toLowerCase();
    return musicFiles.filter(file =>
      file.file_name?.toLowerCase().includes(lowerQuery) ||
      file.title?.toLowerCase().includes(lowerQuery) ||
      file.artist?.toLowerCase().includes(lowerQuery) ||
      file.album?.toLowerCase().includes(lowerQuery)
    );
  }, [musicFiles, searchQuery]);

  // Reset selection when folder changes
  useEffect(() => {
    setSelectedFiles([]);
  }, [directoryPath, setSelectedFiles]);

  const columns = useMemo<ColumnDef<AudioMetadata>[]>(
    () => {
      const maxLen = {
        file_name: 9,
        title: 5,
        artist: 6,
        album: 5,
        genre: 5,
        year: 4,
      };

      filteredMusicFiles.forEach((file) => {
        if (file.file_name && file.file_name.length > maxLen.file_name) maxLen.file_name = file.file_name.length;
        if (file.title && file.title.length > maxLen.title) maxLen.title = file.title.length;
        if (file.artist && file.artist.length > maxLen.artist) maxLen.artist = file.artist.length;
        if (file.album && file.album.length > maxLen.album) maxLen.album = file.album.length;
        if (file.genre && file.genre.length > maxLen.genre) maxLen.genre = file.genre.length;
        const yearStr = file.year ? file.year.toString() : '';
        if (yearStr.length > maxLen.year) maxLen.year = yearStr.length;
      });

      const approxCharWidth = 10;
      const padding = 50;
      const minSize = 80;
      const maxSize = 400;

      const calcSize = (charLen: number, min: number = minSize, max: number = maxSize) => {
        const width = charLen * approxCharWidth + padding;
        return Math.min(Math.max(width, min), max);
      };

      const dataFilterFn = (row: any, columnId: string, filterValue: any) => {
        if (typeof filterValue === 'object' && filterValue !== null) {
          const value = row.getValue(columnId);
          const isEmpty = value === null || value === undefined || value === '' || value === 0;

          if (filterValue.emptyState === 'EMPTY' && !isEmpty) return false;
          if (filterValue.emptyState === 'NOT_EMPTY' && isEmpty) return false;

          const track = row.original as AudioMetadata;

          if (columnId === 'file_name') {
            const fileName = track.file_name || '';
            const lastDotIndex = fileName.lastIndexOf('.');
            const extension = lastDotIndex !== -1 ? fileName.substring(lastDotIndex + 1).toUpperCase() : '';
            const bitrate = track.bitrate || 0;

            if (filterValue.types && filterValue.types.length > 0) {
              if (!filterValue.types.includes(extension)) return false;
            }

            if (filterValue.bitrates && filterValue.bitrates.length > 0) {
              let bitrateMatch = false;
              for (const br of filterValue.bitrates) {
                if (br === '>320' && bitrate > 320) bitrateMatch = true;
                else if (br === '320' && Math.round(bitrate) === 320) bitrateMatch = true;
                else if (br === '<320' && bitrate < 320 && bitrate > 0) bitrateMatch = true;
                else if (br === 'unknown' && bitrate === 0) bitrateMatch = true;
              }
              if (!bitrateMatch) return false;
            }

            return true;
          }

          if (columnId === 'artist') {
            const artist = (track.artist || '').toLowerCase();
            if (filterValue.collabTypes && filterValue.collabTypes.length > 0) {
              const hasFeature = artist.includes('ft.') || artist.includes('feat.') || artist.includes('featuring') || artist.includes(',') || artist.includes('&');
              let match = false;
              if (filterValue.collabTypes.includes('solo') && !hasFeature) match = true;
              if (filterValue.collabTypes.includes('collab') && hasFeature) match = true;
              if (!match) return false;
            }
            return true;
          }
        }

        const value = row.getValue(columnId);
        const isEmpty = value === null || value === undefined || value === '' || value === 0;

        if (filterValue === 'EMPTY') {
          return isEmpty;
        } else if (filterValue === 'NOT_EMPTY') {
          return !isEmpty;
        }
        return true;
      };

      const selectColumn: ColumnDef<AudioMetadata> = {
        id: 'select',
        header: () => {
          const isAllSelected = filteredMusicFiles.length > 0 && selectedFiles.length === filteredMusicFiles.length;
          const isSomeSelected = selectedFiles.length > 0 && selectedFiles.length < filteredMusicFiles.length;

          return (
            <div className="flex items-center justify-center w-full">
              <Checkbox
                checked={isAllSelected ? true : isSomeSelected ? "indeterminate" : false}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedFiles(filteredMusicFiles.map(f => f.file_path));
                  } else {
                    setSelectedFiles([]);
                  }
                }}
                disabled={isEditing}
                aria-label="Select all"
              />
            </div>
          );
        },
        cell: ({ row }) => {
          const filePath = row.original.file_path;
          const isSelected = selectedFiles.includes(filePath);

          return (
            <div className="flex items-center justify-center w-full" onClick={e => e.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => {
                  if (isEditing) return;
                  if (checked) {
                    setSelectedFiles([...selectedFiles, filePath]);
                  } else {
                    setSelectedFiles(selectedFiles.filter(p => p !== filePath));
                  }
                }}
                disabled={isEditing}
                aria-label="Select row"
              />
            </div>
          );
        },
        size: 40,
        enableSorting: false,
        enableColumnFilter: false,
      };

      return [
        selectColumn,
        {
          accessorKey: 'file_name',
          header: 'File Name',
          size: calcSize(maxLen.file_name, 150, 400),
          filterFn: dataFilterFn,
          cell: ({ row }) => {
            const fileName = row.original.file_name;
            const lastDotIndex = fileName.lastIndexOf('.');
            const baseName = lastDotIndex !== -1 ? fileName.substring(0, lastDotIndex) : fileName;
            const extension = lastDotIndex !== -1 ? fileName.substring(lastDotIndex + 1).toUpperCase() : '';
            const bitrate = row.original.bitrate ? `${Math.round(row.original.bitrate)} kbps` : null;

            return (
              <div className="flex items-center justify-between gap-2 max-w-full w-full">
                <div className="truncate min-w-0 flex-1">
                  <div data-custom-tooltip={fileName} className="truncate w-full">
                    {baseName}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {bitrate && (
                    <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold leading-none text-white shadow-sm ${getSolidBitrateColor(row.original.bitrate)}`}>
                      {bitrate}
                    </span>
                  )}
                  {extension && (
                    <span className={`text-[10px] font-semibold uppercase leading-none ${getExtensionTextColor(extension)}`}>
                      {extension}
                    </span>
                  )}
                </div>
              </div>
            );
          }
        },
        {
          accessorKey: 'title',
          header: 'Title',
          size: calcSize(maxLen.title, 100, 400),
          filterFn: dataFilterFn,
          cell: ({ row }) => <div data-custom-tooltip={row.original.title || ''} className="truncate">{row.original.title || ''}</div>
        },
        {
          accessorKey: 'artist',
          header: 'Artist',
          size: calcSize(maxLen.artist, 100, 300),
          filterFn: dataFilterFn,
          cell: ({ row }) => <div data-custom-tooltip={row.original.artist || ''} className="truncate">{row.original.artist || ''}</div>
        },
        {
          accessorKey: 'album',
          header: 'Album',
          size: calcSize(maxLen.album, 100, 300),
          filterFn: dataFilterFn,
          cell: ({ row }) => <div data-custom-tooltip={row.original.album || ''} className="truncate">{row.original.album || ''}</div>
        },
        {
          accessorKey: 'genre',
          header: 'Genre',
          size: calcSize(maxLen.genre, 80, 200),
          filterFn: dataFilterFn,
          cell: ({ row }) => <div className="truncate">{row.original.genre || ''}</div>
        },
        {
          accessorKey: 'year',
          header: 'Year',
          size: calcSize(maxLen.year, 60, 100),
          filterFn: dataFilterFn,
          cell: ({ row }) => <div data-custom-tooltip={row.original.year?.toString() || ''} className="truncate">{row.original.year?.toString() || ''}</div>
        },
      ];
    },
    [filteredMusicFiles, selectedFiles, setSelectedFiles, isEditing]
  );

  const availableExtensions = useMemo(() => {
    return Array.from(new Set(filteredMusicFiles.map(f => {
      const parts = f.file_name.split('.');
      return parts.length > 1 ? parts.pop()?.toUpperCase() : null;
    }))).filter(Boolean) as string[];
  }, [filteredMusicFiles]);

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data: filteredMusicFiles,
    columns,
    state: {
      columnFilters,
      sorting,
    },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { rows } = table.getRowModel();

  // Tạo từ điển ánh xạ từ Chữ cái -> Chỉ số dòng đầu tiên
  const sortedColumnId = sorting.length > 0 ? sorting[0].id : 'file_name';
  const alphabetMap = useAlphabetMap(
    rows,
    (row) => row.getValue(sortedColumnId) as string,
    [sorting]
  );

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 40, // Match the actual row height of 40px
    overscan: 25, // Increase overscan slightly for smoother fast scrolling
  });

  const handleRowClick = (e: React.MouseEvent, filePath: string) => {
    e.preventDefault();
    if (isEditing) return;

    if (e.ctrlKey || e.metaKey) {
      if (selectedFiles.includes(filePath)) {
        setSelectedFiles(selectedFiles.filter(p => p !== filePath));
      } else {
        setSelectedFiles([...selectedFiles, filePath]);
      }
    } else {
      if (selectedFiles.length === 1 && selectedFiles[0] === filePath) {
        setSelectedFiles([]);
      } else {
        setSelectedFiles([filePath]);
      }
    }
  };

  if (isScanning) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-indigo-400 gap-3 h-full">
        <Loader2 className="animate-spin" size={32} />
        <p className="text-sm font-medium animate-pulse">Đang quét thư mục... Vui lòng đợi.</p>
      </div>
    );
  }

  if (musicFiles.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-3 h-full">
        <ListMusic size={48} strokeWidth={1.5} className="opacity-30 mb-2" />
        <p className="text-sm font-medium">Chưa có file nhạc nào. Hãy mở một thư mục.</p>
      </div>
    );
  }

  if (filteredMusicFiles.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-3 h-full">
        <Search size={48} className="opacity-20 mb-2" />
        <p className="text-sm font-medium">Không tìm thấy bài hát nào phù hợp.</p>
      </div>
    );
  }

  return (
    <div
      className="flex-1 w-full h-full border border-white/5 rounded-lg relative overflow-hidden bg-black/20 shadow-inner group/datagrid"
      onPointerMove={(e) => {
        if (isScrubbing) return;
        const scrollContainer = tableContainerRef.current;
        if (!scrollContainer || scrollContainer.scrollHeight <= scrollContainer.clientHeight) {
          if (isScrollerVisible) setIsScrollerVisible(false);
          return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const distanceFromRight = rect.right - e.clientX;
        // Mép phải 80px là vùng hiển thị thanh cuộn
        if (distanceFromRight <= 80) {
          if (!isScrollerVisible) setIsScrollerVisible(true);
        } else {
          if (isScrollerVisible) setIsScrollerVisible(false);
        }
      }}
      onPointerLeave={() => {
        if (!isScrubbing) setIsScrollerVisible(false);
      }}
    >
      <AlphabetScroller
        alphabetMap={alphabetMap}
        onScrollTo={(index) => rowVirtualizer.scrollToIndex(index, { align: 'start' })}
        isVisible={isScrollerVisible}
        onScrubStateChange={setIsScrubbing}
        className="right-6 top-14 bottom-4"
      />

      <div
        ref={tableContainerRef}
        className="overflow-auto text-sm w-full h-full custom-scrollbar"
      >
        <div style={{ height: `${rowVirtualizer.getTotalSize() + 48}px`, position: 'relative', minWidth: 'max-content' }}>
          {/* Table Header */}
          <div className="sticky top-0 z-20 h-12 bg-black/40 backdrop-blur-xl border-b border-white/10 flex text-left shadow-sm">
            {table.getHeaderGroups().map(headerGroup => (
              <div key={headerGroup.id} className="flex w-full h-full">
                {headerGroup.headers.map(header => (
                  <div
                    key={header.id}
                    className={`py-2 flex items-center select-none text-[11px] font-bold uppercase tracking-widest text-indigo-400/80 transition-colors cursor-default border-r border-white/5 last:border-r-0 group hover:bg-white/5 ${header.id === 'select' ? 'px-1' : 'px-4'}`}
                    style={{ width: header.getSize() }}
                  >
                    <div className="flex-1 flex items-center justify-between w-full min-w-0">
                      <div className={`flex items-center gap-2 min-w-0 flex-1 ${header.id === 'select' ? '' : 'mr-2'}`}>
                        <div className={header.id === 'select' ? 'w-full flex justify-center items-center h-full' : 'truncate group-hover:text-indigo-300 transition-colors'}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </div>

                      </div>

                      {header.id !== 'select' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={`p-1.5 shrink-0 rounded-md transition-all duration-300 outline-none focus:outline-none data-[state=open]:opacity-100 data-[state=open]:bg-indigo-500/20 data-[state=open]:text-indigo-300 ${header.column.getFilterValue() || header.column.getIsSorted()
                                ? 'bg-amber-500/20 text-amber-400 opacity-100 shadow-[0_0_12px_rgba(245,158,11,0.3)] data-[state=open]:bg-amber-500/30 data-[state=open]:text-amber-300'
                                : 'opacity-40 group-hover:opacity-100 hover:bg-white/10 text-zinc-500 hover:text-zinc-300'
                                }`}
                              title="Tuỳ chọn cột"
                            >
                              {header.column.getIsSorted() === 'asc' ? <ArrowDownAZ size={13} strokeWidth={2.5} /> :
                                header.column.getIsSorted() === 'desc' ? <ArrowUpZA size={13} strokeWidth={2.5} /> :
                                  <Filter size={13} strokeWidth={2.5} />}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">

                            <DropdownMenuLabel>
                              Sắp xếp
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              className={header.column.getIsSorted() === 'asc' ? "bg-indigo-500/10 border-indigo-500/30 text-white shadow-md shadow-indigo-500/5 font-bold" : ""}
                              onClick={() => header.column.toggleSorting(false)}
                            >
                              <ArrowDownAZ size={14} className={`mr-2 ${header.column.getIsSorted() === 'asc' ? 'opacity-100' : 'opacity-70'}`} />
                              <span>Từ A đến Z</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className={header.column.getIsSorted() === 'desc' ? "bg-indigo-500/10 border-indigo-500/30 text-white shadow-md shadow-indigo-500/5 font-bold" : ""}
                              onClick={() => header.column.toggleSorting(true)}
                            >
                              <ArrowUpZA size={14} className={`mr-2 ${header.column.getIsSorted() === 'desc' ? 'opacity-100' : 'opacity-70'}`} />
                              <span>Từ Z đến A</span>
                            </DropdownMenuItem>
                            {header.column.getIsSorted() && (
                              <DropdownMenuItem
                                className="text-rose-400 focus:from-rose-500/0 focus:to-rose-500/15 mt-1"
                                onClick={() => header.column.clearSorting()}
                              >
                                <X size={14} className="mr-2 opacity-70" />
                                <span>Bỏ sắp xếp</span>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuLabel>
                              Lọc dữ liệu
                            </DropdownMenuLabel>
                            {header.id === 'file_name' ? (
                              <>
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger className={((header.column.getFilterValue() as any)?.types?.length > 0) ? "bg-indigo-500/10 border-indigo-500/30 text-white shadow-md shadow-indigo-500/5 font-bold" : ""}>
                                    <FileAudio size={14} className="mr-2 opacity-70 shrink-0" />
                                    <span className="flex-1">Loại File</span>
                                    {((header.column.getFilterValue() as any)?.types?.length > 0) && (
                                      <span className="text-[9px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded-full font-bold ml-2 mr-1 flex items-center justify-center min-w-5">
                                        {(header.column.getFilterValue() as any).types.length}
                                      </span>
                                    )}
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuPortal>
                                    <DropdownMenuSubContent className="min-w-32">
                                      {availableExtensions.map(ext => {
                                        const currentFilters = header.column.getFilterValue() as any || { types: [], bitrates: [] };
                                        const isChecked = currentFilters.types?.includes(ext);
                                        return (
                                          <DropdownMenuCheckboxItem
                                            key={ext}
                                            checked={isChecked}
                                            onCheckedChange={(checked) => {
                                              const newTypes = checked
                                                ? [...(currentFilters.types || []), ext]
                                                : (currentFilters.types || []).filter((t: string) => t !== ext);

                                              const newFilter = { ...currentFilters, types: newTypes };
                                              if (newFilter.types.length === 0 && (!newFilter.bitrates || newFilter.bitrates.length === 0)) {
                                                header.column.setFilterValue(undefined);
                                              } else {
                                                header.column.setFilterValue(newFilter);
                                              }
                                            }}
                                            className="[&>span.absolute]:hidden"
                                          >
                                            <span className={`font-semibold ${getExtensionTextColor(ext)}`}>{ext}</span>
                                          </DropdownMenuCheckboxItem>
                                        );
                                      })}
                                    </DropdownMenuSubContent>
                                  </DropdownMenuPortal>
                                </DropdownMenuSub>

                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger className={((header.column.getFilterValue() as any)?.bitrates?.length > 0) ? "bg-indigo-500/10 border-indigo-500/30 text-white shadow-md shadow-indigo-500/5 font-bold" : ""}>
                                    <Activity size={14} className="mr-2 opacity-70 shrink-0" />
                                    <span className="flex-1">Bitrate</span>
                                    {((header.column.getFilterValue() as any)?.bitrates?.length > 0) && (
                                      <span className="text-[9px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded-full font-bold ml-2 mr-1 flex items-center justify-center min-w-5">
                                        {(header.column.getFilterValue() as any).bitrates.length}
                                      </span>
                                    )}
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuPortal>
                                    <DropdownMenuSubContent className="min-w-48">
                                      {[
                                        { id: '>320', label: 'Lossless (> 320 kbps)' },
                                        { id: '320', label: 'High Quality (320 kbps)' },
                                        { id: '<320', label: 'Standard (< 320 kbps)' },
                                        { id: 'unknown', label: 'Unknown' },
                                      ].map(br => {
                                        const currentFilters = header.column.getFilterValue() as any || { types: [], bitrates: [] };
                                        const isChecked = currentFilters.bitrates?.includes(br.id);
                                        return (
                                          <DropdownMenuCheckboxItem
                                            key={br.id}
                                            checked={isChecked}
                                            onCheckedChange={(checked) => {
                                              const newBitrates = checked
                                                ? [...(currentFilters.bitrates || []), br.id]
                                                : (currentFilters.bitrates || []).filter((b: string) => b !== br.id);

                                              const newFilter = { ...currentFilters, bitrates: newBitrates };
                                              if ((!newFilter.types || newFilter.types.length === 0) && newFilter.bitrates.length === 0) {
                                                header.column.setFilterValue(undefined);
                                              } else {
                                                header.column.setFilterValue(newFilter);
                                              }
                                            }}
                                            className="[&>span.absolute]:hidden"
                                          >
                                            <span className={isChecked ? "text-indigo-400 font-bold" : ""}>{br.label}</span>
                                          </DropdownMenuCheckboxItem>
                                        );
                                      })}
                                    </DropdownMenuSubContent>
                                  </DropdownMenuPortal>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                  checked={(header.column.getFilterValue() as any)?.emptyState === 'NOT_EMPTY'}
                                  onCheckedChange={() => {
                                    const current = header.column.getFilterValue() as any || {};
                                    const newState = current.emptyState === 'NOT_EMPTY' ? undefined : 'NOT_EMPTY';
                                    const newFilter = { ...current, emptyState: newState };
                                    if (!newFilter.types?.length && !newFilter.bitrates?.length && !newFilter.emptyState) header.column.setFilterValue(undefined);
                                    else header.column.setFilterValue(newFilter);
                                  }}
                                  className="focus:from-emerald-500/0 focus:to-emerald-500/15 data-[state=checked]:bg-emerald-500/10 data-[state=checked]:border-emerald-500/30 data-[state=checked]:shadow-emerald-500/5 [&>span.absolute]:hidden"
                                >
                                  <span className={(header.column.getFilterValue() as any)?.emptyState === 'NOT_EMPTY' ? "font-bold" : ""}>Có dữ liệu</span>
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                  checked={(header.column.getFilterValue() as any)?.emptyState === 'EMPTY'}
                                  onCheckedChange={() => {
                                    const current = header.column.getFilterValue() as any || {};
                                    const newState = current.emptyState === 'EMPTY' ? undefined : 'EMPTY';
                                    const newFilter = { ...current, emptyState: newState };
                                    if (!newFilter.types?.length && !newFilter.bitrates?.length && !newFilter.emptyState) header.column.setFilterValue(undefined);
                                    else header.column.setFilterValue(newFilter);
                                  }}
                                  className="focus:from-amber-500/0 focus:to-amber-500/15 data-[state=checked]:bg-amber-500/10 data-[state=checked]:border-amber-500/30 data-[state=checked]:shadow-amber-500/5 [&>span.absolute]:hidden"
                                >
                                  <span className={(header.column.getFilterValue() as any)?.emptyState === 'EMPTY' ? "font-bold" : ""}>Không có dữ liệu</span>
                                </DropdownMenuCheckboxItem>
                              </>
                            ) : header.id === 'artist' ? (
                              <>
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger className={((header.column.getFilterValue() as any)?.collabTypes?.length > 0) ? "bg-indigo-500/10 border-indigo-500/30 text-white shadow-md shadow-indigo-500/5 font-bold" : ""}>
                                    <Users size={14} className="mr-2 opacity-70 shrink-0" />
                                    <span className="flex-1">Hợp tác (Featuring)</span>
                                    {((header.column.getFilterValue() as any)?.collabTypes?.length > 0) && (
                                      <span className="text-[9px] bg-indigo-500/30 text-indigo-200 px-1.5 py-0.5 rounded-full font-bold ml-2 mr-1 flex items-center justify-center min-w-5">
                                        {(header.column.getFilterValue() as any).collabTypes.length}
                                      </span>
                                    )}
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuPortal>
                                    <DropdownMenuSubContent className="min-w-40">
                                      {[
                                        { id: 'solo', label: 'Hát đơn (Solo)' },
                                        { id: 'collab', label: 'Có kết hợp (Featuring)' },
                                      ].map(type => {
                                        const currentFilters = header.column.getFilterValue() as any || { collabTypes: [] };
                                        const isChecked = currentFilters.collabTypes?.includes(type.id);
                                        return (
                                          <DropdownMenuCheckboxItem
                                            key={type.id}
                                            checked={isChecked}
                                            onCheckedChange={(checked) => {
                                              const newTypes = checked
                                                ? [...(currentFilters.collabTypes || []), type.id]
                                                : (currentFilters.collabTypes || []).filter((t: string) => t !== type.id);

                                              const newFilter = { ...currentFilters, collabTypes: newTypes };
                                              if (newFilter.collabTypes.length === 0 && !newFilter.emptyState) {
                                                header.column.setFilterValue(undefined);
                                              } else {
                                                header.column.setFilterValue(newFilter);
                                              }
                                            }}
                                            className="[&>span.absolute]:hidden"
                                          >
                                            <span className={isChecked ? "text-indigo-400 font-bold" : ""}>{type.label}</span>
                                          </DropdownMenuCheckboxItem>
                                        );
                                      })}
                                    </DropdownMenuSubContent>
                                  </DropdownMenuPortal>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem
                                  checked={(header.column.getFilterValue() as any)?.emptyState === 'NOT_EMPTY'}
                                  onCheckedChange={() => {
                                    const current = header.column.getFilterValue() as any || {};
                                    const newState = current.emptyState === 'NOT_EMPTY' ? undefined : 'NOT_EMPTY';
                                    const newFilter = { ...current, emptyState: newState };
                                    if (!newFilter.collabTypes?.length && !newFilter.emptyState) header.column.setFilterValue(undefined);
                                    else header.column.setFilterValue(newFilter);
                                  }}
                                  className="focus:from-emerald-500/0 focus:to-emerald-500/15 data-[state=checked]:bg-emerald-500/10 data-[state=checked]:border-emerald-500/30 data-[state=checked]:shadow-emerald-500/5 [&>span.absolute]:hidden"
                                >
                                  <span className={(header.column.getFilterValue() as any)?.emptyState === 'NOT_EMPTY' ? "font-bold" : ""}>Có dữ liệu</span>
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                  checked={(header.column.getFilterValue() as any)?.emptyState === 'EMPTY'}
                                  onCheckedChange={() => {
                                    const current = header.column.getFilterValue() as any || {};
                                    const newState = current.emptyState === 'EMPTY' ? undefined : 'EMPTY';
                                    const newFilter = { ...current, emptyState: newState };
                                    if (!newFilter.collabTypes?.length && !newFilter.emptyState) header.column.setFilterValue(undefined);
                                    else header.column.setFilterValue(newFilter);
                                  }}
                                  className="focus:from-amber-500/0 focus:to-amber-500/15 data-[state=checked]:bg-amber-500/10 data-[state=checked]:border-amber-500/30 data-[state=checked]:shadow-amber-500/5 [&>span.absolute]:hidden"
                                >
                                  <span className={(header.column.getFilterValue() as any)?.emptyState === 'EMPTY' ? "font-bold" : ""}>Không có dữ liệu</span>
                                </DropdownMenuCheckboxItem>
                              </>
                            ) : (
                              <>
                                <DropdownMenuCheckboxItem
                                  checked={header.column.getFilterValue() === 'NOT_EMPTY'}
                                  onCheckedChange={() => {
                                    if (header.column.getFilterValue() === 'NOT_EMPTY') {
                                      header.column.setFilterValue(undefined);
                                    } else {
                                      header.column.setFilterValue('NOT_EMPTY');
                                    }
                                  }}
                                  className="focus:from-emerald-500/0 focus:to-emerald-500/15 data-[state=checked]:bg-emerald-500/10 data-[state=checked]:border-emerald-500/30 data-[state=checked]:shadow-emerald-500/5 [&>span.absolute]:hidden"
                                >
                                  <span className={header.column.getFilterValue() === 'NOT_EMPTY' ? "font-bold" : ""}>Có dữ liệu</span>
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem
                                  checked={header.column.getFilterValue() === 'EMPTY'}
                                  onCheckedChange={() => {
                                    if (header.column.getFilterValue() === 'EMPTY') {
                                      header.column.setFilterValue(undefined);
                                    } else {
                                      header.column.setFilterValue('EMPTY');
                                    }
                                  }}
                                  className="focus:from-amber-500/0 focus:to-amber-500/15 data-[state=checked]:bg-amber-500/10 data-[state=checked]:border-amber-500/30 data-[state=checked]:shadow-amber-500/5 [&>span.absolute]:hidden"
                                >
                                  <span className={header.column.getFilterValue() === 'EMPTY' ? "font-bold" : ""}>Không có dữ liệu</span>
                                </DropdownMenuCheckboxItem>
                              </>
                            )}

                            {Boolean(header.column.getFilterValue()) && (
                              <DropdownMenuItem
                                className="text-rose-400 focus:from-rose-500/0 focus:to-rose-500/15 mt-1"
                                onClick={() => header.column.setFilterValue(undefined)}
                              >
                                <FilterX size={14} className="mr-2 opacity-70" />
                                <span>Bỏ lọc</span>
                              </DropdownMenuItem>
                            )}

                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Virtualized Rows Container */}
          <div
            style={{
              position: 'absolute',
              top: 48, // Height of the sticky header
              left: 0,
              width: '100%',
              transform: `translateY(${rowVirtualizer.getVirtualItems()[0]?.start ?? 0}px)`,
            }}
          >
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const row = rows[virtualRow.index];
              const isSelected = selectedFiles.includes(row.original.file_path);

              return (
                <div
                  key={row.id}
                  data-index={virtualRow.index}
                  onClick={(e) => handleRowClick(e, row.original.file_path)}
                  className={`flex w-full items-stretch cursor-pointer select-none transition-all duration-300 relative group overflow-hidden border-b border-white/5 ${isSelected ? 'row-active-bg after:absolute after:left-0 after:top-0 after:bottom-0 after:w-0.75 after:bg-indigo-500' : 'row-hover-bg'
                    }`}
                  style={{ height: '40px' }}
                >
                  <div className="row-gradient-overlay" />
                  {row.getVisibleCells().map(cell => {
                    let value = cell.getValue();
                    if (value === null || value === undefined) value = "";

                    return (
                      <div
                        key={cell.id}
                        className={`py-1.5 text-zinc-300 flex items-center border-r border-white/5 last:border-r-0 z-10 ${cell.column.id === 'select' ? 'px-0 justify-center' : 'px-3'}`}
                        style={{ width: cell.column.getSize() }}
                      >
                        <div className={cell.column.id === 'select' ? 'w-full flex justify-center items-center h-full' : 'truncate w-full block'}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        {typeof document !== 'undefined' && createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-100 px-3 py-1.5 text-xs font-medium rounded-md shadow-md backdrop-blur-xl bg-white/70 text-zinc-800 dark:bg-zinc-800/70 dark:text-white/80 border border-black/10 dark:border-white/10 pointer-events-none"
            style={{ display: 'none' }}
          />,
          document.body
        )}
      </div>
    </div>
  );
};
