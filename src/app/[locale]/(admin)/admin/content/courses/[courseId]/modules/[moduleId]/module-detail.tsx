'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ChevronRight, BookOpenText, Dumbbell, Clock } from 'lucide-react';
import type { LessonWithTranslation } from '@/lib/admin/queries';
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
  translations: Array<{ locale: string; title: string; description?: string | null }>,
  locale: string
) {
  return translations.find((t) => t.locale === locale)
    ?? translations.find((t) => t.locale === 'fr')
    ?? translations[0]
    ?? { title: '---', description: null };
}

interface Props {
  module: {
    id: string;
    course_id: string;
    sort_order: number;
    status: string;
    estimated_duration_minutes: number | null;
    translations: Array<{ locale: string; title: string; description: string | null }>;
  };
  lessons: LessonWithTranslation[];
  courseId: string;
  courseSlug: string;
  locale: string;
}

export function ModuleDetail({ module: mod, lessons, courseId, courseSlug, locale }: Props) {
  const t = useTranslations('admin');
  const modTr = getTr(mod.translations, locale);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div>
        <div className="flex items-center gap-1 text-sm text-navy-400 mb-4">
          <Link href="/admin/content/courses" className="hover:text-navy-600 transition-colors">
            {t('courses')}
          </Link>
          <span>/</span>
          <Link href={`/admin/content/courses/${courseId}`} className="hover:text-navy-600 transition-colors">
            {courseSlug.replace('hsk-', 'HSK ') || t('course')}
          </Link>
          <span>/</span>
          <span className="text-navy-600 font-medium">{modTr.title}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-sm shrink-0">
            M{mod.sort_order}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
              {modTr.title}
              <Badge variant={getStatusVariant(mod.status as ContentStatus)}>
                {t(mod.status)}
              </Badge>
            </h1>
            {modTr.description && (
              <p className="text-sm text-navy-400 mt-1">{modTr.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-navy-900">{lessons.length}</p>
            <p className="text-xs text-navy-400">{t('lessons')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-navy-900">
              {lessons.reduce((s, l) => s + l.exercise_count, 0)}
            </p>
            <p className="text-xs text-navy-400">{t('exercises')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-navy-900">
              {mod.estimated_duration_minutes ?? '---'}
            </p>
            <p className="text-xs text-navy-400">{t('duration')} (min)</p>
          </CardContent>
        </Card>
      </div>

      {/* Lessons list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpenText className="h-5 w-5 text-navy-500" />
            {t('lessons')} ({lessons.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lessons.length === 0 ? (
            <p className="text-sm text-navy-400 py-4 text-center">{t('noData')}</p>
          ) : (
            <div className="space-y-2">
              {lessons.map((lesson) => {
                const lTr = getTr(lesson.translations, locale);
                return (
                  <Link
                    key={lesson.id}
                    href={`/admin/content/courses/${courseId}/modules/${mod.id}/lessons/${lesson.id}`}
                  >
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-cream-50 hover:bg-cream-100 transition-colors group cursor-pointer">
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 text-sm font-bold text-teal-700">
                        {lesson.sort_order}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-navy-800 truncate">{lTr.title}</h4>
                          <Badge variant={getStatusVariant(lesson.status)}>
                            {t(lesson.status)}
                          </Badge>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-navy-100 text-navy-500 font-mono">
                            {lesson.lesson_type}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-navy-400">
                          <span className="flex items-center gap-1">
                            <Dumbbell className="h-3 w-3" />
                            {lesson.exercise_count} {t('exercises').toLowerCase()}
                          </span>
                          {lesson.estimated_duration_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {lesson.estimated_duration_minutes} min
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-navy-300 group-hover:text-teal-500 transition-colors shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
