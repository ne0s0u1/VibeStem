import { Link } from 'react-router-dom';
import { Music, Scissors, Sparkles, GitCompare, ArrowRight, CheckCircle, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-md shadow-purple-500/20">
              <Music size={16} className="text-white" />
            </div>
            <span className="text-xl font-bold">EDMVibe</span>
          </div>
          <div className="flex items-center gap-3">
            {!loading && (
              user ? (
                <>
                  <span className="text-sm text-gray-500 hidden sm:block">
                    你好，<span className="font-semibold text-gray-800">{user.name}</span>
                  </span>
                  <Link
                    to="/app"
                    className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all duration-200"
                  >
                    <LayoutDashboard size={15} />
                    进入工作台
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    登录
                  </Link>
                  <Link
                    to="/register"
                    className="px-5 py-2 text-sm font-semibold bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all duration-200"
                  >
                    免费注册
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-28 px-6">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-100 rounded-full mix-blend-multiply blur-3xl opacity-60 animate-pulse" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-100 rounded-full mix-blend-multiply blur-3xl opacity-60 animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-100 rounded-full text-sm font-semibold text-purple-700 mb-8">
            <Sparkles size={14} />
            专为电子音乐打造 · EDM AI 创作平台
          </div>
          <h1 className="text-6xl font-extrabold tracking-tight text-gray-900 leading-tight mb-6">
            AI 电子乐生成
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600">
              强化分轨 · 在线处理
            </span>
          </h1>
          <p className="text-xl text-gray-500 mb-12 max-w-2xl mx-auto leading-relaxed">
            一键生成 House、Techno、Trance 等风格 EDM，HTDemucs V4 深度分轨，配合专业音频工具链，让电子音乐创作更自由。
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Link
                to="/app"
                className="inline-flex items-center gap-2.5 px-8 py-4 bg-gray-900 text-white font-semibold rounded-2xl hover:bg-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                进入工作台
                <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2.5 px-8 py-4 bg-gray-900 text-white font-semibold rounded-2xl hover:bg-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  开始使用
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2.5 px-8 py-4 bg-white text-gray-900 font-semibold rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-300"
                >
                  已有账号，直接登录
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">EDMVibe 核心功能</h2>
            <p className="text-gray-500 text-lg">AI 电子乐创作全流程，一站式完成</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Sparkles,
                color: 'violet',
                title: 'EDM AI 生成',
                desc: 'House、Techno、Trance、DnB 等多风格预设，Suno V5 一键生成',
              },
              {
                icon: Scissors,
                color: 'rose',
                title: '强化分轨',
                desc: 'HTDemucs V4 + EDM 微调模型，分离人声、Kick、Bass、Synth',
              },
              {
                icon: GitCompare,
                color: 'purple',
                title: '双模型对比',
                desc: '官方模型与 EDM 微调模型并排对比，直观评估',
              },
              {
                icon: Music,
                color: 'blue',
                title: '音频工具箱',
                desc: 'BPM 检测、EQ 均衡、Time Stretch，在线一站式处理',
              },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div
                key={title}
                className="bg-white rounded-3xl p-6 border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
              >
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 bg-${color}-50 border border-${color}-100`}
                >
                  <Icon size={22} className={`text-${color}-500`} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">为什么选择 EDMVibe</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              'House / Techno / Trance 等 8 大 EDM 风格预设按鈕',
              'EDM 优化微调模型，SDR +2.37 dB',
              '支持 MP3 / WAV / FLAC 常见格式',
              '纯 GPU 推理，分轨速度极快',
              'Appwrite 云端存储，安全可靠',
              '基于 wavesurfer.js 的专业波形显示',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <CheckCircle size={18} className="text-purple-500 shrink-0" />
                <span className="text-sm font-medium text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gray-900">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">开始创作</h2>
          <p className="text-gray-400 mb-10 text-lg">免费注册，马上体验 AI 电子乐生成与分轨</p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-purple-500 text-white font-bold rounded-2xl hover:bg-purple-400 transition-all duration-300 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:-translate-y-0.5"
          >
            免费注册
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-100 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} EDMVibe · 面向电子音乐的 AI 生成与分轨平台
      </footer>
    </div>
  );
}
