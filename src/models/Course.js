// Internal course model. Nothing outside api/UdemyApiClient.js and mappers/CourseMapper.js
// should ever read Udemy's raw JSON field names directly — everything else works with this shape.

export const CourseStatus = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};

export function createCourse({
  id,
  title,
  instructors = [],
  progress = 0,
  imageUrl = null,
  url = null,
  favorite = false,
  archived = false,
  lastAccessedAt = null,
  enrolledAt = null,
  published = true,
}) {
  return {
    id,
    title,
    instructors,
    progress,
    imageUrl,
    url,
    favorite,
    archived,
    lastAccessedAt,
    enrolledAt,
    published,
  };
}

export function getCourseStatus(course) {
  if (course.progress >= 100) return CourseStatus.COMPLETED;
  if (course.progress > 0) return CourseStatus.IN_PROGRESS;
  return CourseStatus.NOT_STARTED;
}
