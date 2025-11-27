import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MoveHorizontal } from 'lucide-react';

interface ComparisonSliderProps {
  beforeImage: string;
  afterImage: string;
  className?: string;
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({
  beforeImage,
  afterImage,
  className = '',
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      setSliderPosition(percentage);
    },
    []
  );

  const onMouseDown = () => setIsDragging(true);
  const onTouchStart = () => setIsDragging(true);

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleMove(e.clientX);
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) handleMove(e.touches[0].clientX);
    };

    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
    }

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isDragging, handleMove]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none group cursor-col-resize ${className}`}
      onMouseDown={(e) => {
         setIsDragging(true);
         handleMove(e.clientX);
      }}
      onTouchStart={(e) => {
         setIsDragging(true);
         handleMove(e.touches[0].clientX);
      }}
    >
      {/* After Image (Background) */}
      <img
        src={afterImage}
        alt="After"
        className="absolute top-0 left-0 w-full h-full object-cover"
      />

      {/* Before Image (Clipped) */}
      <div
        className="absolute top-0 left-0 h-full overflow-hidden border-r-2 border-white/50"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={beforeImage}
          alt="Before"
          className="absolute top-0 left-0 max-w-none h-full object-cover"
          style={{ width: containerRef.current?.offsetWidth || '100%' }} // Keep aspect ratio logic simple
          // Note: In a real responsive grid, calculating the exact width for the inner image 
          // to match the outer container is tricky. We'll rely on the container size.
          // For a simpler approach, we assume the parent has a fixed aspect ratio or fits content.
        />
         {/* Label */}
         <div className="absolute top-4 left-4 bg-black/60 text-white text-xs px-2 py-1 rounded font-medium backdrop-blur-sm">
            Original
        </div>
      </div>
      
       {/* Label for After */}
       <div className="absolute top-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded font-medium backdrop-blur-sm">
            AI Redesign
        </div>

      {/* Slider Handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10 flex items-center justify-center"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="w-8 h-8 -ml-[14px] bg-white rounded-full shadow-lg flex items-center justify-center text-slate-800">
            <MoveHorizontal size={16} />
        </div>
      </div>
    </div>
  );
};
