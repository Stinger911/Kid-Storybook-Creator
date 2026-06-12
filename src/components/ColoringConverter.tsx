import React, { useRef, useState, useEffect } from 'react';
import { Upload, Sliders, Image as ImageIcon, Sparkles, AlertCircle, RefreshCw, PenTool, Flame, Eraser, Check } from 'lucide-react';

interface ColoringConverterProps {
  onColoringGenerated?: (coloringDataUrl: string, originalDataUrl: string, adjustments: any) => void;
  initialOriginalImage?: string;
  initialAdjustments?: {
    threshold: number;
    edgeStrength: number;
    brightness: number;
    contrast: number;
    invert: boolean;
    noProcess?: boolean;
  };
}

export default function ColoringConverter({
  onColoringGenerated,
  initialOriginalImage,
  initialAdjustments,
}: ColoringConverterProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(initialOriginalImage || null);
  const [dragActive, setDragActive] = useState(false);
  
  // Coloring conversion sliders
  const [threshold, setThreshold] = useState(initialAdjustments?.threshold ?? 40);
  const [edgeStrength, setEdgeStrength] = useState(initialAdjustments?.edgeStrength ?? 3);
  const [brightness, setBrightness] = useState(initialAdjustments?.brightness ?? 15);
  const [contrast, setContrast] = useState(initialAdjustments?.contrast ?? 50);
  const [invert, setInvert] = useState(initialAdjustments?.invert ?? false);
  const [noProcess, setNoProcess] = useState<boolean>(initialAdjustments?.noProcess ?? false);

  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Canvases for processing
  const sourceCanvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);

  // Sync with changes to initialOriginalImage or initialAdjustments (e.g., when parent shifts pages)
  useEffect(() => {
    if (initialOriginalImage) {
      setImageSrc(initialOriginalImage);
    } else {
      setImageSrc(null);
    }
  }, [initialOriginalImage]);

  useEffect(() => {
    if (initialAdjustments) {
      setThreshold(initialAdjustments.threshold ?? 40);
      setEdgeStrength(initialAdjustments.edgeStrength ?? 3);
      setBrightness(initialAdjustments.brightness ?? 15);
      setContrast(initialAdjustments.contrast ?? 50);
      setInvert(initialAdjustments.invert ?? false);
      setNoProcess(initialAdjustments.noProcess ?? false);
    } else {
      setThreshold(40);
      setEdgeStrength(3);
      setBrightness(15);
      setContrast(50);
      setInvert(false);
      setNoProcess(false);
    }
  }, [initialAdjustments]);

  // Handle adjustments update
  useEffect(() => {
    if (imageSrc) {
      processImage();
    }
  }, [imageSrc, threshold, edgeStrength, brightness, contrast, invert, noProcess]);

  // Drag-and-drop mechanics
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Oops! Please upload an image file (PNG, JPG, or WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setImageSrc(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  // Advanced Sobel Filter for converting Photo to Coloring Page Outline
  const processImage = () => {
    const sourceCanvas = sourceCanvasRef.current;
    const outputCanvas = outputCanvasRef.current;
    if (!sourceCanvas || !outputCanvas || !imageSrc) return;

    setIsProcessing(true);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const ctxSource = sourceCanvas.getContext('2d');
      const ctxOutput = outputCanvas.getContext('2d');
      if (!ctxSource || !ctxOutput) return;

      // Limit max dimension for steady browser performance (keep ready templates high-res)
      const maxDim = noProcess ? 1200 : 600;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      sourceCanvas.width = width;
      sourceCanvas.height = height;
      outputCanvas.width = width;
      outputCanvas.height = height;

      // Draw original image to source canvas
      ctxSource.drawImage(img, 0, 0, width, height);

      // Bypass outline and threshold filters for pre-optimized coloring layouts
      if (noProcess) {
        ctxOutput.drawImage(img, 0, 0, width, height);
        const coloringDataUrl = outputCanvas.toDataURL('image/png');
        if (onColoringGenerated) {
          onColoringGenerated(coloringDataUrl, imageSrc, {
            threshold,
            edgeStrength,
            brightness,
            contrast,
            invert,
            noProcess: true
          });
        }
        setIsProcessing(false);
        return;
      }

      // Get image data
      const imgData = ctxSource.getImageData(0, 0, width, height);
      const data = imgData.data;

      // 1. Contrast & Brightness Pre-Processing
      const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
      const bOffset = brightness;

      for (let i = 0; i < data.length; i += 4) {
        // Red
        data[i] = factor * (data[i] - 128) + 128 + bOffset;
        // Green
        data[i + 1] = factor * (data[i + 1] - 128) + 128 + bOffset;
        // Blue
        data[i + 2] = factor * (data[i + 2] - 128) + 128 + bOffset;
      }

      // Create output buffer for Sobel edge detection
      const outputImgData = ctxOutput.createImageData(width, height);
      const outData = outputImgData.data;

      // Helper to get grayscale pixel value
      const getGrayscale = (x: number, y: number) => {
        if (x < 0) x = 0;
        if (x >= width) x = width - 1;
        if (y < 0) y = 0;
        if (y >= height) y = height - 1;

        const idx = (y * width + x) * 4;
        // Standard luminance weights: 0.299R + 0.587G + 0.114B
        return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      };

      // 2. Sobel Edge Kernel
      const kX = [
        [-1, 0, 1],
        [-2, 0, 2],
        [-1, 0, 1]
      ];
      const kY = [
        [-1, -2, -1],
        [0, 0, 0],
        [1, 2, 1]
      ];

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let gX = 0;
          let gY = 0;

          // Compute Sobel matrix gradients
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const pixel = getGrayscale(x + kx, y + ky);
              gX += pixel * kX[ky + 1][kx + 1];
              gY += pixel * kY[ky + 1][kx + 1];
            }
          }

          // Edge strength (magnitude of gradients)
          const magnitude = Math.sqrt(gX * gX + gY * gY) * (edgeStrength / 2);
          const outIdx = (y * width + x) * 4;

          // Binary Threshold decision to render clean black drawing outline vs white canvas background
          let edgeColor = 255; // default white coloring plate background
          
          if (magnitude > threshold) {
            edgeColor = 0; // Black lines matching coloring page templates
          }

          if (invert) {
            edgeColor = 255 - edgeColor;
          }

          outData[outIdx] = edgeColor;     // R
          outData[outIdx + 1] = edgeColor; // G
          outData[outIdx + 2] = edgeColor; // B
          outData[outIdx + 3] = 255;       // A (fully opaque)
        }
      }

      ctxOutput.putImageData(outputImgData, 0, 0);

      // Trigger callbacks
      const coloringDataUrl = outputCanvas.toDataURL('image/png');
      if (onColoringGenerated) {
        onColoringGenerated(coloringDataUrl, imageSrc, {
          threshold,
          edgeStrength,
          brightness,
          contrast,
          invert,
        });
      }

      setIsProcessing(false);
    };
    img.src = imageSrc;
  };

  const handleReset = () => {
    setImageSrc(null);
    setThreshold(40);
    setEdgeStrength(3);
    setBrightness(15);
    setContrast(50);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full bg-white border border-stone-200 rounded-2xl p-6 shadow-sm flex flex-col gap-6" id="coloring-converter">
      {/* Upload Zone */}
      {!imageSrc ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={openFileDialog}
          className={`border-3 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition ${
            dragActive
              ? 'border-amber-400 bg-amber-50/50'
              : 'border-stone-300 hover:border-amber-400 hover:bg-stone-50/50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-4 animate-bounce">
            <Upload className="w-6 h-6" />
          </div>
          <h4 className="font-sans font-bold text-stone-700 text-lg">Click or Drag Photo Here</h4>
          <p className="text-sm text-stone-500 mt-2 max-w-xs">
            Upload your child's favorite toy, a selfie together, a cute pet, or a scenery photo to turn it into a custom coloring book page!
          </p>
          <span className="text-xs text-stone-400 mt-4 font-mono">PNG, JPG or WEBP up to 10MB</span>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Visual Previews column */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-amber-600 tracking-wider uppercase">🎨 Coloring Sheet Preview</span>
              <button
                onClick={handleReset}
                className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 transition"
              >
                <RefreshCw className="w-3 h-3" />
                Change Photo
              </button>
            </div>

            {/* Split Screen Previews */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original picture */}
              <div className="border border-stone-200 rounded-xl overflow-hidden bg-stone-50 relative group">
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/55 text-white rounded text-[10px] font-sans">
                  Original Photo
                </div>
                <img src={imageSrc} alt="Original" className="w-full h-56 object-contain" />
              </div>

              {/* Converted Line-Art Coloring Page */}
              <div className="border border-stone-200 rounded-xl overflow-hidden bg-white relative">
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 text-white rounded text-[10px] font-bold font-sans">
                  Kid's Outline Page
                </div>
                {/* Visual Processing State overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10">
                    <Sparkles className="w-8 h-8 text-amber-500 animate-spin" />
                    <span className="text-xs font-bold text-stone-600 mt-2 font-sans">Drawing outline...</span>
                  </div>
                )}
                
                {/* Keep output canvas accessible to download */}
                <canvas ref={outputCanvasRef} className="w-full h-56 object-contain" />
                
                {/* Hidden canvas to hold source metrics */}
                <canvas ref={sourceCanvasRef} className="hidden" />
              </div>
            </div>
          </div>

          {/* Slider control adjustments column */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-stone-100 pt-6 lg:pt-0 lg:pl-6 flex flex-col gap-5 justify-between">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-1.5 border-b border-stone-100 pb-3">
                <Sliders className="w-4 h-4 text-amber-500" />
                <h4 className="font-sans font-bold text-stone-700 text-sm">Line Customizer Filters</h4>
              </div>

              {/* Ready Coloring Page Bypass switch */}
              <div className="flex flex-col gap-1.5 bg-amber-50/60 p-3 rounded-xl border border-amber-100/70 shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-700 flex items-center gap-1.5">
                    <Check className={`w-3.5 h-3.5 ${noProcess ? 'text-green-600' : 'text-stone-400'}`} />
                    Do not process image
                  </span>
                  <button
                    onClick={() => setNoProcess(!noProcess)}
                    className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 focus:outline-none ${
                      noProcess ? 'bg-amber-500' : 'bg-stone-200'
                    }`}
                    id="toggle-no-process"
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                        noProcess ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[10px] text-stone-500 leading-normal">
                  Toggle on <strong>"Do not process image"</strong> for ready coloring templates/drawings to keep them exactly as uploaded (bypasses detail/edge outlining).
                </p>
              </div>

              {/* Process filters block - dimmed when bypassed */}
              <div className={`flex flex-col gap-4 transition-all duration-300 ${noProcess ? 'opacity-30 pointer-events-none select-none' : ''}`}>
                
                {/* Slider 1: Detail & Edge Threshold */}
                <div className="flex flex-col gap-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-600">Line Cleanliness</label>
                    <span className="text-xs text-stone-400 font-mono font-bold">{threshold}</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full h-1.5 bg-stone-100 accent-amber-500 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-stone-400">Higher numbers remove light background shadows.</span>
                </div>

                {/* Slider 2: Vector Outline Thickness */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-600">Line Blackness Density</label>
                    <span className="text-xs text-stone-400 font-mono font-bold">{edgeStrength}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={edgeStrength}
                    onChange={(e) => setEdgeStrength(Number(e.target.value))}
                    className="w-full h-1.5 bg-stone-100 accent-amber-500 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-stone-400">Boosts visibility of thin outlines for tracing.</span>
                </div>

                {/* Slider 3: Contrast Factor */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-600">Photo Focus Contrast</label>
                    <span className="text-xs text-stone-400 font-mono font-bold">{contrast}</span>
                  </div>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full h-1.5 bg-stone-100 accent-amber-500 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-stone-400">Higher contrast outlines sharper structural details.</span>
                </div>

                {/* Slider 4: Brightness compensation */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-600">White Background Brightness</label>
                    <span className="text-xs text-stone-400 font-mono font-bold">{brightness}</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="100"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full h-1.5 bg-stone-100 accent-amber-500 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-stone-400">Increases brightness to bleach paper gradients.</span>
                </div>

                {/* Option 5: Color Inverter */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-stone-50">
                  <span className="text-xs font-bold text-stone-600">Inverse Lines (Neon chalk)</span>
                  <button
                    onClick={() => setInvert(!invert)}
                    className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 focus:outline-none ${
                      invert ? 'bg-amber-500' : 'bg-stone-200'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                        invert ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

              </div>
            </div>

            {/* Informative advice */}
            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] text-amber-800 leading-relaxed">
                <strong>Tips for Parents:</strong> Photos with plenty of lighting, high contrast, and clean backgrounds create the cleanest, happiest coloring sheets! Try drawing with black marker on plain paper, photograph it, and convert it here!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
