import React, { useEffect, useRef, useState } from 'react';
import { Eye, Sparkles, X, ZoomIn } from 'lucide-react';
import type { SpecimenPreset } from '../../constants/bioEnums.ts';
import { labAudio } from '../../utils/labAudio.ts';

interface EyepieceCanvasProps {
  preset: SpecimenPreset;
  magnification: number; // 40 | 100 | 400
  stained: boolean;
  stainColor: string;
  focused: boolean;
  centeredModal?: boolean;
  onClose?: () => void;
}

interface CalloutSpot {
  name: string;
  xRatio: number;
  yRatio: number;
  description: string;
}

const CALLOUTS_BY_PRESET: Record<SpecimenPreset, CalloutSpot[]> = {
  onion_peel: [
    { name: 'Cell Wall', xRatio: 0.3, yRatio: 0.36, description: 'Rigid cellulose outer layer forming the brick-like plant grid.' },
    { name: 'Nucleus', xRatio: 0.45, yRatio: 0.44, description: 'Amber iodine-stained DNA control center pushed near the cell wall.' },
    { name: 'Central Vacuole', xRatio: 0.62, yRatio: 0.56, description: 'Large fluid-filled sac maintaining plant turgor pressure.' },
  ],
  cheek_cells: [
    { name: 'Plasma Membrane', xRatio: 0.33, yRatio: 0.41, description: 'Flexible outer boundary—animal cells have no rigid cell wall.' },
    { name: 'Nucleus', xRatio: 0.5, yRatio: 0.49, description: 'Methylene-blue stained genetic core holding DNA.' },
    { name: 'Cytoplasm', xRatio: 0.65, yRatio: 0.58, description: 'Gel-like cell interior where metabolic reactions occur.' },
  ],
  leaf_stomata: [
    { name: 'Guard Cells', xRatio: 0.41, yRatio: 0.48, description: 'Kidney-shaped epidermal cells that swell or shrink to control gas flow.' },
    { name: 'Stoma Pore', xRatio: 0.5, yRatio: 0.5, description: 'Microscopic breathing pore letting CO₂ in and O₂ / water vapor out.' },
    { name: 'Chloroplasts & Grana', xRatio: 0.57, yRatio: 0.43, description: 'Green organelles with stacked thylakoid grana inside guard cells.' },
  ],
  pond_microbes: [
    { name: 'Paramecium', xRatio: 0.46, yRatio: 0.45, description: 'Fast-swimming ciliated single-celled protist.' },
    { name: 'Algal Filament', xRatio: 0.64, yRatio: 0.6, description: 'Photosynthetic green algal chain with spiral chloroplasts.' },
  ],
  blood_smear: [
    { name: 'Red Blood Cell', xRatio: 0.43, yRatio: 0.48, description: 'Biconcave oxygen carrier packed with hemoglobin (no nucleus).' },
    { name: 'White Blood Cell', xRatio: 0.62, yRatio: 0.52, description: 'Larger immune defender with a multi-lobed stained nucleus.' },
  ],
  yeast_cells: [
    { name: 'Parent Yeast Cell', xRatio: 0.47, yRatio: 0.5, description: 'Oval unicellular fungus undergoing cellular respiration.' },
    { name: 'Budding Daughter', xRatio: 0.59, yRatio: 0.44, description: 'Asexual bud pinching off from the parent cell.' },
  ],
  paramecium: [
    { name: 'Cilia Fringe', xRatio: 0.36, yRatio: 0.48, description: 'Coordinated beating hair-like oars for locomotion.' },
    { name: 'Contractile Vacuole', xRatio: 0.54, yRatio: 0.5, description: 'Star-shaped pump expelling excess osmotic water.' },
  ],
  generic_cells: [
    { name: 'Cell Membrane', xRatio: 0.36, yRatio: 0.46, description: 'Selectively permeable phospholipid boundary.' },
    { name: 'Nucleus', xRatio: 0.52, yRatio: 0.5, description: 'DNA-containing control organelle.' },
  ],
};

