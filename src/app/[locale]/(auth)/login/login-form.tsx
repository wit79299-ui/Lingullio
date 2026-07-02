'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { signIn } from '@/lib/auth/actions';

export function LoginForm() {
  const t = useTranslations('auth');
  const te = useTranslations('errors');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn(email, password);

    if (result.error) {
      setError(t('invalidCredentials'));
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl text-center">{t('login')}</CardTitle>
        <CardDescription className="text-center">
          {t('loginSubtitle')}
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
          <Input
            label={t('password')}
            type="password"
            placeholder={t('passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && (
            <p className="text-sm text-error-500" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loading}
          >
            {loading ? t('loginButton') + '...' : t('loginButton')}
          </Button>
          <div className="flex flex-col items-center gap-3 pt-2">
            <Link
              href="/forgot-password"
              className="text-sm text-blue-500 hover:underline"
            >
              {t('forgotPassword')}
            </Link>
            <Link
              href="/activate"
              className="text-sm text-navy-500 hover:underline"
            >
              {t('activateTitle')}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
