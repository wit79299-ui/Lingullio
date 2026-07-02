import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { fetchCourseBySlug } from '@/lib/learner/queries';
import { Link } from '@/i18n/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Languages,
  PenTool,
  Layers,
  ChevronRight,
  Clock,
  ArrowLeft,
  BookMarked,
  GraduationCap,
} from 'lucide-react';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function CourseDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'courses' });

  const course = await fetchCourseBySlug(slug, locale);
  if (!course) notFound();

  const level = slug.replace('hsk-', '');

  // Stats cards
  const stats = [
    { label: t('vocabularyTab'), value: course.vocabulary_count, icon: BookOpen, href: `/courses/${slug}/vocabulary`, color: 'bg-emerald-50 text-emerald-600' },
    { label: t('grammarTab'), value: course.grammar_count, icon: PenTool, href: null, color: 'bg-violet-50 text-violet-600' },
    { label: t('charactersTab'), value: course.character_count, icon: Languages, href: null, color: 'bg-sky-50 text-sky-600' },
    { label: t('modulesTab'), value: course.module_count, icon: Layers, href: null, color: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/courses"
        className="inline-flex items-center gap-2 text-sm text-navy-400 hover:text-navy-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('title')}
      </Link>

      {/* Course Header */}
      <header className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 text-teal-700 font-bold text-2xl shrink-0">
          {level}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-navy-900">{course.title}</h1>
          {course.description && (
            <p className="text-navy-400 mt-1">{course.description}</p>
          )}
          <div className="flex items-center gap-3 mt-3">
            <Badge variant={course.vocabulary_count > 0 ? 'published' : 'draft'}>
              {course.vocabulary_count > 0 ? t('available') : t('comingSoon')}
            </Badge>
            <span className="text-xs text-navy-400">HSK {level}</span>
          </div>
        </div>
      </header>

      {/* Content Stats Grid */}
      <section>
        <h2 className="text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-navy-400" />
          {t('contentStats')}
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const content = (
              <Card className={`transition-all duration-200 ${stat.href && stat.value > 0 ? 'hover:shadow-md cursor-pointer group' : ''}`}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${stat.color} shrink-0`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-2xl font-bold text-navy-900">{stat.value}</p>
                    <p className="text-xs text-navy-400">{stat.label}</p>
                  </div>
                  {stat.href && stat.value > 0 && (
                    <ChevronRight className="h-4 w-4 text-navy-300 group-hover:text-teal-500 group-hover:translate-x-1 transition-all shrink-0" />
                  )}
                </CardContent>
              </Card>
            );

            if (stat.href && stat.value > 0) {
              return (
                <Link key={stat.label} href={stat.href}>
                  {content}
                </Link>
              );
            }
            return <div key={stat.label}>{content}</div>;
          })}
        </div>
      </section>

      {/* Quick Access Buttons */}
      {course.vocabulary_count > 0 && (
        <section className="flex flex-wrap gap-3">
          <Button asChild variant="primary" size="lg">
            <Link href={`/courses/${slug}/vocabulary`}>
              <BookOpen className="h-4 w-4 mr-2" />
              {t('vocabularyTab')} ({course.vocabulary_count})
            </Link>
          </Button>
        </section>
      )}

      {/* Modules List */}
      {course.modules.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-navy-900 mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-navy-400" />
            {t('modulesTab')}
          </h2>
          <div className="space-y-3">
            {course.modules.map((mod) => (
              <Card key={mod.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-navy-50 text-navy-600 font-semibold text-sm shrink-0">
                    {mod.sort_order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-navy-900">{mod.title}</h3>
                    {mod.description && (
                      <p className="text-sm text-navy-400 line-clamp-1">{mod.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-navy-400 flex items-center gap-1">
                        <BookMarked className="h-3 w-3" />
                        {t('lessons', { count: mod.lesson_count })}
                      </span>
                      {mod.estimated_duration_minutes && (
                        <span className="text-xs text-navy-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {t('estimatedTime', { minutes: mod.estimated_duration_minutes })}
                        </span>
                      )}
                      <Badge
                        variant={mod.status === 'published' ? 'published' : 'draft'}
                        className="text-[10px]"
                      >
                        {mod.status === 'published' ? t('available') : t('comingSoon')}
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-navy-300 shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* No Modules state */}
      {course.modules.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <Layers className="h-10 w-10 text-navy-200 mx-auto mb-3" />
            <p className="text-navy-400">{t('noModules')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
