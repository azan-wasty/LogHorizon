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
  ShieldAlert,
  ShieldCheck,
  MoreVertical,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Filter
} from 'lucide-react';

const CATEGORIES = ['Anime', 'Manga', 'Movie', 'TV', 'Book'];

const EMPTY_FORM = {
  title: '', category: 'Anime', description: '', discordLink: '',
  externalId: '', source: '', coverImage: '', rating: '',
  tagIds: [],
};

export default function ContentStudio() {
  const toast = useToast();
  const [tab, setTab] = useState('content'); // 'content' | 'tags' | 'users'
  const [content, setContent] = useState([]);
  const [tags, setTags] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Rapid Ingestion State
  const [ingestTitle, setIngestTitle] = useState('');
  const [ingestCategory, setIngestCategory] = useState('Anime');
  const [ingesting, setIngesting] = useState(false);

  // Tag creation
  const [tagForm, setTagForm] = useState({ type: 'Genre', name: '' });
  const [savingTag, setSavingTag] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [cd, td, ud] = await Promise.all([
        adminApi.listContent(), 
        adminApi.listTags(),
        adminApi.listUsers()
      ]);
      setContent(cd.content || []);
      setTags(td.tags || []);
      setUsers(ud.users || []);
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
      toast(`Successfully ingested ${res.content.title}`, 'success');
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

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-electric-purple/10 border border-electric-purple/20 text-[10px] font-mono font-bold uppercase tracking-widest text-electric-purple">
              Admin / Content Studio
            </span>
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-white flex items-center gap-3">
            <Layers className="text-electric-purple" />
            System Management
          </h1>
          <p className="text-gray-500 text-sm font-body italic">Advanced orchestration of the global entertainment index.</p>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={refresh}
            className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-electric-purple hover:bg-accent-violet text-white px-6 py-2.5 rounded-xl font-display font-semibold shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all hover:-translate-y-0.5"
          >
            <Plus size={18} />
            New Entry
          </button>
        </div>
      </header>

      {/* Stats Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Index', value: content.length, icon: Database, color: 'text-electric-purple', bg: 'bg-electric-purple/10' },
          { label: 'Active Tags', value: tags.length, icon: TagIcon, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
          { label: 'Ingested', value: content.filter(c => c.externalId).length, icon: Zap, color: 'text-spotify-green', bg: 'bg-spotify-green/10' },
          { label: 'Discord Linked', value: content.filter(c => c.discordLink).length, icon: ExternalLink, color: 'text-discord-blue', bg: 'bg-discord-blue/10' },
        ].map((stat, i) => (
          <div key={i} className="premium-card p-6 flex items-center gap-5">
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-2xl font-display font-bold text-white">{stat.value}</p>
              <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Automated Ingestion Section */}
      <section className="glass-panel p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-electric-purple/5 blur-[80px] -mr-32 -mt-32 pointer-events-none group-hover:bg-electric-purple/10 transition-all duration-500" />
        
        <div className="flex items-start gap-4 mb-8">
          <div className="p-3 rounded-xl bg-electric-purple shadow-[0_0_15px_rgba(124,58,237,0.3)]">
            <Zap className="text-white w-6 h-6" fill="white" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white">Rapid Ingestion Pipeline</h2>
            <p className="text-sm text-gray-500 font-body">Automated metadata mapping via Jikan, TMDB, and Google Books APIs.</p>
          </div>
        </div>

        <form onSubmit={handleRapidIngest} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text"
              placeholder="Enter exact title (e.g. Neon Genesis Evangelion)..."
              className="w-full bg-white/5 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-sm font-body focus:bg-white/[0.08] focus:border-electric-purple/40 focus:ring-1 focus:ring-electric-purple/20 transition-all outline-none text-white"
              value={ingestTitle}
              onChange={(e) => setIngestTitle(e.target.value)}
              disabled={ingesting}
            />
          </div>
          <select 
            className="bg-white/5 border border-white/5 rounded-xl px-6 py-3.5 text-sm font-display font-semibold outline-none focus:border-electric-purple/40 transition-all text-gray-400 cursor-pointer"
            value={ingestCategory}
            onChange={(e) => setIngestCategory(e.target.value)}
            disabled={ingesting}
          >
            {CATEGORIES.map(c => <option key={c} value={c} className="bg-charcoal text-white">{c}</option>)}
          </select>
          <button 
            type="submit"
            disabled={ingesting || !ingestTitle.trim()}
            className="bg-electric-purple hover:bg-accent-violet text-white px-8 py-3.5 rounded-xl font-display font-bold tracking-tight shadow-[0_0_20px_rgba(124,58,237,0.3)] flex items-center justify-center gap-2 min-w-[160px] transition-all disabled:opacity-50 disabled:translate-y-0 active:scale-95"
          >
            {ingesting ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
            {ingesting ? 'Injecting...' : 'Start Ingest'}
          </button>
        </form>
      </section>

      {/* Tabs / Management Section */}
      <section className="space-y-6">
        <div className="flex border-b border-white/5">
          {['content', 'tags', 'users'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-8 py-4 font-display text-sm font-bold uppercase tracking-widest transition-all relative ${
                tab === t ? 'text-electric-purple' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {t}
              {tab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-electric-purple shadow-[0_0_10px_rgba(124,58,237,0.5)]" />}
            </button>
          ))}
        </div>

        {tab === 'content' ? (
          <div className="glass-panel overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-4 font-display text-[10px] uppercase tracking-widest text-gray-500">Metadata Entry</th>
                  <th className="px-6 py-4 font-display text-[10px] uppercase tracking-widest text-gray-500">Classification</th>
                  <th className="px-6 py-4 font-display text-[10px] uppercase tracking-widest text-gray-500">Sync Status</th>
                  <th className="px-6 py-4 font-display text-[10px] uppercase tracking-widest text-gray-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {content.map(item => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-14 bg-white/5 rounded-md overflow-hidden flex-shrink-0">
                          {item.coverImage ? (
                            <img src={item.coverImage} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600">
                              <Database size={16} />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white group-hover:text-electric-purple transition-colors">{item.title}</p>
                          <p className="text-[10px] font-mono text-gray-500 truncate max-w-[200px]">{item.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-gray-400">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {item.externalId ? (
                          <>
                            <CheckCircle2 size={14} className="text-spotify-green" />
                            <span className="text-[10px] font-mono text-spotify-green">SYNCED ({item.source})</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={14} className="text-amber-500" />
                            <span className="text-[10px] font-mono text-amber-500">MANUAL</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setForm({
                              ...EMPTY_FORM,
                              title: item.title,
                              category: item.category,
                              description: item.description,
                              discordLink: item.discordLink || '',
                              externalId: item.externalId || '',
                              source: item.source || '',
                              coverImage: item.coverImage || '',
                              rating: item.rating != null ? String(item.rating) : '',
                              tagIds: item.tags?.map(t => t.id) || [],
                            });
                            setEditId(item.id);
                            setShowForm(true);
                          }}
                          className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {content.length === 0 && (
              <div className="py-20 text-center">
                <Filter className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">Database is empty.</p>
              </div>
            )}
          </div>
        ) : tab === 'tags' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Create tag */}
            <div className="glass-panel p-6 h-fit space-y-6">
              <h3 className="text-lg font-display font-bold text-white">Initialize Tag</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">Namespace</label>
                  <select 
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm font-display outline-none focus:border-electric-purple/40 text-gray-400 transition-all"
                    value={tagForm.type} 
                    onChange={e => setTagForm(f => ({ ...f, type: e.target.value }))}
                  >
                    {['Genre', 'Theme', 'Mood'].map(t => <option key={t} className="bg-charcoal">{t}</option>)}
                  </select>
                </div>
                <div>
                   <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">Identifier</label>
                   <input 
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm font-body outline-none focus:border-electric-purple/40 text-white transition-all"
                    placeholder="e.g. Cyberpunk"
                    value={tagForm.name}
                    onChange={e => setTagForm(f => ({ ...f, name: e.target.value }))}
                   />
                </div>
                <button 
                  onClick={handleCreateTag}
                  disabled={savingTag || !tagForm.name.trim()}
                  className="w-full bg-electric-purple hover:bg-accent-violet text-white py-3 rounded-xl font-display font-semibold transition-all shadow-[0_0_15px_rgba(124,58,237,0.2)] disabled:opacity-50"
                >
                  {savingTag ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Sync Tag to Index'}
                </button>
              </div>
            </div>

            {/* Tag List */}
            <div className="lg:col-span-2 space-y-8">
              {['Genre', 'Theme', 'Mood'].map(type => {
                const typeTags = tags.filter(t => t.type === type);
                if (typeTags.length === 0) return null;
                return (
                  <div key={type} className="space-y-4">
                    <h4 className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-600 flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-electric-purple" />
                       {type}s
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {typeTags.map(tag => (
                        <div key={tag.id} className="flex items-center gap-2 pl-4 pr-2 py-2 rounded-full bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                          <span className="text-sm text-gray-300 font-display font-medium">{tag.name}</span>
                          <button 
                            onClick={() => handleDeleteTag(tag.id)}
                            className="p-1 text-gray-600 hover:text-red-400 hover:bg-red-400/10 rounded-full transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="glass-panel overflow-hidden">
             <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-4 font-display text-[10px] uppercase tracking-widest text-gray-500">Member Identifier</th>
                  <th className="px-6 py-4 font-display text-[10px] uppercase tracking-widest text-gray-500">Access Level</th>
                  <th className="px-6 py-4 font-display text-[10px] uppercase tracking-widest text-gray-500">Linked Since</th>
                  <th className="px-6 py-4 font-display text-[10px] uppercase tracking-widest text-gray-500 text-right">System Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                             user.role === 'ADMIN' ? 'bg-electric-purple/20 text-electric-purple' : 'bg-white/5 text-gray-600'
                          }`}>
                             <UserCircle size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{user.username}</p>
                            <p className="text-[10px] font-mono text-gray-500">{user.email}</p>
                          </div>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-2">
                         {user.role === 'ADMIN' ? (
                           <span className="px-2 py-1 rounded bg-electric-purple/10 border border-electric-purple/20 text-[10px] font-mono font-bold text-electric-purple flex items-center gap-1.5">
                             <ShieldCheck size={12} />
                             MODERATOR
                           </span>
                         ) : (
                           <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-gray-400 flex items-center gap-1.5">
                             <UserCircle size={12} />
                             STANDARD
                           </span>
                         )}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <span className="text-[10px] font-mono text-gray-500 uppercase">
                         {new Date(user.createdAt).toLocaleDateString()}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                       <button
                         onClick={() => handleToggleRole(user)}
                         className={`px-4 py-1.5 rounded-lg font-display text-[10px] font-bold uppercase tracking-wider transition-all border ${
                           user.role === 'ADMIN' 
                             ? 'text-red-400 border-red-400/10 hover:bg-red-400/10' 
                             : 'text-electric-purple border-electric-purple/10 hover:bg-electric-purple/10'
                         }`}
                       >
                         {user.role === 'ADMIN' ? 'Revoke Access' : 'Grant Admin'}
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Manual Entry Form Modal (Keep condensed) */}
      {showForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 backdrop-blur-md bg-black/60 overflow-y-auto">
          <div className="w-full max-w-2xl bg-charcoal border border-white/10 rounded-2xl shadow-2xl flex flex-col relative animate-fade-up">
            <div className="h-1.5 bg-gradient-to-r from-electric-purple to-accent-violet rounded-t-2xl" />
            
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <h2 className="text-xl font-display font-bold text-white">
                {editId ? 'Modify Record' : 'Create New Asset'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><XCircle size={24} /></button>
            </div>

            <div className="p-8 overflow-y-auto max-h-[70vh] space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                   <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">Category</label>
                   <select 
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none"
                    value={form.category} 
                    onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                   >
                     {CATEGORIES.map(c => <option key={c} className="bg-charcoal">{c}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">Rating (0-10)</label>
                   <input 
                    type="number" step="0.1"
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none"
                    value={form.rating}
                    onChange={(e) => setForm(f => ({ ...f, rating: e.target.value }))}
                   />
                </div>
              </div>

              <div>
                 <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">Full Title</label>
                 <input 
                  className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none"
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                 />
              </div>

              <div>
                 <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">Detailed Narrative</label>
                 <textarea 
                  rows={4}
                  className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none"
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                 />
              </div>

               <div className="grid grid-cols-2 gap-6">
                 <div>
                   <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">Source Origin</label>
                   <input 
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none text-gray-400"
                    placeholder="Manual"
                    value={form.source}
                    onChange={(e) => setForm(f => ({ ...f, source: e.target.value }))}
                   />
                </div>
                <div>
                   <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">Discord ID</label>
                   <input 
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-sm text-white outline-none"
                    value={form.discordLink}
                    onChange={(e) => setForm(f => ({ ...f, discordLink: e.target.value }))}
                   />
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-white/5 flex justify-end gap-4">
              <button 
                onClick={() => setShowForm(false)}
                className="px-6 py-2.5 text-sm font-display font-semibold text-gray-500 hover:text-white transition-colors"
              >
                Discard
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="bg-electric-purple hover:bg-accent-violet text-white px-8 py-2.5 rounded-lg font-display font-semibold shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all flex items-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {editId ? 'Commit Record' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
