import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  RotateCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  Crop,
} from 'lucide-react';

interface ImageCropModalProps {
  imageSrc: string;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
  cropSize?: number; // visual preview size (default 280)
  outputSize?: number; // final export size (default 600)
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  imageSrc,
  isOpen,
  onClose,
  onCropComplete,
  cropSize = 280,
  outputSize = 600,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0); // degrees: 0, 90, 180, 270
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Load image whenever imageSrc changes
  useEffect(() => {
    if (!imageSrc || !isOpen) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc, isOpen]);

  // Compute scale and dimensions
  const getRenderMetrics = useCallback(() => {
    if (!image) return null;
    const isVertical = rotation % 180 !== 0;
    const effectiveW = isVertical ? image.height : image.width;
    const effectiveH = isVertical ? image.width : image.height;

    // Minimum scale to completely cover the crop square
    const baseScale = Math.max(cropSize / effectiveW, cropSize / effectiveH);
    const scale = baseScale * zoom;
    const drawW = image.width * scale;
    const drawH = image.height * scale;

    // Max pan bounds so the image always fills the square
    const maxPanX = Math.max(0, (effectiveW * scale - cropSize) / 2);
    const maxPanY = Math.max(0, (effectiveH * scale - cropSize) / 2);

    return {
      scale,
      drawW,
      drawH,
      maxPanX,
      maxPanY,
    };
  }, [image, rotation, zoom, cropSize]);

  // Redraw canvas whenever zoom, rotation, pan, or image changes
  useEffect(() => {
    if (!isOpen || !image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const metrics = getRenderMetrics();
    if (!metrics) return;

    // Clamp pan to prevent empty gaps
    const clampedPanX = Math.min(Math.max(pan.x, -metrics.maxPanX), metrics.maxPanX);
    const clampedPanY = Math.min(Math.max(pan.y, -metrics.maxPanY), metrics.maxPanY);

    ctx.clearRect(0, 0, cropSize, cropSize);

    // Save and apply transformations
    ctx.save();
    ctx.translate(cropSize / 2 + clampedPanX, cropSize / 2 + clampedPanY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(image, -metrics.drawW / 2, -metrics.drawH / 2, metrics.drawW, metrics.drawH);
    ctx.restore();
  }, [isOpen, image, zoom, rotation, pan, cropSize, getRenderMetrics]);

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const metrics = getRenderMetrics();
    if (!metrics) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const newX = panStartRef.current.x + dx;
    const newY = panStartRef.current.y + dy;

    // Clamp within bounds
    const clampedX = Math.min(Math.max(newX, -metrics.maxPanX), metrics.maxPanX);
    const clampedY = Math.min(Math.max(newY, -metrics.maxPanY), metrics.maxPanY);

    setPan({ x: clampedX, y: clampedY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.min(3.5, Math.max(1, Number((prev + delta).toFixed(2)))));
  };

  // Apply Crop and generate high-res 600x600 output
  const handleApply = () => {
    if (!image) return;
    const metrics = getRenderMetrics();
    if (!metrics) return;

    const clampedPanX = Math.min(Math.max(pan.x, -metrics.maxPanX), metrics.maxPanX);
    const clampedPanY = Math.min(Math.max(pan.y, -metrics.maxPanY), metrics.maxPanY);

    const ratio = outputSize / cropSize;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = outputSize;
    exportCanvas.height = outputSize;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    exportCtx.imageSmoothingEnabled = true;
    exportCtx.imageSmoothingQuality = 'high';

    exportCtx.save();
    exportCtx.translate(outputSize / 2 + clampedPanX * ratio, outputSize / 2 + clampedPanY * ratio);
    exportCtx.rotate((rotation * Math.PI) / 180);
    exportCtx.drawImage(
      image,
      (-metrics.drawW * ratio) / 2,
      (-metrics.drawH * ratio) / 2,
      metrics.drawW * ratio,
      metrics.drawH * ratio
    );
    exportCtx.restore();

    const croppedResult = exportCanvas.toDataURL('image/jpeg', 0.88);
    onCropComplete(croppedResult);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Adjust Dish Photo</h3>
              <p className="text-[11px] text-slate-500">Drag to position & zoom to fit</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="p-5 flex flex-col items-center justify-center bg-slate-900 select-none">
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-indigo-400/80 cursor-grab active:cursor-grabbing group"
            style={{ width: cropSize, height: cropSize }}
          >
            <canvas
              ref={canvasRef}
              width={cropSize}
              height={cropSize}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onWheel={handleWheel}
              className="touch-none w-full h-full block bg-black"
            />

            {/* Subtle Rule-of-Thirds Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 border border-white/20 opacity-40 group-hover:opacity-70 transition-opacity">
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div></div>
            </div>

            {/* Center Drag Hint Pill */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-950/75 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] text-white/90 flex items-center space-x-1 pointer-events-none shadow-sm">
              <Move className="w-3 h-3 text-indigo-300" />
              <span>Drag to move</span>
            </div>
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="p-4 space-y-3.5 bg-white border-t border-slate-100">
          
          {/* Zoom Slider */}
          <div className="flex items-center space-x-3 text-slate-600">
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(1, Number((prev - 0.2).toFixed(1))))}
              className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700 cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />

            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(3, Number((prev + 0.2).toFixed(1))))}
              className="p-1 rounded-lg hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700 cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-500 w-9 text-right">
              {zoom.toFixed(1)}x
            </span>
          </div>

          {/* Action Row: Rotate & Reset */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              type="button"
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-indigo-600" />
              <span>Rotate 90°</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setRotation(0);
                setPan({ x: 0, y: 0 });
              }}
              className="px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center space-x-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Apply Photo</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
