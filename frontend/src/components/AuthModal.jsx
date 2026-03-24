import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';

export default function AuthModal({ mode, onClose, onSwitch, onSuccess }) {
  const { login, register } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }));
  };

  const validate = () => {
    const e = {};
    if (mode === 'register' && form.username.trim().length < 3)
      e.username = 'Username must be at least 3 characters';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Enter a valid email address';
    if (form.password.length < 8)
      e.password = 'Password must be at least 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      let user;
      if (mode === 'login') {
        const data = await login(form.email, form.password);
        user = data.user;
        toast('Welcome back!', 'success');
        onSuccess({ ...user, newUser: false });
      } else {
        await register(form.username, form.email, form.password);
        toast('Account created!', 'success');
        onSuccess({ newUser: true });
      }
    } catch (err) {
      toast(err.message || 'Something went wrong', 'error');
      if (err.message?.includes('email')) setErrors({ email: err.message });
      if (err.message?.includes('username')) setErrors({ username: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Header accent */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, var(--violet), var(--cyan))' }} />

        <div style={{ padding: '32px 36px' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, margin: '0 auto 12px',
              background: 'linear-gradient(135deg, var(--violet), #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem', boxShadow: '0 0 20px var(--violet-glow)',
            }}>◈</div>
            <h2 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: 4 }}>
              {mode === 'login' ? 'Welcome back' : 'Join LogHorizon'}
            </h2>
            <p style={{ fontSize: '0.85rem', margin: 0, fontStyle: 'italic' }}>
              {mode === 'login' ? 'Enter your credentials to continue' : 'Create your account to get started'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'register' && (
              <div>
                <label className="label">Username</label>
                <input
                  className="input"
                  type="text"
                  placeholder="your_handle"
                  value={form.username}
                  onChange={set('username')}
                  autoFocus
                />
                {errors.username && <FieldError msg={errors.username} />}
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={set('email')}
                autoFocus={mode === 'login'}
              />
              {errors.email && <FieldError msg={errors.email} />}
            </div>

            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={set('password')}
              />
              {errors.password && <FieldError msg={errors.password} />}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '13px' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Spinner /> {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                mode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <div className="divider" />

          <p style={{ textAlign: 'center', fontSize: '0.85rem', margin: 0, color: 'var(--text-muted)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => onSwitch(mode === 'login' ? 'register' : 'login')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--violet-bright)', fontFamily: 'inherit',
                fontSize: 'inherit', fontWeight: 600,
              }}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function FieldError({ msg }) {
  return (
    <p style={{
      fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
      color: 'var(--error)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4,
    }}>✕ {msg}</p>
  );
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" strokeLinecap="round" />
    </svg>
  );
}
