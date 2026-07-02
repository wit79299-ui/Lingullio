import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function AuthLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream-25 px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img
            src="/logo-lingullio.png"
            alt="Lingullio"
            className="h-10 w-auto"
          />
        </div>
        {children}
      </div>
    </div>
  );
}
