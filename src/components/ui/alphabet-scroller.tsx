import React, { useRef, useState, useEffect } from 'react';

export interface AlphabetScrollerProps {
  alphabetMap: Map<string, number>;
  onScrollTo: (index: number) => void;
  isVisible: boolean;
  onScrubStateChange?: (isScrubbing: boolean) => void;
  className?: string;
}

export const AlphabetScroller: React.FC<AlphabetScrollerProps> = ({
  alphabetMap,
  onScrollTo,
  isVisible,
  onScrubStateChange,
  className = '',
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrubbingData, setScrubbingData] = useState<{ letter: string; y: number } | null>(null);
  const alphabet = ['#', ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))];

  useEffect(() => {
    if (onScrubStateChange) {
      onScrubStateChange(scrubbingData !== null);
    }
  }, [scrubbingData, onScrubStateChange]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!scrollerRef.current) return;
    scrollerRef.current.setPointerCapture(e.pointerId);
    handleScrub(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!scrollerRef.current || !scrollerRef.current.hasPointerCapture(e.pointerId)) return;
    handleScrub(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!scrollerRef.current) return;
    scrollerRef.current.releasePointerCapture(e.pointerId);
    setScrubbingData(null);
  };

  const handleScrub = (e: React.PointerEvent) => {
    if (!scrollerRef.current) return;
    const rect = scrollerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    const percentage = Math.max(0, Math.min(1, y / height));
    const letterIndex = Math.min(Math.floor(percentage * alphabet.length), alphabet.length - 1);
    const targetLetter = alphabet[letterIndex];

    const targetRowIndex = alphabetMap.get(targetLetter);
    if (targetRowIndex !== undefined) {
      onScrollTo(targetRowIndex);
    } else {
      // Tìm chữ cái gần nhất phía sau nếu chữ cái hiện tại không có dữ liệu
      for (let i = letterIndex + 1; i < alphabet.length; i++) {
         if (alphabetMap.has(alphabet[i])) {
            onScrollTo(alphabetMap.get(alphabet[i])!);
            break;
         }
      }
    }
    
    setScrubbingData({ letter: targetLetter, y: Math.max(0, Math.min(rect.height, y)) });
  };

  return (
    <div
      ref={scrollerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`absolute w-5 z-40 flex flex-col items-center justify-between py-2 rounded-full transition-all duration-300 select-none touch-none cursor-pointer ${
        isVisible || scrubbingData ? 'opacity-100 bg-black/40 backdrop-blur-md shadow-lg border border-white/10' : 'opacity-0 pointer-events-none translate-x-2'
      } ${className}`}
    >
      {alphabet.map((letter) => {
        const hasData = alphabetMap.has(letter);
        const isSelected = scrubbingData?.letter === letter;
        
        return (
          <div 
            key={letter} 
            className={`text-[9px] font-bold leading-none w-full text-center transition-all duration-150 flex-1 flex items-center justify-center ${
              isSelected ? 'text-indigo-400 scale-150 drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 
              hasData ? 'text-zinc-400 hover:text-zinc-200' : 'text-zinc-700'
            }`}
          >
            {letter}
          </div>
        );
      })}
      
      {/* Bubble Indicator popup */}
      {scrubbingData && (
        <div 
          className="absolute right-8 w-14 h-14 bg-indigo-500 text-white rounded-full flex items-center justify-center font-black text-2xl shadow-[0_0_30px_rgba(99,102,241,0.6)] border border-indigo-300/30 pointer-events-none transition-none z-50"
          style={{ 
            top: scrubbingData.y - 28, // Căn giữa
          }}
        >
          {scrubbingData.letter}
          {/* Mũi tên nhọn trỏ vào thanh */}
          <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-indigo-500 rotate-45 border-t border-r border-indigo-300/30" />
        </div>
      )}
    </div>
  );
};
