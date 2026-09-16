import { CourseService, SortOption } from '../../services/CourseService.js';
import { createCourseCard } from '../../components/CourseCard.js';
import { UdemyAuthError, UdemyHttpError, UdemyNetworkError } from '../../api/UdemyApiClient.js';

const courseService = new CourseService();

const state = {
  allCourses: [],
  updatedAt: null,
  filter: 'all',
  query: '',
  sortBy: SortOption.NAME_ASC,
  isRefreshing: false,
};

const els = {
  statusText: document.getElementById('status-text'),
  refreshButton: document.getElementById('refresh-button'),
  searchInput: document.getElementById('search-input'),
  filterButtons: Array.from(document.querySelectorAll('.filter-button')),
  sortSelect: document.getElementById('sort-select'),
  resultsCount: document.getElementById('results-count'),
  banner: document.getElementById('banner'),
  grid: document.getElementById('course-grid'),
  emptyState: document.getElementById('empty-state'),
};

function formatRelativeTime(timestamp) {
  if (!timestamp) return null;
  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (diffMinutes < 1) return 'agora mesmo';
  if (diffMinutes < 60) return `há ${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `há ${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  return `há ${diffDays} d`;
}

function setStatusText() {
  if (state.isRefreshing) {
    els.statusText.textContent = 'Atualizando…';
    return;
  }
  const relative = formatRelativeTime(state.updatedAt);
  els.statusText.textContent = relative ? `Atualizado ${relative}` : 'Ainda não atualizado';
}

function showBanner(message, type = 'info') {
  els.banner.textContent = message;
  els.banner.className = `banner banner--${type}`;
  els.banner.hidden = false;
}

function hideBanner() {
  els.banner.hidden = true;
  els.banner.textContent = '';
}

function showEmptyState(message) {
  els.grid.hidden = true;
  els.emptyState.hidden = false;
  els.emptyState.textContent = message;
}

function getFilteredCourses() {
  let courses = courseService.search(state.allCourses, state.query);
  courses = courseService.filterByStatus(courses, state.filter);
  courses = courseService.sort(courses, state.sortBy);
  return courses;
}

function render() {
  if (state.allCourses.length === 0) {
    showEmptyState(
      state.isRefreshing
        ? 'Carregando seus cursos da Udemy…'
        : 'Nenhum curso encontrado ainda. Clique em "Atualizar" para buscar seus cursos na Udemy.'
    );
    els.resultsCount.textContent = '';
    return;
  }

  const courses = getFilteredCourses();

  if (courses.length === 0) {
    showEmptyState('Nenhum curso corresponde à busca ou ao filtro selecionado.');
    els.resultsCount.textContent = '0 cursos';
    return;
  }

  els.emptyState.hidden = true;
  els.grid.hidden = false;
  els.grid.innerHTML = '';
  const fragment = document.createDocumentFragment();
  for (const course of courses) {
    fragment.appendChild(createCourseCard(course));
  }
  els.grid.appendChild(fragment);
  els.resultsCount.textContent = `${courses.length} curso${courses.length === 1 ? '' : 's'}`;
}

function errorMessageFor(error) {
  if (error instanceof UdemyAuthError) {
    return 'Não foi possível confirmar sua sessão na Udemy. Abra udemy.com, faça login e tente novamente.';
  }
  if (error instanceof UdemyHttpError) {
    return `A Udemy respondeu com um erro (HTTP ${error.status}). Tente novamente em instantes.`;
  }
  if (error instanceof UdemyNetworkError) {
    return 'Não foi possível conectar à Udemy. Verifique sua internet.';
  }
  return 'Ocorreu um erro inesperado ao buscar seus cursos.';
}

async function refresh() {
  state.isRefreshing = true;
  els.refreshButton.disabled = true;
  setStatusText();
  if (state.allCourses.length === 0) {
    hideBanner();
    render();
  }

  try {
    const { courses, updatedAt } = await courseService.refreshCourses();
    state.allCourses = courses;
    state.updatedAt = updatedAt;
    hideBanner();
    if (courses.length === 0) {
      showBanner('Nenhuma collection ou curso foi encontrado na sua conta Udemy.', 'info');
    }
  } catch (error) {
    const message = errorMessageFor(error);
    if (state.allCourses.length > 0) {
      showBanner(`Não foi possível atualizar (${message}). Mostrando dados salvos em cache.`, 'warning');
    } else {
      showBanner(message, 'error');
    }
  } finally {
    state.isRefreshing = false;
    els.refreshButton.disabled = false;
    setStatusText();
    render();
  }
}

function wireEvents() {
  els.refreshButton.addEventListener('click', refresh);

  els.searchInput.addEventListener('input', (event) => {
    state.query = event.target.value;
    render();
  });

  els.filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      state.filter = button.dataset.filter;
      els.filterButtons.forEach((b) => b.classList.toggle('is-active', b === button));
      render();
    });
  });

  els.sortSelect.addEventListener('change', (event) => {
    state.sortBy = event.target.value;
    render();
  });
}

async function init() {
  wireEvents();
  state.sortBy = els.sortSelect.value;

  const cached = await courseService.getCachedCourses();
  if (cached && cached.courses.length > 0) {
    state.allCourses = cached.courses;
    state.updatedAt = cached.updatedAt;
    setStatusText();
    render();
    // Cache exists: do NOT auto-refresh. Avoids unnecessary requests to Udemy;
    // the user can click "Atualizar" whenever they want fresh data.
    return;
  }

  // No cache yet: fetch once automatically so the page isn't empty on first use.
  await refresh();
}

init();
