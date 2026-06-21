import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface FloatingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon?: React.ReactNode;
}

export const FloatingActionButton = React.forwardRef<HTMLButtonElement, FloatingActionButtonProps>(
  ({ className, label, icon, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "group absolute bottom-8 right-8 flex items-center h-14 bg-indigo-500/30 backdrop-blur-xl border border-white/10 hover:border-white/20 text-white rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.8)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.9)] hover:bg-indigo-500/40 transition-all duration-500 overflow-hidden cursor-pointer z-50",
          className
        )}
        {...props}
      >
        <div className="w-14 h-14 flex items-center justify-center shrink-0">
          {icon ? icon : <Plus size={28} className="text-white drop-shadow-md group-hover:scale-110 transition-all duration-500" />}
        </div>
        <span className="max-w-0 opacity-0 group-hover:max-w-50 group-hover:opacity-100 group-hover:pr-6 whitespace-nowrap font-semibold text-[15px] drop-shadow-md transition-all duration-500 ease-in-out">
          {label}
        </span>
      </button>
    );
  }
);
FloatingActionButton.displayName = "FloatingActionButton";
