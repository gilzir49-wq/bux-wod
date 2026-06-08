import { Workout } from './types';

const KEY = 'bux_wod_saved_v1';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function getSavedWorkouts(): Workout[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Workout[];
    if (!Array.isArray(parsed)) return [];
    // newest first
    return parsed.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function saveWorkout(workout: Workout): Workout[] {
  if (!isBrowser()) return [];
  const all = getSavedWorkouts();
  const idx = all.findIndex((w) => w.id === workout.id);
  if (idx >= 0) {
    all[idx] = workout;
  } else {
    all.unshift(workout);
  }
  window.localStorage.setItem(KEY, JSON.stringify(all));
  return getSavedWorkouts();
}

export function isSaved(id: string): boolean {
  return getSavedWorkouts().some((w) => w.id === id);
}

export function deleteWorkout(id: string): Workout[] {
  if (!isBrowser()) return [];
  const all = getSavedWorkouts().filter((w) => w.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(all));
  return all;
}

export function rateWorkout(id: string, rating: number): Workout[] {
  if (!isBrowser()) return [];
  const all = getSavedWorkouts();
  const w = all.find((x) => x.id === id);
  if (w) {
    w.rating = rating;
    window.localStorage.setItem(KEY, JSON.stringify(all));
  }
  return getSavedWorkouts();
}
