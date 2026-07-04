'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ChevronRight, BookOpen, Layers, KeyRound } from 'lucide-react';
import type { ProductWithTranslation, CourseWithTranslation } from '@/lib/admin/queries';
import type { ContentStatus } from '@/types/database';

function getStatusVariant(status: ContentStatus) {
  const map: Record<ContentStatus, 'published' | 'draft' | 'archived' | 'new'> = {
    published: 'published',
    draft: 'draft',
    validated: 'new',
    archived: 'archived',
  };
  return map[status] ?? 'draft';
}

function getProductTranslation(
  translations: Array<{ locale: string; name: string; description: string | null; tagline: string | null }>,
  locale: string
) {
  return translations.find((t) => t.locale === locale)
    ?? translations.find((t) => t.locale === 'fr')
    ?? translations[0]
    ?? { name: '---', description: null, tagline: null };
}

function getCourseTranslation(
  translations: Array<{ locale: string; title: string; description: string | null }>,
  locale: string
) {
  return translations.find((t) => t.locale === locale)
    ?? translations.find((t) => t.locale === 'fr')
    ?? translations[0]
    ?? { title: '---', description: null };
}

interface Props {
  product: ProductWithTranslation;
  courses: CourseWithTranslation[];
  locale: string;
}

export function ProductDetail({ product, courses, locale }: Props) {
  const t = useTranslations('admin');
  const tr = getProductTranslation(product.translations, locale);

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1 text-sm text-navy-400 hover:text-navy-600 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('products')}
        </Link>

        <div className="flex items-start gap-4">
          <div className={`flex items-center justify-center w-16 h-16 rounded-xl ${
            product.exam_type === 'HSK' ? 'bg-red-600' : 'bg-navy-800'
          } text-white font-bold text-lg shrink-0`}>
            {product.exam_type}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-navy-900">{tr.name}</h1>
              <Badge variant={getStatusVariant(product.status)}>
                {t(product.status)}
              </Badge>
            </div>
            {tr.tagline && (
              <p className="text-sm text-navy-400 mt-1">{tr.tagline}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-navy-400">
              <span>{t('productCode')}: <span className="font-mono font-medium">{product.code}</span></span>
              <span>{t('targetLanguage')}: <span className="font-medium">{product.target_language}</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Description card */}
      {tr.description && (
        <Card>
          <CardHeader>
            <CardTitle>{t('description')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-navy-600">{tr.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Courses / Levels */}
      <div>
        <h2 className="text-lg font-semibold text-navy-800 mb-4">
          {t('courses')} ({courses.length})
        </h2>

        {courses.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-navy-400">
              {t('noData')}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {courses.map((course) => {
              const ctr = getCourseTranslation(course.translations, locale);
              return (
                <Link
                  key={course.id}
                  href={`/admin/content/courses/${course.id}`}
                >
                  <Card className="transition-all hover:shadow-md hover:border-teal-200 group">
                    <CardContent className="py-4 flex items-center gap-4">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-navy-800 text-white font-bold text-sm shrink-0">
                        {course.slug.replace('hsk-', 'HSK ')}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-navy-900 truncate">
                            {ctr.title}
                          </h3>
                          <Badge variant={getStatusVariant(course.status)}>
                            {t(course.status)}
                          </Badge>
                        </div>
                        {ctr.description && (
                          <p className="text-xs text-navy-400 truncate max-w-lg">
                            {ctr.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-navy-400">
                          <span className="flex items-center gap-1">
                            <Layers className="h-3.5 w-3.5" />
                            {course.module_count} {t('modules').toLowerCase()}
                          </span>
                          <span className="flex items-center gap-1">
                            <KeyRound className="h-3.5 w-3.5" />
                            {course.license_count} {t('licenses').toLowerCase()}
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5" />
                            v{course.version}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="h-5 w-5 text-navy-300 group-hover:text-teal-500 transition-colors shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
