import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { CircleNotch, Stack } from '@phosphor-icons/react';

export default function AuthModal({ mode = 'login', onClose, onSwitch, onSuccess }) {
  const { login, register } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.email) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'At least 6 characters';
    if (mode === 'register' && !form.username) errs.username = 'Username is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === 'login') {
        const data = await login(form.email, form.password);
        toast('Welcome back!', 'success');
        if (onSuccess) onSuccess({ ...data?.user, newUser: false });
      } else {
        const data = await register(form.username, form.email, form.password);
        toast('Account created!', 'success');
        if (onSuccess) onSuccess({ ...data?.user, newUser: true });
      }
      onClose();
    } catch (err) {
      toast(err.message || 'Authentication failed', 'error');
      setErrors({ global: err.message || 'Authentication failed' });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#fff',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    fontFamily: 'var(--font-body)',
    fontSize: '0.68rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#9ca3af',
    marginBottom: 6,
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%', maxWidth: 420, background: '#0f0f16', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        animation: 'fadeUp 0.3s ease',
      }}>
        {/* Accent bar */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #9333EA, #f59e0b)' }} />

        <div style={{ padding: '32px 36px' }} className="auth-modal-content">
          {/* Logo + heading */}
          <div style={{ textAlign: 'center', marginBottom: 28 }} className="auth-header">
            <div style={{
              width: 44, height: 44, borderRadius: 12, margin: '0 auto 14px',
              background: 'linear-gradient(135deg, #9333EA, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(147,51,234,0.35)',
            }}>
              <Stack size={22} color="#fff" weight="duotone" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', color: '#fff', letterSpacing: '-0.02em', marginBottom: 6 }}>
              {mode === 'login' ? 'Welcome back' : 'Join LogHorizon'}
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', color: '#6b7280', fontStyle: 'italic', margin: 0 }}>
              {mode === 'login' ? 'Enter your credentials to continue' : 'Create your account to get started'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'register' && (
              <div>
                <label style={labelStyle}>Username</label>
                <input style={inputStyle} type="text" placeholder="your_handle" value={form.username} onChange={set('username')} autoFocus
                  onFocus={e => e.target.style.borderColor = 'rgba(147,51,234,0.4)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                {errors.username && <FieldError msg={errors.username} />}
              </div>
            )}
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} autoFocus={mode === 'login'}
                onFocus={e => e.target.style.borderColor = 'rgba(147,51,234,0.4)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
              {errors.email && <FieldError msg={errors.email} />}
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input style={inputStyle} type="password" placeholder="••••••••" value={form.password} onChange={set('password')}
                onFocus={e => e.target.style.borderColor = 'rgba(147,51,234,0.4)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
              {errors.password && <FieldError msg={errors.password} />}
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: '#fff', color: '#000', fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginTop: 8, transition: 'all 0.2s', opacity: loading ? 0.6 : 1,
              boxShadow: '0 4px 20px rgba(255,255,255,0.1)',
            }}>
              {loading && <CircleNotch size={16} weight="bold" style={{ animation: 'spin 0.8s linear infinite' }} />}
              {loading ? 'Please wait...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '24px 0' }} />

          {/* Switch mode */}
          <p style={{ textAlign: 'center', fontSize: '0.82rem', margin: 0, color: '#6b7280', fontFamily: 'var(--font-body)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => onSwitch(mode === 'login' ? 'register' : 'login')} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#9333EA',
              fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 600,
            }}>
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        @media (max-width: 480px) {
          .auth-modal-content { padding: 24px 24px !important; }
          .auth-header { margin-bottom: 20px !important; }
        }
      `}</style>
    </div>
  );
}

function FieldError({ msg }) {
  return (
    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: '#f87171', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
      ✕ {msg}
    </p>
  );
}