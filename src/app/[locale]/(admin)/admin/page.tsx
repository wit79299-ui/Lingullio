import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { Users, KeyRound, BookOpen, BarChart3, BookOpenText, PenTool, Languages } from 'lucide-react';
import { fetchAdminStats } from '@/lib/admin/queries';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'admin' });

  let stats = {
    totalLearners: 0,
    activeLicenses: 0,
    totalCourses: 0,
    publishedCourses: 0,
    totalVocabulary: 0,
    totalExercises: 0,
  };

  try {
    stats = await fetchAdminStats();
  } catch {
    // Supabase not configured or error - use defaults
  }

  const kpiCards = [
    { label: t('activeLearners'), value: String(stats.totalLearners), icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: t('activationRate'), value: String(stats.activeLicenses), icon: KeyRound, color: 'bg-teal-50 text-teal-600' },
    { label: t('publishedCourses'), value: `${stats.publishedCourses} / ${stats.totalCourses}`, icon: BookOpen, color: 'bg-gold-50 text-gold-600' },
    { label: t('totalVocabulary'), value: String(stats.totalVocabulary), icon: Languages, color: 'bg-purple-50 text-purple-600' },
    { label: t('totalExercises'), value: String(stats.totalExercises), icon: PenTool, color: 'bg-green-50 text-green-600' },
  ];

  const quickLinks = [
    { label: t('courses'), href: '/admin/content/courses', icon: BookOpen, desc: t('manageContent') },
    { label: t('vocabulary'), href: '/admin/content/vocabulary', icon: BookOpenText, desc: `${stats.totalVocabulary} ${t('vocabulary').toLowerCase()}` },
    { label: t('grammar'), href: '/admin/content/grammar', icon: Languages, desc: t('grammar') },
    { label: t('characters'), href: '/admin/content/characters', icon: PenTool, desc: t('characters') },
    { label: t('learners'), href: '/admin/learners', icon: Users, desc: t('manageLearners') },
    { label: t('licenses'), href: '/admin/licenses', icon: KeyRound, desc: t('manageLicenses') },
    { label: t('analytics'), href: '/admin/analytics', icon: BarChart3, desc: t('analytics') },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-navy-900">
        {t('dashboard')}
      </h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="py-5">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${kpi.color} mb-3`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold text-navy-900">{kpi.value}</p>
                <p className="text-xs text-navy-400 mt-1">{kpi.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick links grid */}
      <div>
        <h2 className="text-lg font-semibold text-navy-800 mb-4">{t('content')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <Card className="h-full transition-shadow hover:shadow-md hover:border-teal-200">
                  <CardContent className="py-5 flex items-start gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-navy-50 shrink-0">
                      <Icon className="h-5 w-5 text-navy-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-navy-800">{link.label}</p>
                      <p className="text-xs text-navy-400 mt-0.5">{link.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
