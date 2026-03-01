import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, isAuthenticated } from '../features/auth/authApi';

// ── LoginPage ─────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail]       = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading]   = useState<boolean>(false);
  const [error, setError]       = useState<string>('');

  // Focus-ring state per input
  const [emailFocused, setEmailFocused]       = useState<boolean>(false);
  const [passwordFocused, setPasswordFocused] = useState<boolean>(false);

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
          Sign in
        </h1>
        <p
          style={{
            fontSize: '13.5px',
            color: 'var(--text-secondary)',
            fontFamily: "'Lora', Georgia, serif",
            margin: '0 0 28px 0',
          }}
        >
          Welcome back — enter your credentials below.
        </p>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} noValidate>
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
          <div style={{ marginBottom: '24px' }}>
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
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              style={inputStyle(passwordFocused)}
              placeholder="••••••••"
            />
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
            {loading ? 'Signing in…' : 'Sign In'}
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

        {/* ── Register link ── */}
        <p
          style={{
            marginTop: '28px',
            textAlign: 'center',
            fontSize: '13px',
            fontFamily: "'Lora', Georgia, serif",
            color: 'var(--text-secondary)',
          }}
        >
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 600 }}
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
