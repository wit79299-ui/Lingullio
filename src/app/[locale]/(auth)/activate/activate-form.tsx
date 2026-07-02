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
import { verifyActivationCode, activateAccount } from '@/lib/auth/actions';

type Step = 'code' | 'password';

export function ActivateForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [step, setStep] = useState<Step>('code');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await verifyActivationCode(email, code);

    setLoading(false);

    if (result.error) {
      setError(t('invalidCode'));
      return;
    }

    setStep('password');
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
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

    const result = await activateAccount(email, password, code);

    setLoading(false);

    if (result.error) {
      if (result.error === 'invalidCode') {
        setError(t('invalidCode'));
      } else if (result.error === 'emailAlreadyExists') {
        setError(t('invalidCredentials'));
      } else {
        setError(result.error);
      }
      return;
    }

    // Account created and license activated, redirect to login
    router.push('/login');
  }

  if (step === 'password') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-center">
            {t('setPasswordTitle')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('setPasswordSubtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
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
            <p className="text-xs text-navy-400">
              {t('passwordRequirements')}
            </p>
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
              {loading
                ? t('setPasswordButton') + '...'
                : t('setPasswordButton')}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl text-center">
          {t('activateTitle')}
        </CardTitle>
        <CardDescription className="text-center">
          {t('activateSubtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCodeSubmit} className="space-y-4">
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
            label={t('activationCode')}
            type="text"
            placeholder={t('codePlaceholder')}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
            maxLength={8}
            autoComplete="off"
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
            {loading ? t('activateButton') + '...' : t('activateButton')}
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
