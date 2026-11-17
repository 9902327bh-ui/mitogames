import React from 'react';

interface LabHandCursorProps {
  cursorDivRef: React.RefObject<HTMLDivElement | null>;
  cursorVisible: boolean;
  cursorHovering: boolean;
  glovesOn: boolean;
}

export const LabHandCursor: React.FC<LabHandCursorProps> = ({
  cursorDivRef,
  cursorVisible,
  cursorHovering,
  glovesOn,
}) => {
  return (
    <div
      ref={cursorDivRef}
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 z-50"
      style={{
        opacity: cursorVisible ? 1 : 0,
        transform: 'translate3d(-100px, -100px, 0)',
      }}
    >
      <svg
        width="46"
        height="52"
        viewBox="0 0 64 72"
        fill="none"
        className="transition-transform duration-100"
        style={{ transform: `scale(${cursorHovering ? 1.14 : 1})` }}
      >
        <path
          d="M22 6C19.5 6 17.5 8 17.5 10.5V34L12.5 29C10.5 27 7.2 27.2 5.4 29.3C3.6 31.4 3.9 34.6 5.9 36.4L19 50.5C21.8 53.5 25.8 55.2 30 55.2H39C46.2 55.2 52 49.4 52 42.2V24.5C52 22 50 20 47.5 20C45.9 20 44.5 20.8 43.7 22.1C43.2 19.6 41 17.8 38.4 17.8C36.7 17.8 35.1 18.7 34.2 20.1C33.6 17.6 31.4 15.8 28.8 15.8C27.5 15.8 26.3 16.3 25.4 17V10.5C25.4 8 24.5 6 22 6Z"
          fill={glovesOn ? '#38bdf8' : '#f4b393'}
          stroke={glovesOn ? '#0369a1' : '#9a583a'}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {glovesOn && (
          <rect
            x="21"
            y="54"
            width="24"
            height="10"
            rx="4"
            fill="#0284c7"
            stroke="#0369a1"
            strokeWidth="2.5"
          />
        )}
      </svg>
    </div>
  );
};
