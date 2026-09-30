<template>
  <div class="annotation-editor">
    <div class="canvas-stage" :style="{ width: displayWidth + 'px' }">
      <div class="canvas-wrapper">
        <canvas ref="canvasEl"></canvas>
        <div v-if="loading" class="loading">Loading…</div>
      </div>

      <!-- Draw overlay: colour + thickness (follows existing drawing tool) -->
      <div v-if="activeTool === TOOL.DRAW" class="overlay">
        <div class="overlay-head">
          <span>Draw</span>
          <button class="x" title="Close" @click="closeOverlay">
            <Close24 />
          </button>
        </div>
        <div class="swatches">
          <button
            v-for="c in colors"
            :key="c.value"
            class="swatch"
            :class="{ sel: penColor === c.value }"
            :style="{ background: c.value }"
            :title="c.name"
            @click="setPenColor(c.value)"
          />
        </div>
        <div class="sizes">
          <button
            v-for="s in penSizes"
            :key="s"
            class="size"
            :class="{ sel: penWidth === s }"
            @click="setPenWidth(s)"
          >
            <span class="dot" :style="{ width: s + 'px', height: s + 'px' }" />
          </button>
        </div>
      </div>

      <!-- Stamp overlay: 3 fixed shapes -->
      <div v-if="activeTool === TOOL.STAMP" class="overlay">
        <div class="overlay-head">
          <span>Stamp</span>
          <button class="x" title="Close" @click="closeOverlay">
            <Close24 />
          </button>
        </div>
        <div class="stamp-shapes">
          <button
            class="shape"
            :class="{ sel: stampShape === 'tick' }"
            title="Tick"
            @click="chooseStamp('tick')"
          >
            <Checkmark24 />
          </button>
          <button
            class="shape"
            :class="{ sel: stampShape === 'cross' }"
            title="Cross"
            @click="chooseStamp('cross')"
          >
            <Close24 />
          </button>
          <button
            class="shape"
            :class="{ sel: stampShape === 'circle' }"
            title="Circle"
            @click="chooseStamp('circle')"
          >
            <CircleDash24 />
          </button>
        </div>
      </div>

      <!-- Text overlay: colour -->
      <div v-if="activeTool === TOOL.TEXT" class="overlay">
        <div class="overlay-head">
          <span>Text</span>
          <button class="x" title="Close" @click="closeOverlay">
            <Close24 />
          </button>
        </div>
        <div class="swatches">
          <button
            v-for="c in colors"
            :key="c.value"
            class="swatch"
            :class="{ sel: textColor === c.value }"
            :style="{ background: c.value }"
            :title="c.name"
            @click="setTextColor(c.value)"
          />
        </div>
      </div>

      <annotation-toolbar
        :active-tool="activeTool"
        :can-undo="canUndo"
        :has-elements="hasElements"
        @tool="handleTool"
        @undo="undo"
        @back="handleBack"
        @done="handleDone"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import {
  Canvas,
  FabricImage,
  FabricObject,
  PencilBrush,
  Point,
  Path,
  Textbox,
} from "fabric";
import Close24 from "@carbon/icons-vue/es/close/24";
import Checkmark24 from "@carbon/icons-vue/es/checkmark/24";
import CircleDash24 from "@carbon/icons-vue/es/circle-dash/24";
import AnnotationToolbar from "@/annotation/AnnotationToolbar.vue";
import {
  CANVAS_COLORS,
  PEN_SIZES,
  BRUSH_OPACITY,
  ROLE_DEFAULT_COLOR,
  TEXT_SETTINGS,
  TOOL,
  type StampShape,
  type ToolName,
} from "@/annotation/constants";
import {
  createStamp,
  STAMP_META_KEYS,
  type StampObject,
} from "@/annotation/stamps";
import { hexToRGB } from "@/annotation/utils";
import {
  fabricBoundingBox,
  fabricToElements,
} from "@/annotation/serialization";
import type { AnnotationSaveResult } from "@/annotation/types";

const props = withDefaults(
  defineProps<{
    imageUrl: string;
    role?: "teacher" | "student";
    maxWidth?: number;
  }>(),
  { role: "teacher", maxWidth: 560 },
);

