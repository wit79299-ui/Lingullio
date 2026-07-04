'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, StatusFilter } from '@/components/ui/data-table';
import { useState, useMemo } from 'react';
import { Clock, FileQuestion, Layers } from 'lucide-react';
import type { MockExamWithTranslation, CourseWithTranslation } from '@/lib/admin/queries';
import type { ContentStatus } from '@/types/database';
import type { Column } from '@/components/ui/data-table';

function getStatusVariant(status: ContentStatus) {
  const map: Record<ContentStatus, 'published' | 'draft' | 'archived' | 'new'> = {
    published: 'published',
    draft: 'draft',
    validated: 'new',
    archived: 'archived',
  };
  return map[status] ?? 'draft';
}

interface Props {
  mockExams: MockExamWithTranslation[];
  courses: CourseWithTranslation[];
  locale: string;
}

export function MockExamsTable({ mockExams, courses, locale }: Props) {
  const t = useTranslations('admin');
  const [courseFilter, setCourseFilter] = useState('');

  const courseMap = useMemo(() => {
    const m = new Map<string, string>();
    courses.forEach((c) => {
      const tr = c.translations.find((t) => t.locale === locale) ?? c.translations[0];
      m.set(c.id, tr?.title ?? c.slug);
    });
    return m;
  }, [courses, locale]);

  const filtered = useMemo(() => {
    if (!courseFilter) return mockExams;
    return mockExams.filter((e) => e.course_id === courseFilter);
  }, [mockExams, courseFilter]);

  const courseOptions = [
    { value: '', label: t('allLevels') },
    ...courses.map((c) => ({
      value: c.id,
      label: courseMap.get(c.id) ?? c.slug,
    })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <StatusFilter
          value={courseFilter}
          onChange={setCourseFilter}
          options={courseOptions}
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-navy-400">
            {t('noData')}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((exam) => {
            const tr = exam.translations.find((t) => t.locale === locale)
              ?? exam.translations.find((t) => t.locale === 'fr')
              ?? exam.translations[0];

            return (
              <Card key={exam.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4 flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-orange-100 text-orange-700 font-bold text-lg shrink-0">
                    <FileQuestion className="h-6 w-6" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-navy-900 truncate">
                        {tr?.title ?? `Exam #${exam.sort_order}`}
                      </h3>
                      <Badge variant={getStatusVariant(exam.status)}>
                        {t(exam.status)}
                      </Badge>
                    </div>
                    {tr?.description && (
                      <p className="text-xs text-navy-400 truncate max-w-lg">
                        {tr.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-navy-400">
                      <span className="text-navy-500 font-medium">
                        {courseMap.get(exam.course_id) ?? '---'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5" />
                        {exam.section_count} {t('sections').toLowerCase()}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileQuestion className="h-3.5 w-3.5" />
                        {exam.question_count} {t('questions').toLowerCase()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {exam.total_duration_minutes} min
                      </span>
                      <span>{exam.total_points} {t('points').toLowerCase()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
