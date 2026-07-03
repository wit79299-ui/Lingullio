import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { fetchLessonById, fetchLessonExercises } from '@/lib/learner/queries';
import { ExerciseEngine } from '@/components/exercises/exercise-engine';
import type { Exercise } from '@/components/exercises/types';

type Props = {
  params: Promise<{ locale: string; slug: string; lessonId: string }>;
};

export default async function ExercisesPage({ params }: Props) {
  const { locale, slug, lessonId } = await params;
  setRequestLocale(locale);

  const [lesson, rawExercises] = await Promise.all([
    fetchLessonById(lessonId, locale),
    fetchLessonExercises(lessonId, locale),
  ]);

  if (!lesson || rawExercises.length === 0) notFound();

  // Map to Exercise type expected by the engine
  const exercises: Exercise[] = rawExercises.map((e) => ({
    id: e.id,
    exercise_type: e.exercise_type as Exercise['exercise_type'],
    difficulty: e.difficulty,
    points: e.points,
    sort_order: e.sort_order,
    audio_url: e.audio_url,
    metadata: e.metadata,
    prompt: e.prompt,
    instruction: e.instruction,
    explanation: e.explanation,
    hint: e.hint,
  }));

  const hskLevel = slug.replace('hsk-', '');
  const backHref = `/courses/${slug}/lessons/${lessonId}`;

  return (
    <div className="py-2">
      <ExerciseEngine
        exercises={exercises}
        lessonTitle={lesson.title}
        moduleTitle={lesson.module_title}
        hskLevel={hskLevel}
        slug={slug}
        lessonId={lessonId}
        backHref={backHref}
      />
    </div>
  );
}
