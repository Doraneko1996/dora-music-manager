import React from 'react';
import { Music, X } from 'lucide-react';
import { cn } from '../../lib/utils';

export type AppTheme = 'manager' | 'downloader';

interface LockOverlayProps {
  isLocked: boolean;
  title?: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  innerClassName?: string;
  theme?: AppTheme;
  onClose?: () => void;
  children?: React.ReactNode;
}

export const LockOverlay: React.FC<LockOverlayProps> = ({ 
  isLocked, 
  title = "Đang Chỉnh Sửa",
  description = "Bạn đang chỉnh sửa thông tin, hãy hoàn tất để tiếp tục chọn.",
  icon,
  className,
  innerClassName,
  theme = 'manager',
  onClose,
  children
}) => {
  if (!isLocked) return null;

  const borderClass = theme === 'manager' ? 'border-indigo-500/30' : 'border-rose-500/30';
  const iconColorClass = theme === 'manager' ? 'text-indigo-400' : 'text-rose-400';

  return (
    <div className={cn("absolute inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm pointer-events-auto", className)}>
      <div className={cn("relative bg-zinc-900/90 backdrop-blur-md border p-6 rounded-2xl text-center shadow-2xl shadow-black/80 max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200", borderClass, innerClassName)}>
        {onClose && (
          <button
            onClick={onClose}
            className={cn(
              "absolute top-4 right-4 z-10 rounded-full p-1.5 transition-all duration-300 backdrop-blur-md border border-white/5",
              theme === 'manager' 
                ? "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/30 hover:text-indigo-200 hover:border-indigo-500/50 shadow-[0_0_10px_rgba(99,102,241,0.1)] hover:shadow-[0_0_15px_rgba(99,102,241,0.3)]" 
                : "bg-rose-500/10 text-rose-400 hover:bg-rose-500/30 hover:text-rose-200 hover:border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.1)] hover:shadow-[0_0_15px_rgba(244,63,94,0.3)]"
            )}
          >
            <X size={18} />
          </button>
        )}
        {icon ? (
          <div className={cn("mx-auto mb-4 flex justify-center opacity-80", iconColorClass)}>
            {icon}
          </div>
        ) : (
          <Music className={cn("w-12 h-12 mx-auto mb-4 opacity-80", iconColorClass)} />
        )}
        <h3 className="text-white font-semibold mb-2 text-base">{title}</h3>
        <p className="text-zinc-400 text-sm mb-4">{description}</p>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </div>
  );
};
