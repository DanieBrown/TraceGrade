import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, isAuthenticated } from '../features/auth/authApi';
import AuthLayout, { AuthField } from '../components/layout/AuthLayout';

// ── LoginPage ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail]       = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading]   = useState<boolean>(false);
  const [error, setError]       = useState<string>('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError('');

    // Guard: empty fields
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);

    try {
      const token = await login(email, password);
      localStorage.setItem('auth_token', token);
      navigate('/');
    } catch (err: unknown) {
      // Map HTTP status codes to user-friendly messages
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        setError('Invalid email or password.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AuthLayout
      title="Sign in"
      description="Use your account to return to grading and class management."
      footerText="Don't have an account?"
      footerLinkLabel="Register"
      footerLinkTo="/register"
      onSubmit={handleSubmit}
      submitLabel={loading ? 'Signing in…' : 'Sign In'}
      isSubmitting={loading}
      error={error}
      asideTitle="Keep grading clear, calm, and easy to scan."
      asideBody="TraceGrade brings classes, reviews, exams, and settings into one quieter workspace for teachers."
    >
      <AuthField label="Email" htmlFor="email">
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@school.edu"
          className="w-full rounded-xl border border-subtle bg-elevated px-4 py-3 font-body text-sm text-pri outline-none transition-colors focus:border-[var(--accent-gold)]"
        />
      </AuthField>

      <AuthField label="Password" htmlFor="password">
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-xl border border-subtle bg-elevated px-4 py-3 font-body text-sm text-pri outline-none transition-colors focus:border-[var(--accent-gold)]"
        />
      </AuthField>
    </AuthLayout>
  );
}
