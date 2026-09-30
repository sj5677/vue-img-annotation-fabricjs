// Persistence for saved annotations. Each image keeps its own list of saves so
// the "endless save" flow can accumulate groups across reloads.

import type { SavedAnnotation } from "@/annotation/types";

const PREFIX = "img-annotation:";

// localStorage survives reloads; swap to sessionStorage for per-tab lifetime.
const store: Storage = window.localStorage;

function keyFor(imageKey: string): string {
  return `${PREFIX}${imageKey}`;
}

export function loadAnnotations(imageKey: string): SavedAnnotation[] {
  try {
    const raw = store.getItem(keyFor(imageKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedAnnotation[]) : [];
  } catch {
    return [];
  }
}

export function saveAnnotation(
  imageKey: string,
  annotation: SavedAnnotation,
): SavedAnnotation[] {
  const list = loadAnnotations(imageKey);
  list.push(annotation);
  store.setItem(keyFor(imageKey), JSON.stringify(list));
  return list;
}

export function clearAnnotations(imageKey: string): void {
  store.removeItem(keyFor(imageKey));
}
