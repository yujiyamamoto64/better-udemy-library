// Translates Udemy's raw JSON into our internal Course model (models/Course.js).
// This, together with api/UdemyApiClient.js, is the ONLY place allowed to reference
// Udemy-specific field names like `completion_ratio`, `image_480x270`,
// `visible_instructors` or `published_title`.

import { createCourse } from '../models/Course.js';

const UDEMY_ORIGIN = 'https://www.udemy.com';

function toAbsoluteUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${UDEMY_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`;
}

// Udemy's API returns the course *landing/sales* page path (e.g. "/course/my-course/"),
// which for an enrolled user just redirects through an upsell page. We want to link
// straight into the player instead, i.e. ".../course/my-course/learn/".
function toCourseLearnUrl(path) {
  const absolute = toAbsoluteUrl(path);
  if (!absolute) return null;

  let url;
  try {
    url = new URL(absolute);
  } catch {
    return absolute;
  }

  let pathname = url.pathname;
  if (!pathname.endsWith('/')) pathname += '/';
  if (!pathname.endsWith('/learn/')) pathname += 'learn/';
  url.pathname = pathname;
  url.search = '';
  return url.toString();
}

function mapInstructors(visibleInstructors) {
  if (!Array.isArray(visibleInstructors)) return [];
  return visibleInstructors.map((instructor) => instructor.display_name).filter(Boolean);
}

function clampProgress(completionRatio) {
  const value = typeof completionRatio === 'number' ? completionRatio : 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Maps a single raw Udemy course object into our internal Course model. */
export function mapCourse(rawCourse) {
  return createCourse({
    id: rawCourse.id,
    title: rawCourse.title || 'Curso sem título',
    instructors: mapInstructors(rawCourse.visible_instructors),
    progress: clampProgress(rawCourse.completion_ratio),
    imageUrl: rawCourse.image_480x270 || rawCourse.image_240x135 || null,
    url: toCourseLearnUrl(rawCourse.url),
    favorite: Boolean(rawCourse.favorite_time),
    archived: Boolean(rawCourse.archive_time),
    lastAccessedAt: rawCourse.last_accessed_time || null,
    enrolledAt: rawCourse.enrollment_time || null,
    published: rawCourse.is_published !== false,
  });
}

/** Flattens the raw collections response (each with a nested `courses` array) into Course[]. */
export function mapCollections(rawCollections) {
  const courses = [];
  for (const collection of rawCollections) {
    const rawCourses = Array.isArray(collection.courses) ? collection.courses : [];
    for (const rawCourse of rawCourses) {
      courses.push(mapCourse(rawCourse));
    }
  }
  return courses;
}
