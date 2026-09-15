import { useState, useEffect, useCallback } from 'react';
import { admin as adminApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import {
  Plus, Search, Trash2, Edit3, Zap, Database, Tag as TagIcon,
  Layers, ExternalLink, RefreshCw, UserCircle, CheckCircle2,
  AlertCircle, Loader2, Compass, X, ChevronLeft, ChevronRight, Check
} from 'lucide-react';

const CATEGORIES = ['Anime', 'Manga', 'Movie', 'TV'];

export default function ContentStudio() {
  const toast = useToast();
  const [tab, setTab] = useState('content');
  const [tags, setTags] = useState([]);
  const [users, setUsers] = useState([]);
  const [discordApprovals, setDiscordApprovals] = useState([]);
  const [subredditApprovals, setSubredditApprovals] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Aggregated Stats state
  const [stats, setStats] = useState({
    totalContent: 0,
    activeTags: 0,
    syncedContent: 0,
    discordLinks: 0,
    redditLinks: 0
  });

  // Content Search & Pagination state
  const [content, setContent] = useState([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  // Edit Content Modal state
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    category: 'Anime',
    description: '',
    rating: '',
    status: '',
    coverImage: '',
    bannerImage: '',
    totalEpisodes: '',
    totalChapters: '',
    discordLink: '',
    redditLink: ''
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Ingestion state
  const [ingestTitle, setIngestTitle] = useState('');
  const [ingestCategory, setIngestCategory] = useState('Anime');
  const [ingesting, setIngesting] = useState(false);

  // Fetch paginated content
  const fetchContent = useCallback(async (targetPage = 1, query = activeQuery, category = searchCategory) => {
    setContentLoading(true);
    try {
      const res = await adminApi.listContent({
        page: targetPage,
        limit: 20,
        search: query || undefined,
        category: category !== 'ALL' ? category : undefined
      });
      if (res.ok) {
        setContent(res.content || []);
        setPage(res.page || 1);
        setTotalPages(res.totalPages || 1);
        setTotalResults(res.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch content:', err);
      toast('Failed to load content list', 'error');
    } finally {
      setContentLoading(false);
    }
  }, [activeQuery, searchCategory, toast]);

  // General data refresh (stats, tags, users, approvals)
  const refresh = async () => {
    setLoading(true);
    try {
      const [statsRes, td, ud, dd, sd, ed] = await Promise.all([
        adminApi.stats().catch(() => ({ stats: {} })),
        adminApi.listTags(),
        adminApi.listUsers(),
        adminApi.listDiscordRecommendations({ status: 'PENDING' }),
        adminApi.listSubredditRecommendations({ status: 'PENDING' }),
        adminApi.listPendingEvents().catch(() => ({ events: [] })),
      ]);

      if (statsRes.stats) {
        setStats(statsRes.stats);
      }
      setTags(td.tags || []);
      setUsers(ud.users || []);
      setDiscordApprovals(dd.recommendations || []);
      setSubredditApprovals(sd.recommendations || []);
      setPendingEvents(ed.events || []);

      // Also fetch content page 1
      await fetchContent(page);
    } catch (err) {
      console.error('Refresh error:', err);
      toast('Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // Trigger search
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setActiveQuery(searchQuery);
    setPage(1);
    fetchContent(1, searchQuery, searchCategory);
  };

  const handleCategoryFilterChange = (newCat) => {
    setSearchCategory(newCat);
    setPage(1);
    fetchContent(1, activeQuery, newCat);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveQuery('');
    setPage(1);
    fetchContent(1, '', searchCategory);
  };

  // Open Edit Modal
  const openEditModal = (item) => {
    setEditingItem(item);
    setEditForm({
      title: item.title || '',
      category: item.category || 'Anime',
      description: item.description || '',
      rating: item.rating !== null && item.rating !== undefined ? String(item.rating) : '',
      status: item.status || '',
      coverImage: item.coverImage || '',
      bannerImage: item.bannerImage || '',
      totalEpisodes: item.totalEpisodes ? String(item.totalEpisodes) : '',
      totalChapters: item.totalChapters ? String(item.totalChapters) : '',
      discordLink: item.discordLink || '',
      redditLink: item.redditLink || ''
    });
  };

  // Save Edit Content
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editForm.title.trim()) {
      toast('Title is required', 'error');
      return;
    }

    setSavingEdit(true);
    try {
      const payload = {
        title: editForm.title.trim(),
        category: editForm.category,
        description: editForm.description.trim(),
        rating: editForm.rating ? parseFloat(editForm.rating) : null,
        status: editForm.status.trim() || null,
        coverImage: editForm.coverImage.trim() || null,
        bannerImage: editForm.bannerImage.trim() || null,
        totalEpisodes: editForm.totalEpisodes ? parseInt(editForm.totalEpisodes, 10) : null,
        totalChapters: editForm.totalChapters ? parseInt(editForm.totalChapters, 10) : null,
        discordLink: editForm.discordLink.trim() || null,
        redditLink: editForm.redditLink.trim() || null,
      };

      const res = await adminApi.updateContent(editingItem.id, payload);
      if (res.ok) {
        toast(`"${payload.title}" updated successfully`, 'success');
        setContent(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...res.content } : item));
        setEditingItem(null);
      } else {
        throw new Error(res.message || 'Update failed');
      }
    } catch (err) {
      console.error('Update failed:', err);
      toast(`Failed to update title: ${err.message}`, 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  // Single-title ingest via /admin/content/ingest
  const handleIngest = async () => {
    if (ingesting) return;

    const targetTitle = ingestTitle.trim();
    if (!targetTitle) {
      toast('Please enter a title to ingest', 'error');
      return;
    }

    setIngesting(true);
    try {
      const result = await adminApi.ingestContent({ title: targetTitle, category: ingestCategory });
      if (result?.ok === false) throw new Error(result.message || 'Ingestion failed');
      toast(`"${targetTitle}" ingested successfully`, 'success');
      setIngestTitle('');
      refresh();
    } catch (err) {
      console.error('Ingestion failed:', err);
      toast(`Ingestion error: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIngesting(false);
    }
  };

  // Bulk auto-discovery via /admin/content/discover
  const handleDiscover = async (cat) => {
    if (ingesting) return;
    setIngesting(true);
    try {
      const result = await adminApi.discoverContent({ category: cat, mode: 'popular', pages: 3 });
      if (result?.ok === false) throw new Error(result.message || 'Discovery failed');
      const s = result?.stats;
      toast(`Discovered ${cat}: +${s?.ingested ?? 0} new, ${s?.skipped ?? 0} skipped`, 'success');
      refresh();
    } catch (err) {
      console.error('Discovery failed:', err);
      toast(`Discovery error: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setIngesting(false);
    }
  };

  const handleDeleteContent = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await adminApi.deleteContent(id);
      toast(`"${title}" deleted`, 'success');
      setContent(prev => prev.filter(c => c.id !== id));
      setTotalResults(t => Math.max(0, t - 1));
      setStats(s => ({ ...s, totalContent: Math.max(0, s.totalContent - 1) }));
    } catch (err) {
      toast(`Delete failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteUser = async (id, username) => {
    if (!window.confirm(`Are you sure you want to permanently delete user @${username}? This will remove all their library items, ratings, reviews, and activity.`)) return;
    try {
      await adminApi.deleteUser(id);
      toast(`User @${username} deleted successfully`, 'success');
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      toast(`Failed to delete user: ${err.message}`, 'error');
    }
  };

  const handleApproveDiscord = async (id) => {
    try {
      await adminApi.updateDiscordRecommendation(id, 'APPROVED');
      toast('Discord link approved', 'success');
      setDiscordApprovals(prev => prev.filter(d => d.id !== id));
      setStats(s => ({ ...s, discordLinks: s.discordLinks + 1 }));
    } catch (err) {
      console.error('Discord approval error:', err);
      toast(`Failed to approve: ${err.message}`, 'error');
    }
  };

  const handleRejectDiscord = async (id) => {
    try {
      await adminApi.updateDiscordRecommendation(id, 'REJECTED');
      toast('Discord link rejected', 'success');
      setDiscordApprovals(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      toast(`Failed to reject: ${err.message}`, 'error');
    }
  };

  const handleApproveSubreddit = async (id) => {
    try {
      await adminApi.updateSubredditRecommendation(id, 'APPROVED');
      toast('Subreddit link approved', 'success');
      setSubredditApprovals(prev => prev.filter(s => s.id !== id));
      setStats(s => ({ ...s, redditLinks: s.redditLinks + 1 }));
    } catch (err) {
      console.error('Subreddit approval error:', err);
      toast(`Failed to approve: ${err.message}`, 'error');
    }
  };

  const handleRejectSubreddit = async (id) => {
    try {
      await adminApi.updateSubredditRecommendation(id, 'REJECTED');
      toast('Subreddit link rejected', 'success');
      setSubredditApprovals(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      toast(`Failed to reject: ${err.message}`, 'error');
    }
  };

  const handleApproveEvent = async (id) => {
    try {
      await adminApi.approveEvent(id, 'APPROVED');
      toast('Event approved', 'success');
      setPendingEvents(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      toast(`Failed to approve event: ${err.message}`, 'error');
    }
  };

  const handleRejectEvent = async (id) => {
    try {
      await adminApi.approveEvent(id, 'REJECTED');
      toast('Event rejected', 'success');
      setPendingEvents(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      toast(`Failed to reject event: ${err.message}`, 'error');
    }
  };

  const TAB_NAMES = {
    content: `Content (${totalResults})`,
    tags: `Tags (${tags.length})`,
    users: `Users (${users.length})`,
    discord: `Discord Links (${discordApprovals.length})`,
    subreddit: `Subreddit Links (${subredditApprovals.length})`,
    events: `Events (${pendingEvents.length})`
  };

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '24px', boxSizing: 'border-box', color: '#fff' }}>

      {/* 1. Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', gap: '16px', flexWrap: 'wrap' }}>
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

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={refresh}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '10px', padding: '10px', cursor: 'pointer' }}
            title="Refresh All Data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Stats Grid Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Index', value: stats.totalContent || 0, icon: Database, color: '#a855f7' },
          { label: 'Active Tags', value: stats.activeTags || tags.length, icon: TagIcon, color: '#06b6d4' },
          { label: 'Synced API', value: stats.syncedContent || 0, icon: Zap, color: '#10b981' },
          { label: 'Discord Linked', value: stats.discordLinks || 0, icon: ExternalLink, color: '#6366f1' },
          { label: 'Reddit Linked', value: stats.redditLinks || 0, icon: Search, color: '#f97316' },
        ].map((stat, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '10px', borderRadius: '10px', background: `${stat.color}15` }}>
              <stat.icon color={stat.color} size={20} />
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', lineHeight: '1' }}>{stat.value.toLocaleString()}</div>
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

        <div style={{ display: 'flex', gap: '10px', width: '100%', flexWrap: 'wrap' }}>
          <input
            disabled={ingesting}
            style={{ flex: 1, minWidth: '240px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '12px', outline: 'none', opacity: ingesting ? 0.5 : 1 }}
            placeholder="Enter exact title (e.g. Neon Genesis Evangelion)..."
            value={ingestTitle}
            onChange={(e) => setIngestTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleIngest()}
          />
          <select
            disabled={ingesting}
            value={ingestCategory}
            onChange={(e) => setIngestCategory(e.target.value)}
            style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0 14px', color: '#fff', fontSize: '12px', outline: 'none', cursor: 'pointer', opacity: ingesting ? 0.5 : 1, minHeight: '40px' }}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={() => handleIngest()}
            disabled={ingesting}
            style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '10px', padding: '0 20px', fontWeight: 'bold', fontSize: '11px', cursor: ingesting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', opacity: ingesting ? 0.7 : 1, minHeight: '40px' }}
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
          {CATEGORIES.map(cat => (
            <div
              key={cat}
              onClick={() => handleDiscover(cat)}
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

      {/* 6. Content Tab Viewport with Search & Pagination */}
      {tab === 'content' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Search & Filter Bar */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 12px' }}>
              <Search size={15} color="#888" />
              <input
                style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '12px', width: '100%', outline: 'none' }}
                placeholder="Search titles by name or description..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: 0 }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <select
              value={searchCategory}
              onChange={e => handleCategoryFilterChange(e.target.value)}
              style={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>

            <button
              type="submit"
              disabled={contentLoading}
              style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {contentLoading ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
              Search
            </button>
          </form>

          {/* Table Container */}
          <div style={{ width: '100%', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#888' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>METADATA ENTRY</th>
                  <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>CLASSIFICATION</th>
                  <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>RATING</th>
                  <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>SYNC STATUS</th>
                  <th style={{ padding: '12px 16px', fontWeight: 'bold', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {contentLoading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                      <Loader2 size={24} color="#a855f7" className="animate-spin" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                      Loading content catalog...
                    </td>
                  </tr>
                ) : content.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: '#777' }}>
                      No content records matching the query.
                    </td>
                  </tr>
                ) : content.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '48px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
                          {item.coverImage && <img src={item.coverImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
                        </div>
                        <div style={{ maxWidth: '300px', overflow: 'hidden' }}>
                          <div style={{ fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                          <div style={{ fontSize: '11px', color: '#777', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.description || 'No description'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', color: '#ccc' }}>
                        {item.category}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#fbbf24', fontWeight: 'bold' }}>
                      {item.rating ? `★ ${item.rating.toFixed(1)}` : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ color: item.externalId ? '#10b981' : '#f59e0b', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {item.externalId ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                        {item.externalId ? 'SYNCED' : 'MANUAL'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', alignItems: 'center' }}>
                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(item)}
                          style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}
                          title="Edit Title Details"
                        >
                          <Edit3 size={13} />
                        </button>
                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteContent(item.id, item.title)}
                          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', fontSize: '12px', color: '#888' }}>
              <div>
                Showing Page <span style={{ color: '#fff', fontWeight: 'bold' }}>{page}</span> of <span style={{ color: '#fff', fontWeight: 'bold' }}>{totalPages}</span> ({totalResults} total entries)
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  disabled={page <= 1 || contentLoading}
                  onClick={() => {
                    const prev = Math.max(1, page - 1);
                    fetchContent(prev);
                  }}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: page <= 1 ? '#555' : '#fff', borderRadius: '8px', padding: '6px 12px', cursor: page <= 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <button
                  disabled={page >= totalPages || contentLoading}
                  onClick={() => {
                    const next = Math.min(totalPages, page + 1);
                    fetchContent(next);
                  }}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: page >= totalPages ? '#555' : '#fff', borderRadius: '8px', padding: '6px 12px', cursor: page >= totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. Tags Tab Viewport */}
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

      {/* 8. Users Tab Viewport (Role modification & User Deletion) */}
      {tab === 'users' && (
        <div style={{ width: '100%', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#888' }}>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>USER</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>EMAIL</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>ROLE</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#777' }}>No users found.</td></tr>
              ) : users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserCircle size={16} color="#a855f7" /> {user.username || user.name}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#aaa' }}>{user.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: user.role === 'ADMIN' ? 'rgba(239,68,68,0.12)' : 'rgba(168,85,247,0.1)',
                      color: user.role === 'ADMIN' ? '#ef4444' : '#a855f7',
                      padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold'
                    }}>
                      {user.role || 'USER'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                      <button
                        onClick={async () => {
                          const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
                          try {
                            await adminApi.updateUserRole(user.id, newRole);
                            toast(`${user.username} is now ${newRole}`, 'success');
                            setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
                          } catch (err) {
                            toast(`Failed to update role: ${err.message}`, 'error');
                          }
                        }}
                        style={{
                          background: user.role === 'ADMIN' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                          border: `1px solid ${user.role === 'ADMIN' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                          color: user.role === 'ADMIN' ? '#ef4444' : '#10b981',
                          borderRadius: '6px', padding: '4px 10px', cursor: 'pointer',
                          fontWeight: 'bold', fontSize: '10px', whiteSpace: 'nowrap'
                        }}
                      >
                        {user.role === 'ADMIN' ? '⬇ Demote to User' : '⬆ Make Admin'}
                      </button>

                      <button
                        onClick={() => handleDeleteUser(user.id, user.username)}
                        style={{
                          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                          color: '#ef4444', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer'
                        }}
                        title="Delete User permanently"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 9. Discord Tab Viewport */}
      {tab === 'discord' && (
        <div style={{ width: '100%', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#888' }}>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>TITLE / ENTRY</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>DISCORD LINK</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>SUBMITTED BY</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {discordApprovals.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#777' }}>No pending Discord link approvals.</td></tr>
              ) : discordApprovals.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{item.content?.title || `Content #${item.contentId}`}</td>
                  <td style={{ padding: '12px 16px', color: '#6366f1' }}>{item.inviteLink}</td>
                  <td style={{ padding: '12px 16px', color: '#777', fontSize: '11px' }}>{item.user?.username}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button onClick={() => handleApproveDiscord(item.id)} style={{ background: '#10b981', border: 'none', color: '#fff', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>Approve</button>
                    <button onClick={() => handleRejectDiscord(item.id)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 10. Subreddit Tab Viewport */}
      {tab === 'subreddit' && (
        <div style={{ width: '100%', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#888' }}>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>TITLE / ENTRY</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>SUBREDDIT</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>SUBMITTED BY</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {subredditApprovals.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#777' }}>No pending Subreddit link approvals.</td></tr>
              ) : subredditApprovals.map(item => (
                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{item.content?.title || `Content #${item.contentId}`}</td>
                  <td style={{ padding: '12px 16px', color: '#f97316' }}>r/{item.subreddit}</td>
                  <td style={{ padding: '12px 16px', color: '#777', fontSize: '11px' }}>{item.user?.username}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button onClick={() => handleApproveSubreddit(item.id)} style={{ background: '#10b981', border: 'none', color: '#fff', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>Approve</button>
                    <button onClick={() => handleRejectSubreddit(item.id)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 11. Events Tab Viewport */}
      {tab === 'events' && (
        <div style={{ width: '100%', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#888' }}>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>EVENT NAME</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>TYPE</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>HOST</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold' }}>STARTS</th>
                <th style={{ padding: '12px 16px', fontWeight: 'bold', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {pendingEvents.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#777' }}>No pending events found.</td></tr>
              ) : pendingEvents.map(event => (
                <tr key={event.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{event.title}</td>
                  <td style={{ padding: '12px 16px', color: '#a855f7', fontSize: '11px' }}>{event.type}</td>
                  <td style={{ padding: '12px 16px', color: '#aaa', fontSize: '11px' }}>{event.host?.username || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#aaa', fontSize: '11px' }}>{event.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBD'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button onClick={() => handleApproveEvent(event.id)} style={{ background: '#10b981', border: 'none', color: '#fff', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>Approve</button>
                    <button onClick={() => handleRejectEvent(event.id)} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 12. Edit Content Modal */}
      {editingItem && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto',
            background: '#14141f', border: '1px solid rgba(168,85,247,0.3)',
            borderRadius: '20px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Edit3 color="#a855f7" size={20} />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
                  Edit Title Metadata <span style={{ color: '#888', fontSize: '13px' }}>#{editingItem.id}</span>
                </h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Title & Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '6px', fontWeight: '600' }}>TITLE *</label>
                  <input
                    required
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none' }}
                    value={editForm.title}
                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '6px', fontWeight: '600' }}>CATEGORY</label>
                  <select
                    style={{ width: '100%', boxSizing: 'border-box', background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
                    value={editForm.category}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '6px', fontWeight: '600' }}>DESCRIPTION</label>
                <textarea
                  rows={3}
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '12px', outline: 'none', resize: 'vertical' }}
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>

              {/* Rating & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '6px', fontWeight: '600' }}>RATING (0.0 - 10.0)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    placeholder="e.g. 8.5"
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none' }}
                    value={editForm.rating}
                    onChange={e => setEditForm({ ...editForm, rating: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '6px', fontWeight: '600' }}>STATUS</label>
                  <input
                    placeholder="e.g. Finished Airing, Publishing"
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none' }}
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  />
                </div>
              </div>

              {/* Episodes / Chapters */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '6px', fontWeight: '600' }}>TOTAL EPISODES</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 24"
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none' }}
                    value={editForm.totalEpisodes}
                    onChange={e => setEditForm({ ...editForm, totalEpisodes: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '6px', fontWeight: '600' }}>TOTAL CHAPTERS</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 100"
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '13px', outline: 'none' }}
                    value={editForm.totalChapters}
                    onChange={e => setEditForm({ ...editForm, totalChapters: e.target.value })}
                  />
                </div>
              </div>

              {/* Cover Image URL */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '6px', fontWeight: '600' }}>COVER IMAGE URL</label>
                <input
                  placeholder="https://..."
                  style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '12px', outline: 'none' }}
                  value={editForm.coverImage}
                  onChange={e => setEditForm({ ...editForm, coverImage: e.target.value })}
                />
              </div>

              {/* Discord & Reddit Links */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '6px', fontWeight: '600' }}>DISCORD INVITE LINK</label>
                  <input
                    placeholder="https://discord.gg/..."
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '12px', outline: 'none' }}
                    value={editForm.discordLink}
                    onChange={e => setEditForm({ ...editForm, discordLink: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#aaa', marginBottom: '6px', fontWeight: '600' }}>REDDIT SUBREDDIT / LINK</label>
                  <input
                    placeholder="e.g. anime or r/anime"
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#fff', fontSize: '12px', outline: 'none' }}
                    value={editForm.redditLink}
                    onChange={e => setEditForm({ ...editForm, redditLink: e.target.value })}
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => setEditingItem(null)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#ccc', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer', fontSize: '12px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 22px', fontWeight: 'bold', fontSize: '12px', cursor: savingEdit ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {savingEdit ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}