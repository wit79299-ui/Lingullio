'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, Pagination, SearchBar, StatusFilter } from '@/components/ui/data-table';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { VocabularyWithTranslation } from '@/lib/admin/queries';
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

function getMeaning(
  translations: Array<{ locale: string; meaning: string }>,
  locale: string
): string {
  const match = translations.find((t) => t.locale === locale);
  if (match) return match.meaning;
  const fallback = translations.find((t) => t.locale === 'fr') ?? translations[0];
  return fallback?.meaning ?? '---';
}

interface Props {
  items: VocabularyWithTranslation[];
  total: number;
  page: number;
  pageSize: number;
  locale: string;
}

export function VocabularyTable({ items, total, page, pageSize, locale }: Props) {
  const t = useTranslations('admin');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [levelFilter, setLevelFilter] = useState(searchParams.get('level') || '');

  const totalPages = Math.ceil(total / pageSize);

  function updateUrl(params: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => {
      if (v) sp.set(k, v); else sp.delete(k);
    });
    sp.delete('page'); // Reset page on filter change
    router.push(`?${sp.toString()}`);
  }

  function handleSearch(val: string) {
    setSearch(val);
    // Debounced search
    clearTimeout((window as unknown as Record<string, ReturnType<typeof setTimeout>>).__vocabSearchTimer);
    (window as unknown as Record<string, ReturnType<typeof setTimeout>>).__vocabSearchTimer = setTimeout(() => {
      updateUrl({ q: val });
    }, 400);
  }

  const columns: Column<VocabularyWithTranslation>[] = [
    {
      key: 'simplified',
      header: t('simplified'),
      className: 'w-20',
      render: (item) => (
        <span className="text-xl font-medium text-navy-900">{item.simplified}</span>
      ),
    },
    {
      key: 'pinyin',
      header: t('pinyin'),
      render: (item) => (
        <span className="text-sm text-blue-600 font-mono">{item.pinyin}</span>
      ),
    },
    {
      key: 'meaning',
      header: t('meaning'),
      render: (item) => (
        <span className="text-sm text-navy-700">{getMeaning(item.translations, locale)}</span>
      ),
    },
    {
      key: 'level',
      header: t('level'),
      className: 'w-20',
      render: (item) => (
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-navy-100 text-xs font-bold text-navy-700">
          {item.level}
        </span>
      ),
    },
    {
      key: 'word_type',
      header: t('wordType'),
      className: 'hidden lg:table-cell',
      render: (item) => (
        <span className="text-xs text-navy-400">{item.word_type ?? '---'}</span>
      ),
    },
    {
      key: 'status',
      header: t('status'),
      className: 'w-24',
      render: (item) => (
        <Badge variant={getStatusVariant(item.status)}>
          {t(item.status)}
        </Badge>
      ),
    },
  ];

  const statusOptions = [
    { value: '', label: t('allStatuses') },
    { value: 'published', label: t('published') },
    { value: 'draft', label: t('draft') },
    { value: 'validated', label: t('validated') },
    { value: 'archived', label: t('archived') },
  ];

  const levelOptions = [
    { value: '', label: t('allLevels') },
    ...Array.from({ length: 9 }, (_, i) => ({
      value: String(i + 1),
      label: `HSK ${i + 1}`,
    })),
  ];

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <SearchBar
            value={search}
            onChange={handleSearch}
            placeholder={t('search')}
            className="sm:max-w-xs"
          />
          <StatusFilter
            value={levelFilter}
            onChange={(v) => { setLevelFilter(v); updateUrl({ level: v }); }}
            options={levelOptions}
          />
          <StatusFilter
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); updateUrl({ status: v }); }}
            options={statusOptions}
          />
        </div>

        <DataTable
          columns={columns}
          data={items}
          keyExtractor={(item) => item.id}
          emptyMessage={t('noData')}
        />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={(p) => {
            const sp = new URLSearchParams(searchParams.toString());
            sp.set('page', String(p));
            router.push(`?${sp.toString()}`);
          }}
        />
      </CardContent>
    </Card>
  );
}
