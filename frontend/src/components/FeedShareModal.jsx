import { useState } from 'react';
import { Broadcast, Lock, RocketLaunch, X } from '@phosphor-icons/react';

export default function FeedShareModal({ isOpen, title, actionDesc, onConfirm, onCancel }) {
  const [remember, setRemember] = useState(false);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', animation: 'fadeIn 0.2s ease'
    }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        background: '#131320', border: '1px solid rgba(147,51,234,0.35)',
        borderRadius: '20px', padding: '24px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.9)',
        display: 'flex', flexDirection: 'column', gap: '16px',
        position: 'relative'
      }}>
        <button
          onClick={onCancel}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 4
          }}
        >
          <X size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'rgba(147,51,234,0.15)', border: '1px solid rgba(147,51,234,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa'
          }}>
            <Broadcast size={22} weight="duotone" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
              Share to Activity Feed?
            </h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9ca3af' }}>
              Broadcast this update to the community stream.
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4
        }}>
          <span style={{ fontSize: '0.65rem', color: '#a78bfa', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            {actionDesc || 'Library Update'}
          </span>
          <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => onConfirm(true, remember)}
            style={{
              flex: 1, padding: '12px 14px', borderRadius: 12,
              background: 'linear-gradient(135deg, #7c3aed, #9333EA)',
              border: 'none', color: '#fff', fontWeight: 800, fontSize: '0.82rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 4px 16px rgba(147,51,234,0.35)'
            }}
          >
            <RocketLaunch size={16} weight="bold" />
            Share to Stream
          </button>

          <button
            onClick={() => onConfirm(false, remember)}
            style={{
              flex: 1, padding: '12px 14px', borderRadius: 12,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', color: '#ccc', fontWeight: 700, fontSize: '0.82rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
          >
            <Lock size={16} weight="bold" />
            Keep Private
          </button>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.75rem', color: '#888', marginTop: 4 }}>
          <input
            type="checkbox"
            checked={remember}
            onChange={e => setRemember(e.target.checked)}
            style={{ accentColor: '#9333EA', cursor: 'pointer' }}
          />
          Remember my choice for future updates
        </label>
      </div>
    </div>
  );
}
