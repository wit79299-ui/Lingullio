'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, SearchBar, StatusFilter } from '@/components/ui/data-table';
import { useState, useMemo } from 'react';
import type { User } from '@/types/database';
import type { Column } from '@/components/ui/data-table';

type UserWithProfiles = User & {
  learner_profiles: Array<{
    id: string;
    target_exam: string;
    target_level: string;
    preparation_status: string;
  }>;
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '---';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

interface Props {
  users: UserWithProfiles[];
  locale: string;
}

export function LearnersTable({ users, locale }: Props) {
  const t = useTranslations('admin');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const filtered = useMemo(() => {
    let result = users;
    if (roleFilter) result = result.filter((u) => u.role === roleFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((u) =>
        u.email.toLowerCase().includes(q) ||
        (u.display_name ?? '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [users, search, roleFilter]);

  const columns: Column<UserWithProfiles>[] = [
    {
      key: 'display_name',
      header: t('displayName'),
      render: (item) => (
        <div>
          <p className="font-medium text-navy-900">{item.display_name ?? '---'}</p>
          <p className="text-xs text-navy-400">{item.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: t('role'),
      className: 'w-24',
      render: (item) => {
        const variant = item.role === 'admin' ? 'error' : item.role === 'editor' ? 'new' : 'published';
        return (
          <Badge variant={variant}>
            {item.role}
          </Badge>
        );
      },
    },
    {
      key: 'profiles',
      header: t('profiles'),
      className: 'hidden lg:table-cell',
      render: (item) => (
        <div className="space-y-1">
          {item.learner_profiles.length === 0 ? (
            <span className="text-xs text-navy-300">---</span>
          ) : (
            item.learner_profiles.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="text-xs font-medium text-navy-700">{p.target_exam} {p.target_level}</span>
                <Badge variant={p.preparation_status === 'ready' ? 'mastered' : p.preparation_status === 'at_risk' ? 'error' : 'inProgress'}>
                  {p.preparation_status}
                </Badge>
              </div>
            ))
          )}
        </div>
      ),
    },
    {
      key: 'is_active',
      header: t('isActive'),
      className: 'w-16',
      render: (item) => (
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${item.is_active ? 'bg-green-500' : 'bg-navy-200'}`} />
      ),
    },
    {
      key: 'last_login_at',
      header: t('lastLogin'),
      className: 'hidden lg:table-cell',
      render: (item) => (
        <span className="text-xs text-navy-400">{formatDate(item.last_login_at)}</span>
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

  const roleOptions = [
    { value: '', label: 'Tous les roles' },
    { value: 'learner', label: 'Apprenant' },
    { value: 'admin', label: 'Admin' },
    { value: 'editor', label: 'Editeur' },
    { value: 'reviewer', label: 'Relecteur' },
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
            value={roleFilter}
            onChange={setRoleFilter}
            options={roleOptions}
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
