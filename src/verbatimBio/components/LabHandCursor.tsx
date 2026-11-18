import React, { useEffect, useState } from 'react';

interface LabHandCursorProps {
  active: boolean;
  isHoveringTarget?: boolean;
  holdingLabel?: string | null;
}

export const LabHandCursor: React.FC<LabHandCursorProps> = ({
  active,
  isHoveringTarget = false,
  holdingLabel = null,
}) => {
  const [pos, setPos] = useState<{ x: number; y: number; visible: boolean }>({
    x: -100,
    y: -100,
    visible: false,
  });
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    if (!active) {
      setPos((p) => (p.visible ? { ...p, visible: false } : p));
      return;
    }

    const shouldHideOverElement = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) return true;
      // Hide custom hand cursor over DOM buttons/modals/HUD controls so OS pointer never overlaps it
      if (
        target.closest(
          '[data-hide-hand-cursor="true"], button, a, select, input, textarea, [role="dialog"]',
        )
      ) {
        return true;
      }
      // Show ONLY when inside the 3D lab canvas wrapper
      return !target.closest('[data-lab-canvas-stage="true"]');
    };

    const onMove = (e: MouseEvent) => {
      const hide = shouldHideOverElement(e.target);
      setPos({ x: e.clientX, y: e.clientY, visible: !hide });
    };
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);
    const onLeave = () => setPos((p) => ({ ...p, visible: false }));

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    document.addEventListener('mouseleave', onLeave);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, [active]);

  if (!active || !pos.visible) return null;

  const isGrabbing = pressed || Boolean(holdingLabel);

  return (
    <div
      className="fixed top-0 left-0 z-[70] pointer-events-none select-none hidden md:block"
      style={{
        transform: `translate3d(${pos.x - 10}px, ${pos.y - 6}px, 0)`,
      }}
      aria-hidden="true"
    >
      <div
        style={{
          transform: `scale(${pressed ? 0.9 : isHoveringTarget ? 1.08 : 1})`,
          transition: 'transform 90ms ease-out',
        }}
      >
        {/* Cartoon gloved lab hand SVG */}
        <svg width="34" height="36" viewBox="0 0 36 38" fill="none" className="drop-shadow-md">
          {isGrabbing ? (
            /* Pinching / holding gloved hand */
            <g>
              <path
                d="M11 10 C11 6, 16 5, 17 10 L17 15 C19 13, 23 13, 23 17 L23 19 C25 17, 29 18, 28 22 L27 29 C26 33, 21 35, 16 35 C11 35, 8 31, 8 25 L8 18 C8 14, 11 13, 11 17 Z"
                fill="#E0F2FE"
                stroke="#0369A1"
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              <rect x="10" y="31" width="15" height="4" rx="2" fill="#0EA5E9" />
            </g>
          ) : (
            /* Pointing gloved index hand */
            <g>
              <path
                d="M12 4 C12 2, 16 2, 16 5 L16 15 C18 13, 21 13, 21 16 L21 17 C23 15, 26 16, 26 18 L26 20 C28 18, 31 19, 30 23 L29 29 C28 33, 23 35, 17 35 C11 35, 8 30, 8 24 L8 17 C8 15, 10 14, 12 16 Z"
                fill={isHoveringTarget ? '#D1FAE5' : '#E0F2FE'}
                stroke={isHoveringTarget ? '#059669' : '#0369A1'}
                strokeWidth="2.2"
                strokeLinejoin="round"
              />
              <rect
                x="10"
                y="31"
                width="16"
                height="4"
                rx="2"
                fill={isHoveringTarget ? '#10B981' : '#0EA5E9'}
              />
            </g>
          )}
        </svg>

        {holdingLabel && (
          <span className="ml-6 -mt-3 inline-block px-2 py-0.5 rounded bg-[#0F172A] text-white text-[10px] font-semibold shadow-sm whitespace-nowrap">
            {holdingLabel}
          </span>
        )}
      </div>
    </div>
  );
};