const emit = defineEmits<{
  (e: "done", result: AnnotationSaveResult): void;
  (e: "cancel"): void;
}>();

interface BaseFlag {
  isBaseImage?: boolean;
}

const colors = CANVAS_COLORS;
const penSizes = PEN_SIZES;
const roleColor = ROLE_DEFAULT_COLOR[props.role];

const canvasEl = ref<HTMLCanvasElement | null>(null);
const loading = ref(true);
const displayWidth = ref(props.maxWidth);
const activeTool = ref<ToolName>("");
const penColor = ref(roleColor);
const penWidth = ref(5);
const textColor = ref(roleColor);
const stampShape = ref<StampShape | "">("");
const hasElements = ref(false);
const canUndo = ref(false);

// Non-reactive fabric handles.
let canvas: Canvas | null = null;
let brush: PencilBrush | null = null;
let previewStamp: StampObject | null = null;
let canvasW = 0;
let canvasH = 0;

// Undo history of dataless snapshots (mirrors reference saveCanvasState).
let initialState: Record<string, unknown> | null = null;
const history: Record<string, unknown>[] = [];

function isBase(obj: FabricObject): boolean {
  return (obj as FabricObject & BaseFlag).isBaseImage === true;
}

function annotationObjects(): FabricObject[] {
  return canvas ? canvas.getObjects().filter((o) => !isBase(o)) : [];
}

function refreshFlags() {
  hasElements.value = annotationObjects().length > 0;
  canUndo.value = history.length > 0;
}

function snapshot(): Record<string, unknown> {
  return canvas!.toDatalessJSON(STAMP_META_KEYS) as unknown as Record<
    string,
    unknown
  >;
}

function saveCanvasState() {
  if (!canvas) return;
  history.push(snapshot());
  refreshFlags();
}

onMounted(async () => {
  await initCanvas();
});

onBeforeUnmount(() => {
  canvas?.dispose();
  canvas = null;
});

async function initCanvas() {
  const img = await FabricImage.fromURL(props.imageUrl, {
    crossOrigin: "anonymous",
  });
  const natW = img.width ?? props.maxWidth;
  const natH = img.height ?? props.maxWidth;
  const scale = Math.min(props.maxWidth / natW, 1);
  canvasW = Math.round(natW * scale);
  canvasH = Math.round(natH * scale);
  displayWidth.value = canvasW;

  canvas = new Canvas(canvasEl.value as HTMLCanvasElement, {
    width: canvasW,
    height: canvasH,
    backgroundColor: "#ffffff",
    isDrawingMode: false,
    selection: false,
    preserveObjectStacking: true,
    enableRetinaScaling: false,
  });

  FabricObject.prototype.set({ transparentCorners: false });

  brush = new PencilBrush(canvas);
  brush.width = penWidth.value;
  brush.color = hexToRGB(penColor.value, BRUSH_OPACITY.PEN);
  canvas.freeDrawingBrush = brush;

  // Base image (non-interactive), scaled to fill the canvas.
  img.set({
    left: 0,
    top: 0,
    originX: "left",
    originY: "top",
    scaleX: canvasW / natW,
    scaleY: canvasH / natH,
    selectable: false,
    evented: false,
    erasable: false,
    hoverCursor: "default",
  });
  (img as FabricImage & BaseFlag).isBaseImage = true;
  canvas.add(img);
  canvas.sendObjectToBack(img);
  canvas.renderAll();

  bindEvents();
  initialState = snapshot();
  loading.value = false;
  refreshFlags();
}

