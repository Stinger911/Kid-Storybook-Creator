import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TooltipProps {
  children: React.ReactNode;
  title: string;
  content: string;
  position?: 'bottom' | 'bottom-left' | 'bottom-right' | 'top';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  title,
  content,
  position = 'bottom',
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);

  const handleMouseEnter = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    // A soft 150ms delay keeps tooltips from closing if mouse briefly slips away
    const id = window.setTimeout(() => {
      setIsHovered(false);
    }, 150);
    setTimeoutId(id);
  };

  // Tailored position-based styles for the main container and the balloon arrow
  let positionClasses = '';
  let arrowClasses = '';
  let animationOrigin = 'center';

  switch (position) {
    case 'bottom':
      positionClasses = 'top-full left-1/2 -translate-x-1/2 mt-2';
      arrowClasses = 'left-1/2 -translate-x-1/2 border-b-stone-900 top-[-6px] border-l-transparent border-r-transparent border-b-[6px] border-l-[6px] border-r-[6px]';
      animationOrigin = 'top';
      break;
    case 'bottom-left':
      positionClasses = 'top-full left-0 mt-2';
      arrowClasses = 'left-4 border-b-stone-900 top-[-6px] border-l-transparent border-r-transparent border-b-[6px] border-l-[6px] border-r-[6px]';
      animationOrigin = 'top left';
      break;
    case 'bottom-right':
      positionClasses = 'top-full right-0 mt-2';
      arrowClasses = 'right-4 border-b-stone-900 top-[-6px] border-l-transparent border-r-transparent border-b-[6px] border-l-[6px] border-r-[6px]';
      animationOrigin = 'top right';
      break;
    case 'top':
      positionClasses = 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      arrowClasses = 'left-1/2 -translate-x-1/2 border-t-stone-900 bottom-[-6px] border-l-transparent border-r-transparent border-t-[6px] border-l-[6px] border-r-[6px]';
      animationOrigin = 'bottom';
      break;
  }

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: position.startsWith('bottom') ? -4 : 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: position.startsWith('bottom') ? -2 : 2 }}
            transition={{ type: 'spring', damping: 15, stiffness: 220 }}
            style={{ originX: animationOrigin.includes('left') ? 0 : animationOrigin.includes('right') ? 1 : 0.5, originY: animationOrigin.includes('top') ? 0 : 1 }}
            className={`absolute z-[100] w-64 p-3 bg-stone-900 text-stone-100 rounded-xl shadow-xl border border-stone-800 text-left cursor-default select-none pointer-events-none ${positionClasses}`}
          >
            {/* Elegant pointing triangle */}
            <div className={`absolute w-0 h-0 border-solid ${arrowClasses}`} />
            
            <div className="flex flex-col gap-1">
              <span className="font-sans font-black text-xs uppercase tracking-wider text-amber-400">
                {title}
              </span>
              <span className="font-sans text-[11px] text-stone-300 leading-normal font-medium">
                {content}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
