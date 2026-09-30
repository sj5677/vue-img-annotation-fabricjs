<template>
  <div class="image-annotation">
    <div class="ia-header">
      <h3>{{ title }}</h3>
      <span class="ia-count">{{ annotations.length }} saved</span>
    </div>

    <!-- View mode: rendered image with every saved annotation + bounding boxes. -->
    <div v-if="mode === 'view'" class="ia-view">
      <div class="ia-image-wrap" :style="{ maxWidth: maxWidth + 'px' }">
        <annotation-renderer
          :key="renderKey"
          :image-url="imageUrl"
          :annotations="annotations"
          :max-width="maxWidth"
          :show-boxes="showBoxes"
        />
      </div>
      <div class="ia-toolbar">
        <button
          class="ia-annotate"
          title="Image annotation"
          @click="startEditing"
        >
          <Draw24 />
          <span>Annotate</span>
        </button>
        <label class="ia-check">
          <input v-model="showBoxes" type="checkbox" />
          Bounding boxes
        </label>
        <button
          v-if="annotations.length"
          class="ia-btn"
          @click="showJson = !showJson"
        >
          {{ showJson ? "Hide" : "Show" }} saved payloads
        </button>
        <button
          v-if="annotations.length"
          class="ia-btn ia-danger"
          @click="clearAll"
        >
          Clear all
        </button>
      </div>
      <pre v-if="showJson && annotations.length" class="ia-payload">{{
        JSON.stringify(annotations, null, 2)
      }}</pre>
    </div>

    <!-- Edit mode: fabric annotation canvas for one new save. -->
    <annotation-canvas
      v-else
      :image-url="imageUrl"
      :role="role"
      :max-width="maxWidth"
      @done="handleDone"
      @cancel="handleCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Draw24 from "@carbon/icons-vue/es/draw/24";
import AnnotationCanvas from "@/annotation/AnnotationCanvas.vue";
import AnnotationRenderer from "@/annotation/AnnotationRenderer.vue";
import {
  clearAnnotations,
  loadAnnotations,
  saveAnnotation,
} from "@/annotation/storage";
import type { AnnotationSaveResult, SavedAnnotation } from "@/annotation/types";

const props = withDefaults(
  defineProps<{
    title: string;
    imageUrl: string;
    role?: "teacher" | "student";
    maxWidth?: number;
  }>(),
  { role: "teacher", maxWidth: 560 },
);

const mode = ref<"view" | "edit">("view");
const annotations = ref<SavedAnnotation[]>([]);
const showJson = ref(false);
const showBoxes = ref(true);
const renderKey = ref(0);

// Per-image storage key so each demo image accumulates its own saves.
const imageKey = computed(() => props.imageUrl);

onMounted(() => {
  annotations.value = loadAnnotations(imageKey.value);
});

function startEditing() {
  mode.value = "edit";
}

function handleDone(result: AnnotationSaveResult) {
  if (result.payload.elements.length > 0) {
    const annotation: SavedAnnotation = {
      id: `save-${Date.now()}`,
      createdAt: Date.now(),
      payload: result.payload,
      boundingBox: result.boundingBox,
    };
    saveAnnotation(imageKey.value, annotation);
    annotations.value = [...annotations.value, annotation];
  }
  mode.value = "view";
}

function handleCancel() {
  mode.value = "view";
}

function clearAll() {
  if (!confirm("Remove all saved annotations for this image?")) return;
  clearAnnotations(imageKey.value);
  annotations.value = [];
  renderKey.value += 1;
}
</script>

<style scoped>
.image-annotation {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background: #ffffff;
}
.ia-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}
.ia-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.ia-count {
  font-size: 12px;
  color: #6f6f6f;
}
.ia-image-wrap {
  border: 1px solid #dcdcdc;
  line-height: 0;
}
.ia-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #f4f4f4;
  border: 1px solid #dcdcdc;
  border-top: none;
  border-radius: 0 0 4px 4px;
  flex-wrap: wrap;
}
.ia-annotate {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: #0f62fe;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
}
.ia-annotate:hover {
  background: #0353e9;
}
.ia-check {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #393939;
}
.ia-btn {
  background: transparent;
  border: 1px solid #c6c6c6;
  border-radius: 4px;
  padding: 6px 10px;
  cursor: pointer;
}
.ia-btn.ia-danger {
  color: #da1e28;
  border-color: #da1e28;
}
.ia-payload {
  margin: 12px 0 0;
  padding: 12px;
  background: #161616;
  color: #f4f4f4;
  border-radius: 4px;
  font-size: 12px;
  max-height: 260px;
  overflow: auto;
}
</style>
