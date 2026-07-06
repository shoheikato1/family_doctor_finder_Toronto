import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Input } from '../components/design-system/Input';
import { Button } from '../components/design-system/Button';
import { Card } from '../components/design-system/Card';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../components/design-system/Toast';
import { isRealMode } from '../lib/backendMode';
import { getSupabase } from '../lib/supabaseClient';
import { mapSupabaseUser } from '../lib/realBackend';

type Mode = 'login' | 'signup';

type FormErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

function validateEmail(email: string): string | undefined {
  if (!email) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
}

function validatePassword(password: string): string | undefined {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
}

export function LoginPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const signUp = useAppStore((s) => s.signUp);
  const signIn = useAppStore((s) => s.signIn);

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function clearAuthError() {
    if (authError) setAuthError(null);
  }

  function handleEmailBlur() {
    const err = validateEmail(email);
    setErrors((e) => ({ ...e, email: err }));
  }

  function handlePasswordBlur() {
    const err = validatePassword(password);
    setErrors((e) => ({ ...e, password: err }));
  }

  function handleConfirmBlur() {
    if (mode !== 'signup') return;
    const err =
      !confirmPassword
        ? 'Please confirm your password.'
        : confirmPassword !== password
        ? 'Passwords do not match.'
        : undefined;
    setErrors((e) => ({ ...e, confirmPassword: err }));
  }

  function validateAll(): boolean {
    const next: FormErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    if (mode === 'signup') {
      next.confirmPassword =
        !confirmPassword
          ? 'Please confirm your password.'
          : confirmPassword !== password
          ? 'Passwords do not match.'
          : undefined;
    }
    setErrors(next);
    return !Object.values(next).some(Boolean);
  }

  async function handleSubmit() {
    setAuthError(null);
    if (!validateAll()) return;

    setLoading(true);

    // Real mode (move P4): supabase-js email+password. Same UI, new handlers.
    if (isRealMode) {
      const supabase = getSupabase();
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setAuthError(error.message);
        } else if (data.session && data.user) {
          useAppStore.getState().setUser(mapSupabaseUser(data.user));
          navigate('/onboarding');
        } else {
          // Email confirmation is on for this Supabase project.
          addToast('Check your inbox to confirm your email, then sign in.', 'info');
          switchMode('login');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setAuthError(error.message);
        } else {
          if (data.user) useAppStore.getState().setUser(mapSupabaseUser(data.user));
          navigate('/dashboard');
        }
      }
      setLoading(false);
      return;
    }

    // Demo mode: the original auth theatre, unchanged.
    // Simulate a brief async delay for realism
    await new Promise((r) => setTimeout(r, 400));

    if (mode === 'signup') {
      signUp(email);
      navigate('/onboarding');
    } else {
      const found = signIn(email);
      if (found) {
        navigate('/dashboard');
      } else {
        setAuthError('No account found with that email. Try signing up.');
      }
    }

    setLoading(false);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setErrors({});
    setAuthError(null);
    setPassword('');
    setConfirmPassword('');
  }

  return (
    <div className="min-h-screen bg-background-base flex flex-col items-center justify-center px-6">
      {/* Wordmark */}
      <div className="mb-8 text-center">
        <p className="font-sans text-lg font-semibold text-text-primary leading-snug">
          Let's Find
        </p>
        <p className="font-sans text-lg font-semibold text-primary leading-snug">
          Family Doctor
        </p>
        <div className="flex items-center justify-center gap-1 mt-1">
          <Heart size={12} strokeWidth={1.5} fill="currentColor" className="text-brand-accent shrink-0" />
          <span className="font-sans text-xs text-text-tertiary">Toronto, Ontario</span>
        </div>
      </div>

      <Card className="w-full max-w-sm">
        <h2 className="font-sans text-xl font-semibold text-text-primary mb-1">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="font-sans text-sm text-text-secondary mb-6">
          {mode === 'login'
            ? 'Sign in to continue finding your family doctor.'
            : 'Let\'s get started. Takes about 5 minutes.'}
        </p>

        <div className="flex flex-col gap-4">
          <Input
            type="email"
            label="Email"
            value={email}
            onChange={(v) => { setEmail(v); clearAuthError(); }}
            onBlur={handleEmailBlur}
            error={errors.email}
            placeholder="you@example.com"
            required
          />

          <Input
            type="password"
            label="Password"
            value={password}
            onChange={(v) => { setPassword(v); clearAuthError(); }}
            onBlur={handlePasswordBlur}
            error={errors.password}
            placeholder={mode === 'signup' ? 'At least 8 characters' : ''}
            required
          />

          {mode === 'signup' && (
            <Input
              type="password"
              label="Confirm password"
              value={confirmPassword}
              onChange={(v) => { setConfirmPassword(v); clearAuthError(); }}
              onBlur={handleConfirmBlur}
              error={errors.confirmPassword}
              required
            />
          )}

          {authError && (
            <p className="font-sans text-sm text-status-rejected">{authError}</p>
          )}

          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={loading}
          >
            {mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>

          {mode === 'login' && (
            <button
              type="button"
              onClick={() => addToast('Coming soon.', 'info')}
              className="font-sans text-sm text-text-secondary hover:text-text-primary transition-colors duration-120 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
            >
              Forgot password?
            </button>
          )}
        </div>

        <div className="mt-6 pt-5 border-t border-border-soft">
          {mode === 'login' ? (
            <p className="font-sans text-sm text-text-secondary">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="text-text-primary font-medium hover:text-primary transition-colors duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
              >
                Create account
              </button>
            </p>
          ) : (
            <p className="font-sans text-sm text-text-secondary">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-text-primary font-medium hover:text-primary transition-colors duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
              >
                Back to sign in
              </button>
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
