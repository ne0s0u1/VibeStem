import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Music,
  Scissors,
  Sparkles,
  GitCompare,
  History,
  LogOut,
  LayoutDashboard,
  ChevronLeft,
} from 'lucide-react';

const navItems = [
  { to: '/app', icon: LayoutDashboard, label: '工作台', color: 'emerald' },
  { to: '/app/generate', icon: Sparkles, label: 'AI 生成', color: 'teal' },
  { to: '/app/separate', icon: Scissors, label: '智能分轨', color: 'rose' },
  { to: '/app/compare', icon: GitCompare, label: '模型对比', color: 'violet' },
  { to: '/app/history', icon: History, label: '任务历史', color: 'amber' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside
      className="w-[280px] bg-white/80 backdrop-blur-xl border-r border-gray-100/50 flex flex-col h-screen shrink-0 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)] z-20 relative"
      aria-label="侧栏导航"
    >
      {/* Logo */}
      <div className="px-6 py-8">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-300">
            <Music size={20} className="text-white" aria-hidden="true" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-gray-900 group-hover:text-emerald-600 transition-colors">
            VibeStem
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto" aria-label="主导航菜单">
        {navItems.map(({ to, icon: Icon, label, color }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/app'}
            className={({ isActive }) =>
              `flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-[15px] font-medium transition-all duration-300 group relative overflow-hidden ${
                isActive
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-50" />
                )}
                <Icon 
                  size={20} 
                  aria-hidden="true" 
                  className={`transition-colors duration-300 ${
                    isActive ? 'text-emerald-400' : 'text-gray-400 group-hover:text-gray-900'
                  }`}
                />
                <span className="relative z-10">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Back to landing */}
      <div className="px-4 pb-4">
        <Link
          to="/"
          className="flex items-center gap-3 px-4 py-3.5 text-[15px] font-medium text-gray-500 hover:text-gray-900 transition-all duration-300 rounded-2xl hover:bg-gray-50 group"
        >
          <ChevronLeft size={20} aria-hidden="true" className="text-gray-400 group-hover:-translate-x-1 transition-transform" />
          返回首页
        </Link>
      </div>

      {/* User */}
      <div className="p-5 border-t border-gray-100/50 bg-gray-50/50">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-md">
            {user?.name?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs font-medium text-gray-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-300 rounded-xl group"
            aria-label="退出登录"
            title="退出登录"
          >
            <LogOut size={18} aria-hidden="true" className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </aside>
  );
}