function bindEvents() {
  if (!canvas) return;
  const c = canvas;

  c.on("path:created", (ev) => {
    const path = (ev as unknown as { path: Path }).path;
    path.set({ selectable: true, hasControls: true, erasable: false });
    saveCanvasState();
  });

  c.on("mouse:down", (opt) => {
    if (!canvas) return;
    const scene = canvas.getScenePoint(opt.e);
    if (activeTool.value === TOOL.STAMP && stampShape.value) {
      if (inBounds(scene)) placeStamp(scene, stampShape.value as StampShape);
    } else if (activeTool.value === TOOL.TEXT) {
      if (inBounds(scene)) addTextBox(scene);
    }
  });

  c.on("mouse:move", (opt) => {
    if (activeTool.value === TOOL.STAMP && stampShape.value) {
      updatePreview(canvas!.getScenePoint(opt.e));
    }
  });

  c.on("object:moving", (e) => clampObject(e.target as FabricObject));
  c.on("object:scaling", (e) => clampObject(e.target as FabricObject));
  c.on("object:modified", () => saveCanvasState());
  c.on("selection:cleared", () => refreshFlags());
}

function inBounds(p: Point): boolean {
  return p.x >= 0 && p.y >= 0 && p.x <= canvasW && p.y <= canvasH;
}

function clampObject(obj: FabricObject) {
  const rect = obj.getBoundingRect();
  if (obj.left! - (obj.originX === "center" ? rect.width / 2 : 0) < 0) {
    obj.left = obj.originX === "center" ? rect.width / 2 : 0;
  }
  if (obj.top! - (obj.originY === "center" ? rect.height / 2 : 0) < 0) {
    obj.top = obj.originY === "center" ? rect.height / 2 : 0;
  }
  const right =
    obj.left! + (obj.originX === "center" ? rect.width / 2 : rect.width);
  const bottom =
    obj.top! + (obj.originY === "center" ? rect.height / 2 : rect.height);
  if (right > canvasW)
    obj.left =
      canvasW - (obj.originX === "center" ? rect.width / 2 : rect.width);
  if (bottom > canvasH)
    obj.top =
      canvasH - (obj.originY === "center" ? rect.height / 2 : rect.height);
  obj.setCoords();
}

// --- Toolbar handling -------------------------------------------------------

function handleTool(tool: ToolName) {
  if (!canvas) return;
  canvas.discardActiveObject();
  removePreview();
  stampShape.value = "";
  activeTool.value = tool;

  const drawing = tool === TOOL.DRAW;
  canvas.isDrawingMode = drawing;
  canvas.selection = tool === TOOL.SELECT;

  if (drawing && brush) {
    brush.width = penWidth.value;
    brush.color = hexToRGB(penColor.value, BRUSH_OPACITY.PEN);
  }

  const selectable = tool === TOOL.SELECT;
  annotationObjects().forEach((o) => {
    o.selectable = selectable;
    o.evented = selectable;
  });
  canvas.renderAll();
}

function closeOverlay() {
  activeTool.value = "";
  if (canvas) canvas.isDrawingMode = false;
  removePreview();
}

// --- Draw -------------------------------------------------------------------

function setPenColor(value: string) {
  penColor.value = value;
  if (brush) brush.color = hexToRGB(value, BRUSH_OPACITY.PEN);
}

function setPenWidth(size: number) {
  penWidth.value = size;
  if (brush) brush.width = size;
}

// --- Stamp ------------------------------------------------------------------

function chooseStamp(shape: StampShape) {
  stampShape.value = shape;
  activeTool.value = TOOL.STAMP;
  if (canvas) {
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.defaultCursor = "crosshair";
  }
}

function updatePreview(scene: Point) {
  if (!canvas || !stampShape.value) return;
  if (!inBounds(scene)) {
    removePreview();
    canvas.defaultCursor = "default";
    return;
  }
  canvas.defaultCursor = "crosshair";
  if (!previewStamp) {
    previewStamp = createStamp(
      stampShape.value as StampShape,
      resolveStampColor(),
    );
    previewStamp.set({ opacity: 0.5, evented: false, selectable: false });
    canvas.add(previewStamp);
  }
  previewStamp.set({ left: scene.x, top: scene.y });
  previewStamp.setCoords();
  canvas.requestRenderAll();
}

function removePreview() {
  if (canvas && previewStamp) {
    canvas.remove(previewStamp);
    previewStamp = null;
    canvas.defaultCursor = "default";
    canvas.requestRenderAll();
  }
}

function resolveStampColor(): string {
  return roleColor;
}

