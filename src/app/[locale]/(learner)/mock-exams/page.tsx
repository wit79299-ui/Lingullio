import { setRequestLocale, getTranslations } from 'next-intl/server';
import { fetchMockExams } from '@/lib/learner/queries';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Clock,
  Target,
  ChevronRight,
  Headphones,
  BookOpen,
  Award,
  Zap,
} from 'lucide-react';
import { MockExamHistory } from '@/components/mock-exam/mock-exam-history';

type Props = { params: Promise<{ locale: string }> };

const levelGradients: Record<string, string> = {
  'hsk-1': 'from-emerald-500 to-teal-500',
  'hsk-2': 'from-sky-500 to-blue-500',
  'hsk-3': 'from-violet-500 to-purple-500',
  'hsk-4': 'from-amber-500 to-orange-500',
  'hsk-5': 'from-rose-500 to-pink-500',
  'hsk-6': 'from-indigo-500 to-blue-500',
  'hsk-7-9': 'from-rose-500 to-indigo-500',
};

export default async function MockExamsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  let exams: Awaited<ReturnType<typeof fetchMockExams>> = [];
  try {
    exams = await fetchMockExams(locale);
  } catch (err) {
    console.error('Failed to fetch mock exams:', err);
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <header>
        <h1 className="text-2xl font-bold text-navy-900 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-navy-50">
            <FileText className="h-5 w-5 text-navy-700" />
          </div>
          Mock Exams
        </h1>
        <p className="text-navy-400 mt-2 ml-[52px]">
          Practice under real HSK exam conditions
        </p>
      </header>

      {/* Info Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-navy-50 via-cream-50 to-gold-50 p-5 sm:p-6 border border-cream-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gold-100 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6 text-gold-600" />
          </div>
          <div>
            <h2 className="font-semibold text-navy-900 mb-1">Official HSK 2026 Format</h2>
            <p className="text-sm text-navy-500">
              Each mock exam faithfully reproduces the format, duration and scoring
              of the official exam. Timer, listening + reading sections, and detailed
              analysis of your results.
            </p>
          </div>
        </div>
      </div>

      {/* Exam History */}
      <MockExamHistory />

      {/* Exam Cards */}
      {exams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {exams.map((exam) => {
            const gradient = levelGradients[exam.course_slug] ?? 'from-gray-500 to-gray-600';
            const level = exam.course_slug.replace('hsk-', '').toUpperCase();

            return (
              <Link
                key={exam.id}
                href={`/mock-exams/${exam.id}`}
                className="block group"
              >
                <Card className="h-full transition-all duration-200 hover:shadow-lg hover:ring-2 hover:ring-teal-200 overflow-hidden">
                  {/* Top gradient bar */}
                  <div className={`h-2 bg-gradient-to-r ${gradient}`} />

                  <CardContent className="pt-5">
                    {/* Level badge + status */}
                    <div className="flex items-center justify-between mb-4">
                      <div className={`flex items-center gap-2`}>
                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} text-white font-bold text-sm`}>
                          {level}
                        </span>
                        <Badge variant="published">Available</Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-navy-400">
                        <Zap className="h-3.5 w-3.5" />
                        {exam.total_points} pts
                      </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-lg font-semibold text-navy-900 mb-2 group-hover:text-teal-600 transition-colors">
                      {exam.title}
                    </h2>

                    {/* Description */}
                    {exam.description && (
                      <p className="text-sm text-navy-400 line-clamp-2 mb-4">
                        {exam.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="flex items-center gap-2 text-xs text-navy-500">
                        <Clock className="h-3.5 w-3.5 text-navy-300" />
                        <span>{exam.total_duration_minutes} min</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-navy-500">
                        <Target className="h-3.5 w-3.5 text-navy-300" />
                        <span>{exam.question_count} questions</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-navy-500">
                        <Headphones className="h-3.5 w-3.5 text-navy-300" />
                        <span>{exam.section_count} sections</span>
                      </div>
                    </div>

                    {/* Sections preview */}
                    <div className="flex gap-2 mb-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium">
                        <Headphones className="h-3 w-3" />
                        Listening
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-medium">
                        <BookOpen className="h-3 w-3" />
                        Reading
                      </span>
                    </div>

                    {/* CTA */}
                    <div className="flex items-center justify-between pt-3 border-t border-cream-100">
                      <span className="text-sm font-medium text-teal-600 group-hover:text-teal-700 transition-colors">
                        Start the exam
                      </span>
                      <ChevronRight className="h-4 w-4 text-teal-500 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <FileText className="h-12 w-12 text-navy-200 mx-auto mb-4" />
          <p className="text-navy-400">No mock exams available at the moment.</p>
          <p className="text-sm text-navy-300 mt-2">Mock exams will be available soon.</p>
        </div>
      )}
    </div>
  );
}
