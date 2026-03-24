import { useState, useRef } from 'react';

export default function TagInput({ allTags = [], selected = [], onChange }) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const flatTags = Array.isArray(allTags) ? allTags : Object.values(allTags).flat();

  const filtered = query.trim()
    ? flatTags.filter(t =>
        t.name.toLowerCase().includes(query.toLowerCase()) &&
        !selected.includes(t.id)
      )
    : flatTags.filter(t => !selected.includes(t.id)).slice(0, 8);

  const selectedTags = flatTags.filter(t => selected.includes(t.id));

  const add = (tag) => {
    onChange([...selected, tag.id]);
    setQuery('');
    inputRef.current?.focus();
  };

  const remove = (id) => {
    onChange(selected.filter(x => x !== id));
  };

  return (
    <div>
      {/* Chips */}
      {selectedTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {selectedTags.map(tag => (
            <span key={tag.id} className="chip">
              {tag.name}
              <button onClick={() => remove(tag.id)} title="Remove">✕</button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          className="input"
          type="text"
          placeholder="Type to search and add tags..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />

        {/* Dropdown */}
        {focused && filtered.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
            background: 'var(--midnight)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-sm)',
            marginTop: 4,
            overflow: 'hidden',
            boxShadow: '0 16px 40px rgba(0,0,0,0.4)',
            maxHeight: 220,
            overflowY: 'auto',
          }}>
            {filtered.map(tag => (
              <div
                key={tag.id}
                onClick={() => add(tag)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background 0.15s',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9rem',
                  color: 'var(--text-secondary)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.12)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span>{tag.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {tag.type}
                </span>
              </div>
            ))}
          </div>
        )}

        {focused && query.trim() && filtered.length === 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
            background: 'var(--midnight)', border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-sm)', marginTop: 4, padding: '12px 14px',
            fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)',
          }}>
            No matching tags found
          </div>
        )}
      </div>
    </div>
  );
}
