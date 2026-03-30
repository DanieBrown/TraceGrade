import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, isAuthenticated } from '../features/auth/authApi';
import type { RegisterPayload } from '../features/auth/authApi';
import AuthLayout, { AuthField } from '../components/layout/AuthLayout';

// ── RegisterPage ──────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName]   = useState<string>('');
  const [email, setEmail]         = useState<string>('');
  const [password, setPassword]   = useState<string>('');
  const [role, setRole]             = useState<'TEACHER' | 'ADMIN' | 'COUNSELOR'>('TEACHER');
  const [loading, setLoading]     = useState<boolean>(false);
  const [error, setError]         = useState<string>('');

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

    // Client-side validation
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError('All fields are required.');
      return;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const payload: RegisterPayload = { firstName, lastName, email, password, role };
      const token = await register(payload);
      localStorage.setItem('auth_token', token);
      navigate('/');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      const status   = axiosErr?.response?.status;
      if (status === 409) {
        setError('An account with this email already exists.');
      } else if (status === 400) {
        const msg = axiosErr?.response?.data?.message;
        setError(msg ?? 'Registration failed. Please check your details.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AuthLayout
      title="Create account"
      description="Set up your teacher workspace and start organizing classes, exams, and review thresholds."
      footerText="Already have an account?"
      footerLinkLabel="Sign in"
      footerLinkTo="/login"
      onSubmit={handleSubmit}
      submitLabel={loading ? 'Creating account...' : 'Create Account'}
      isSubmitting={loading}
      error={error}
      asideTitle="Start with a workspace built for teachers."
      asideBody="Create your account once, then manage class rosters, gradeable exams, and manual review decisions from the same environment."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <AuthField label="First name" htmlFor="firstName">
          <input
            id="firstName"
            type="text"
            required
            placeholder="First name"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            className="w-full rounded-xl border border-subtle bg-elevated px-4 py-3 font-body text-sm text-pri outline-none transition-colors focus:border-[var(--accent-gold)]"
          />
        </AuthField>

        <AuthField label="Last name" htmlFor="lastName">
          <input
            id="lastName"
            type="text"
            required
            placeholder="Last name"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            className="w-full rounded-xl border border-subtle bg-elevated px-4 py-3 font-body text-sm text-pri outline-none transition-colors focus:border-[var(--accent-gold)]"
          />
        </AuthField>
      </div>

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
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          className="w-full rounded-xl border border-subtle bg-elevated px-4 py-3 font-body text-sm text-pri outline-none transition-colors focus:border-[var(--accent-gold)]"
        />
      </AuthField>

      <AuthField label="Role" htmlFor="role">
        <select
          id="role"
          value={role}
          onChange={e => setRole(e.target.value as 'TEACHER' | 'ADMIN' | 'COUNSELOR')}
          className="w-full appearance-none rounded-xl border border-subtle bg-elevated px-4 py-3 font-body text-sm text-pri outline-none transition-colors focus:border-[var(--accent-gold)]"
        >
          <option value="TEACHER">Teacher</option>
          <option value="ADMIN" disabled>Admin - Coming Soon</option>
          <option value="COUNSELOR" disabled>Counselor - Coming Soon</option>
        </select>
      </AuthField>
    </AuthLayout>
  );
}
