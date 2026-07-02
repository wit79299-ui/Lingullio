'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // TODO: Send reset email via Supabase
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1000);
  }

  if (sent) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-teal-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-navy-700 mb-4">{t('emailSent')}</p>
          <Link href="/login">
            <Button variant="secondary" size="sm">
              {t('login')}
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl text-center">
          {t('forgotTitle')}
        </CardTitle>
        <CardDescription className="text-center">
          {t('forgotSubtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('email')}
            type="email"
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {t('sendResetLink')}
          </Button>
          <div className="text-center pt-2">
            <Link
              href="/login"
              className="text-sm text-blue-500 hover:underline"
            >
              {t('login')}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
