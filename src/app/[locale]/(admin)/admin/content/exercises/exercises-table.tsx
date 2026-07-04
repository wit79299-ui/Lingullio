'use client';

import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Pagination, StatusFilter } from '@/components/ui/data-table';
import { useState, useCallback } from 'react';
import { Tag } from 'lucide-react';
import type { ExerciseWithTranslation } from '@/lib/admin/queries';
import type { ContentStatus } from '@/types/database';

const EXERCISE_TYPES = [
  'character_recognition', 'controlled_translation', 'dictation',
  'fill_blank', 'flashcard', 'listening_comprehension',
  'matching', 'mcq', 'reading_comprehension', 'reorder',
] as const;

const LEVELS = ['1', '2', '3', '4', '5', '6', '7-9'] as const;

function getStatusVariant(status: ContentStatus) {
  const map: Record<ContentStatus, 'published' | 'draft' | 'archived' | 'new'> = {
    published: 'published',
    draft: 'draft',
    validated: 'new',
    archived: 'archived',
  };
  return map[status] ?? 'draft';
}

const TYPE_COLORS: Record<string, string> = {
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
  exercises: ExerciseWithTranslation[];
  total: number;
  currentPage: number;
  pageSize: number;
  locale: string;
  filters: { level?: string; type?: string; status?: string };
}

export function ExercisesTable({ exercises, total, currentPage, pageSize, locale, filters }: Props) {
  const t = useTranslations('admin');
  const router = useRouter();
  const pathname = usePathname();

  const [levelFilter, setLevelFilter] = useState(filters.level ?? '');
  const [typeFilter, setTypeFilter] = useState(filters.type ?? '');
  const [statusFilter, setStatusFilter] = useState(filters.status ?? '');

  const totalPages = Math.ceil(total / pageSize);

  const navigate = useCallback(
    (overrides: Record<string, string>) => {
      const p = new URLSearchParams();
      const merged = { level: levelFilter, type: typeFilter, status: statusFilter, page: '1', ...overrides };
      Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v); });
      router.push(`${pathname}?${p.toString()}` as any);
    },
    [router, pathname, levelFilter, typeFilter, statusFilter]
  );

  const levelOptions = [
    { value: '', label: t('allLevels') },
    ...LEVELS.map((l) => ({ value: l, label: `HSK ${l}` })),
  ];

  const typeOptions = [
    { value: '', label: t('allTypes') },
    ...EXERCISE_TYPES.map((et) => ({ value: et, label: et.replace(/_/g, ' ') })),
  ];

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
      <div className="flex flex-wrap gap-3">
        <StatusFilter
          value={levelFilter}
          onChange={(v) => { setLevelFilter(v); navigate({ level: v }); }}
          options={levelOptions}
        />
        <StatusFilter
          value={typeFilter}
          onChange={(v) => { setTypeFilter(v); navigate({ type: v }); }}
          options={typeOptions}
        />
        <StatusFilter
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); navigate({ status: v }); }}
          options={statusOptions}
        />
      </div>

      {/* Exercises list */}
      {exercises.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-navy-400">
            {t('noData')}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-2">
            <div className="space-y-1">
              {exercises.map((ex) => {
                const exTr = ex.translations.find((t) => t.locale === locale)
                  ?? ex.translations.find((t) => t.locale === 'fr')
                  ?? ex.translations[0];
                const typeColor = TYPE_COLORS[ex.exercise_type] ?? 'bg-gray-100 text-gray-700';

                return (
                  <div
                    key={ex.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-cream-50 transition-colors"
                  >
                    <span className="flex items-center justify-center w-7 h-7 rounded bg-navy-100 text-xs font-bold text-navy-600 shrink-0 mt-0.5">
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
                        {ex.level && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-navy-50 text-navy-500 font-mono">
                            HSK {ex.level}
                          </span>
                        )}
                        {ex.difficulty && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold-100 text-gold-700">
                            {ex.difficulty}
                          </span>
                        )}
                        <span className="text-[10px] text-navy-300">
                          {ex.option_count} opt.
                        </span>
                      </div>
                      {exTr?.prompt && (
                        <p className="text-sm text-navy-700 mt-1 line-clamp-2">
                          {exTr.prompt}
                        </p>
                      )}
                      {ex.skill_tags && ex.skill_tags.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
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
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(p) => navigate({ page: String(p) })}
        />
      )}
    </div>
  );
}
