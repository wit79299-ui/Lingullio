import { setRequestLocale } from 'next-intl/server';
import { fetchMockExamDetail } from '@/lib/learner/queries';
import { notFound } from 'next/navigation';
import { MockExamRunner } from '@/components/mock-exam/mock-exam-runner';

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function MockExamPage({ params }: Props) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const exam = await fetchMockExamDetail(id, locale);
  if (!exam) {
    notFound();
  }

  return <MockExamRunner exam={exam} locale={locale} />;
}
