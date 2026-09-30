<template>
  <div class="annotation-toolbar">
    <button class="tb-btn" title="Back" @click="$emit('back')">
      <ArrowLeft24 />
    </button>

    <button
      class="tb-btn"
      title="Undo"
      :disabled="!canUndo"
      @click="$emit('undo')"
    >
      <Undo24 />
    </button>

    <span class="tb-sep" />

    <button
      class="tb-btn"
      :class="{ active: activeTool === TOOL.SELECT }"
      title="Select"
      :disabled="!hasElements"
      @click="$emit('tool', TOOL.SELECT)"
    >
      <Cursor_124 />
    </button>

    <button
      class="tb-btn"
      :class="{ active: activeTool === TOOL.DRAW }"
      title="Draw"
      @click="$emit('tool', TOOL.DRAW)"
    >
      <Pen24 />
    </button>

    <button
      class="tb-btn"
      :class="{ active: activeTool === TOOL.STAMP }"
      title="Stamp"
      @click="$emit('tool', TOOL.STAMP)"
    >
      <Stamp24 />
    </button>

    <button
      class="tb-btn"
      :class="{ active: activeTool === TOOL.TEXT }"
      title="Text"
      @click="$emit('tool', TOOL.TEXT)"
    >
      <TextCreation24 />
    </button>

    <span class="tb-sep" />

    <button
      class="tb-btn done"
      title="Done"
      :disabled="!hasElements"
      @click="$emit('done')"
    >
      <Checkmark24 />
      <span>Done</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import ArrowLeft24 from "@carbon/icons-vue/es/arrow--left/24";
import Undo24 from "@carbon/icons-vue/es/undo/24";
import Cursor_124 from "@carbon/icons-vue/es/cursor--1/24";
import Pen24 from "@carbon/icons-vue/es/pen/24";
import Stamp24 from "@carbon/icons-vue/es/stamp/24";
import TextCreation24 from "@carbon/icons-vue/es/text--creation/24";
import Checkmark24 from "@carbon/icons-vue/es/checkmark/24";
import { TOOL, type ToolName } from "@/annotation/constants";

defineProps<{
  activeTool: ToolName;
  canUndo: boolean;
  hasElements: boolean;
}>();

defineEmits<{
  (e: "tool", tool: ToolName): void;
  (e: "undo"): void;
  (e: "back"): void;
  (e: "done"): void;
}>();
</script>

<style scoped>
.annotation-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  background: #f4f4f4;
  border: 1px solid #dcdcdc;
  border-top: none;
  border-radius: 0 0 4px 4px;
}
.tb-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #161616;
}
.tb-btn:hover:not(:disabled) {
  background: #e0e0e0;
}
.tb-btn.active {
  background: #d0e2ff;
  border-color: #0f62fe;
}
.tb-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.tb-btn.done {
  margin-left: auto;
  font-weight: 600;
}
.tb-sep {
  width: 1px;
  height: 24px;
  background: #dcdcdc;
  margin: 0 4px;
}
</style>
