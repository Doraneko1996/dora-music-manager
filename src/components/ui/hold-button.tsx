import React, { useState, useEffect, useRef } from 'react';
import { Button, ButtonProps } from './button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

interface HoldButtonProps extends ButtonProps {
  onHold: () => void;
  holdDuration?: number;
}

export const HoldButton = React.forwardRef<HTMLButtonElement, HoldButtonProps>(
  ({ onHold, holdDuration = 3000, className, children, ...props }, ref) => {
    const [isHolding, setIsHolding] = useState(false);
    const [progress, setProgress] = useState(0);
    const holdTimer = useRef<NodeJS.Timeout | null>(null);
    const startTime = useRef<number | null>(null);
    const animationFrame = useRef<number | null>(null);

    const startHold = (e: React.MouseEvent | React.TouchEvent) => {
      // Chỉ cho phép chuột trái
      if ('button' in e && e.button !== 0) return;
      
      setIsHolding(true);
      startTime.current = Date.now();
      
      const updateProgress = () => {
        if (!startTime.current) return;
        const elapsed = Date.now() - startTime.current;
        const newProgress = Math.min((elapsed / holdDuration) * 100, 100);
        setProgress(newProgress);
        
        if (newProgress < 100) {
          animationFrame.current = requestAnimationFrame(updateProgress);
        }
      };
      
      animationFrame.current = requestAnimationFrame(updateProgress);

      holdTimer.current = setTimeout(() => {
        setIsHolding(false);
        setProgress(0);
        if (animationFrame.current) {
          cancelAnimationFrame(animationFrame.current);
          animationFrame.current = null;
        }
        startTime.current = null;
        onHold();
      }, holdDuration);
    };

    const stopHold = () => {
      setIsHolding(false);
      setProgress(0);
      if (holdTimer.current) {
        clearTimeout(holdTimer.current);
        holdTimer.current = null;
      }
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
        animationFrame.current = null;
      }
      startTime.current = null;
    };

    useEffect(() => {
      return () => {
        if (holdTimer.current) clearTimeout(holdTimer.current);
        if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
      };
    }, []);

    return (
      <TooltipProvider>
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <div className="inline-block" onMouseLeave={stopHold}>
              <Button
                ref={ref}
                className={cn("relative overflow-hidden select-none", className)}
                onMouseDown={startHold}
                onMouseUp={stopHold}
                onTouchStart={startHold}
                onTouchEnd={stopHold}
                {...props}
              >
                {isHolding && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-black/20 dark:bg-white/20 transition-none"
                    style={{ width: `${progress}%` }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>
            <p className="text-xs font-medium">Giữ {Math.round(holdDuration / 1000)}s để xác nhận</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

HoldButton.displayName = 'HoldButton';
