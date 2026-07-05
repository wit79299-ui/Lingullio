import { setRequestLocale, getTranslations } from 'next-intl/server';
import { fetchLearnerCourses } from '@/lib/learner/queries';
import { getCefrLevel } from '@/lib/constants/exam-systems';
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
  Award,
  Target,
  ArrowRight,
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
  '7-9': { gradient: 'from-rose-50 via-purple-50 to-indigo-50', iconBg: 'bg-gradient-to-br from-rose-100 to-indigo-100 text-indigo-700', ring: 'ring-indigo-200' },
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

      {/* Placement Test CTA */}
      <Link href="/placement" className="block group">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-500 via-teal-600 to-emerald-600 p-6 sm:p-8 text-white shadow-lg shadow-teal-200/30 hover:shadow-xl hover:shadow-teal-200/40 transition-all duration-300">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative flex items-center gap-5">
            <div className="w-14 h-14 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
              <Target className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold mb-1">Discover your Chinese level</h2>
              <p className="text-sm text-white/80">
                Adaptive placement test · ~16 min · Free personalized plan
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-sm font-medium text-white/90 group-hover:text-white shrink-0">
              Take the test
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </Link>

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

                  {/* Title + CEFR */}
                  <h2 className="text-lg font-semibold text-navy-900 mb-1 group-hover:text-teal-600 transition-colors">
                    {course.title}
                  </h2>
                  {(() => {
                    const cefr = getCefrLevel(course.exam_type, level);
                    return cefr ? (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gold-100 text-gold-700 font-medium mb-2">
                        <Award className="h-2.5 w-2.5" />
                        CECRL {cefr}
                      </span>
                    ) : null;
                  })()}

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
          <p className="text-navy-400">No courses available at the moment.</p>
        </div>
      )}
    </div>
  );
}
