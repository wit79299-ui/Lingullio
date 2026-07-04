'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { ShoppingCart, Package, BookOpen, Check } from 'lucide-react';
import type { Column } from '@/components/ui/data-table';

interface SkuMapping {
  id: string;
  sku: string;
  course_id: string | null;
  product_id: string | null;
  grants_full_product: boolean;
  created_at: string;
  courses: { slug: string } | null;
  products: { code: string } | null;
}

interface Props {
  mappings: SkuMapping[];
  locale: string;
}

export function SkuMappingsTable({ mappings, locale }: Props) {
  const t = useTranslations('admin');

  const columns: Column<SkuMapping>[] = [
    {
      key: 'sku',
      header: t('sku'),
      render: (item) => (
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-navy-400" />
          <span className="font-mono font-medium text-navy-900">{item.sku}</span>
        </div>
      ),
    },
    {
      key: 'grants_full_product',
      header: t('type'),
      className: 'w-32',
      render: (item) => (
        <Badge variant={item.grants_full_product ? 'published' : 'new'}>
          {item.grants_full_product ? t('grantsFull') : t('grantsSingle')}
        </Badge>
      ),
    },
    {
      key: 'product',
      header: t('product'),
      className: 'hidden md:table-cell',
      render: (item) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-indigo-400" />
          <span className="text-sm text-navy-700">
            {item.products?.code ?? '---'}
          </span>
        </div>
      ),
    },
    {
      key: 'course',
      header: t('course'),
      className: 'hidden lg:table-cell',
      render: (item) => (
        <div className="flex items-center gap-2">
          {item.courses ? (
            <>
              <BookOpen className="h-4 w-4 text-teal-400" />
              <span className="text-sm text-navy-700">{item.courses.slug}</span>
            </>
          ) : (
            <span className="text-xs text-navy-300">---</span>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      header: t('createdAt'),
      className: 'hidden lg:table-cell w-28',
      render: (item) => (
        <span className="text-xs text-navy-400">
          {new Date(item.created_at).toLocaleDateString('fr-FR')}
        </span>
      ),
    },
  ];

  return (
    <Card>
      <CardContent className="py-4">
        {mappings.length === 0 ? (
          <div className="py-12 text-center text-sm text-navy-400">
            {t('noData')}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={mappings}
            keyExtractor={(item) => item.id}
            emptyMessage={t('noData')}
          />
        )}
      </CardContent>
    </Card>
  );
}
