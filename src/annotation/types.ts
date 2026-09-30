import type { StampShape } from "@/annotation/constants";

export interface StrokeElement {
  id: string;
  type: "stroke";
  color: string;
  size: number;
  points: [number, number][];
}

export interface TextElement {
  id: string;
  type: "text";
  text: string;
  color: string;
  x: number;
  y: number;
  width: number;
}

export interface StampElement {
  id: string;
  type: "stamp";
  shape: StampShape;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AnnotationElement = StrokeElement | TextElement | StampElement;

export interface AnnotationPayload {
  schemaVersion: 1;
  elements: AnnotationElement[];
}

// Normalized (0..1) bounding box enclosing every element of a single save.
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// The result the editor hands back on each Done: one grouped payload plus the
// bounding box that encloses its elements.
export interface AnnotationSaveResult {
  payload: AnnotationPayload;
  boundingBox: BoundingBox | null;
}

// One persisted save = a group of elements with its bounding box and metadata.
export interface SavedAnnotation {
  id: string;
  createdAt: number;
  payload: AnnotationPayload;
  boundingBox: BoundingBox | null;
}
