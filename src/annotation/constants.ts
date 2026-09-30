// Mirrors the relevant subset of sls-frontend-vle drawing tool config.

export const DRAWING_TOOL = {
  PEN: "Pen",
  TEXT: "Text",
} as const;

export const TOOL = {
  SELECT: "select",
  DRAW: "draw",
  STAMP: "stamp",
  TEXT: "text",
} as const;

export type ToolName = (typeof TOOL)[keyof typeof TOOL] | "";

// Follows existing drawing tool palette (drawing.config.ts CANVAS_COLORS).
export const CANVAS_COLORS = [
  { name: "Red", value: "#C14149" },
  { name: "Orange", value: "#F3812F" },
  { name: "Yellow", value: "#FBBC04" },
  { name: "Green", value: "#67B717" },
  { name: "Blue", value: "#20CDD8" },
  { name: "Purple", value: "#A674DF" },
  { name: "White", value: "#FFFFFF" },
  { name: "Black", value: "#0B233F" },
];

export const PEN_SIZES = [2, 5, 10, 20, 30];

export const BRUSH_OPACITY = {
  PEN: 1,
};

// Role defaults (drawing.config.ts): teacher red, student black.
export const ROLE_DEFAULT_COLOR = {
  teacher: "#C14149",
  student: "#0B233F",
};

export const STAMP_SHAPES = ["tick", "cross", "circle"] as const;
export type StampShape = (typeof STAMP_SHAPES)[number];

export const TEXT_SETTINGS = {
  placeholderText: "Type here",
  fontSize: 30,
  fontFamily: "Noto Sans, sans-serif",
  width: 120,
};

// Default rendered stamp size in image pixels.
export const STAMP_SIZE = 40;
