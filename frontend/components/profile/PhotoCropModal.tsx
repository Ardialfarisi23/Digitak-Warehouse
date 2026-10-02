"use client";

import { useState, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCw } from "lucide-react";

import Cropper from "react-easy-crop";
import { Button } from "@/components/ui/button";

interface PhotoCropModalProps {
  open: boolean;
  imageSrc: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

export function PhotoCropModal({ open, imageSrc, onConfirm, onCancel }: PhotoCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: { x: number; y: number; width: number; height: number }) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context tidak didukung.");

      const outputSize = 512;
      const image = new window.Image();
      image.src = imageSrc;

      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Gagal memuat gambar untuk di-crop."));
      });

      if (!croppedAreaPixels) {
        throw new Error("Area crop belum siap.");
      }

      let { x, y, width, height } = croppedAreaPixels;

      if (rotation !== 0) {
        const rotatedCanvas = document.createElement("canvas");
        const rotatedCtx = rotatedCanvas.getContext("2d")!;
        const originalWidth = image.naturalWidth;
        const originalHeight = image.naturalHeight;

        if (rotation === 90 || rotation === 270) {
          rotatedCanvas.width = originalHeight;
          rotatedCanvas.height = originalWidth;
        } else {
          rotatedCanvas.width = originalWidth;
          rotatedCanvas.height = originalHeight;
        }

        rotatedCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
        rotatedCtx.rotate((rotation * Math.PI) / 180);
        rotatedCtx.drawImage(image, -originalWidth / 2, -originalHeight / 2);

        if (rotation === 90) {
          x = y;
          y = rotatedCanvas.width - x - width;
          [width, height] = [height, width];
        } else if (rotation === 180) {
          x = rotatedCanvas.width - x - width;
          y = rotatedCanvas.height - y - height;
        } else if (rotation === 270) {
          const rotatedX = y;
          const rotatedY = x;
          x = rotatedCanvas.height - rotatedX - height;
          y = rotatedY;
          [width, height] = [height, width];
        }

        const scale = outputSize / Math.max(width, height);
        const scaledWidth = Math.round(width * scale);
        const scaledHeight = Math.round(height * scale);

        canvas.width = scaledWidth;
        canvas.height = scaledHeight;

        ctx.drawImage(rotatedCanvas, x, y, width, height, 0, 0, scaledWidth, scaledHeight);
      } else {
        const scale = outputSize / Math.max(width, height);
        const scaledWidth = Math.round(width * scale);
        const scaledHeight = Math.round(height * scale);

        canvas.width = scaledWidth;
        canvas.height = scaledHeight;

        ctx.drawImage(image, x, y, width, height, 0, 0, scaledWidth, scaledHeight);
      }

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.92);
      });

      if (!blob) {
        throw new Error("Gagal membuat hasil crop.");
      }

      onConfirm(blob);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal memproses foto.";
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedAreaPixels(null);
    setError(null);
    onCancel();
  };

  const handleRotate = () => {
    setRotation((r) => (r + 90) % 360);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900">Sunting Foto Profil</h3>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isProcessing}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="relative mx-auto w-full max-w-[280px] aspect-square overflow-hidden border border-slate-200">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            rotation={rotation}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: {
                width: "100%",
                height: "100%",
                position: "relative",
                backgroundColor: "#f3f4f6",
              },
              cropAreaStyle: {
                border: "2px solid rgba(255,255,255,0.8)",
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
              },
            }}
          />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
            disabled={zoom <= 1}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <ZoomOut size={16} />
          </button>

          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-slate-900"
          />

          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
            disabled={zoom >= 3}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <ZoomIn size={16} />
          </button>

          <button
            type="button"
            onClick={handleRotate}
            disabled={isProcessing}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            title="Putar 90°"
          >
            <RotateCw size={16} />
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">
            <p>{error}</p>
          </div>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={isProcessing}
            className="rounded-xl border-stone-200 text-slate-700 hover:bg-slate-50"
          >
            Batal
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isProcessing}
            className="rounded-xl bg-slate-900 text-white hover:bg-slate-800"
          >
            {isProcessing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span className="ml-1.5">Menyimpan...</span>
              </>
            ) : (
              "Terapkan"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
