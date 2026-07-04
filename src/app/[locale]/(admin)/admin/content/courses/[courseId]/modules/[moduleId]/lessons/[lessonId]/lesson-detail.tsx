'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, Clock, Tag } from 'lucide-react';
import type { ExerciseWithTranslation } from '@/lib/admin/queries';
import type { ContentStatus } from '@/types/database';

function getStatusVariant(status: ContentStatus) {
  const map: Record<ContentStatus, 'published' | 'draft' | 'archived' | 'new'> = {
    published: 'published',
    draft: 'draft',
    validated: 'new',
    archived: 'archived',
  };
  return map[status] ?? 'draft';
}

function getTr(
  translations: Array<{ locale: string; title?: string; prompt?: string; description?: string | null }>,
  locale: string
) {
  return translations.find((t) => t.locale === locale)
    ?? translations.find((t) => t.locale === 'fr')
    ?? translations[0];
}

const EXERCISE_TYPE_COLORS: Record<string, string> = {
  mcq: 'bg-blue-100 text-blue-700',
  fill_blank: 'bg-green-100 text-green-700',
  matching: 'bg-purple-100 text-purple-700',
  reorder: 'bg-orange-100 text-orange-700',
  dictation: 'bg-pink-100 text-pink-700',
  flashcard: 'bg-yellow-100 text-yellow-700',
  character_recognition: 'bg-red-100 text-red-700',
  controlled_translation: 'bg-indigo-100 text-indigo-700',
  listening_comprehension: 'bg-teal-100 text-teal-700',
  reading_comprehension: 'bg-cyan-100 text-cyan-700',
};

interface Props {
  lesson: {
    id: string;
    module_id: string;
    sort_order: number;
    lesson_type: string;
    status: string;
    estimated_duration_minutes: number | null;
    translations: Array<{ locale: string; title: string; description: string | null }>;
  };
  exercises: ExerciseWithTranslation[];
  totalExercises: number;
  courseId: string;
  moduleId: string;
  breadcrumb: { courseSlug: string; moduleTitle: string };
  locale: string;
}

export function LessonDetail({
  lesson,
  exercises,
  totalExercises,
  courseId,
  moduleId,
  breadcrumb,
  locale,
}: Props) {
  const t = useTranslations('admin');
  const lTr = getTr(lesson.translations, locale);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <div className="flex flex-wrap items-center gap-1 text-sm text-navy-400 mb-4">
          <Link href="/admin/content/courses" className="hover:text-navy-600 transition-colors">
            {t('courses')}
          </Link>
          <span>/</span>
          <Link href={`/admin/content/courses/${courseId}`} className="hover:text-navy-600 transition-colors">
            {breadcrumb.courseSlug.replace('hsk-', 'HSK ') || t('course')}
          </Link>
          <span>/</span>
          <Link href={`/admin/content/courses/${courseId}/modules/${moduleId}`} className="hover:text-navy-600 transition-colors">
            {breadcrumb.moduleTitle}
          </Link>
          <span>/</span>
          <span className="text-navy-600 font-medium">{lTr?.title ?? '---'}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-100 text-teal-700 font-bold text-sm shrink-0">
            L{lesson.sort_order}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
              {lTr?.title ?? '---'}
              <Badge variant={getStatusVariant(lesson.status as ContentStatus)}>
                {t(lesson.status)}
              </Badge>
              <span className="text-xs px-2 py-0.5 rounded bg-navy-100 text-navy-500 font-mono">
                {lesson.lesson_type}
              </span>
            </h1>
            {lTr?.description && (
              <p className="text-sm text-navy-400 mt-1">{lTr.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-navy-900">{totalExercises}</p>
            <p className="text-xs text-navy-400">{t('exercises')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-navy-900">
              {lesson.estimated_duration_minutes ?? '---'}
            </p>
            <p className="text-xs text-navy-400">{t('duration')} (min)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-navy-900">
              {new Set(exercises.map(e => e.exercise_type)).size}
            </p>
            <p className="text-xs text-navy-400">{t('allTypes')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Exercises list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-navy-500" />
            {t('exercises')} ({totalExercises})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {exercises.length === 0 ? (
            <p className="text-sm text-navy-400 py-4 text-center">{t('noData')}</p>
          ) : (
            <div className="space-y-2">
              {exercises.map((ex) => {
                const exTr = getTr(ex.translations, locale) as {
                  locale: string;
                  prompt: string;
                  instruction: string | null;
                  explanation: string | null;
                  hint: string | null;
                } | undefined;
                const typeColor = EXERCISE_TYPE_COLORS[ex.exercise_type] ?? 'bg-gray-100 text-gray-700';

                return (
                  <div
                    key={ex.id}
                    className="flex items-start gap-4 p-3 rounded-lg bg-cream-50 hover:bg-cream-100 transition-colors"
                  >
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-navy-100 text-sm font-bold text-navy-700 shrink-0 mt-0.5">
                      {ex.sort_order}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeColor}`}>
                          {ex.exercise_type.replace(/_/g, ' ')}
                        </span>
                        <Badge variant={getStatusVariant(ex.status)}>
                          {t(ex.status)}
                        </Badge>
                        {ex.difficulty && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold-100 text-gold-700">
                            {ex.difficulty}
                          </span>
                        )}
                        <span className="text-[10px] text-navy-300">
                          {ex.option_count} {t('options').toLowerCase()}
                        </span>
                      </div>
                      {exTr?.prompt && (
                        <p className="text-sm text-navy-700 mt-1 line-clamp-2">
                          {exTr.prompt}
                        </p>
                      )}
                      {exTr?.instruction && (
                        <p className="text-xs text-navy-400 mt-0.5 italic line-clamp-1">
                          {exTr.instruction}
                        </p>
                      )}
                      {ex.skill_tags && ex.skill_tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Tag className="h-3 w-3 text-navy-300" />
                          {ex.skill_tags.map((tag) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-navy-50 text-navy-500">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
