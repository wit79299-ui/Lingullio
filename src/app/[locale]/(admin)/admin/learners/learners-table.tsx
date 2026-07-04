'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, SearchBar, StatusFilter } from '@/components/ui/data-table';
import { useState, useMemo } from 'react';
import { Clock, Flame, Zap, Trophy, Calendar } from 'lucide-react';
import type { LearnerWithStats } from '@/lib/admin/queries';
import type { Column } from '@/components/ui/data-table';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '---';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}m` : `${h}h`;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '---';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `${days}j`;
  if (days < 30) return `${Math.floor(days / 7)}sem`;
  return `${Math.floor(days / 30)}mois`;
}

interface Props {
  users: LearnerWithStats[];
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

  const columns: Column<LearnerWithStats>[] = [
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
      className: 'w-20',
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
      className: 'hidden xl:table-cell',
      render: (item) => (
        <div className="space-y-1">
          {item.learner_profiles.length === 0 ? (
            <span className="text-xs text-navy-300">{t('noProfile')}</span>
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
      key: 'study_time',
      header: t('studyTime'),
      className: 'hidden lg:table-cell w-24',
      render: (item) => {
        const totalMinutes = item.learner_profiles.reduce((s, p) => s + (p.total_study_time_minutes ?? 0), 0);
        return (
          <div className="flex items-center gap-1 text-xs text-navy-600">
            <Clock className="h-3.5 w-3.5 text-navy-400" />
            <span className="font-medium">{formatDuration(totalMinutes)}</span>
          </div>
        );
      },
    },
    {
      key: 'streak',
      header: t('streak'),
      className: 'hidden lg:table-cell w-20',
      render: (item) => {
        const maxStreak = Math.max(0, ...item.learner_profiles.map((p) => p.streak_days ?? 0));
        const longest = Math.max(0, ...item.learner_profiles.map((p) => p.longest_streak ?? 0));
        return (
          <div className="flex items-center gap-1 text-xs">
            <Flame className={`h-3.5 w-3.5 ${maxStreak > 0 ? 'text-orange-500' : 'text-navy-300'}`} />
            <span className="font-medium text-navy-700">{maxStreak}</span>
            <span className="text-navy-300" title={t('longestStreak')}>/{longest}</span>
          </div>
        );
      },
    },
    {
      key: 'xp',
      header: t('xp'),
      className: 'hidden lg:table-cell w-20',
      render: (item) => {
        const totalXp = item.learner_profiles.reduce((s, p) => s + (p.total_xp ?? 0), 0);
        const maxLevel = Math.max(0, ...item.learner_profiles.map((p) => p.level ?? 0));
        return (
          <div className="text-xs">
            <div className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-yellow-500" />
              <span className="font-medium text-navy-700">{totalXp.toLocaleString()}</span>
            </div>
            {maxLevel > 0 && (
              <div className="flex items-center gap-1 mt-0.5">
                <Trophy className="h-3 w-3 text-navy-300" />
                <span className="text-navy-400">Lv.{maxLevel}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'last_activity',
      header: t('lastActivity'),
      className: 'hidden md:table-cell w-24',
      render: (item) => {
        const lastActs = item.learner_profiles
          .map((p) => p.last_activity_at)
          .filter(Boolean)
          .sort()
          .reverse();
        const latest = lastActs[0] ?? item.last_login_at;
        return (
          <div className="flex items-center gap-1 text-xs text-navy-400">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatRelativeTime(latest)}</span>
          </div>
        );
      },
    },
    {
      key: 'is_active',
      header: t('isActive'),
      className: 'w-12',
      render: (item) => (
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${item.is_active ? 'bg-green-500' : 'bg-navy-200'}`} />
      ),
    },
    {
      key: 'created_at',
      header: t('createdAt'),
      className: 'hidden lg:table-cell',
      render: (item) => (
        <span className="text-xs text-navy-400">{formatDate(item.created_at)}</span>
      ),
    },
  ];

  const roleOptions = [
    { value: '', label: 'Tous les rôles' },
    { value: 'learner', label: 'Apprenant' },
    { value: 'admin', label: 'Admin' },
    { value: 'editor', label: 'Éditeur' },
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
