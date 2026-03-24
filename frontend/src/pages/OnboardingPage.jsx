import { useState, useEffect } from 'react';
import { preferences as prefApi } from '../api/client';
import { useToast } from '../hooks/useToast';
import { 
  Swords, 
  Compass, 
  Laugh, 
  Drama, 
  Sparkles, 
  Rocket, 
  Palmtree, 
  Zap, 
  Moon, 
  Droplet, 
  Users, 
  Sprout, 
  Skull, 
  Search,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Hexagon
} from 'lucide-react';

const STEPS = ['Genres', 'Moods', 'Themes'];

const ICONS = {
  // Genres
  Action: Swords, 
  Adventure: Compass, 
  Comedy: Laugh, 
  Drama: Drama,
  Fantasy: Sparkles, 
  'Sci-Fi': Rocket,
  // Moods
  Chill: Palmtree, 
  Hype: Zap, 
  Dark: Moon, 
  Emotional: Droplet,
  // Themes
  Friendship: Users, 
  'Coming of Age': Sprout, 
  Revenge: Skull, 
  Mystery: Search,
};

const TYPE_ORDER = ['Genre', 'Mood', 'Theme'];

export default function PreferenceWizard({ onComplete }) {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [options, setOptions] = useState({});
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    prefApi.getOptions()
      .then(d => {
        if (Object.keys(d.options || {}).length === 0) {
          return prefApi.seed().then(() => prefApi.getOptions()).then(d2 => setOptions(d2.options || {}));
        }
        setOptions(d.options || {});
      })
      .catch(() => toast('Could not load preferences', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const currentType = TYPE_ORDER[step];
  const currentOptions = options[currentType] || [];
  const progress = ((step + 1) / STEPS.length) * 100;

  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else handleFinish();
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await prefApi.set(selected);
      toast('Your taste profile is set!', 'success');
      onComplete();
    } catch {
      toast('Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-electric-purple animate-spin" />
        <p className="font-mono text-xs uppercase tracking-widest text-gray-500">Initializing Codex...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark text-white selection:bg-electric-purple/30 selection:text-white relative overflow-hidden flex flex-col items-center py-12 px-6">
      {/* Background ambient lighting */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-electric-purple/5 blur-[120px] pointer-events-none rounded-full" />
      
      <div className="w-full max-w-3xl relative z-10">
        {/* Header */}
        <header className="mb-12 animate-fade-up">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-electric-purple to-accent-violet flex items-center justify-center">
              <Hexagon className="w-5 h-5 text-white" fill="white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">
              Log<span className="text-electric-purple">Horizon</span>
            </span>
          </div>
          
          <h1 className="text-4xl font-display font-bold mb-3 tracking-tight">Refine your signature.</h1>
          <p className="text-gray-400 font-body text-lg italic">Select the traits that define your entertainment palette.</p>
        </header>

        {/* Steering / Progress */}
        <div className="mb-10 animate-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              {STEPS.map((s, i) => (
                <div 
                  key={s}
                  className={`px-4 py-1.5 rounded-full font-display text-[10px] uppercase tracking-widest border transition-all duration-300 ${
                    i === step 
                      ? 'bg-electric-purple/10 border-electric-purple/30 text-electric-purple shadow-[0_0_15px_rgba(124,58,237,0.1)]' 
                      : i < step 
                        ? 'bg-white/5 border-white/10 text-gray-500' 
                        : 'border-white/5 text-gray-700'
                  }`}
                >
                  {i < step ? 'Complete' : s}
                </div>
              ))}
            </div>
            <span className="font-mono text-[10px] text-gray-600 uppercase tracking-widest">Step {step + 1} of 3</span>
          </div>
          
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-electric-purple to-accent-violet shadow-[0_0_10px_rgba(124,58,237,0.5)] transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content Section */}
        <section className="mb-12 animate-fade-up" style={{ animationDelay: '200ms' }}>
           <div className="mb-8">
            <h2 className="text-xl font-display font-semibold text-white mb-2">
              {step === 0 && 'Which genres move you?'}
              {step === 1 && 'Define your typical mood.'}
              {step === 2 && 'What themes pull you in?'}
            </h2>
            <p className="text-sm text-gray-500">{selected.length} nodes selected in your grid.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {currentOptions.length === 0 ? (
              <div className="col-span-full py-20 text-center border border-dashed border-white/5 rounded-2xl">
                <Search className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-600 font-mono text-xs uppercase tracking-widest">No data available in this sector.</p>
              </div>
            ) : (
              currentOptions.map(opt => {
                const Icon = ICONS[opt.value] || Hexagon;
                const isSelected = selected.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => toggle(opt.id)}
                    className={`relative p-6 rounded-2xl border transition-all duration-300 text-left group overflow-hidden ${
                      isSelected 
                        ? 'bg-electric-purple/10 border-electric-purple/40 ring-1 ring-electric-purple/20 shadow-[0_0_30px_rgba(124,58,237,0.1)]' 
                        : 'bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className={`mb-4 w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300 ${
                      isSelected ? 'bg-electric-purple text-white' : 'bg-white/5 text-gray-500 group-hover:text-gray-300'
                    }`}>
                      <Icon size={20} />
                    </div>
                    
                    <span className={`font-display font-semibold transition-colors ${
                      isSelected ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                    }`}>
                      {opt.value}
                    </span>

                    {isSelected && (
                      <div className="absolute top-4 right-4 text-electric-purple">
                        <Check size={16} />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Navigation Actions */}
        <footer className="flex items-center justify-between border-t border-white/5 pt-8 animate-fade-up" style={{ animationDelay: '300ms' }}>
          <button
            onClick={() => step > 0 && setStep(s => s - 1)}
            disabled={step === 0}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-display font-semibold transition-all ${
              step === 0 ? 'opacity-0 pointer-events-none' : 'text-gray-500 hover:text-white'
            }`}
          >
            <ChevronLeft size={18} />
            Back
          </button>

          <div className="flex gap-4">
            <button 
              onClick={handleFinish}
              disabled={saving}
              className="px-6 py-2.5 text-sm font-display font-semibold text-gray-500 hover:text-white transition-colors"
            >
              Skip Setup
            </button>
            <button
              onClick={handleNext}
              disabled={saving}
              className="flex items-center gap-2 bg-electric-purple hover:bg-accent-violet text-white px-8 py-2.5 rounded-lg font-display font-semibold shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {step < STEPS.length - 1 ? 'Next' : 'Sync Profile'}
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
