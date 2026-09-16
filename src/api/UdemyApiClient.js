// The ONLY module allowed to know the shape/URL of Udemy's internal API.
//
// Endpoint used (observed via DevTools on the "My Learning / Lists" page):
//
//   GET https://www.udemy.com/api-2.0/users/me/subscribed-courses-collections/
//
// IMPORTANT LIMITATION (see README.md "Limitations" section for details):
// This endpoint returns the user's *collections* ("lists"), each with a nested,
// possibly-truncated (`course_limit`) array of courses. It is what the Udemy
// frontend itself uses to render "My Learning / Lists", but it is NOT confirmed
// to be equivalent to "every course the account is subscribed to" (e.g. a course
// that was never added to any list may not appear here). A dedicated
// "subscribed courses" endpoint likely exists and should replace/complement this
// one once found in DevTools — see TODO below and in README.md.
//
// TODO(subscribed-courses): Investigate the Udemy DevTools network tab on
// https://www.udemy.com/home/my-courses/learning/ for a flatter endpoint such as
// something under /api-2.0/users/me/subscribed-courses/ that isn't scoped to
// collections. Do NOT guess the URL/params — capture them from an authenticated
// session and wire them in here behind the same fetchAllCollections()-shaped
// contract so the rest of the app never has to change.

const COLLECTIONS_ENDPOINT =
  'https://www.udemy.com/api-2.0/users/me/subscribed-courses-collections/';

const COURSE_FIELDS = [
  'archive_time',
  'buyable_object_type',
  'completion_ratio',
  'enrollment_time',
  'favorite_time',
  'features',
  'image_240x135',
  'image_480x270',
  'is_practice_test_course',
  'is_private',
  'is_published',
  'last_accessed_time',
  'published_title',
  'title',
  'tracking_id',
  'url',
  'visible_instructors',
].join(',');

const COLLECTION_FIELDS = '@all';

const DEFAULT_PAGE_SIZE = 12;
const DEFAULT_COURSE_LIMIT = 100;
// Safety net so a misbehaving/paginating-forever API response can never hang the UI.
const MAX_PAGES = 50;

export class UdemyAuthError extends Error {
  constructor(message = 'Sessão da Udemy não encontrada ou expirada.') {
    super(message);
    this.name = 'UdemyAuthError';
  }
}

export class UdemyHttpError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'UdemyHttpError';
    this.status = status;
  }
}

export class UdemyNetworkError extends Error {
  constructor(message = 'Falha de rede ao tentar acessar a Udemy.') {
    super(message);
    this.name = 'UdemyNetworkError';
  }
}

function buildCollectionsUrl({ page, pageSize, courseLimit }) {
  const url = new URL(COLLECTIONS_ENDPOINT);
  url.searchParams.set('fields[course]', COURSE_FIELDS);
  url.searchParams.set('fields[user_has_subscribed_courses_collection]', COLLECTION_FIELDS);
  url.searchParams.set('page', String(page));
  url.searchParams.set('page_size', String(pageSize));
  url.searchParams.set('course_limit', String(courseLimit));
  return url.toString();
}

export class UdemyApiClient {
  async fetchCollectionsPage({ page, pageSize, courseLimit }) {
    const url = buildCollectionsUrl({ page, pageSize, courseLimit });

    let response;
    try {
      response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
    } catch (error) {
      throw new UdemyNetworkError();
    }

    if (response.status === 401 || response.status === 403) {
      throw new UdemyAuthError();
    }

    if (!response.ok) {
      throw new UdemyHttpError(`Udemy respondeu com HTTP ${response.status}`, response.status);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // Typically means we were redirected to an HTML login page: session isn't valid.
      throw new UdemyAuthError('Resposta inesperada da Udemy (não é JSON). A sessão pode ter expirado.');
    }

    return response.json();
  }

  /**
   * Fetches every page of the subscribed-courses-collections endpoint and
   * returns the raw (unmapped) list of collections. Pagination is followed
   * via the `next` field the API returns, not by guessing page counts.
   */
  async fetchAllCollections({
    pageSize = DEFAULT_PAGE_SIZE,
    courseLimit = DEFAULT_COURSE_LIMIT,
    maxPages = MAX_PAGES,
  } = {}) {
    const collections = [];
    let page = 1;
    let hasNext = true;

    while (hasNext && page <= maxPages) {
      const data = await this.fetchCollectionsPage({ page, pageSize, courseLimit });
      const results = Array.isArray(data.results) ? data.results : [];
      collections.push(...results);
      hasNext = Boolean(data.next);
      page += 1;
    }

    return collections;
  }
}
