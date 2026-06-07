import React, { useRef, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

export const TruncatedTooltip: React.FC<{ text: React.ReactNode, fullText: string, className?: string }> = ({ text, fullText, className }) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      if (textRef.current && textRef.current.scrollWidth > textRef.current.clientWidth) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    } else {
      setIsOpen(false);
    }
  };

  return (
    <Tooltip open={isOpen} onOpenChange={handleOpenChange} delayDuration={200}>
      <TooltipTrigger asChild>
        <div ref={textRef} className={className}>
          {text}
        </div>
      </TooltipTrigger>
      <TooltipContent 
        side="bottom" 
        align="start" 
        sideOffset={4}
        collisionPadding={24}
        className="max-w-none whitespace-nowrap bg-black/80 backdrop-blur-md border border-white/10 shadow-lg px-2.5 py-1.5 rounded-lg animate-in fade-in-0 zoom-in-95 duration-200"
      >
        <p className="text-xs font-medium text-zinc-300 leading-tight">{fullText}</p>
      </TooltipContent>
    </Tooltip>
  );
};
