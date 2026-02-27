import { Scissors, Sparkles, Music, GitCompare, ArrowRight, Zap, AudioWaveform, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const quickActions = [
  {
    to: '/app/separate',
    icon: Scissors,
    title: 'AI Stem Separation',
    desc: 'Isolate vocals and instruments with HTDemucs V4',
    gradient: 'from-rose-400 to-pink-500',
    bg: 'bg-rose-50/50',
    border: 'border-rose-100',
    iconColor: 'text-rose-500',
    hoverRing: 'group-hover:ring-rose-500/20',
  },
  {
    to: '/app/generate',
    icon: Sparkles,
    title: 'AI Music Generation',
    desc: 'Create professional tracks from text with Suno V5',
    gradient: 'from-emerald-400 to-teal-500',
    bg: 'bg-emerald-50/50',
    border: 'border-emerald-100',
    iconColor: 'text-emerald-500',
    hoverRing: 'group-hover:ring-emerald-500/20',
  },
  {
    to: '/app/compare',
    icon: GitCompare,
    title: 'Model Comparison',
    desc: 'Side-by-side analysis of Standard vs EDM models',
    gradient: 'from-violet-400 to-purple-500',
    bg: 'bg-violet-50/50',
    border: 'border-violet-100',
    iconColor: 'text-violet-500',
    hoverRing: 'group-hover:ring-violet-500/20',
  },
  {
    to: '/app/library',
    icon: Music,
    title: 'Your Library',
    desc: 'Manage your tracks, stems, and generated music',
    gradient: 'from-blue-400 to-cyan-500',
    bg: 'bg-blue-50/50',
    border: 'border-blue-100',
    iconColor: 'text-blue-500',
    hoverRing: 'group-hover:ring-blue-500/20',
  },
] as const;

const stats = [
  { icon: Scissors, label: 'Separation Engine', value: 'HTDemucs V4', color: 'text-rose-500', bg: 'bg-rose-50' },
  { icon: Zap, label: 'Vocal Boost', value: '+2.37 dB', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { icon: Sparkles, label: 'Generation Engine', value: 'Suno V5', color: 'text-teal-500', bg: 'bg-teal-50' },
  { icon: AudioWaveform, label: 'Audio Tools', value: 'BPM / EQ', color: 'text-violet-500', bg: 'bg-violet-50' },
] as const;

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
      <div className="max-w-5xl mx-auto space-y-10 pb-12">
        {/* Welcome header */}
        <header className="relative">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-emerald-200/30 rounded-full blur-3xl -z-10"></div>
          <div className="absolute top-0 right-20 w-48 h-48 bg-blue-200/30 rounded-full blur-3xl -z-10"></div>
          
          <div className="flex items-center gap-5 mb-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-gray-900/20 ring-4 ring-white">
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <h1 className="text-3xl font-medium tracking-tight text-gray-900">
                Welcome back, {user?.name ?? 'Musician'} 👋
              </h1>
              <p className="text-gray-500 mt-1 text-sm">Your AI-powered music production studio is ready.</p>
            </div>
          </div>
        </header>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ icon: Icon, label, value, color, bg }) => (
            <div
              key={label}
              className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 hover:shadow-md transition-all duration-300 group"
            >
              <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                <Icon size={20} className={color} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
                <p className="text-sm font-bold text-gray-900 truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-medium text-gray-900">
              Quick Start
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {quickActions.map(({ to, icon: Icon, title, desc, bg, border, iconColor, hoverRing }) => (
              <Link
                key={to}
                to={to}
                className={`group relative bg-white border border-gray-100 rounded-3xl p-6 hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300 hover:-translate-y-1 overflow-hidden ring-1 ring-transparent ${hoverRing}`}
              >
                {/* Background Accent */}
                <div className={`absolute top-0 right-0 w-32 h-32 ${bg} rounded-bl-full -mr-8 -mt-8 transition-transform duration-500 group-hover:scale-110`} />

                <div className="relative">
                  <div className="flex items-start justify-between mb-5">
                    <div className={`w-12 h-12 rounded-2xl ${bg} border ${border} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                      <Icon size={22} className={iconColor} aria-hidden="true" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                      <ArrowRight size={14} className="text-gray-600" aria-hidden="true" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1.5 text-lg">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-[85%]">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Research tip */}
        <div className="relative bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl p-8 overflow-hidden shadow-lg shadow-emerald-500/20 text-white">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" aria-hidden="true" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10" aria-hidden="true" />
          
          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0 shadow-inner">
              <Zap size={28} className="text-white" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/20 text-[11px] font-bold uppercase tracking-wider mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                New Feature
              </div>
              <h3 className="text-xl font-bold mb-1.5">EDM Enhanced Model is Live</h3>
              <p className="text-emerald-50 text-sm max-w-xl leading-relaxed">
                Fine-tuned on the MUSDB18 dataset, our new model achieves a +2.37 dB improvement in vocal SDR for electronic dance music.
              </p>
            </div>
            <Link
              to="/app/compare"
              className="shrink-0 flex items-center gap-2 text-sm font-bold text-emerald-600 bg-white hover:bg-emerald-50 px-6 py-3.5 rounded-xl transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              <Play size={16} className="fill-emerald-600" />
              Try it now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
