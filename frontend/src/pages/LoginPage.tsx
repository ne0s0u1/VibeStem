import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Music, Loader } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/app');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '登录失败，请检查邮箱和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-10 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Music size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">EDMVibe</span>
        </Link>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">欢迎回来</h1>
          <p className="text-gray-500 text-sm mb-8">登录以继续使用工作台</p>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">邮箱</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">密码</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader size={18} className="animate-spin" /> : null}
              {loading ? '登录�?..' : '登录'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          还没有账号？{' '}
          <Link to="/register" className="text-emerald-600 font-semibold hover:underline">
            注册
          </Link>
        </p>
      </div>
    </div>
  );
}
