import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, isAuthenticated } from '../features/auth/authApi';
import type { RegisterPayload } from '../features/auth/authApi';

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

  // Focus-ring state per input
  const [firstNameFocused, setFirstNameFocused] = useState<boolean>(false);
  const [lastNameFocused, setLastNameFocused]   = useState<boolean>(false);
  const [emailFocused, setEmailFocused]         = useState<boolean>(false);
  const [passwordFocused, setPasswordFocused]   = useState<boolean>(false);
  const [roleFocused, setRoleFocused]             = useState<boolean>(false);

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

  // ── Shared input style helper ──────────────────────────────────────────────

  function inputStyle(focused: boolean): React.CSSProperties {
    return {
      backgroundColor: 'var(--bg-elevated)',
      border: `1px solid ${focused ? 'var(--accent-gold)' : 'var(--border)'}`,
      color: 'var(--text-primary)',
      borderRadius: '8px',
      padding: '10px 14px',
      width: '100%',
      fontSize: '14px',
      fontFamily: "'Lora', Georgia, serif",
      outline: 'none',
      boxSizing: 'border-box',
      transition: 'border-color 0.15s ease',
    };
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-base)',
      }}
    >
      {/* ── Form card ── */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '40px',
          width: '380px',
        }}
      >
        {/* ── Brand mark ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '32px',
          }}
        >
          <div
            className="font-display"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, var(--accent-gold) 0%, #f0c050 100%)',
              color: '#06101e',
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '-0.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            TG
          </div>
          <div>
            <p
              className="font-display"
              style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', lineHeight: 1 }}
            >
              TraceGrade
            </p>
            <p
              className="font-mono"
              style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginTop: '3px', letterSpacing: '0.1em' }}
            >
              TEACHER PORTAL
            </p>
          </div>
        </div>

        {/* ── Heading ── */}
        <h1
          className="font-display"
          style={{
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '0 0 6px 0',
          }}
        >
          Create an account
        </h1>
        <p
          style={{
            fontSize: '13.5px',
            color: 'var(--text-secondary)',
            fontFamily: "'Lora', Georgia, serif",
            margin: '0 0 28px 0',
          }}
        >
          Join TraceGrade — fill in your details below.
        </p>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} noValidate>
          {/* First name */}
          <div style={{ marginBottom: '18px' }}>
            <label
              htmlFor="firstName"
              style={{
                display: 'block',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontFamily: "'Lora', Georgia, serif",
                marginBottom: '6px',
                fontWeight: 500,
              }}
            >
              First name
            </label>
            <input
              id="firstName"
              type="text"
              required
              placeholder="First name"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              onFocus={() => setFirstNameFocused(true)}
              onBlur={() => setFirstNameFocused(false)}
              style={inputStyle(firstNameFocused)}
            />
          </div>

          {/* Last name */}
          <div style={{ marginBottom: '18px' }}>
            <label
              htmlFor="lastName"
              style={{
                display: 'block',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontFamily: "'Lora', Georgia, serif",
                marginBottom: '6px',
                fontWeight: 500,
              }}
            >
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              required
              placeholder="Last name"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              onFocus={() => setLastNameFocused(true)}
              onBlur={() => setLastNameFocused(false)}
              style={inputStyle(lastNameFocused)}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: '18px' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontFamily: "'Lora', Georgia, serif",
                marginBottom: '6px',
                fontWeight: 500,
              }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              style={inputStyle(emailFocused)}
              placeholder="you@school.edu"
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '18px' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontFamily: "'Lora', Georgia, serif",
                marginBottom: '6px',
                fontWeight: 500,
              }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              style={inputStyle(passwordFocused)}
              placeholder="••••••••"
            />
          </div>

          {/* Role */}
          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="role"
              style={{
                display: 'block',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontFamily: "'Lora', Georgia, serif",
                marginBottom: '6px',
                fontWeight: 500,
              }}
            >
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={e => setRole(e.target.value as 'TEACHER' | 'ADMIN' | 'COUNSELOR')}
              onFocus={() => setRoleFocused(true)}
              onBlur={() => setRoleFocused(false)}
              style={{
                ...inputStyle(roleFocused),
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2378b4dc' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
                paddingRight: '36px',
              }}
            >
              <option value="TEACHER">Teacher</option>
              <option value="ADMIN" disabled>Admin — Coming Soon</option>
              <option value="COUNSELOR" disabled>Counselor — Coming Soon</option>
            </select>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px 0',
              backgroundColor: loading ? 'rgba(232, 164, 40, 0.6)' : 'var(--accent-gold)',
              color: '#06101e',
              border: 'none',
              borderRadius: '8px',
              fontFamily: "'Syne', sans-serif",
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.01em',
              transition: 'background-color 0.15s ease',
            }}
          >
            {loading ? 'Creating account\u2026' : 'Create Account'}
          </button>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              style={{
                color: 'var(--accent-crimson)',
                fontSize: '13px',
                fontFamily: "'Lora', Georgia, serif",
                marginTop: '12px',
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}
        </form>

        {/* ── Login link ── */}
        <p
          style={{
            marginTop: '28px',
            textAlign: 'center',
            fontSize: '13px',
            fontFamily: "'Lora', Georgia, serif",
            color: 'var(--text-secondary)',
          }}
        >
          Already have an account?{' '}
          <Link
            to="/login"
            style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 600 }}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
