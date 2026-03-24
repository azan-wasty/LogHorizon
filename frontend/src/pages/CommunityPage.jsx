import { 
  Trophy, 
  Search, 
  Link as LinkIcon, 
  Gamepad2, 
  Rocket, 
  ShieldCheck,
  Hexagon,
  Users,
  Activity
} from 'lucide-react';

export default function CommunityPage() {
  const features = [
    { icon: Trophy, title: 'Tournaments', desc: 'Digital anime/game tournaments with bracket tracking and leaderboards.', badge: 'Coming Soon', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { icon: Search, title: 'Opponent Search', desc: 'Find teams and players to challenge for matches across genres.', badge: 'Planned', color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { icon: LinkIcon, title: 'Discord Integration', desc: 'Browse and join community Discord servers for your favorite series.', badge: 'In Progress', color: 'text-discord-blue', bg: 'bg-discord-blue/10' },
    { icon: Gamepad2, title: 'Gaming Leagues', desc: 'Compete in digital gaming tournaments and see recommendations.', badge: 'Planned', color: 'text-spotify-green', bg: 'bg-spotify-green/10' },
  ];

  return (
    <div className="space-y-12 animate-fade-up">
      <header>
        <h1 className="text-4xl font-display font-bold text-white mb-2 tracking-tight">Community Nexus</h1>
        <p className="text-gray-500 italic font-body">Connect, compete, and collaborate within your local sectors.</p>
      </header>

      {/* Announcement Banner */}
      <div className="glass-panel p-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-electric-purple/10 blur-[100px] -mr-40 -mt-40 pointer-events-none group-hover:bg-electric-purple/20 transition-all duration-700" />
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="p-5 rounded-2xl bg-electric-purple shadow-[0_0_30px_rgba(124,58,237,0.4)]">
            <Rocket className="text-white w-10 h-10" fill="white" />
          </div>
          <div className="text-center md:text-left">
            <h3 className="text-2xl font-display font-bold text-white mb-2 tracking-tight">Systems Initialization</h3>
            <p className="text-gray-400 font-body max-w-xl italic leading-relaxed">
              Sprint 2 will introduce the <span className="text-electric-purple font-semibold">Nexus Tournament Framework</span>. Establish squads, track matches, and integrate your Discord hubs directly into the LogHorizon ecosystem.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Roadmap */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feat, i) => (
          <div 
            key={feat.title} 
            className="premium-card p-10 space-y-6 hover:-translate-y-1 transition-transform"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex justify-between items-start">
              <div className={`p-4 rounded-2xl ${feat.bg} ${feat.color}`}>
                <feat.icon size={28} />
              </div>
              <span className={`px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono font-bold uppercase tracking-widest ${feat.color}`}>
                {feat.badge}
              </span>
            </div>
            <div className="space-y-3">
              <h3 className="font-display font-bold text-white text-lg tracking-tight">{feat.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed font-body italic">{feat.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Platform Activity Mock */}
      <section className="pt-12">
        <div className="flex items-center gap-4 mb-10">
           <Activity className="text-electric-purple" />
           <h4 className="text-[10px] font-mono uppercase tracking-[0.4em] text-gray-700">Platform Synchrony Statistics</h4>
           <div className="h-px flex-1 bg-white/5" />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Neural Nodes', value: '—', icon: Users, color: 'text-gray-800' },
            { label: 'Active Brackets', value: '—', icon: Trophy, color: 'text-gray-800' },
            { label: 'Verified Sectors', value: '—', icon: ShieldCheck, color: 'text-gray-800' },
            { label: 'Sync Requests', value: '—', icon: Activity, color: 'text-gray-800' },
          ].map((stat, i) => (
            <div key={i} className="glass-panel p-8 text-center group border-transparent hover:border-white/5 transition-all">
               <p className="text-4xl font-display font-bold text-gray-800 mb-2 group-hover:text-white transition-colors">{stat.value}</p>
               <p className="text-[10px] font-mono uppercase tracking-widest text-gray-600 group-hover:text-gray-400 transition-colors">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
