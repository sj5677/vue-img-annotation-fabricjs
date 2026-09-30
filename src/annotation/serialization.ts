// Conversion between Fabric.js objects and the normalized save format.
// All persisted coordinates are normalized to 0..1 of the canvas size so a save
// can be re-rendered at any display width.

import { FabricObject, Path, Point, Rect, Textbox, util } from "fabric";
import { STAMP_SIZE, TEXT_SETTINGS } from "@/annotation/constants";
import { createStamp, type StampObject } from "@/annotation/stamps";
import { nextId } from "@/annotation/utils";
import type {
  AnnotationElement,
  BoundingBox,
  StrokeElement,
} from "@/annotation/types";

// ---------------------------------------------------------------------------
// Fabric -> save format
// ---------------------------------------------------------------------------

export function fabricToElements(
  objects: FabricObject[],
  canvasW: number,
  canvasH: number,
  fallbackColor: string,
): AnnotationElement[] {
  const elements: AnnotationElement[] = [];
  objects.forEach((obj) => {
    const stamp = obj as StampObject;
    if (stamp.elementType === "stamp" && stamp.stampShape) {
      elements.push({
        id: nextId("stamp"),
        type: "stamp",
        shape: stamp.stampShape,
        color: stamp.stampColor ?? fallbackColor,
        x: obj.left! / canvasW,
        y: obj.top! / canvasH,
        width: (obj.width! * obj.scaleX!) / canvasW,
        height: (obj.height! * obj.scaleY!) / canvasH,
      });
    } else if (obj instanceof Textbox) {
      elements.push({
        id: nextId("text"),
        type: "text",
        text: obj.text ?? "",
        color: String(obj.fill ?? fallbackColor),
        x: obj.left! / canvasW,
        y: obj.top! / canvasH,
        width: (obj.width! * obj.scaleX!) / canvasW,
      });
    } else if (obj instanceof Path) {
      elements.push({
        id: nextId("stroke"),
        type: "stroke",
        color: String(obj.stroke ?? fallbackColor),
        size: obj.strokeWidth ?? 5,
        points: extractStrokePoints(obj, canvasW, canvasH),
      });
    }
  });
  return elements;
}

export function extractStrokePoints(
  path: Path,
  canvasW: number,
  canvasH: number,
): [number, number][] {
  const matrix = path.calcTransformMatrix();
  const offset = path.pathOffset;
  const points: [number, number][] = [];
  (path.path as unknown as (string | number)[][]).forEach((cmd) => {
    for (let i = 1; i < cmd.length - 1; i += 2) {
      const x = cmd[i] as number;
      const y = cmd[i + 1] as number;
      if (typeof x !== "number" || typeof y !== "number") continue;
      const scene = util.transformPoint(
        new Point(x - offset.x, y - offset.y),
        matrix,
      );
      points.push([
        +(scene.x / canvasW).toFixed(4),
        +(scene.y / canvasH).toFixed(4),
      ]);
    }
  });
  return points;
}

// Union of every object's bounding rect, normalized to 0..1. Null when empty.
export function fabricBoundingBox(
  objects: FabricObject[],
  canvasW: number,
  canvasH: number,
): BoundingBox | null {
  if (objects.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  objects.forEach((obj) => {
    const r = obj.getBoundingRect();
    minX = Math.min(minX, r.left);
    minY = Math.min(minY, r.top);
    maxX = Math.max(maxX, r.left + r.width);
    maxY = Math.max(maxY, r.top + r.height);
  });
  return {
    x: +(minX / canvasW).toFixed(4),
    y: +(minY / canvasH).toFixed(4),
    width: +((maxX - minX) / canvasW).toFixed(4),
    height: +((maxY - minY) / canvasH).toFixed(4),
  };
}

// ---------------------------------------------------------------------------
// Save format -> fabric (read-only rendering)
// ---------------------------------------------------------------------------

// Builds non-interactive Fabric objects for a set of saved elements.
export function elementsToFabric(
  elements: AnnotationElement[],
  canvasW: number,
  canvasH: number,
): FabricObject[] {
  const objects: FabricObject[] = [];
  elements.forEach((el) => {
    const obj = elementToFabric(el, canvasW, canvasH);
    if (obj) objects.push(obj);
  });
  return objects;
}

function elementToFabric(
  el: AnnotationElement,
  canvasW: number,
  canvasH: number,
): FabricObject | null {
  if (el.type === "stroke") return strokeToPath(el, canvasW, canvasH);

  if (el.type === "text") {
    return new Textbox(el.text, {
      left: el.x * canvasW,
      top: el.y * canvasH,
      originX: "center",
      originY: "center",
      width: el.width * canvasW,
      fontSize: TEXT_SETTINGS.fontSize,
      fontFamily: TEXT_SETTINGS.fontFamily,
      fill: el.color,
      ...readOnlyProps,
    });
  }

  // stamp
  const stamp = createStamp(el.shape, el.color);
  stamp.set({ left: el.x * canvasW, top: el.y * canvasH });
  const targetW = el.width * canvasW;
  const currentW = stamp.getScaledWidth() || STAMP_SIZE;
  const factor = targetW / currentW;
  stamp.scaleX = (stamp.scaleX ?? 1) * factor;
  stamp.scaleY = (stamp.scaleY ?? 1) * factor;
  stamp.set(readOnlyProps);
  stamp.setCoords();
  return stamp;
}

function strokeToPath(
  el: StrokeElement,
  canvasW: number,
  canvasH: number,
): Path | null {
  if (el.points.length === 0) return null;
  const d = el.points
    .map(([nx, ny], i) => {
      const x = (nx * canvasW).toFixed(2);
      const y = (ny * canvasH).toFixed(2);
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  return new Path(d, {
    fill: "",
    stroke: el.color,
    strokeWidth: el.size,
    strokeLineCap: "round",
    strokeLineJoin: "round",
    ...readOnlyProps,
  });
}

// A dashed rectangle Fabric object for a normalized bounding box.
export function boundingBoxRect(
  box: BoundingBox,
  canvasW: number,
  canvasH: number,
  color: string,
): Rect {
  return new Rect({
    left: box.x * canvasW,
    top: box.y * canvasH,
    width: box.width * canvasW,
    height: box.height * canvasH,
    originX: "left",
    originY: "top",
    fill: "",
    stroke: color,
    strokeWidth: 1.5,
    strokeDashArray: [6, 4],
    strokeUniform: true,
    ...readOnlyProps,
  });
}

const readOnlyProps = {
  selectable: false,
  evented: false,
  hoverCursor: "default",
} as const;
