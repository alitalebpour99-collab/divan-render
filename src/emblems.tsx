// The line emblems of the site (components/ui/Emblem.tsx), on a 24 grid: one per
// section and advisor. `draw` runs 0 → 1 and draws the lines in.
import React from "react";

const SHAPES: Record<string, React.ReactNode> = {
  treasury: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="5.6" />
      <path d="M12 9.4l2.6 2.6-2.6 2.6-2.6-2.6z" />
    </>
  ),
  chancery: (
    <>
      <rect x="3.5" y="6" width="17" height="12.5" rx="1" />
      <path d="M3.8 6.6l8.2 6.2 8.2-6.2" />
      <circle cx="17.2" cy="16.6" r="2.4" fill="currentColor" stroke="none" />
    </>
  ),
  war: (
    <>
      <path d="M5 19L18.5 5.5M19 19L5.5 5.5" />
      <path d="M6 14.6l3.4 3.4M18 14.6L14.6 18" />
      <path d="M17 4.5h2.5V7M7 4.5H4.5V7" />
    </>
  ),
  court: (
    <>
      <path d="M12 4v15.5M8 19.5h8M4.8 7.4h14.4" />
      <path d="M4.8 7.4L2.6 13M4.8 7.4L7 13M19.2 7.4L17 13M19.2 7.4l2.2 5.6" />
      <path d="M2.4 13a2.4 2.4 0 0 0 4.8 0zM16.8 13a2.4 2.4 0 0 0 4.8 0z" />
    </>
  ),
  archive: (
    <>
      <rect x="4.5" y="3.5" width="15" height="17" rx="1" />
      <path d="M8 8h8M8 11.2h8M8 14.4h5" />
      <path d="M4.5 17.4h15" />
    </>
  ),
  vizier: (
    <>
      <path d="M7.3 7.3h9.4v9.4H7.3z" />
      <path d="M12 5.4l6.6 6.6-6.6 6.6L5.4 12z" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  council: (
    <>
      <ellipse cx="12" cy="12.5" rx="5.2" ry="3.4" />
      <circle cx="12" cy="4.6" r="1.4" />
      <circle cx="19.4" cy="9.4" r="1.4" />
      <circle cx="19.4" cy="16.4" r="1.4" />
      <circle cx="4.6" cy="9.4" r="1.4" />
      <circle cx="4.6" cy="16.4" r="1.4" />
      <circle cx="12" cy="20.4" r="1.4" />
    </>
  ),
  home: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 3.8v3.4M12 16.8v3.4M3.8 12h3.4M16.8 12h3.4" />
      <circle cx="12" cy="12" r="1.8" />
    </>
  ),
  ideas: (
    <>
      <path d="M12 3.6a6 6 0 0 0-3.7 10.7c.7.6 1.1 1.4 1.1 2.2h5.2c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3.6z" />
      <path d="M9.6 18.6h4.8M10.6 20.6h2.8" />
    </>
  ),
  seat: (
    <>
      <circle cx="12" cy="6.8" r="2.7" />
      <path d="M6.6 15.4a5.4 5.4 0 0 1 10.8 0" />
      <path d="M3.4 15.4h17.2M6 15.4v5M18 15.4v5" />
    </>
  ),
  today: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 7.2V12l3.2 2" />
      <path d="M12 3.8v1.4M12 18.8v1.4M3.8 12h1.4M18.8 12h1.4" />
    </>
  ),
  brain: (
    <>
      <circle cx="12" cy="12" r="2.3" />
      <circle cx="5" cy="6.4" r="1.4" />
      <circle cx="19" cy="6.4" r="1.4" />
      <circle cx="4.6" cy="16.6" r="1.4" />
      <circle cx="19.4" cy="16.6" r="1.4" />
      <circle cx="12" cy="20.6" r="1.4" />
      <path d="M10.2 10.6L6.1 7.3M13.8 10.6l4.1-3.3M10 13.1l-4.2 2.8M14 13.1l4.2 2.8M12 14.3v4.9" />
    </>
  ),
};

/** An emblem by its id; an unknown id draws the seat. */
export const Emblem: React.FC<{ id: string; size: number; color: string; stroke?: number }> = ({ id, size, color, stroke = 1.3 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", flex: "none", color }}>
    {SHAPES[id] ?? SHAPES.seat}
  </svg>
);

/** The same emblem with every line drawn in from nothing as `draw` goes 0 → 1 (each shape gets pathLength 1). */
export const DrawnEmblem: React.FC<{ id: string; size: number; color: string; stroke?: number; draw: number }> = ({ id, size, color, stroke = 1.3, draw }) => {
  const shape = (SHAPES[id] ?? SHAPES.seat) as React.ReactElement<{ children: React.ReactNode }>;
  const parts = React.Children.toArray(shape.props.children) as React.ReactElement<Record<string, unknown>>[];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", flex: "none", color }}>
      {parts.map((part, i) => {
        // the lines follow each other: each starts a little after the one before it
        const local = Math.max(0, Math.min(1, draw * (1 + 0.25 * (parts.length - 1)) - 0.25 * i));
        const filled = part.props.fill === "currentColor";
        return React.cloneElement(part, filled ? { key: i, opacity: local } : { key: i, pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - local });
      })}
    </svg>
  );
};
