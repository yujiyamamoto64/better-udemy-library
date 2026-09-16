// Orchestrates loading (cache + network), deduplication, search, filter and sort.
// Works exclusively with the internal Course model — no Udemy-specific field ever
// appears below this line.

import { UdemyApiClient } from '../api/UdemyApiClient.js';
import { mapCollections } from '../mappers/CourseMapper.js';
import { CourseStorage } from '../storage/CourseStorage.js';
import { getCourseStatus } from '../models/Course.js';

export const SortOption = {
  NAME_ASC: 'name_asc',
  NAME_DESC: 'name_desc',
  PROGRESS_DESC: 'progress_desc',
  PROGRESS_ASC: 'progress_asc',
};

export class CourseService {
  constructor({ apiClient = new UdemyApiClient(), storage = new CourseStorage() } = {}) {
    this.apiClient = apiClient;
    this.storage = storage;
  }

  /** Returns { courses, updatedAt } from cache, or null if nothing is cached yet. */
  async getCachedCourses() {
    return this.storage.getCache();
  }

  /**
   * Fetches fresh data from the Udemy API, maps it, deduplicates it and
   * persists it to cache. Throws UdemyAuthError / UdemyHttpError / UdemyNetworkError
   * (see api/UdemyApiClient.js) on failure — callers decide how to degrade
   * (e.g. keep showing stale cache).
   */
  async refreshCourses() {
    const collections = await this.apiClient.fetchAllCollections();
    const courses = mapCollections(collections);
    const deduped = this._dedupe(courses);
    const updatedAt = await this.storage.setCache(deduped);
    return { courses: deduped, updatedAt, collectionsCount: collections.length };
  }

  /** A course can appear in more than one collection; keep a single entry per course.id. */
  _dedupe(courses) {
    const byId = new Map();
    for (const course of courses) {
      byId.set(course.id, course);
    }
    return Array.from(byId.values());
  }

  /** Client-side search by title or instructor name. Never triggers a request. */
  search(courses, query) {
    const normalized = (query || '').trim().toLowerCase();
    if (!normalized) return courses;
    return courses.filter((course) => {
      const titleMatch = course.title.toLowerCase().includes(normalized);
      const instructorMatch = course.instructors.some((name) =>
        name.toLowerCase().includes(normalized)
      );
      return titleMatch || instructorMatch;
    });
  }

  filterByStatus(courses, status) {
    if (!status || status === 'all') return courses;
    return courses.filter((course) => getCourseStatus(course) === status);
  }

  sort(courses, sortBy) {
    const sorted = [...courses];
    switch (sortBy) {
      case SortOption.NAME_ASC:
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case SortOption.NAME_DESC:
        sorted.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case SortOption.PROGRESS_DESC:
        sorted.sort((a, b) => b.progress - a.progress);
        break;
      case SortOption.PROGRESS_ASC:
        sorted.sort((a, b) => a.progress - b.progress);
        break;
      default:
        break;
    }
    return sorted;
  }
}
