import { useState, useEffect } from 'react';
import { admin as adminApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  Zap,
  Database,
  Tag as TagIcon,
  Layers,
  ExternalLink,
  RefreshCw,
  UserCircle,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Compass,
} from 'lucide-react';

const CATEGORIES = ['Anime', 'Manga', 'Movie', 'TV'];

const EMPTY_FORM = {
  title: '', category: 'Anime', description: '', discordLink: '', redditLink: '',
  externalId: '', source: '', coverImage: '', rating: '',
  tagIds: [],
  isSuggested: false,
};

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
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [ingestTitle, setIngestTitle] = useState('');
  const [ingestCategory, setIngestCategory] = useState('Anime');
  const [ingesting, setIngesting] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoverMode, setDiscoverMode] = useState('popular');
  const [discoverPages, setDiscoverPages] = useState(2);
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [discoverStartPages, setDiscoverStartPages] = useState({});

  const [tagForm, setTagForm] = useState({ type: 'Genre', name: '' });
  const [savingTag, setSavingTag] = useState(false);

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
    } catch {
      toast('Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = async (user) => {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!window.confirm(`Change ${user.username}'s role to ${newRole}?`)) return;

    try {
      await adminApi.updateUserRole(user.id, newRole);
      toast(`Updated ${user.username} to ${newRole}`, 'success');
      refresh();
    } catch (err) {
      toast(err.message || 'Failed to update role', 'error');
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleRapidIngest = async (e) => {
    e.preventDefault();
    if (!ingestTitle.trim()) return;
    setIngesting(true);
    try {
      const res = await adminApi.ingestContent({ title: ingestTitle, category: ingestCategory });
      toast(`Successfully ingested ${res.content?.title || 'item'}`, 'success');
      setIngestTitle('');
      refresh();
    } catch (err) {
      toast(err.message || 'Ingestion failed', 'error');
    } finally {
      setIngesting(false);
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast('Title and description are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        rating: form.rating ? parseFloat(form.rating) : null,
      };
      if (editId) {
        await adminApi.updateContent(editId, payload);
        toast('Content updated!', 'success');
      } else {
        await adminApi.createContent(payload);
        toast('Content created!', 'success');
      }
      setShowForm(false);
      refresh();
    } catch (err) {
      toast(err.message || 'Failed to save content', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this content?')) return;
    try {
      await adminApi.deleteContent(id);
      toast('Content deleted', 'success');
      refresh();
    } catch {
      toast('Failed to delete', 'error');
    }
  };

  const handleBulkDiscover = async (category) => {
    setDiscovering(true);
    toast(`Discovering ${category} (${discoverMode}, ${discoverPages} pages)...`, 'info');
    try {
      const startPage = discoverStartPages[category] || 1;
      const res = await adminApi.discoverContent({
        category,
        mode: discoverMode,
        pages: discoverPages,
        startPage,
        query: discoverQuery
      });

      if (res.stats?.nextPage) {
        setDiscoverStartPages(p => ({ ...p, [category]: res.stats.nextPage }));
      }

      const s = res.stats;
      toast(`Done! ${s.ingested} new, ${s.skipped} existing, ${s.failed} failed (${s.total} scanned)`, 'success');
      refresh();
    } catch (err) {
      toast(err.message || 'Neural discovery failed', 'error');
    } finally {
      setDiscovering(false);
    }
  };

  const handleCreateTag = async () => {
    if (!tagForm.name.trim()) { toast('Tag name is required', 'error'); return; }
    setSavingTag(true);
    try {
      await adminApi.createTag(tagForm);
      toast('Tag created!', 'success');
      setTagForm(f => ({ ...f, name: '' }));
      refresh();
    } catch (err) {
      toast(err.message || 'Failed to create tag', 'error');
    } finally {
      setSavingTag(false);
    }
  };

  const handleDeleteTag = async (id) => {
    try {
      await adminApi.deleteTag(id);
      refresh();
    } catch {
      toast('Failed to delete tag', 'error');
    }
  };

  const TAB_NAMES = {
    content: 'Content',
    tags: 'Tags',
    users: 'Users',
    discord: 'Discord Links',
    subreddit: 'Subreddit Links',
    events: `Events (${pendingEvents.length})`
  };

  return (
    <div className="admin-page space-y-8 w-full max-w-full overflow-x-hidden">
      <style>{`
        .admin-stats-wrap {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }

        .admin-stat-card {
          flex: 1 1 200px;
          min-width: 180px;
        }

        .admin-table-container {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .admin-table-container table {
          min-width: 800px;
        }

        .tab-btn {
          padding: 12px 24px;
          font-family: var(--font-display);
          font-size: 0.85rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6b7280;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          color: #d1d5db;
        }

        .tab-btn.active {
          color: var(--electric-purple);
          border-bottom-color: var(--electric-purple);
        }
      `}</style>

      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-electric-purple/10 border border-electric-purple/20 text-[10px] font-body font-bold uppercase tracking-widest text-electric-purple">
              Admin / Content Studio
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white flex items-center gap-3">
            <Layers className="text-electric-purple" />
            System Management
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm font-body italic">Advanced orchestration of the global entertainment index.</p>
        </div>

        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={refresh}
            className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); }}
            className="btn-primary"
            style={{ padding: '10px 20px', fontSize: '0.85rem' }}
          >
            <Plus size={16} />
            New Entry
          </button>
        </div>
      </header>

      {/* Stats Board Grid (Forced Wrap Flexbox) */}
      <div className="admin-stats-wrap">
        {[
          { label: 'Total Index', value: content.length, icon: Database, color: 'text-electric-purple', bg: 'bg-electric-purple/10' },
          { label: 'Active Tags', value: tags.length, icon: TagIcon, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
          { label: 'Ingested', value: content.filter(c => c.externalId).length, icon: Zap, color: 'text-spotify-green', bg: 'bg-spotify-green/10' },
          { label: 'Discord Linked', value: content.filter(c => c.discordLink).length, icon: ExternalLink, color: 'text-discord-blue', bg: 'bg-discord-blue/10' },
          { label: 'Reddit Linked', value: content.filter(c => c.redditLink).length, icon: Search, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        ].map((stat, i) => (
          <div key={i} className="premium-card p-4 flex items-center gap-3 admin-stat-card">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} flex-shrink-0`}>
              <stat.icon size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xl font-display font-bold text-white truncate">{stat.value}</p>
              <p className="text-[10px] font-body uppercase tracking-wider text-gray-500 truncate">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Rapid Ingestion Section */}
      <section className="premium-card p-6 relative overflow-hidden">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-2.5 rounded-xl bg-electric-purple shadow-[0_0_15px_rgba(124,58,237,0.3)]">
            <Zap className="text-white w-5 h-5" fill="white" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">Rapid Ingestion Pipeline</h2>
            <p className="text-xs text-gray-500 font-body">Automated metadata mapping via Jikan and TMDB APIs.</p>
          </div>
        </div>

        <form onSubmit={handleRapidIngest} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Enter exact title (e.g. Neon Genesis Evangelion)..."
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm font-body focus:border-electric-purple outline-none text-white"
              value={ingestTitle}
              onChange={(e) => setIngestTitle(e.target.value)}
              disabled={ingesting || discovering}
            />
          </div>
          <select
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-display font-semibold outline-none text-gray-300 cursor-pointer"
            value={ingestCategory}
            onChange={(e) => setIngestCategory(e.target.value)}
            disabled={ingesting || discovering}
          >
            {CATEGORIES.map(c => <option key={c} value={c} className="bg-charcoal text-white">{c}</option>)}
          </select>
          <button
            type="submit"
            disabled={ingesting || discovering || !ingestTitle.trim()}
            className="btn-primary"
            style={{ padding: '10px 24px', fontSize: '0.85rem' }}
          >
            {ingesting ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
            {ingesting ? 'Injecting...' : 'Start Ingest'}
          </button>
        </form>
      </section>

      {/* Nexus Auto-Discovery */}
      <section className="premium-card p-6 relative overflow-hidden">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-white">Nexus Auto-Discovery</h2>
              <p className="text-xs text-gray-500 font-body">Bulk-ingest trending, popular, and top-rated media from all APIs.</p>
            </div>
          </div>
          {Object.keys(discoverStartPages).length > 0 && (
            <button
              onClick={() => setDiscoverStartPages({})}
              className="text-xs font-body text-gray-500 hover:text-red-400 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 transition-all"
            >
              <RefreshCw size={12} />
              Reset Pages
            </button>
          )}
        </div>

        {/* Discovery Modes & Slider */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 p-4 rounded-xl bg-white/[0.02] border border-white/5">
          <div className="space-y-2">
            <label className="block text-[10px] font-body uppercase tracking-wider text-gray-500">Discovery Mode</label>
            <div className="flex flex-wrap gap-2">
              {['popular', 'top_rated', 'trending', 'search'].map(m => (
                <button
                  key={m}
                  onClick={() => setDiscoverMode(m)}
                  className={`px-3.5 py-1.5 rounded-lg font-display text-xs font-bold uppercase tracking-wider transition-all ${discoverMode === m ? 'bg-electric-purple text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                >
                  {m.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {discoverMode === 'search' && (
            <div className="flex-1 max-w-xs">
              <label className="block text-[10px] font-body uppercase tracking-wider text-gray-500 mb-1">Search Query</label>
              <input
                type="text"
                placeholder="Keywords..."
                value={discoverQuery}
                onChange={(e) => setDiscoverQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-xs font-body outline-none text-white"
              />
            </div>
          )}

          <div className="space-y-2 min-w-[180px]">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[10px] font-body uppercase tracking-wider text-gray-500">Pages Limit</span>
              <span className="font-display font-bold text-white">{discoverPages} Pages</span>
            </div>
            <input
              type="range" min="1" max="5" value={discoverPages}
              onChange={(e) => setDiscoverPages(Number(e.target.value))}
              className="w-full accent-electric-purple"
            />
          </div>
        </div>

        {/* Category Trigger Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => handleBulkDiscover(cat)}
              disabled={ingesting || discovering}
              className="premium-card p-4 flex flex-col items-center text-center gap-2 hover:border-electric-purple/40 group transition-all disabled:opacity-50"
            >
              <div className="p-3 rounded-xl bg-white/5 text-gray-400 group-hover:text-electric-purple group-hover:bg-electric-purple/10 transition-all">
                <Compass size={24} className={discovering ? 'animate-pulse' : ''} />
              </div>
              <div>
                <h3 className="text-white font-display font-bold text-sm">{cat}</h3>
                <p className="text-[10px] font-body text-electric-purple font-semibold mt-0.5">Page {discoverStartPages[cat] || 1}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Navigation Tab Bar */}
      <section className="space-y-4">
        <div className="flex border-b border-white/10 overflow-x-auto gap-2">
          {['content', 'tags', 'users', 'discord', 'subreddit', 'events'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`tab-btn ${tab === t ? 'active' : ''}`}
            >
              {TAB_NAMES[t]}
            </button>
          ))}
        </div>

        {tab === 'content' ? (
          <div className="premium-card overflow-hidden">
            <div className="admin-table-container">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="px-6 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Metadata Entry</th>
                    <th className="px-6 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Classification</th>
                    <th className="px-6 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Highlight</th>
                    <th className="px-6 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Sync Status</th>
                    <th className="px-6 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {content.map(item => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-14 bg-white/5 rounded overflow-hidden flex-shrink-0">
                            {item.coverImage ? (
                              <img src={item.coverImage} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-600">
                                <Database size={16} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white group-hover:text-electric-purple transition-colors truncate">{item.title}</p>
                            <p className="text-xs font-body text-gray-400 truncate max-w-xs">{item.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded bg-white/5 border border-white/10 text-xs font-body text-gray-300">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {item.isSuggested && (
                          <span className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-body font-bold text-amber-400 inline-flex items-center gap-1">
                            SUGGESTED
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {item.externalId ? (
                            <>
                              <CheckCircle2 size={14} className="text-spotify-green" />
                              <span className="text-xs font-body text-spotify-green">SYNCED ({item.source})</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle size={14} className="text-amber-500" />
                              <span className="text-xs font-body text-amber-500">MANUAL</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setForm({
                                ...EMPTY_FORM,
                                title: item.title,
                                category: item.category,
                                description: item.description,
                                discordLink: item.discordLink || '',
                                redditLink: item.redditLink || '',
                                externalId: item.externalId || '',
                                source: item.source || '',
                                coverImage: item.coverImage || '',
                                rating: item.rating != null ? String(item.rating) : '',
                                tagIds: item.tags?.map(t => t.id) || [],
                                isSuggested: item.isSuggested || false,
                              });
                              setEditId(item.id);
                              setShowForm(true);
                            }}
                            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : tab === 'tags' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="premium-card p-5 h-fit space-y-4">
              <h3 className="text-base font-display font-bold text-white">Initialize Tag</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-body uppercase tracking-wider text-gray-500 mb-1">Namespace</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-display outline-none text-gray-300"
                    value={tagForm.type}
                    onChange={e => setTagForm(f => ({ ...f, type: e.target.value }))}
                  >
                    {['Genre', 'Theme', 'Mood'].map(t => <option key={t} className="bg-charcoal">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-body uppercase tracking-wider text-gray-500 mb-1">Identifier</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-body outline-none text-white"
                    placeholder="e.g. Cyberpunk"
                    value={tagForm.name}
                    onChange={e => setTagForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <button
                  onClick={handleCreateTag}
                  disabled={savingTag || !tagForm.name.trim()}
                  className="btn-primary w-full"
                  style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                >
                  {savingTag ? <Loader2 className="animate-spin mx-auto" size={14} /> : 'Sync Tag to Index'}
                </button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {['Genre', 'Theme', 'Mood'].map(type => {
                const typeTags = tags.filter(t => t.type === type);
                if (typeTags.length === 0) return null;
                return (
                  <div key={type} className="space-y-3">
                    <h4 className="text-[10px] font-body uppercase tracking-widest text-gray-500 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-electric-purple" />
                      {type}s
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {typeTags.map(tag => (
                        <div key={tag.id} className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full bg-white/5 border border-white/10 group">
                          <span className="text-xs text-gray-300 font-display">{tag.name}</span>
                          <button
                            onClick={() => handleDeleteTag(tag.id)}
                            className="p-0.5 text-gray-500 hover:text-red-400 rounded-full"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : tab === 'users' ? (
          <div className="premium-card overflow-hidden">
            <div className="admin-table-container">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="px-6 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Member</th>
                    <th className="px-6 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Access Level</th>
                    <th className="px-6 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400">Joined</th>
                    <th className="px-6 py-4 font-display text-[10px] uppercase tracking-wider text-gray-400 text-right">System Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <UserCircle size={20} className="text-gray-500" />
                          <div>
                            <p className="text-sm font-semibold text-white">{user.username}</p>
                            <p className="text-xs font-body text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded text-xs font-body font-bold ${user.role === 'ADMIN' ? 'bg-electric-purple/10 text-electric-purple' : 'bg-white/5 text-gray-400'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-body text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleToggleRole(user)}
                          className="px-3 py-1 rounded font-display text-xs font-bold uppercase border border-white/10 hover:bg-white/5 text-gray-300"
                        >
                          {user.role === 'ADMIN' ? 'Revoke Admin' : 'Grant Admin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md bg-black/70 overflow-y-auto">
          <div className="w-full max-w-xl bg-charcoal border border-white/10 rounded-2xl shadow-2xl flex flex-col relative my-auto">
            <div className="h-1 bg-gradient-to-r from-electric-purple to-accent-violet rounded-t-2xl" />

            <div className="p-5 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-base font-display font-bold text-white">
                {editId ? 'Modify Record' : 'Create New Asset'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><XCircle size={20} /></button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[70vh] space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-body uppercase tracking-wider text-gray-500 mb-1">Category</label>
                  <select
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    value={form.category}
                    onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                  >
                    {CATEGORIES.map(c => <option key={c} className="bg-charcoal">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-body uppercase tracking-wider text-gray-500 mb-1">Rating (0-10)</label>
                  <input
                    type="number" step="0.1"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    value={form.rating}
                    onChange={(e) => setForm(f => ({ ...f, rating: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-body uppercase tracking-wider text-gray-500 mb-1">Full Title</label>
                <input
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-[10px] font-body uppercase tracking-wider text-gray-500 mb-1">Description</label>
                <textarea
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>

            <div className="p-4 border-t border-white/5 flex justify-end gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-xs font-display text-gray-500 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
                style={{ padding: '8px 20px', fontSize: '0.8rem' }}
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editId ? 'Commit' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}