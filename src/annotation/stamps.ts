import { Circle, FabricObject, Group, Path } from "fabric";
import type { StampShape } from "@/annotation/constants";
import { STAMP_SIZE } from "@/annotation/constants";

// Canonical stamp geometry defined once, drawn as vector Fabric objects so the
// colour can be applied per teacher/student (SLS-12411 assessment: do NOT load
// the SVG asset for the placed stamp).

export const STAMP_META_KEYS = ["elementType", "stampShape", "stampColor"];

interface StampObjectData {
  elementType?: "stamp";
  stampShape?: StampShape;
  stampColor?: string;
}

export type StampObject = FabricObject & StampObjectData;

const STROKE_WIDTH = 4;

function buildRawStamp(shape: StampShape, color: string): FabricObject {
  const common = {
    fill: "",
    stroke: color,
    strokeWidth: STROKE_WIDTH,
    strokeLineCap: "round" as const,
    strokeLineJoin: "round" as const,
  };

  if (shape === "circle") {
    return new Circle({
      ...common,
      radius: 11,
      originX: "center",
      originY: "center",
    });
  }

  const pathData =
    shape === "tick" ? "M3 12 L9 18 L21 4" : "M4 4 L20 20 M20 4 L4 20";
  return new Path(pathData, {
    ...common,
    originX: "center",
    originY: "center",
  });
}

// Creates a placed stamp scaled to STAMP_SIZE, centre origin, rotation locked.
export function createStamp(shape: StampShape, color: string): StampObject {
  const raw = buildRawStamp(shape, color);
  // Wrap in a group so bounding size is predictable and scaling is uniform.
  const group = new Group([raw], {
    originX: "center",
    originY: "center",
    lockRotation: true,
  }) as StampObject;

  const maxDim = Math.max(
    group.width ?? STAMP_SIZE,
    group.height ?? STAMP_SIZE,
  );
  const scale = STAMP_SIZE / maxDim;
  group.scaleX = scale;
  group.scaleY = scale;
  group.elementType = "stamp";
  group.stampShape = shape;
  group.stampColor = color;
  group.set({ erasable: false });
  return group;
}
