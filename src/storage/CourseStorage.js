import { extensionApi } from '../platform/extensionApi.js';

// Local cache for the mapped Course[] list, backed by the WebExtension storage API.
// Stores only { courses, updatedAt } — no credentials, tokens or cookies ever pass through here.

const STORAGE_KEY = 'betterUdemyLibrary';

// Bump this whenever CourseMapper's output shape (e.g. course.url logic) changes,
// so a stale cache from a previous version of the extension is treated as absent
// instead of silently serving data mapped with the old logic.
const CACHE_VERSION = 2;

export class CourseStorage {
  /** Returns { courses, updatedAt } or null if there's no cache yet (or it's from an older version). */
  async getCache() {
    const data = await extensionApi.storage.local.get(STORAGE_KEY);
    const entry = data[STORAGE_KEY];
    if (!entry || !Array.isArray(entry.courses) || entry.version !== CACHE_VERSION) return null;
    return { courses: entry.courses, updatedAt: entry.updatedAt || null };
  }

  /** Persists the given courses and returns the updatedAt timestamp used. */
  async setCache(courses) {
    const updatedAt = Date.now();
    await extensionApi.storage.local.set({
      [STORAGE_KEY]: { courses, updatedAt, version: CACHE_VERSION },
    });
    return updatedAt;
  }

  async clearCache() {
    await extensionApi.storage.local.remove(STORAGE_KEY);
  }
}
