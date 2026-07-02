'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SearchBar, StatusFilter } from '@/components/ui/data-table';
import { useState, useMemo } from 'react';
import { ChevronRight, BookOpen, Layers, KeyRound } from 'lucide-react';
import type { CourseWithTranslation } from '@/lib/admin/queries';
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

function getTranslation(
  translations: Array<{ locale: string; title: string; description: string | null }>,
  locale: string
): { title: string; description: string | null } {
  const match = translations.find((t) => t.locale === locale);
  if (match) return match;
  const fallback = translations.find((t) => t.locale === 'fr') ?? translations[0];
  return fallback ?? { title: '---', description: null };
}

interface Props {
  courses: CourseWithTranslation[];
  locale: string;
}

export function CoursesTable({ courses, locale }: Props) {
  const t = useTranslations('admin');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    let result = courses;
    if (statusFilter) {
      result = result.filter((c) => c.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) => {
        const tr = getTranslation(c.translations, locale);
        return (
          c.slug.toLowerCase().includes(q) ||
          tr.title.toLowerCase().includes(q) ||
          c.exam_type.toLowerCase().includes(q)
        );
      });
    }
    return result;
  }, [courses, search, statusFilter, locale]);

  const statusOptions = [
    { value: '', label: t('allStatuses') },
    { value: 'published', label: t('published') },
    { value: 'draft', label: t('draft') },
    { value: 'validated', label: t('validated') },
    { value: 'archived', label: t('archived') },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder={t('search')}
          className="sm:max-w-xs"
        />
        <StatusFilter
          value={statusFilter}
          onChange={setStatusFilter}
          options={statusOptions}
        />
      </div>

      {/* Course cards */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-navy-400">
          {t('noData')}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((course) => {
            const tr = getTranslation(course.translations, locale);
            return (
              <Link
                key={course.id}
                href={`/admin/content/courses/${course.id}`}
              >
                <Card className="transition-all hover:shadow-md hover:border-teal-200 group">
                  <CardContent className="py-4 flex items-center gap-4">
                    {/* HSK level badge */}
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-navy-800 text-white font-bold text-sm shrink-0">
                      {course.slug.replace('hsk-', 'HSK ')}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-navy-900 truncate">
                          {tr.title}
                        </h3>
                        <Badge variant={getStatusVariant(course.status)}>
                          {t(course.status)}
                        </Badge>
                      </div>
                      {tr.description && (
                        <p className="text-xs text-navy-400 truncate max-w-lg">
                          {tr.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-navy-400">
                        <span className="flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5" />
                          {course.module_count} {t('modules').toLowerCase()}
                        </span>
                        <span className="flex items-center gap-1">
                          <KeyRound className="h-3.5 w-3.5" />
                          {course.license_count} {t('licenses').toLowerCase()}
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          v{course.version}
                        </span>
                      </div>
                    </div>

                    {/* Chevron */}
                    <ChevronRight className="h-5 w-5 text-navy-300 group-hover:text-teal-500 transition-colors shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
