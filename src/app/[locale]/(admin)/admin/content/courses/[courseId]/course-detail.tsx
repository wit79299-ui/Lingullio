'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Layers, BookOpenText, ChevronRight } from 'lucide-react';
import type { CourseWithTranslation, ModuleWithTranslation } from '@/lib/admin/queries';
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
  course: CourseWithTranslation;
  modules: ModuleWithTranslation[];
  locale: string;
}

export function CourseDetail({ course, modules, locale }: Props) {
  const t = useTranslations('admin');
  const tr = getTr(course.translations, locale);

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <Link href="/admin/content/courses" className="inline-flex items-center gap-1 text-sm text-navy-400 hover:text-teal-600 mb-3">
          <ArrowLeft className="h-4 w-4" />
          {t('courses')}
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-navy-800 text-white font-bold text-sm shrink-0">
            {course.slug.replace('hsk-', 'HSK ')}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-2">
              {tr.title}
              <Badge variant={getStatusVariant(course.status)}>
                {t(course.status)}
              </Badge>
            </h1>
            {tr.description && (
              <p className="text-sm text-navy-400 mt-1">{tr.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-navy-900">{modules.length}</p>
            <p className="text-xs text-navy-400">{t('modules')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-navy-900">
              {modules.reduce((sum, m) => sum + m.lesson_count, 0)}
            </p>
            <p className="text-xs text-navy-400">{t('lessons')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-navy-900">{course.license_count}</p>
            <p className="text-xs text-navy-400">{t('licenses')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Translations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('title')} / Translations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {course.translations.length === 0 ? (
              <p className="text-sm text-navy-400">{t('noData')}</p>
            ) : (
              course.translations.map((tr) => (
                <div key={tr.locale} className="flex items-start gap-3 p-3 rounded-lg bg-cream-50">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-navy-100 text-xs font-bold text-navy-700 uppercase shrink-0">
                    {tr.locale}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-navy-900">{tr.title}</p>
                    {tr.description && (
                      <p className="text-xs text-navy-400 mt-0.5 line-clamp-2">{tr.description}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modules list with drill-down */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-5 w-5 text-navy-500" />
            {t('modules')} ({modules.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {modules.length === 0 ? (
            <p className="text-sm text-navy-400 py-4 text-center">{t('noData')}</p>
          ) : (
            <div className="space-y-2">
              {modules.map((mod) => {
                const modTr = getTr(mod.translations, locale);
                return (
                  <Link
                    key={mod.id}
                    href={`/admin/content/courses/${course.id}/modules/${mod.id}`}
                  >
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-cream-50 hover:bg-cream-100 transition-colors group cursor-pointer">
                      <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-navy-100 text-sm font-bold text-navy-700">
                        {mod.sort_order}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-navy-800 truncate">{modTr.title}</h4>
                          <Badge variant={getStatusVariant(mod.status)}>
                            {t(mod.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-navy-400">
                          <span className="flex items-center gap-1">
                            <BookOpenText className="h-3 w-3" />
                            {mod.lesson_count} {t('lessons').toLowerCase()}
                          </span>
                          {mod.estimated_duration_minutes && (
                            <span>{mod.estimated_duration_minutes} min</span>
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
