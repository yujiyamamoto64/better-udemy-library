// Presentation-only component: builds the DOM node for a single course.
// Knows nothing about the Udemy API — only the internal Course model.

import { getCourseStatus, CourseStatus } from '../models/Course.js';

const STATUS_LABELS = {
  [CourseStatus.NOT_STARTED]: 'Não iniciado',
  [CourseStatus.IN_PROGRESS]: 'Em andamento',
  [CourseStatus.COMPLETED]: 'Concluído',
};

export function createCourseCard(course) {
  const status = getCourseStatus(course);

  const card = document.createElement('article');
  card.className = 'course-card';
  card.dataset.status = status;

  const link = document.createElement('a');
  link.className = 'course-card__link';
  link.href = course.url || '#';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.title = `Abrir "${course.title}" na Udemy`;

  const imageWrapper = document.createElement('div');
  imageWrapper.className = 'course-card__image-wrapper';
  const img = document.createElement('img');
  img.className = 'course-card__image';
  img.loading = 'lazy';
  img.src = course.imageUrl || '';
  img.alt = '';
  img.addEventListener('error', () => {
    imageWrapper.classList.add('course-card__image-wrapper--broken');
  });
  imageWrapper.appendChild(img);

  const body = document.createElement('div');
  body.className = 'course-card__body';

  const title = document.createElement('h3');
  title.className = 'course-card__title';
  title.textContent = course.title;

  const instructors = document.createElement('p');
  instructors.className = 'course-card__instructors';
  instructors.textContent = course.instructors.length
    ? course.instructors.join(', ')
    : 'Instrutor não informado';

  const progressWrapper = document.createElement('div');
  progressWrapper.className = 'course-card__progress-wrapper';

  const progressBar = document.createElement('div');
  progressBar.className = 'course-card__progress-bar';
  const progressFill = document.createElement('div');
  progressFill.className = 'course-card__progress-fill';
  progressFill.style.width = `${course.progress}%`;
  progressBar.appendChild(progressFill);

  const progressLabel = document.createElement('span');
  progressLabel.className = 'course-card__progress-label';
  progressLabel.textContent = `${course.progress}% · ${STATUS_LABELS[status]}`;

  progressWrapper.append(progressBar, progressLabel);
  body.append(title, instructors, progressWrapper);
  link.append(imageWrapper, body);
  card.appendChild(link);

  return card;
}
