import React, { useRef, useState, useEffect } from 'react';
import { Sparkles, Trash2, RotateCcw, Download, Printer, Smile, ArrowRight, BookOpen } from 'lucide-react';

interface HandwritingCustomizerProps {
  initialText?: string;
  onTextChange?: (text: string) => void;
  readOnly?: boolean;
  hideStartDots?: boolean;
  onHideStartDotsChange?: (hide: boolean) => void;
}

export default function HandwritingCustomizer({
  initialText = 'Hello World',
  onTextChange,
  readOnly = false,
  hideStartDots = false,
  onHideStartDotsChange,
}: HandwritingCustomizerProps) {
  const [text, setText] = useState(initialText);
  const [lineType, setLineType] = useState<'standard' | 'cursive' | 'wide'>('standard');
  const [color, setColor] = useState('#4f46e5'); // default purple-blue trace crayon
  const [brushSize, setBrushSize] = useState(6);
  const [localHideStartDots, setLocalHideStartDots] = useState(hideStartDots);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Synchronize internal and external state
  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  useEffect(() => {
    setLocalHideStartDots(hideStartDots);
  }, [hideStartDots]);

  const toggleDots = () => {
    const newVal = !localHideStartDots;
    setLocalHideStartDots(newVal);
    if (onHideStartDotsChange) {
      onHideStartDotsChange(newVal);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);
    if (onTextChange) {
      onTextChange(val);
    }
    clearCanvas();
  };

  // Canvas drawing for interactive virtual tracing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset size to match parent layout bounding box
    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = (rect?.width || 800) * 2;
      canvas.height = 200 * 2; // Fixed logical height
      canvas.style.width = '100%';
      canvas.style.height = '200px';
      ctx.scale(2, 2);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [text, lineType]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      // Prevent scrolling when drawing on touchscreen
      e.preventDefault();
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Convert character into handwriting guidelines parameters
  const renderBackgroundLines = () => {
    return (
      <svg className="absolute inset-0 w-full h-[200px] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        {/* Lined paper guides */}
        <line x1="0%" y1="40" x2="100%" y2="40" stroke="#93c5fd" strokeWidth="1.5" /> {/* Top Boundary */}
        <line x1="0%" y1="100" x2="100%" y2="100" stroke="#fca5a5" strokeWidth="1.5" strokeDasharray="6 4" /> {/* Mid-dashed line */}
        <line x1="0%" y1="160" x2="100%" y2="160" stroke="#93c5fd" strokeWidth="1.5" /> {/* Base line */}
        <line x1="0%" y1="195" x2="100%" y2="195" stroke="#e2e8f0" strokeWidth="1" /> {/* Bottom gap boundary */}
      </svg>
    );
  };

  return (
    <div className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden" id="handwriting-customizer">
      {/* Decorative elementary note binder margin */}
      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-red-200 border-r border-red-100 z-10 pointer-events-none" />

      {/* Title / Controls Panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 z-20 pl-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-500" />
          <h3 className="font-sans font-semibold text-stone-700 text-sm md:text-base">
            {readOnly ? 'Tracing Practice Sheet' : 'Create Custom Writing Sheet'}
          </h3>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-stone-500">Practice word:</label>
            <input
              type="text"
              value={text}
              onChange={handleTextChange}
              placeholder="e.g. Cat"
              maxLength={24}
              className="px-3 py-1 text-sm rounded-lg border border-stone-300 focus:ring-4 focus:ring-amber-200 focus:outline-none bg-white text-stone-800 font-semibold"
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLineType(lineType === 'standard' ? 'cursive' : 'standard')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
              lineType === 'cursive'
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
            }`}
          >
            {lineType === 'cursive' ? '✏️ Hollow Letters' : '✨ Dashed Letters'}
          </button>

          <button
            type="button"
            onClick={toggleDots}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
              localHideStartDots
                ? 'bg-stone-100 text-stone-400 border-stone-200'
                : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100/80'
            }`}
            title={localHideStartDots ? "Turn on pink start dots" : "Turn off pink start dots"}
          >
            <span className={`w-2 h-2 rounded-full ${localHideStartDots ? 'bg-stone-400' : 'bg-rose-500 animate-pulse'}`} />
            <span>{localHideStartDots ? 'Pink Dots: Off' : 'Pink Dots: On'}</span>
          </button>
        </div>
      </div>

      {/* Tracing Area Wrapper */}
      <div className="relative w-full h-[200px] border border-dashed border-stone-300 rounded-xl bg-white select-none shadow-inner overflow-hidden pl-6">
        {/* Handwriting Lined Worksheet Guides */}
        {renderBackgroundLines()}

        {/* Outer text preview / SVG letters outline */}
        <div className="absolute inset-x-6 top-0 bottom-0 flex items-center justify-center pointer-events-none z-10 select-none">
          <div className="w-full flex justify-center items-baseline gap-2 overflow-hidden px-4">
            {text.split('').map((char, index) => {
              if (char === ' ') {
                return <span key={index} className="w-8 inline-block" />;
              }
              return (
                <div key={index} className="relative flex flex-col items-center">
                  {/* Tracing SVG character */}
                  <svg
                    viewBox="0 0 100 120"
                    className="w-16 h-28 select-none"
                    style={{ overflow: 'visible' }}
                  >
                    {/* Outline / Guideline behind */}
                    <text
                      x="50%"
                      y="94"
                      textAnchor="middle"
                      className={`school-tracing-font font-handwriting text-[94px] select-none ${
                        lineType === 'cursive'
                          ? 'fill-stone-50 stroke-stone-300 stroke-2'
                          : 'fill-none stroke-stone-200 stroke-[1.5] stroke-dasharray'
                      }`}
                      style={{
                        fontFamily: '"Playwrite GB J", "Schoolbell", "Short Stack", "Playpen Sans", cursive',
                        fontStyle: 'italic',
                        fontWeight: 300,
                        strokeDasharray: lineType === 'standard' ? '6,3' : 'none',
                      }}
                    >
                      {char}
                    </text>

                    {/* Dotted target lines inside letter if cursive */}
                    {lineType === 'cursive' && (
                      <text
                        x="50%"
                        y="94"
                        textAnchor="middle"
                        className="school-tracing-font font-handwriting text-[94px] select-none fill-none stroke-amber-400/60 stroke-[1] stroke-dasharray"
                        style={{
                          fontFamily: '"Playwrite GB J", "Schoolbell", "Short Stack", "Playpen Sans", cursive',
                          fontStyle: 'italic',
                          fontWeight: 300,
                          strokeDasharray: '2,2',
                        }}
                      >
                        {char}
                      </text>
                    )}

                    {/* Helper Tracing Dots for Start / Direction */}
                    {!localHideStartDots && (
                      <>
                        <circle cx="50%" cy="16" r="3.5" fill="#f43f5e" className="animate-pulse" />
                        <text x="50%" y="10" textAnchor="middle" className="text-[9px] fill-rose-500 font-bold font-sans">
                          start
                        </text>
                      </>
                    )}
                  </svg>
                </div>
              );
            })}
          </div>
        </div>

        {/* Drawing layer canvas */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 w-full h-full cursor-crosshair z-20"
        />
      </div>

      {/* Tracing Canvas Control Kit */}
      <div className="flex flex-wrap items-center justify-between gap-3 z-20 pl-4">
        {/* Brush colors (delightful kid crayons) */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-stone-500">Crayon:</span>
          <div className="flex items-center gap-1.5">
            {[
              { color: '#4f46e5', label: 'Blueberry' },
              { color: '#ec4899', label: 'Bubblegum' },
              { color: '#10b981', label: 'Green Apple' },
              { color: '#f59e0b', label: 'Honey' },
              { color: '#ef4444', label: 'Cherry' },
              { color: '#18181b', label: 'Pencil' },
            ].map(( crayon ) => (
              <button
                key={crayon.color}
                onClick={() => setColor(crayon.color)}
                style={{ backgroundColor: crayon.color }}
                title={crayon.label}
                className={`w-6 h-6 rounded-full border-2 transition transform hover:scale-110 ${
                  color === crayon.color ? 'border-amber-400 scale-125 shadow' : 'border-white hover:border-stone-300'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Ink width / Eraser / Restart */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-stone-500">Thickness:</span>
            <input
              type="range"
              min="3"
              max="16"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-20 accent-amber-500 h-1.5 bg-stone-200 rounded-lg cursor-pointer"
            />
          </div>

          <div className="h-4 w-[1px] bg-stone-300" />

          <button
            onClick={clearCanvas}
            className="flex items-center gap-1 px-3 py-1 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg text-xs font-semibold text-stone-600 transition"
            title="Wipe template clear"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
            <span>Wipe Clear</span>
          </button>
        </div>
      </div>
      
      {/* Informative tutorial alert under the template */}
      <div className="flex items-center gap-2 bg-stone-100/50 rounded-xl p-3 text-xs text-stone-600 border border-stone-200/50 pl-4 mt-1">
        <Smile className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p>
          Trace over letters starting from the <span className="text-rose-500 font-bold">pink start dots</span>. Use the virtual crayon to practice drawing on your screen, or print this page to use with physical pencils!
        </p>
      </div>
    </div>
  );
}
