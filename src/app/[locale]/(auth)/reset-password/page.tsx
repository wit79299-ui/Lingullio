import { setRequestLocale } from 'next-intl/server';
import { ResetPasswordForm } from './reset-password-form';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ResetPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ResetPasswordForm />;
}
