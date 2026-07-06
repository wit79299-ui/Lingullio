'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Eye, EyeOff } from 'lucide-react';
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
  const [showPassword, setShowPassword] = useState(false);

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

    // Use hard redirect to avoid client-side hydration issues
    // between (auth) and (learner) layout groups
    window.location.href = '/dashboard';
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
          <div className="relative">
            <Input
              label={t('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] text-navy-400 hover:text-navy-600 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
            </button>
          </div>
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
