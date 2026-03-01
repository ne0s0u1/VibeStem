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

      {/* ─── Feature Section: 交替左右布局 ── */}
      {/* 图片占位说明：将来替换 imgSrc 为 Appwrite 预览 URL：
          `${APPWRITE_CONFIG.endpoint}/storage/buckets/${featuresBucketId}/files/<fileId>/preview?project=${projectId}` */}
      {[
        {
          title: 'AI 电子乐一键生成',
          desc: '内置 8 大 EDM 风格预设，覆盖 House、Techno、Trance、DnB 等主流方向。Suno V5 模型加持，从零开始创作一首完整 EDM 曲目只需 30 秒，支持自定义歌词、风格标签与参考音频。',
          points: ['8 大主流 EDM 风格预设', 'Suno V5 最新模型', '支持自定义歌词与风格', '结果即时入库，随时重放'],
          imgSrc: null, // 替换为 Appwrite 图片 URL
          imgPlaceholder: 'from-violet-400 via-purple-500 to-indigo-600',
          mockType: 'generate',
        },
        {
          title: '深度智能分轨',
          desc: 'HTDemucs V4 深度模型将混音拆分为人声、鼓、贝斯和其他乐器，EDM 优化微调版本 SDR 提升 +2.37 dB。波形同步播放，每轨独立音量控制，支持一键下载单轨文件。',
          points: ['HTDemucs V4 + EDM 微调', 'SDR +2.37 dB 品质提升', '人声 / 鼓 / 贝斯 / 旋律四轨输出', '逐轨波形播放与音量混音'],
          imgSrc: null,
          imgPlaceholder: 'from-rose-400 via-pink-500 to-fuchsia-600',
          mockType: 'separate',
        },
        {
          title: '双模型对比评估',
          desc: '将同一首歌同时送入官方 HTDemucs 与 EDM 微调模型，两组分轨结果左右并排展示，音量、波形、下载一应俱全，让差异一目了然，帮助你选出最佳分轨方案。',
          points: ['官方模型 vs EDM 微调模型', '双路并行推理', '左右波形同步对比', '独立下载任意模型输出'],
          imgSrc: null,
          imgPlaceholder: 'from-cyan-400 via-sky-500 to-blue-600',
          mockType: 'compare',
        },
      ].map(({ title, desc, points, imgSrc, imgPlaceholder, mockType }, idx) => {
        const isEven = idx % 2 === 1;
        const TextBlock = (
          <div className="flex flex-col justify-center py-8">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4 leading-tight">{title}</h2>
            <p className="text-gray-500 text-base leading-relaxed mb-6">{desc}</p>
            <ul className="space-y-2.5">
              {points.map(p => (
                <li key={p} className="flex items-center gap-2.5 text-sm font-medium text-gray-700">
                  <CheckCircle size={16} className="text-purple-500 shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        );
        const ImgBlock = (
          <div className="relative flex items-center justify-center py-8">
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={title}
                className="w-full max-w-md rounded-3xl shadow-2xl object-cover aspect-[4/3]"
              />
            ) : (
              /* 图片占位区 — 上传图片后替换为 <img> */
              <div className={`w-full max-w-md aspect-[4/3] rounded-3xl bg-gradient-to-br ${imgPlaceholder} shadow-2xl flex flex-col items-center justify-center gap-3 overflow-hidden relative`}>
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_30%,white,transparent)]" />
                {mockType === 'generate' && (
                  <div className="w-4/5 space-y-2 px-4">
                    {['House', 'Techno', 'Trance', 'Drum & Bass'].map((s, i) => (
                      <div key={s} className={`h-7 rounded-full bg-white/20 flex items-center px-3 text-white/80 text-xs font-semibold transition-all`} style={{ width: `${70 + i * 7}%` }}>{s}</div>
                    ))}
                    <div className="h-9 rounded-full bg-white/40 flex items-center justify-center text-white text-xs font-bold mt-3">✦ 开始生成</div>
                  </div>
                )}
                {mockType === 'separate' && (
                  <div className="w-4/5 space-y-2 px-2">
                    {[['人声', 'w-full'], ['鼓', 'w-4/5'], ['贝斯', 'w-3/5'], ['其他', 'w-11/12']].map(([label, w]) => (
                      <div key={label} className="flex items-center gap-2">
                        <span className="text-white/70 text-[10px] w-8 font-medium">{label}</span>
                        <div className={`h-4 ${w} rounded-full bg-white/25 relative overflow-hidden`}>
                          <div className="absolute inset-0 flex items-center px-1 gap-px">
                            {Array.from({ length: 20 }).map((_, i) => (
                              <div key={i} className="flex-1 rounded-full bg-white/50" style={{ height: `${30 + Math.random() * 60}%` }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {mockType === 'compare' && (
                  <div className="w-4/5 grid grid-cols-2 gap-2 px-1">
                    {['官方模型', '微调模型'].map(m => (
                      <div key={m} className="bg-white/15 rounded-xl p-2 space-y-1">
                        <p className="text-white/80 text-[10px] font-bold text-center">{m}</p>
                        {['人声', '鼓', '贝斯'].map(t => (
                          <div key={t} className="h-2 rounded-full bg-white/30" />
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
        return (
          <section key={title} className={`py-20 px-6 ${isEven ? 'bg-gray-50' : 'bg-white'}`}>
            <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
              {isEven ? <>{ImgBlock}{TextBlock}</> : <>{TextBlock}{ImgBlock}</>}
            </div>
          </section>
        );
      })}

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
