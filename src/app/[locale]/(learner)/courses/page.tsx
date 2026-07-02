import { setRequestLocale, getTranslations } from 'next-intl/server';
import { fetchLearnerCourses } from '@/lib/learner/queries';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  GraduationCap,
  Languages,
  PenTool,
  ChevronRight,
  Layers,
} from 'lucide-react';

type Props = { params: Promise<{ locale: string }> };

// HSK level colors and icons
const levelConfig: Record<string, { gradient: string; iconBg: string; ring: string }> = {
  '1': { gradient: 'from-emerald-50 to-teal-50', iconBg: 'bg-emerald-100 text-emerald-600', ring: 'ring-emerald-200' },
  '2': { gradient: 'from-sky-50 to-blue-50', iconBg: 'bg-sky-100 text-sky-600', ring: 'ring-sky-200' },
  '3': { gradient: 'from-violet-50 to-purple-50', iconBg: 'bg-violet-100 text-violet-600', ring: 'ring-violet-200' },
  '4': { gradient: 'from-amber-50 to-orange-50', iconBg: 'bg-amber-100 text-amber-600', ring: 'ring-amber-200' },
  '5': { gradient: 'from-rose-50 to-pink-50', iconBg: 'bg-rose-100 text-rose-600', ring: 'ring-rose-200' },
  '6': { gradient: 'from-indigo-50 to-blue-50', iconBg: 'bg-indigo-100 text-indigo-600', ring: 'ring-indigo-200' },
  '7': { gradient: 'from-teal-50 to-cyan-50', iconBg: 'bg-teal-100 text-teal-600', ring: 'ring-teal-200' },
  '8': { gradient: 'from-fuchsia-50 to-purple-50', iconBg: 'bg-fuchsia-100 text-fuchsia-600', ring: 'ring-fuchsia-200' },
  '9': { gradient: 'from-red-50 to-orange-50', iconBg: 'bg-red-100 text-red-600', ring: 'ring-red-200' },
};

function getLevel(slug: string): string {
  return slug.replace('hsk-', '');
}

export default async function CoursesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'courses' });

  let courses: Awaited<ReturnType<typeof fetchLearnerCourses>> = [];
  try {
    courses = await fetchLearnerCourses(locale);
  } catch (err) {
    console.error('Failed to fetch courses:', err);
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <header>
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-navy-50">
            <GraduationCap className="h-5 w-5 text-navy-700" />
          </div>
          {t('title')}
        </h1>
        <p className="text-navy-400 mt-2 ml-[52px]">{t('subtitle')}</p>
      </header>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.map((course) => {
          const level = getLevel(course.slug);
          const config = levelConfig[level] ?? levelConfig['1'];
          const hasContent = course.vocabulary_count > 0 || course.module_count > 0;

          return (
            <Link
              key={course.id}
              href={`/courses/${course.slug}`}
              className="block group"
            >
              <Card className={`h-full transition-all duration-200 hover:shadow-md hover:ring-2 ${config.ring} overflow-hidden`}>
                {/* Top gradient bar */}
                <div className={`h-2 bg-gradient-to-r ${config.gradient}`} />

                <CardContent className="pt-5">
                  {/* Level badge + status */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${config.iconBg} font-bold text-lg`}>
                      {level}
                    </div>
                    {hasContent ? (
                      <Badge variant="published">{t('available')}</Badge>
                    ) : (
                      <Badge variant="draft">{t('comingSoon')}</Badge>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="text-lg font-semibold text-navy-900 mb-1 group-hover:text-teal-600 transition-colors">
                    {course.title}
                  </h2>

                  {/* Description */}
                  {course.description && (
                    <p className="text-sm text-navy-400 line-clamp-2 mb-4">
                      {course.description}
                    </p>
                  )}

                  {/* Content stats */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="flex items-center gap-2 text-xs text-navy-500">
                      <Layers className="h-3.5 w-3.5 text-navy-300" />
                      <span>{t('modules', { count: course.module_count })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-navy-500">
                      <BookOpen className="h-3.5 w-3.5 text-navy-300" />
                      <span>{t('vocabulary', { count: course.vocabulary_count })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-navy-500">
                      <PenTool className="h-3.5 w-3.5 text-navy-300" />
                      <span>{t('grammar', { count: course.grammar_count })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-navy-500">
                      <Languages className="h-3.5 w-3.5 text-navy-300" />
                      <span>{t('characters', { count: course.character_count })}</span>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center justify-between pt-3 border-t border-cream-100">
                    <span className="text-sm font-medium text-teal-600 group-hover:text-teal-700 transition-colors">
                      {hasContent ? t('viewCourse') : t('comingSoon')}
                    </span>
                    <ChevronRight className="h-4 w-4 text-teal-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Empty state */}
      {courses.length === 0 && (
        <div className="text-center py-16">
          <GraduationCap className="h-12 w-12 text-navy-200 mx-auto mb-4" />
          <p className="text-navy-400">Aucun parcours disponible pour le moment.</p>
        </div>
      )}
    </div>
  );
}
