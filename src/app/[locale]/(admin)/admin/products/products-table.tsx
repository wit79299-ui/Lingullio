'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SearchBar, StatusFilter } from '@/components/ui/data-table';
import { useState, useMemo } from 'react';
import { ChevronRight, BookOpen, Users } from 'lucide-react';
import type { ProductWithTranslation } from '@/lib/admin/queries';
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
  translations: Array<{ locale: string; name: string; description: string | null; tagline: string | null }>,
  locale: string
): { name: string; description: string | null; tagline: string | null } {
  const match = translations.find((t) => t.locale === locale);
  if (match) return match;
  const fallback = translations.find((t) => t.locale === 'fr') ?? translations[0];
  return fallback ?? { name: '---', description: null, tagline: null };
}

const EXAM_TYPE_COLORS: Record<string, string> = {
  HSK: 'bg-red-600',
  TOPIK: 'bg-blue-600',
  TEF: 'bg-indigo-600',
  DELF: 'bg-violet-600',
  JLPT: 'bg-pink-600',
};

interface Props {
  products: ProductWithTranslation[];
  locale: string;
}

export function ProductsTable({ products, locale }: Props) {
  const t = useTranslations('admin');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    let result = products;
    if (statusFilter) {
      result = result.filter((p) => p.status === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => {
        const tr = getTranslation(p.translations, locale);
        return (
          p.code.toLowerCase().includes(q) ||
          tr.name.toLowerCase().includes(q) ||
          p.exam_type.toLowerCase().includes(q)
        );
      });
    }
    return result;
  }, [products, search, statusFilter, locale]);

  const statusOptions = [
    { value: '', label: t('allStatuses') },
    { value: 'published', label: t('published') },
    { value: 'draft', label: t('draft') },
    { value: 'archived', label: t('archived') },
  ];

  return (
    <div className="space-y-4">
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

      {filtered.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-navy-400">
          {t('noData')}
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((product) => {
            const tr = getTranslation(product.translations, locale);
            const bgColor = EXAM_TYPE_COLORS[product.exam_type] ?? 'bg-navy-800';
            return (
              <Link
                key={product.id}
                href={`/admin/products/${product.id}`}
              >
                <Card className="transition-all hover:shadow-md hover:border-teal-200 group">
                  <CardContent className="py-4 flex items-center gap-4">
                    {/* Exam type badge */}
                    <div className={`flex items-center justify-center w-14 h-14 rounded-xl ${bgColor} text-white font-bold text-xs shrink-0`}>
                      {product.exam_type}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-navy-900 truncate">
                          {tr.name}
                        </h3>
                        <Badge variant={getStatusVariant(product.status)}>
                          {t(product.status)}
                        </Badge>
                      </div>
                      {tr.tagline && (
                        <p className="text-xs text-navy-400 truncate max-w-lg">
                          {tr.tagline}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-navy-400">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3.5 w-3.5" />
                          {product.course_count} {t('courseCount').toLowerCase()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {product.total_learners} {t('totalLearners').toLowerCase()}
                        </span>
                        <span className="text-navy-300">
                          {t('productCode')}: <span className="font-mono">{product.code}</span>
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
