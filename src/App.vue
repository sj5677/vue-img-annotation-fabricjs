<template>
  <div class="page">
    <header class="page-header">
      <h1>Image Annotation POC</h1>
      <p>
        Click <strong>Annotate</strong> to add a save (a group of elements).
        Every save persists to local storage, gets its own bounding box, and is
        re-rendered together on the same image. Keep annotating to stack more
        saves.
      </p>
      <label class="role">
        Role:
        <select v-model="role">
          <option value="teacher">Teacher (red default)</option>
          <option value="student">Student (black default)</option>
        </select>
      </label>
    </header>

    <div class="grid">
      <image-annotation
        :key="'cat-' + role"
        title="Cat"
        image-url="/cat.jpg"
        :role="role"
      />
      <image-annotation
        :key="'duck-' + role"
        title="Duck"
        image-url="/duck.jpg"
        :role="role"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import ImageAnnotation from "@/annotation/ImageAnnotation.vue";

const role = ref<"teacher" | "student">("teacher");
</script>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
.page-header h1 {
  margin: 0 0 8px;
  font-size: 22px;
}
.page-header p {
  margin: 0 0 12px;
  color: #525252;
}
.role {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
}
.role select {
  padding: 4px 8px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 24px;
  margin-top: 20px;
  align-items: start;
}
</style>
