import React from 'react';
import { Music } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LockOverlayProps {
  isLocked: boolean;
  className?: string;
}

export const LockOverlay: React.FC<LockOverlayProps> = ({ 
  isLocked, 
  className
}) => {
  if (!isLocked) return null;

  return (
    <div className={cn("absolute inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm", className)}>
      <div className="bg-zinc-900/90 backdrop-blur-md border border-indigo-500/30 p-6 rounded-2xl text-center shadow-2xl shadow-black/80 max-w-xs mx-4 animate-in fade-in zoom-in-95 duration-200">
        <Music className="w-12 h-12 text-indigo-400 mx-auto mb-4 opacity-80" />
        <h3 className="text-white font-semibold mb-2 text-base">Đang Chỉnh Sửa</h3>
        <p className="text-zinc-400 text-sm">Bạn đang chỉnh sửa thông tin, hãy hoàn tất để tiếp tục chọn.</p>
      </div>
    </div>
  );
};