function placeStamp(scene: Point, shape: StampShape) {
  if (!canvas) return;
  removePreview();
  const stamp = createStamp(shape, resolveStampColor());
  stamp.set({ left: scene.x, top: scene.y, selectable: false, evented: false });
  stamp.setCoords();
  canvas.add(stamp);
  canvas.renderAll();
  saveCanvasState();
  // Stamp placed -> return to Select (AC 107).
  stampShape.value = "";
  handleTool(TOOL.SELECT);
}

// --- Text -------------------------------------------------------------------

function setTextColor(value: string) {
  textColor.value = value;
}

function addTextBox(scene: Point) {
  if (!canvas) return;
  const textbox = new Textbox(TEXT_SETTINGS.placeholderText, {
    left: scene.x,
    top: scene.y,
    originX: "center",
    originY: "center",
    width: TEXT_SETTINGS.width,
    fontSize: TEXT_SETTINGS.fontSize,
    fontFamily: TEXT_SETTINGS.fontFamily,
    fill: textColor.value,
    lockRotation: true,
    backgroundColor: "transparent",
    erasable: false,
  });
  canvas.add(textbox);
  // Enter Select mode without discarding the freshly created textbox so the
  // user can type immediately (typing replaces the selected placeholder).
  activeTool.value = TOOL.SELECT;
  canvas.isDrawingMode = false;
  canvas.selection = true;
  annotationObjects().forEach((o) => {
    o.selectable = true;
    o.evented = true;
  });
  canvas.setActiveObject(textbox);
  textbox.enterEditing();
  textbox.selectAll();
  saveCanvasState();
}

// --- Undo -------------------------------------------------------------------

function undo() {
  if (!canvas || history.length === 0) return;
  history.pop();
  const target =
    history.length > 0 ? history[history.length - 1] : initialState;
  if (!target) return;
  canvas.loadFromJSON(target).then(() => {
    if (!canvas) return;
    const base = canvas.getObjects().find((o) => isBase(o));
    if (base) {
      base.set({ selectable: false, evented: false, hoverCursor: "default" });
      (base as FabricObject & BaseFlag).isBaseImage = true;
      canvas.sendObjectToBack(base);
    }
    const selectable = activeTool.value === TOOL.SELECT;
    annotationObjects().forEach((o) => {
      o.selectable = selectable;
      o.evented = selectable;
    });
    canvas.renderAll();
    refreshFlags();
  });
}

// --- Done / Back ------------------------------------------------------------

function handleDone() {
  emit("done", buildSaveResult());
}

function handleBack() {
  if (hasElements.value && !confirm("Discard this annotation?")) return;
  emit("cancel");
}

function buildSaveResult(): AnnotationSaveResult {
  const objects = annotationObjects();
  const elements = fabricToElements(objects, canvasW, canvasH, roleColor);
  const boundingBox = fabricBoundingBox(objects, canvasW, canvasH);
  return { payload: { schemaVersion: 1, elements }, boundingBox };
}
</script>

<style scoped>
.annotation-editor {
  display: inline-block;
}
.canvas-stage {
  position: relative;
  display: inline-block;
}
.canvas-wrapper {
  position: relative;
  border: 1px solid #dcdcdc;
  line-height: 0;
}
.loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6f6f6f;
  font-size: 14px;
}
.overlay {
  position: absolute;
  left: 0;
  bottom: 44px;
  z-index: 5;
  background: #ffffff;
  border: 1px solid #dcdcdc;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  padding: 8px;
  min-width: 220px;
}
.overlay-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
}
.overlay-head .x {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  color: #161616;
}
.swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.swatch {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  outline: 1px solid #c6c6c6;
  cursor: pointer;
}
.swatch.sel {
  outline: 2px solid #0f62fe;
}
.sizes {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}
.size {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #c6c6c6;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}
.size.sel {
  border-color: #0f62fe;
  background: #d0e2ff;
}
.size .dot {
  background: #161616;
  border-radius: 50%;
  display: inline-block;
}
.stamp-shapes {
  display: flex;
  gap: 8px;
}
.shape {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #c6c6c6;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  color: #161616;
}
.shape.sel {
  border-color: #0f62fe;
  background: #d0e2ff;
}
</style>
