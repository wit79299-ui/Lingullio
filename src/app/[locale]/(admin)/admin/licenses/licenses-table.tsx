'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, SearchBar, StatusFilter } from '@/components/ui/data-table';
import { useState, useMemo } from 'react';
import type { LicenseWithUser } from '@/lib/admin/queries';
import type { LicenseStatus } from '@/types/database';
import type { Column } from '@/components/ui/data-table';

function getLicenseStatusVariant(status: LicenseStatus) {
  const map: Record<LicenseStatus, 'new' | 'published' | 'draft' | 'archived' | 'error'> = {
    pending: 'new',
    active: 'published',
    expired: 'draft',
    revoked: 'error',
    refunded: 'archived',
  };
  return map[status] ?? 'draft';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '---';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

interface Props {
  licenses: LicenseWithUser[];
  locale: string;
}

export function LicensesTable({ licenses, locale }: Props) {
  const t = useTranslations('admin');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    let result = licenses;
    if (statusFilter) result = result.filter((l) => l.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((l) =>
        l.email.toLowerCase().includes(q) ||
        l.activation_code.toLowerCase().includes(q) ||
        (l.user?.display_name ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [licenses, search, statusFilter]);

  const columns: Column<LicenseWithUser>[] = [
    {
      key: 'activation_code',
      header: t('activationCode'),
      render: (item) => (
        <span className="font-mono text-sm font-medium text-navy-900">{item.activation_code}</span>
      ),
    },
    {
      key: 'email',
      header: t('email'),
      render: (item) => (
        <div>
          <p className="text-sm text-navy-700">{item.email}</p>
          {item.user?.display_name && (
            <p className="text-xs text-navy-400">{item.user.display_name}</p>
          )}
        </div>
      ),
    },
    {
      key: 'course',
      header: t('courseSlug'),
      className: 'hidden lg:table-cell',
      render: (item) => (
        <span className="text-sm text-navy-600">{item.course?.slug ?? '---'}</span>
      ),
    },
    {
      key: 'status',
      header: t('status'),
      className: 'w-24',
      render: (item) => (
        <Badge variant={getLicenseStatusVariant(item.status)}>
          {t(item.status)}
        </Badge>
      ),
    },
    {
      key: 'activated_at',
      header: t('activatedAt'),
      className: 'hidden lg:table-cell',
      render: (item) => (
        <span className="text-xs text-navy-400">{formatDate(item.activated_at)}</span>
      ),
    },
    {
      key: 'expires_at',
      header: t('expiresAt'),
      className: 'hidden lg:table-cell',
      render: (item) => (
        <span className="text-xs text-navy-400">{formatDate(item.expires_at)}</span>
      ),
    },
    {
      key: 'created_at',
      header: t('createdAt'),
      render: (item) => (
        <span className="text-xs text-navy-400">{formatDate(item.created_at)}</span>
      ),
    },
  ];

  const statusOptions = [
    { value: '', label: t('allStatuses') },
    { value: 'pending', label: t('pending') },
    { value: 'active', label: t('active') },
    { value: 'expired', label: t('expired') },
    { value: 'revoked', label: t('revoked') },
    { value: 'refunded', label: t('refunded') },
  ];

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
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

        <DataTable
          columns={columns}
          data={filtered}
          keyExtractor={(item) => item.id}
          emptyMessage={t('noData')}
        />
      </CardContent>
    </Card>
  );
}
