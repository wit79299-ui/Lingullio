import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, Clock, TrendingUp, Target, Zap } from 'lucide-react';
import { fetchAdminStats } from '@/lib/admin/queries';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AnalyticsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'admin' });

  let stats = {
    totalLearners: 0,
    activeLicenses: 0,
    totalProducts: 0,
    totalCourses: 0,
    publishedCourses: 0,
    totalVocabulary: 0,
    totalExercises: 0,
    totalMockExams: 0,
  };

  try {
    stats = await fetchAdminStats();
  } catch {
    // Fallback
  }

  const metrics = [
    { label: t('activeLearners'), value: stats.totalLearners, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: t('activationRate'), value: stats.activeLicenses, icon: Target, color: 'text-teal-600 bg-teal-50' },
    { label: t('totalProducts'), value: stats.totalProducts, icon: TrendingUp, color: 'text-indigo-600 bg-indigo-50' },
    { label: t('publishedCourses'), value: `${stats.publishedCourses}/${stats.totalCourses}`, icon: BarChart3, color: 'text-gold-600 bg-gold-50' },
    { label: t('totalExercises'), value: stats.totalExercises, icon: Zap, color: 'text-green-600 bg-green-50' },
    { label: t('totalMockExams'), value: stats.totalMockExams, icon: Clock, color: 'text-orange-600 bg-orange-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">{t('analytics')}</h1>
        <p className="text-sm text-navy-400 mt-1">
          Vue d&apos;ensemble des performances de la plateforme
        </p>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.label}>
              <CardContent className="py-5">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${m.color} mb-3`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold text-navy-900">{m.value}</p>
                <p className="text-xs text-navy-400 mt-1">{m.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Placeholder for charts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-navy-500" />
            Registration trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 border-2 border-dashed border-navy-100 rounded-lg text-sm text-navy-400">
            Graphiques à venir — les données s&apos;accumulent
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Completion rate by level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-40 border-2 border-dashed border-navy-100 rounded-lg text-sm text-navy-400">
              Bientôt disponible
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average study time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-40 border-2 border-dashed border-navy-100 rounded-lg text-sm text-navy-400">
              Bientôt disponible
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
