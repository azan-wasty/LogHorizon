import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { achievementsApi } from '../api/client';
import { Award, ArrowLeft, Pin, PinOff, Loader2 } from 'lucide-react';

const MAX_PINNED = 6;

function AchievementCard({ ach, onTogglePin, busy }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px',
        background: ach.pinned ? 'rgba(251,191,36,0.08)' : 'rgba(251,191,36,0.03)',
        border: ach.pinned ? '1px solid rgba(251,191,36,0.35)' : '1px solid rgba(251,191,36,0.1)',
        borderRadius: 16,
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 16px rgba(251,191,36,0.15)' }}>
        <Award size={20} color="#fbbf24" fill="rgba(251,191,36,0.3)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.85rem', color: '#fbbf24', marginBottom: 2 }}>{ach.title}</p>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{ach.description}</p>
        {ach.unlockedAt && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.56rem', color: '#4b5563', marginTop: 4 }}>
            Unlocked {new Date(ach.unlockedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </div>
      <button
        onClick={() => onTogglePin(ach)}
        disabled={busy}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
          padding: '8px 14px', borderRadius: 20, cursor: busy ? 'default' : 'pointer',
          background: ach.pinned ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
          border: ach.pinned ? '1px solid rgba(251,191,36,0.4)' : '1px solid rgba(255,255,255,0.1)',
          fontFamily: 'var(--font-mono)', fontSize: '0.6rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          color: ach.pinned ? '#fbbf24' : '#9ca3af',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? <Loader2 size={12} className="animate-spin" /> : ach.pinned ? <PinOff size={12} /> : <Pin size={12} />}
        {ach.pinned ? 'Pinned' : 'Pin'}
      </button>
    </div>
  );
}

export default function AchievementsPage({ onNavigate }) {
  const { achievements, refetch } = useAuth();
  const toast = useToast();
  const [pendingKey, setPendingKey] = useState(null);

  const pinnedCount = (achievements || []).filter(a => a.pinned).length;

  const handleTogglePin = async (ach) => {
    if (!ach.pinned && pinnedCount >= MAX_PINNED) {
      toast(`You can only pin up to ${MAX_PINNED} achievements`, 'error');
      return;
    }
    setPendingKey(ach.key);
    try {
      await achievementsApi.setPinned(ach.key, !ach.pinned);
      await refetch();
    } catch (err) {
      toast(err.message || 'Failed to update', 'error');
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 20px 80px' }}>
      <button
        onClick={() => onNavigate?.('profile')}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24,
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.12em',
        }}
      >
        <ArrowLeft size={14} /> Back to profile
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
        <Award size={22} color="#fbbf24" fill="rgba(251,191,36,0.3)" />
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.4rem', color: '#fff' }}>Achievements</h1>
      </div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 28 }}>
        {(achievements || []).length} unlocked · {pinnedCount}/{MAX_PINNED} pinned to your profile
      </p>

      {(achievements || []).length === 0 ? (
        <div style={{
          padding: '48px 24px', textAlign: 'center',
          background: 'rgba(251,191,36,0.02)', border: '1px dashed rgba(251,191,36,0.1)', borderRadius: 20,
        }}>
          <Award size={32} color="#374151" style={{ margin: '0 auto 12x' }} />
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', color: '#4b5563' }}>No achievements yet</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: '#2d2d3d', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 6 }}>
            Complete entries, rate content, and build your library to unlock badges
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {achievements.map(ach => (
            <AchievementCard key={ach.key} ach={ach} onTogglePin={handleTogglePin} busy={pendingKey === ach.key} />
          ))}
        </div>
      )}
    </div>
  );
}