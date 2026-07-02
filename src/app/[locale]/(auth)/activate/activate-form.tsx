'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type Step = 'code' | 'password';

export function ActivateForm() {
  const t = useTranslations('auth');
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
    // TODO: Verify activation code via Supabase
    setTimeout(() => {
      setLoading(false);
      setStep('password');
    }, 1000);
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPwd) {
      setError(t('passwordMismatch'));
      return;
    }
    setLoading(true);
    // TODO: Set password via Supabase, activate license
    setTimeout(() => {
      setLoading(false);
    }, 1000);
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
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {t('setPasswordButton')}
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
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {t('activateButton')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
