'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
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
import { resetPassword } from '@/lib/auth/actions';

export function ResetPasswordForm() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPwd) {
      setError(t('passwordMismatch'));
      return;
    }

    if (password.length < 8) {
      setError(t('passwordRequirements'));
      return;
    }

    setLoading(true);

    const code = searchParams.get('code');
    const result = await resetPassword(password, code);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-teal-100 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-teal-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-sm text-navy-700 mb-4">{t('resetSuccess')}</p>
          <Link href="/login">
            <Button variant="primary" size="sm">
              {t('loginButton')}
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
          {t('resetTitle')}
        </CardTitle>
        <CardDescription className="text-center">
          {t('resetSubtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('newPassword')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
          />
          <Input
            label={t('confirmPassword')}
            type="password"
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            required
            autoComplete="new-password"
          />
          <p className="text-xs text-navy-400">{t('passwordRequirements')}</p>
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
            {loading ? t('resetButton') + '...' : t('resetButton')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
