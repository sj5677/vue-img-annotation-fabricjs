<template>
  <div class="annotation-renderer">
    <div class="canvas-wrapper" :style="{ width: displayWidth + 'px' }">
      <canvas ref="canvasEl"></canvas>
      <div v-if="loading" class="loading">Loading…</div>
      <div v-else-if="!hasSaves" class="empty">No saved annotations yet</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Canvas, FabricImage, FabricObject } from "fabric";
import {
  boundingBoxRect,
  elementsToFabric,
  fabricBoundingBox,
} from "@/annotation/serialization";
import type { SavedAnnotation } from "@/annotation/types";

const props = withDefaults(
  defineProps<{
    imageUrl: string;
    annotations: SavedAnnotation[];
    maxWidth?: number;
    showBoxes?: boolean;
  }>(),
  { maxWidth: 560, showBoxes: true },
);

const BOX_COLOR = "#0f62fe";

const canvasEl = ref<HTMLCanvasElement | null>(null);
const loading = ref(true);
const displayWidth = ref(props.maxWidth);

let canvas: Canvas | null = null;
let canvasW = 0;
let canvasH = 0;

const hasSaves = computed(() => props.annotations.length > 0);

onMounted(async () => {
  await initCanvas();
  renderAll();
});

onBeforeUnmount(() => {
  canvas?.dispose();
  canvas = null;
});

watch(
  () => [props.annotations, props.showBoxes],
  () => renderAll(),
  { deep: true },
);

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
    selection: false,
    enableRetinaScaling: false,
  });

  img.set({
    left: 0,
    top: 0,
    originX: "left",
    originY: "top",
    scaleX: canvasW / natW,
    scaleY: canvasH / natH,
    selectable: false,
    evented: false,
    hoverCursor: "default",
  });
  canvas.add(img);
  canvas.sendObjectToBack(img);
  loading.value = false;
}

function renderAll() {
  if (!canvas) return;
  // Drop everything except the base image (first object).
  const base = canvas.getObjects()[0];
  canvas
    .getObjects()
    .slice(1)
    .forEach((o: FabricObject) => canvas!.remove(o));

  props.annotations.forEach((ann) => {
    const objs = elementsToFabric(ann.payload.elements, canvasW, canvasH);
    objs.forEach((obj) => {
      canvas!.add(obj);
      obj.setCoords();
    });
    // Derive the box from the rendered objects so it always aligns visually.
    if (props.showBoxes && objs.length) {
      const box = fabricBoundingBox(objs, canvasW, canvasH);
      if (box) {
        canvas!.add(boundingBoxRect(box, canvasW, canvasH, BOX_COLOR));
      }
    }
  });

  if (base) canvas.sendObjectToBack(base);
  canvas.renderAll();
}
</script>

<style scoped>
.annotation-renderer {
  display: inline-block;
}
.canvas-wrapper {
  position: relative;
  border: 1px solid #dcdcdc;
  line-height: 0;
}
.loading,
.empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6f6f6f;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.6);
}
</style>