export const EyepieceCanvas: React.FC<EyepieceCanvasProps> = ({
  preset,
  magnification,
  stained,
  stainColor,
  focused,
  centeredModal = false,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedCallout, setSelectedCallout] = useState<CalloutSpot | null>(null);
  const [manualZoom, setManualZoom] = useState<number>(magnification);
  const [focusOffset, setFocusOffset] = useState<number>(0);
  const animatedZoomRef = useRef<number>(magnification);

  useEffect(() => {
    setManualZoom(magnification);
  }, [magnification]);

  const effectiveFocused = focused && Math.abs(focusOffset) <= 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const start = performance.now();

    const draw = (now: number) => {
      const t = (now - start) * 0.001;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const radius = w * 0.46;

      // Smooth zoom interpolation
      animatedZoomRef.current += (manualZoom - animatedZoomRef.current) * 0.14;
      const zoomScale =
        animatedZoomRef.current >= 320
          ? 1.5
          : animatedZoomRef.current >= 90
            ? 1.02
            : 0.68;

      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      // Brightfield optical illumination gradient + subtle stain wash
      const bgGrad = ctx.createRadialGradient(cx - 18, cy - 18, 12, cx, cy, radius);
      bgGrad.addColorStop(0, '#ffffff');
      bgGrad.addColorStop(
        0.78,
        stained
          ? preset === 'onion_peel'
            ? '#fef9c3'
            : preset === 'cheek_cells'
              ? '#eff6ff'
              : '#fff1f2'
          : '#f8fafc',
      );
      bgGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      const blurAmount = !focused ? 3.5 : Math.abs(focusOffset) * 1.3;
      if (blurAmount > 0.2) {
        ctx.filter = `blur(${blurAmount.toFixed(1)}px)`;
      }

      ctx.translate(cx, cy);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-cx, -cy);

      const activeStain = stained ? stainColor || '#d97706' : '#94a3b8';

      if (preset === 'onion_peel') {
        const cols = 6;
        const rows = 6;
        const cellW = 72;
        const cellH = 42;
        const originX = cx - (cols * cellW) / 2;
        const originY = cy - (rows * cellH) / 2;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const x = originX + c * cellW + (r % 2 === 0 ? 0 : 18);
            const y = originY + r * cellH;

            // Brick plant cell + cellulose cell wall
            ctx.fillStyle = stained ? 'rgba(253, 230, 138, 0.55)' : 'rgba(241, 245, 249, 0.42)';
            ctx.strokeStyle = stained ? '#92400e' : '#94a3b8';
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            ctx.roundRect(x, y, cellW - 3, cellH - 3, 5);
            ctx.fill();
            ctx.stroke();

            // Central vacuole translucent sac
            ctx.fillStyle = stained ? 'rgba(255, 251, 235, 0.55)' : 'rgba(255, 255, 255, 0.45)';
            ctx.beginPath();
            ctx.roundRect(x + 14, y + 6, cellW - 22, cellH - 14, 4);
            ctx.fill();

            // Stained Nucleus + inner Nucleolus dot
            ctx.fillStyle = stained ? '#78350f' : 'rgba(148, 163, 184, 0.35)';
            ctx.beginPath();
            ctx.ellipse(x + cellW * 0.2, y + cellH * 0.34, 6.2, 4.6, 0.25, 0, Math.PI * 2);
            ctx.fill();
            if (stained) {
              ctx.fillStyle = '#451a03';
              ctx.beginPath();
              ctx.arc(x + cellW * 0.2, y + cellH * 0.34, 2, 0, Math.PI * 2);
              ctx.fill();
            }

            // Cytoplasmic streaming granules along cell perimeter
            const streamX = x + 10 + ((t * 16 + c * 11 + r * 7) % (cellW - 20));
            ctx.fillStyle = stained ? 'rgba(180, 83, 9, 0.42)' : 'rgba(100, 116, 139, 0.3)';
            ctx.beginPath();
            ctx.arc(streamX, y + cellH * 0.78, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (preset === 'cheek_cells' || preset === 'generic_cells') {
        const blobs = [
          { x: cx - 64, y: cy - 36, rx: 46, ry: 34, rot: 0.3 },
          { x: cx + 10, y: cy - 8, rx: 52, ry: 40, rot: -0.2 },
          { x: cx + 72, y: cy + 44, rx: 42, ry: 30, rot: 0.55 },
          { x: cx - 44, y: cy + 56, rx: 46, ry: 35, rot: -0.35 },
        ];
        blobs.forEach((b, idx) => {
          ctx.save();
          ctx.translate(b.x + Math.sin(t * 0.8 + idx) * 1.4, b.y + Math.cos(t * 0.6 + idx) * 1.2);
          ctx.rotate(b.rot);
          ctx.fillStyle = stained ? 'rgba(147, 197, 253, 0.48)' : 'rgba(226, 232, 240, 0.45)';
          ctx.strokeStyle = stained ? activeStain : '#94a3b8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, 0, b.rx, b.ry, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Dark-stained nucleus + tiny cytoplasmic granules
          ctx.fillStyle = stained ? '#1e3a8a' : 'rgba(148, 163, 184, 0.4)';
          ctx.beginPath();
          ctx.arc(4, -2, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      } else if (preset === 'leaf_stomata') {
        // Wavy epidermal jigsaw cell walls
        ctx.strokeStyle = stained ? '#be123c' : '#475569';
        ctx.lineWidth = 1.6;
        for (let i = -3; i <= 3; i++) {
          ctx.beginPath();
          ctx.moveTo(cx - 170, cy + i * 44);
          ctx.bezierCurveTo(cx - 60, cy + i * 44 + 16, cx + 60, cy + i * 44 - 16, cx + 170, cy + i * 44);
          ctx.stroke();
        }
        const stomata = [
          { x: cx, y: cy },
          { x: cx - 88, y: cy - 64 },
          { x: cx + 86, y: cy + 62 },
        ];
        stomata.forEach((s) => {
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.fillStyle = stained ? 'rgba(74, 222, 128, 0.78)' : 'rgba(134, 239, 172, 0.55)';
          ctx.strokeStyle = stained ? '#9f1239' : '#166534';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.ellipse(-11, 0, 12, 26, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.ellipse(11, 0, 12, 26, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Central Stoma Pore opening
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.ellipse(0, 0, 4.8, 13, 0, 0, Math.PI * 2);
          ctx.fill();

          // Chloroplasts with stacked grana disc bands visible inside guard cells
          [-12, 12].forEach((gx) => {
            [-12, -4, 4, 12].forEach((gy) => {
              ctx.fillStyle = '#15803d';
              ctx.beginPath();
              ctx.ellipse(gx, gy, 3.2, 2.2, 0.3, 0, Math.PI * 2);
              ctx.fill();
              if (zoomScale > 1.2) {
                ctx.fillStyle = '#052e16';
                ctx.fillRect(gx - 2, gy - 0.5, 4, 1);
              }
            });
          });
          ctx.restore();
        });
      } else {
        const count = 7;
        for (let i = 0; i < count; i++) {
          const px = cx + Math.sin(t * 0.7 + i * 1.4) * 68;
          const py = cy + Math.cos(t * 0.55 + i * 1.9) * 62;
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(t * 0.3 + i);
          ctx.fillStyle = preset === 'blood_smear' ? '#ef4444' : stained ? activeStain : '#10b981';
          ctx.globalAlpha = 0.82;
          ctx.beginPath();
          ctx.ellipse(0, 0, preset === 'yeast_cells' ? 13 : 22, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          if (preset === 'yeast_cells') {
            ctx.beginPath();
            ctx.arc(14, -4, 6.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      ctx.restore();

      // Microscope pointer needle
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx + radius, cy);
      ctx.lineTo(cx + 18, cy);
      ctx.stroke();

      // Optical vignette + subtle top-left glass reflection arc
      const vig = ctx.createRadialGradient(cx, cy, radius * 0.72, cx, cy, radius);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(15, 23, 42, 0.42)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 14, -Math.PI * 0.82, -Math.PI * 0.48);
      ctx.stroke();

      ctx.restore();

      // Crisp dark metallic eyepiece bezel
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [preset, manualZoom, stained, stainColor, focused, focusOffset]);

  const callouts = CALLOUTS_BY_PRESET[preset] ?? CALLOUTS_BY_PRESET.generic_cells;
  const displaySizeClass = centeredModal ? 'w-72 h-72 sm:w-80 sm:h-80' : 'w-48 h-48';

  const cardInner = (
    <div
      className={`bg-white border border-[#C6DBD0] rounded-2xl shadow-xl ${
        centeredModal ? 'p-6 max-w-md w-full' : 'p-4'
      } space-y-3.5`}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-[#11241B] flex items-center gap-1.5">
          <Eye className="w-4 h-4 text-[#0D7A5F]" />
          <span>Microscope Cell View</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold text-[#0D7A5F]">
            {manualZoom}x · {effectiveFocused ? 'In Focus' : 'Blurry'}
          </span>
          {centeredModal && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close cell view"
              className="p-1 rounded-lg hover:bg-[#EFF7F2] text-[#4E6B5D] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Circular optical viewport with clickable organelle hotspots INSIDE the viewport */}
      <div className={`relative ${displaySizeClass} mx-auto select-none`}>
        <canvas
          ref={canvasRef}
          width={320}
          height={320}
          className="w-full h-full rounded-full block"
        />
        {effectiveFocused &&
          callouts.map((spot) => {
            const isActive = selectedCallout?.name === spot.name;
            return (
              <button
                key={spot.name}
                type="button"
                onClick={() => {
                  labAudio.playClick();
                  setSelectedCallout(spot);
                }}
                style={{
                  left: `${spot.xRatio * 100}%`,
                  top: `${spot.yRatio * 100}%`,
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full border text-[10px] font-bold shadow-md transition-transform cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#0D7A5F] text-white border-white scale-110'
                    : 'bg-white/95 text-[#0D7A5F] border-[#0D7A5F] hover:scale-105'
                }`}
              >
                {spot.name}
              </button>
            );
          })}
      </div>

      {/* Magnification & Fine-Focus Interactive Controls */}
      <div className="space-y-2 pt-2 border-t border-[#ECF3EE]">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-[#4E6B5D] font-medium flex items-center gap-1">
            <ZoomIn className="w-3.5 h-3.5 text-[#0D7A5F]" />
            <span>Objective Lens:</span>
          </span>
          <div className="inline-flex gap-1">
            {[
              { total: 40, label: '4x' },
              { total: 100, label: '10x' },
              { total: 400, label: '40x' },
            ].map((opt) => (
              <button
                key={opt.total}
                type="button"
                onClick={() => {
                  labAudio.playKnobClick();
                  setManualZoom(opt.total);
                }}
                className={`px-2.5 py-1 rounded font-mono text-[11px] font-semibold cursor-pointer ${
                  manualZoom === opt.total
                    ? 'bg-[#0D7A5F] text-white'
                    : 'bg-[#EFF7F2] text-[#2A4739] hover:bg-[#DCECE3]'
                }`}
              >
                {opt.label} ({opt.total}x)
              </button>
            ))}
          </div>
        </div>

        {focused && (
          <label className="flex items-center justify-between gap-2 text-xs text-[#4E6B5D]">
            <span>Fine Focus Knob:</span>
            <input
              type="range"
              min={-3}
              max={3}
              step={1}
              value={focusOffset}
              onChange={(e) => setFocusOffset(Number(e.target.value))}
              className="w-36 accent-[#0D7A5F]"
            />
          </label>
        )}
      </div>

      {selectedCallout ? (
        <div className="rounded-xl bg-[#ECF7F1] border border-[#BFE2CF] px-3.5 py-2.5 text-xs space-y-0.5">
          <p className="font-semibold text-[#11241B] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#0D7A5F]" />
            <span>{selectedCallout.name}</span>
          </p>
          <p className="text-[#2D4D3E] leading-relaxed">{selectedCallout.description}</p>
        </div>
      ) : (
        <p className="text-[11px] text-[#547163] text-center">
          {effectiveFocused
            ? 'Click any organelle label inside the lens to inspect its biological role.'
            : 'Complete slide staining and fine focus to sharpen cellular organelles.'}
        </p>
      )}
    </div>
  );

  if (centeredModal) {
    return (
      <div
        className="fixed inset-0 z-50 bg-[#0B1D14]/45 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        {cardInner}
      </div>
    );
  }

  return cardInner;
};
