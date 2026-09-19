# Better Udemy Library

An unofficial, lightweight browser extension (Firefox, Chrome, and Edge) that gives you a fast,
independent way to browse **your own** Udemy courses — without the pagination and
repeated "Ver mais" clicks of the official "My Learning / Lists" page.

> **This project is not affiliated with, endorsed by, or associated with Udemy, Inc.**
> It is an independent, community-built tool.

## The problem

The Udemy "My Learning / Lists" page only renders a limited number of courses per
list at a time. Viewing or searching your whole library means repeatedly clicking
"Ver mais" ("Show more"), each triggering a new network request. For accounts with
many courses (bundles, free courses, bootcamps, etc.) this makes it slow and
tedious to just find one course.

**Better Udemy Library** reuses your existing, already-authenticated Udemy session
in the browser to fetch your course data, then renders all of it in one simple,
fast, client-side page you fully control (search, filter, sort — instantly, with
zero extra requests to Udemy).

## What it deliberately does NOT do

- No login screen, no Udemy username/password ever requested.
- No credential, cookie, or token storage of any kind.
- No backend server, no external database.
- No scraping of Udemy's HTML — it talks to the same JSON API endpoint the Udemy
  frontend itself uses.
- No data ever leaves your browser. The only network calls are `browser -> Udemy`.

## How it works

1. You click the extension icon.
2. A new tab opens with the extension's own page (`src/pages/library/library.html`).
3. That page checks the browser's local extension storage for a cached course list and renders it
   immediately if present.
4. You can click **Atualizar** ("Refresh") to fetch fresh data. The extension calls
   Udemy's own `subscribed-courses-collections` API endpoint using `fetch(...,
   { credentials: 'include' })`, so your existing Udemy session cookies are reused —
   exactly as if the Udemy page itself had made the request.
5. The response is mapped into a small internal `Course` model, deduplicated, cached
   locally, and rendered as a searchable/sortable/filterable grid.

## Architecture

```
Browser Extension
    |
    +-- Library UI            (src/pages/library, src/components)
    |
    +-- CourseService         (src/services/CourseService.js)
    |
    +-- UdemyApiClient        (src/api/UdemyApiClient.js)
    |
    +-- CourseMapper          (src/mappers/CourseMapper.js)
    |
    +-- CourseStorage         (src/storage/CourseStorage.js)
    |
    +-- Udemy API
```

| Module | Responsibility |
|---|---|
| `UdemyApiClient` | The **only** module that knows Udemy's endpoint URL, query params, and raw JSON shape. Handles HTTP, pagination, and error classification (auth / HTTP / network). |
| `CourseMapper` | The **only other** module allowed to read Udemy-specific fields (`completion_ratio`, `image_480x270`, `visible_instructors`, `published_title`, etc.). Converts raw JSON into the internal `Course` model. |
| `CourseService` | Loads courses (cache or network), deduplicates by `course.id`, and implements search / filter / sort — all client-side, all on the internal model. |
| `CourseStorage` | Thin wrapper around the WebExtension local storage API for caching `{ courses, updatedAt }`. |
| Library UI (`components/CourseCard.js`, `pages/library/*`) | Pure presentation. Renders the internal `Course` model; knows nothing about Udemy's API. |

**Everything below `CourseMapper` in the diagram works only with the internal
`Course` model.** If Udemy changes its JSON response, only `UdemyApiClient.js` and
`CourseMapper.js` should need to change.

### Internal `Course` model

```js
{
  id,
  title,
  instructors,     // string[]
  progress,        // 0-100 integer
  imageUrl,
  url,              // absolute URL on udemy.com
  favorite,
  archived,
  lastAccessedAt,
  enrolledAt,
}
```

## Installation (unpacked / development)

### Chrome / Edge

1. Clone or download this repository.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the `better-udemy-library` folder (the one
   containing `manifest.json`).
5. Make sure you're logged into [udemy.com](https://www.udemy.com) in the same
   browser.
6. Click the extension's icon in the toolbar — a new tab opens with your library.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select this repository's `manifest.json` file.
4. Make sure you're logged into [udemy.com](https://www.udemy.com) in Firefox.
5. Click the extension's icon in the toolbar.

Firefox removes temporary add-ons when the browser restarts. A persistent end-user
installation requires a package signed by Mozilla.

No build step, no `npm install`, no bundler — it's plain ES modules loaded
directly by the browser.

## Development

The project is intentionally dependency-free vanilla JS (ES Modules), HTML and CSS
running under Manifest V3. To iterate:

1. Edit files under `src/`.
2. Reload the extension from `chrome://extensions` on Chrome/Edge or from
   `about:debugging#/runtime/this-firefox` on Firefox (or reload the library tab
   if you only changed `pages/library/*`).
3. Re-open the library tab to see changes.

There is currently no automated test suite — this is a good area for
contributions (e.g. unit tests for `CourseMapper` and `CourseService` using a
lightweight runner, since they have no DOM/browser dependency).

## Privacy

- The extension **never** asks for or stores your Udemy username, password, or any
  authentication token.
- It relies entirely on the session cookie your browser already has for
  `udemy.com` — the same one the official Udemy site uses. The extension cannot
  read that cookie's value; it simply lets the browser attach it automatically to
  requests made with `credentials: 'include'`.
- All requests go directly from your browser to `www.udemy.com`. There is no
  extension backend, proxy, analytics, or third-party server involved.
- The only data persisted is your mapped course list and a timestamp, stored
  in the browser's local extension storage (never synced, never sent anywhere).

## Limitations

- **The `subscribed-courses-collections` endpoint may not represent every course
  in your account.** It returns your *collections* ("lists") with a nested,
  possibly-truncated (`course_limit`) array of courses per collection. It is what
  the Udemy frontend itself uses to render "My Learning / Lists", but a course
  that was never added to a list could theoretically be absent from this response.
  The extension does **not** silently assume this endpoint is a complete "all
  subscribed courses" source.
- **TODO:** identify (via DevTools, on an authenticated session) a flatter
  "subscribed courses" endpoint that isn't scoped to collections, and either
  replace or complement the current one. This should only require changes inside
  `UdemyApiClient.js` (and possibly `CourseMapper.js`) — the rest of the app is
  already isolated from this decision. No endpoint should be guessed or invented;
  it must be captured directly from Udemy's own network traffic.
- This project uses an **internal, unofficial, unpublished** Udemy API endpoint
  observed via browser DevTools. It is not part of any public/documented Udemy
  API. **Udemy can change, rename, or remove this endpoint at any time without
  notice**, which would break the extension until updated.
- No automated retry/backoff strategy beyond simple pagination following; very
  large libraries with many collections will require several sequential requests
  on refresh.
- No automated tests yet.

## License

See [LICENSE](LICENSE) (MIT).
