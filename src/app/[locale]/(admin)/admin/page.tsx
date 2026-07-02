import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, KeyRound, TrendingUp, AlertTriangle } from 'lucide-react';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminDashboardPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'admin' });

  const stats = [
    { key: 'activeLearners', value: '0', icon: Users, change: null },
    { key: 'activationRate', value: '0%', icon: KeyRound, change: null },
    { key: 'completionRate', value: '0%', icon: TrendingUp, change: null },
    { key: 'atRisk', value: '0', icon: AlertTriangle, change: null },
  ] as const;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy-900">
        {t('dashboard')}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.key}>
              <CardContent className="flex items-center gap-4 py-5">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-navy-50">
                  <Icon className="h-6 w-6 text-navy-700" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-navy-900">
                    {stat.value}
                  </p>
                  <p className="text-xs text-navy-400">
                    {t(stat.key)}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activite recente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-navy-400">
            Aucune activite pour le moment. Les donnees apparaitront ici lorsque les premiers apprenants seront actifs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
