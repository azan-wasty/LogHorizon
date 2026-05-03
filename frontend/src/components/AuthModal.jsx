import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Loader2, X, Hexagon } from 'lucide-react';

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

  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, padding: '12px 16px', fontSize: '0.9rem', fontFamily: 'var(--font-body)',
    color: '#fff', outline: 'none', transition: 'border-color 0.2s',
  };

  const labelStyle = {
    fontFamily: 'var(--font-mono)', fontSize: '0.6rem', textTransform: 'uppercase',
    letterSpacing: '0.15em', color: '#6b7280', marginBottom: 6, display: 'block',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: '100%', maxWidth: 420, background: '#0f0f16', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        animation: 'fadeUp 0.3s ease',
      }}>
        {/* Accent bar */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, #7C3AED, #22d3ee)' }} />

        <div style={{ padding: '32px 36px' }}>
          {/* Logo + heading */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, margin: '0 auto 14px',
              background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(124,58,237,0.4)',
            }}>
              <Hexagon size={22} color="#fff" fill="#fff" />
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
                  onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.4)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
                {errors.username && <FieldError msg={errors.username} />}
              </div>
            )}
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} autoFocus={mode === 'login'}
                onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.4)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
              {errors.email && <FieldError msg={errors.email} />}
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input style={inputStyle} type="password" placeholder="••••••••" value={form.password} onChange={set('password')}
                onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.4)'} onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'} />
              {errors.password && <FieldError msg={errors.password} />}
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer',
              background: '#fff', color: '#000', fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginTop: 8, transition: 'all 0.2s', opacity: loading ? 0.6 : 1,
              boxShadow: '0 4px 20px rgba(255,255,255,0.1)',
            }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#e5e7eb'; }}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              {loading && <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} />}
              {loading ? (mode === 'login' ? 'Signing in...' : 'Creating account...') : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* Divider */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '24px 0' }} />

          {/* Switch mode */}
          <p style={{ textAlign: 'center', fontSize: '0.82rem', margin: 0, color: '#6b7280', fontFamily: 'var(--font-body)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => onSwitch(mode === 'login' ? 'register' : 'login')} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#7C3AED',
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
