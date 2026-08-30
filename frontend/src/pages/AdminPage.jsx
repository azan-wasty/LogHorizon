import { useState, useEffect } from 'react';
import { admin as adminApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import {
  Plus, Search, Trash2, Edit3, Zap, Database, Tag as TagIcon,
  Layers, ExternalLink, RefreshCw, UserCircle, CheckCircle2,
  AlertCircle, Loader2, Compass
} from 'lucide-react';

const CATEGORIES = ['Anime', 'Manga', 'Movie', 'TV'];

export default function ContentStudio() {
  const toast = useToast();
  const [tab, setTab] = useState('content');
  const [content, setContent] = useState([]);
  const [tags, setTags] = useState([]);
  const [users, setUsers] = useState([]);
  const [discordApprovals, setDiscordApprovals] = useState([]);
  const [subredditApprovals, setSubredditApprovals] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [ingestTitle, setIngestTitle] = useState('');
  const [ingestCategory, setIngestCategory] = useState('Anime');
  const [ingesting, setIngesting] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [cd, td, ud, dd, sd, ed] = await Promise.all([
        adminApi.listContent(),
        adminApi.listTags(),
        adminApi.listUsers(),
        adminApi.listDiscordRecommendations({ status: 'PENDING' }),
        adminApi.listSubredditRecommendations({ status: 'PENDING' }),
        adminApi.listPendingEvents().catch(() => ({ events: [] })),
      ]);
      setContent(cd.content || []);
      setTags(td.tags || []);
      setUsers(ud.users || []);
      setDiscordApprovals(dd.recommendations || []);
      setSubredditApprovals(sd.recommendations || []);
      setPendingEvents(ed.events || []);
    } catch (err) {
      console.error('Refresh error:', err);
      toast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  // Enhanced ingestion handler with lock guard, method detection & verbose error catching
  const handleIngest = async (titleToIngest = ingestTitle, categoryToIngest = ingestCategory) => {
    if (ingesting) return; // Concurrency lock guard

    const targetTitle = titleToIngest.trim();
    if (!targetTitle) {
      toast('Please enter a title to ingest', 'error');
      return;
    }

    setIngesting(true);
    try {
      // Find whichever function exists on adminApi
      const ingestFn =
        adminApi.ingestContent ||
        adminApi.ingest ||
        adminApi.rapidIngest ||
        adminApi.triggerIngest ||
        adminApi.ingestMedia ||
        adminApi.createContent;

      const payload = {
        title: targetTitle,
        category: categoryToIngest,
        name: targetTitle,
        query: targetTitle
      };

      if (typeof ingestFn === 'function') {
        await ingestFn.call(adminApi, payload);
      } else if (typeof adminApi.post === 'function') {
        await adminApi.post('/ingest', payload);
      } else {
        throw new Error('No valid ingestion method found on adminApi. Check api/client.js exports.');
      }

      toast(`Ingestion triggered for "${targetTitle}"`, 'success');
      if (titleToIngest === ingestTitle) setIngestTitle('');
      refresh();
    } catch (err) {
      console.error('Ingestion failed:', err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Ingestion request failed';
      toast(`Ingestion error: ${serverMsg}`, 'error');
    } finally {
      setIngesting(false);
    }
  };

  const handleApproveDiscord = async (id) => {
    try {
      if (adminApi.approveDiscordRecommendation) {
        await adminApi.approveDiscordRecommendation(id);
      }
      toast('Discord link approved', 'success');
      refresh();
    } catch (err) {
      console.error('Discord approval error:', err);
      toast('Failed to approve Discord link', 'error');
    }
  };

  const handleApproveSubreddit = async (id) => {
    try {
      if (adminApi.approveSubredditRecommendation) {
        await adminApi.approveSubredditRecommendation(id);
      }
      toast('Subreddit link approved', 'success');
      refresh();
    } catch (err) {
      console.error('Subreddit approval error:', err);
      toast('Failed to approve Subreddit link', 'error');
    }
  };

  const TAB_NAMES = {
    content: 'Content',
    tags: 'Tags',
    users: 'Users',
    discord: `Discord Links (${discordApprovals.length})`,
    subreddit: `Subreddit Links (${subredditApprovals.length})`,
    events: `Events (${pendingEvents.length})`
  };

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '24px', boxSizing: 'border-box', color: '#fff' }}>

      {/* 1. Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '10px', background: 'rgba(168,85,247,0.15)', color: '#a855f7', padding: '3px 10px', borderRadius: '12px', fontWeight: 'bold', textTransform: 'uppercase', border: '1px solid rgba(168,85,247,0.3)' }}>
            ADMIN / CONTENT STUDIO
          </span>
          <h1 style={{ fontSize: '26px', fontWeight: '900', margin: '8px 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers color="#a855f7" size={26} /> System Management
          </h1>
          <p style={{ color: '#888', fontSize: '12px', margin: 0, fontStyle: 'italic' }}>
            Advanced orchestration of the global entertainment index.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={refresh}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px', padding: '10px', cursor: 'pointer' }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> NEW ENTRY
          </button>
        </div>
      </div>

      {/* 2. Stats Grid Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Index', value: content.length, icon: Database, color: '#a855f7' },
          { label: 'Active Tags', value: tags.length, icon: TagIcon, color: '#06b6d4' },
          { label: 'Ingested', value: content.filter(c => c.externalId).length, icon: Zap, color: '#10b981' },
          { label: 'Discord Linked', value: content.filter(c => c.discordLink).length, icon: ExternalLink, color: '#6366f1' },
          { label: 'Reddit Linked', value: content.filter(c => c.redditLink).length, icon: Search, color: '#f97316' },
        ].map((stat, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', background: `${stat.color}15` }}>
              <stat.icon color={stat.color} size={20} />
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', lineHeight: '1' }}>{stat.value}</div>
              <div style={{ fontSize: '10px', color: '#777', textTransform: 'uppercase', marginTop: '4px', fontWeight: '600' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Rapid Ingestion Panel */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <Zap color="#a855f7" size={18} />
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>Rapid Ingestion Pipeline</h3>
            <p style={{ margin: 0, fontSize: '11px', color: '#777' }}>Automated metadata mapping via Jikan and TMDB APIs.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
          <input
            disabled={ingesting}
            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '12px', outline: 'none', opacity: ingesting ? 0.5 : 1 }}
            placeholder="Enter exact title (e.g. Neon Genesis Evangelion)..."
            value={ingestTitle}
            onChange={(e) => setIngestTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleIngest()}
          />
          <select
            disabled={ingesting}
            value={ingestCategory}
            onChange={(e) => setIngestCategory(e.target.value)}
            style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0 14px', color: '#fff', fontSize: '12px', outline: 'none', cursor: 'pointer', opacity: ingesting ? 0.5 : 1 }}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={() => handleIngest()}
            disabled={ingesting}
            style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', padding: '0 20px', fontWeight: 'bold', fontSize: '11px', cursor: ingesting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', opacity: ingesting ? 0.7 : 1 }}
          >
            {ingesting ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {ingesting ? 'INGESTING...' : 'START INGEST'}
          </button>
        </div>
      </div>

      {/* 4. Nexus Auto-Discovery Panel */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Compass color="#06b6d4" size={18} />
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>Nexus Auto-Discovery</h3>
            <p style={{ margin: 0, fontSize: '11px', color: '#777' }}>Bulk ingest trending, popular, and top-rated media from APIs.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {CATEGORIES.map(cat => (
            <div
              key={cat}
              onClick={() => handleIngest(`Top ${cat}`, cat)}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px', textAlign: 'center', cursor: ingesting ? 'not-allowed' : 'pointer', opacity: ingesting ? 0.5 : 1 }}
            >
              {ingesting ? (
                <Loader2 size={20} color="#a855f7" className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
              ) : (
                <Compass size={20} color="#a855f7" style={{ margin: '0 auto 8px auto', display: 'block' }} />
              )}
              <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{cat}</div>
              <div style={{ fontSize: '10px', color: '#a855f7', marginTop: '2px' }}>Auto Ingest</div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Horizontal Tab Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '20px', overflowX: 'auto' }}>
        {['content', 'tags', 'users', 'discord', 'subreddit', 'events'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t ? '2px solid #a855f7' : '2px solid transparent',
              color: tab === t ? '#a855f7' : '#888',
              fontSize: '12px',
              fontWeight: 'bold',
              padding: '6px 0',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              textTransform: 'uppercase'
            }}
          >
            {TAB_NAMES[t]}
          </button>
        ))}
      </div>

      {/* 6. Data Tables Viewports */}
      {tab === 'content' && (
        <div style={{ width: '100%', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#888' }}>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>METADATA ENTRY</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>CLASSIFICATION</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>SYNC STATUS</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {content.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#777' }}>No content records found.</td></tr>
              ) : content.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '48px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                        {item.coverImage && <img src={item.coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
                      </div>
                      <div style={{ maxWidth: '320px', overflow: 'hidden' }}>
                        <div style={{ fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                        <div style={{ fontSize: '11px', color: '#777', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', color: '#ccc' }}>
                      {item.category}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ color: item.externalId ? '#10b981' : '#f59e0b', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {item.externalId ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                      {item.externalId ? 'SYNCED' : 'MANUAL'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: '6px' }}><Edit3 size={14} /></button>
                    <button style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'tags' && (
        <div style={{ width: '100%', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#888' }}>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>TAG ID</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>NAME</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>CATEGORY</th>
              </tr>
            </thead>
            <tbody>
              {tags.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#777' }}>No tags found.</td></tr>
              ) : tags.map(tag => (
                <tr key={tag.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px 16px', color: '#777' }}>#{tag.id}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{tag.name || tag.value}</td>
                  <td style={{ padding: '12px 16px', color: '#a855f7' }}>{tag.type || tag.category || 'General'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'users' && (
        <div style={{ width: '100%', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#888' }}>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>USER</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>EMAIL</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>ROLE</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#777' }}>No users found.</td></tr>
              ) : users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserCircle size={16} color="#a855f7" /> {user.username || user.name}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#aaa' }}>{user.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: 'rgba(168,85,247,0.1)', color: '#a855f7', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                      {user.role || 'USER'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'discord' && (
        <div style={{ width: '100%', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#888' }}>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>TITLE / ENTRY</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>DISCORD LINK</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {discordApprovals.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#777' }}>No pending Discord link approvals.</td></tr>
              ) : discordApprovals.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{item.contentTitle || item.title || `Content #${item.contentId}`}</td>
                  <td style={{ padding: '12px 16px', color: '#6366f1' }}>{item.discordLink || item.url}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button onClick={() => handleApproveDiscord(item.id)} style={{ background: '#10b981', border: 'none', color: '#fff', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', marginRight: '6px' }}>
                      Approve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'subreddit' && (
        <div style={{ width: '100%', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#888' }}>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>TITLE / ENTRY</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>SUBREDDIT LINK</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {subredditApprovals.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#777' }}>No pending Subreddit link approvals.</td></tr>
              ) : subredditApprovals.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{item.contentTitle || item.title || `Content #${item.contentId}`}</td>
                  <td style={{ padding: '12px 16px', color: '#f97316' }}>{item.redditLink || item.url}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button onClick={() => handleApproveSubreddit(item.id)} style={{ background: '#10b981', border: 'none', color: '#fff', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>
                      Approve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'events' && (
        <div style={{ width: '100%', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#888' }}>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>EVENT NAME</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>SCHEDULE</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {pendingEvents.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#777' }}>No pending events found.</td></tr>
              ) : pendingEvents.map(event => (
                <tr key={event.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{event.name || event.title}</td>
                  <td style={{ padding: '12px 16px', color: '#aaa' }}>{event.date || 'TBD'}</td>
                  <td style={{ padding: '12px 16px', color: '#f59e0b', fontWeight: 'bold' }}>PENDING</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}