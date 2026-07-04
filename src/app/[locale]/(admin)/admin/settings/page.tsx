import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Globe, ShoppingCart, Bell, Shield, Database } from 'lucide-react';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'admin' });

  const settingSections = [
    {
      icon: Globe,
      title: 'Langues et locales',
      description: 'Configurer les langues disponibles pour les apprenants et les contenus',
      status: 'Actif',
    },
    {
      icon: ShoppingCart,
      title: 'Intégration Shopify',
      description: 'Clé API, webhook URL, configuration du store Shopify',
      status: 'Configuré',
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: "Paramètres d'email et notifications pour admins et apprenants",
      status: 'À configurer',
    },
    {
      icon: Shield,
      title: 'Sécurité & accès',
      description: "Gestion des rôles, permissions et politique d'accès",
      status: 'Actif',
    },
    {
      icon: Database,
      title: 'Base de données',
      description: 'Informations Supabase, migrations, état des tables',
      status: 'Connecté',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy-900">{t('settings')}</h1>
        <p className="text-sm text-navy-400 mt-1">
          Configuration générale de la plateforme Lingullio
        </p>
      </div>

      <div className="grid gap-4">
        {settingSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="py-5 flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-navy-50 shrink-0">
                  <Icon className="h-6 w-6 text-navy-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-navy-900">{section.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      section.status === 'Actif' || section.status === 'Configuré' || section.status === 'Connecté'
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-gold-100 text-gold-700'
                    }`}>
                      {section.status}
                    </span>
                  </div>
                  <p className="text-sm text-navy-400 mt-0.5">{section.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Environment info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-5 w-5 text-navy-500" />
            Environnement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-navy-400">Plateforme</p>
              <p className="font-medium text-navy-900">Lingullio CMS</p>
            </div>
            <div>
              <p className="text-navy-400">Stack</p>
              <p className="font-medium text-navy-900">Next.js 15 + Supabase</p>
            </div>
            <div>
              <p className="text-navy-400">Mode</p>
              <p className="font-medium text-navy-900">DEMO</p>
            </div>
            <div>
              <p className="text-navy-400">Version</p>
              <p className="font-medium text-navy-900">2.0.0-beta</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
