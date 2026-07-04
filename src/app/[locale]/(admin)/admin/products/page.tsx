import { setRequestLocale, getTranslations } from 'next-intl/server';
import { fetchProducts } from '@/lib/admin/queries';
import { ProductsTable } from './products-table';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ProductsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'admin' });

  let products: Awaited<ReturnType<typeof fetchProducts>> = [];
  let fetchError = '';

  try {
    products = await fetchProducts();
  } catch (err) {
    fetchError = String(err);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">{t('products')}</h1>
          <p className="text-sm text-navy-400 mt-1">
            {products.length} {t('products').toLowerCase()}
          </p>
        </div>
      </div>

      {fetchError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {fetchError}
        </div>
      ) : (
        <ProductsTable products={products} locale={locale} />
      )}
    </div>
  );
}
