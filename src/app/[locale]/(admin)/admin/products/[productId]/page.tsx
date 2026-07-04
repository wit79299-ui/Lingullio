import { setRequestLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { fetchProductById, fetchCourses } from '@/lib/admin/queries';
import { ProductDetail } from './product-detail';

type Props = {
  params: Promise<{ locale: string; productId: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { locale, productId } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'admin' });

  let product: Awaited<ReturnType<typeof fetchProductById>> = null;
  let courses: Awaited<ReturnType<typeof fetchCourses>> = [];
  let fetchError = '';

  try {
    product = await fetchProductById(productId);
    if (!product) return notFound();
    courses = await fetchCourses(productId);
  } catch (err) {
    fetchError = String(err);
  }

  if (!product && !fetchError) return notFound();

  return (
    <div className="space-y-6">
      {fetchError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {fetchError}
        </div>
      ) : (
        <ProductDetail product={product!} courses={courses} locale={locale} />
      )}
    </div>
  );
}
