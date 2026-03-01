import { useRef, useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { APPWRITE_CONFIG } from '../lib/config';
import { storage, ID, Permission, Role } from '../lib/appwrite';
import {
  Music,
  Scissors,
  Sparkles,
  GitCompare,
  History,
  LogOut,
  LayoutDashboard,
  ChevronLeft,
  Wand2,
  Loader,
} from 'lucide-react';

const navItems = [
  { to: '/app', icon: LayoutDashboard, label: '工作台', color: 'emerald' },
  { to: '/app/generate', icon: Sparkles, label: 'AI 生成', color: 'teal' },
  { to: '/app/separate', icon: Scissors, label: '智能分轨', color: 'rose' },
  { to: '/app/tools', icon: Wand2, label: '音频工具', color: 'sky' },
  { to: '/app/compare', icon: GitCompare, label: '模型对比', color: 'violet' },
  { to: '/app/history', icon: History, label: '任务历史', color: 'amber' },
];

export default function Sidebar() {
  const { user, logout, updateAvatar } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const prefs = (user?.prefs ?? {}) as Record<string, unknown>;
  const avatarFileId = typeof prefs.avatarFileId === 'string' ? prefs.avatarFileId : '';
  const avatarBucketId = typeof prefs.avatarBucketId === 'string' ? prefs.avatarBucketId : APPWRITE_CONFIG.uploadsBucketId;
  const avatarUpdatedAt = typeof prefs.avatarUpdatedAt === 'string' ? prefs.avatarUpdatedAt : '';
  const avatarUrl = avatarFileId
    ? `${storage.getFileView(avatarBucketId, avatarFileId).toString()}&v=${encodeURIComponent(avatarUpdatedAt || '1')}`
    : (typeof prefs.avatarUrl === 'string' ? prefs.avatarUrl : '');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsDataURL(file);
    });

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('图片解析失败'));
      img.src = src;
    });

  async function compressAvatar(file: File): Promise<Blob> {
    const dataUrl = await readAsDataUrl(file);
    const img = await loadImage(dataUrl);
    const maxSize = 384;
    const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
    const width = Math.max(1, Math.round(img.width * ratio));
    const height = Math.max(1, Math.round(img.height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('浏览器不支持图片处理');
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', 0.82);
    });
    if (!blob) throw new Error('WebP 压缩失败');
    return blob;
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      e.target.value = '';
      return;
    }

    try {
      setUploadingAvatar(true);
      const oldAvatarFileId = typeof prefs.avatarFileId === 'string' ? prefs.avatarFileId : '';
      const oldAvatarBucketId = typeof prefs.avatarBucketId === 'string' ? prefs.avatarBucketId : APPWRITE_CONFIG.uploadsBucketId;

      const webpBlob = await compressAvatar(file);
      const webpFile = new File([webpBlob], `avatar-${user?.$id ?? 'user'}.webp`, { type: 'image/webp' });

      const uploaded = await storage.createFile(
        APPWRITE_CONFIG.uploadsBucketId,
        ID.unique(),
        webpFile,
        user
          ? [
              Permission.read(Role.user(user.$id)),
              Permission.delete(Role.user(user.$id)),
            ]
          : undefined
      );

      const viewUrl = storage.getFileView(APPWRITE_CONFIG.uploadsBucketId, uploaded.$id).toString();
      await updateAvatar({
        avatarUrl: viewUrl,
        avatarFileId: uploaded.$id,
        avatarBucketId: APPWRITE_CONFIG.uploadsBucketId,
      });

      if (oldAvatarFileId && oldAvatarFileId !== uploaded.$id) {
        storage.deleteFile(oldAvatarBucketId, oldAvatarFileId).catch(() => undefined);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : '头像更新失败');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  }

  return (
    <aside
      className="w-[280px] bg-white/80 backdrop-blur-xl border-r border-gray-100/50 flex flex-col h-screen shrink-0 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)] z-20 relative"
      aria-label="侧栏导航"
    >
      {/* Logo */}
      <div className="px-6 py-8">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform duration-300">
            <Music size={20} className="text-white" aria-hidden="true" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-gray-900 group-hover:text-purple-600 transition-colors">
            EDMVibe
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto" aria-label="主导航菜单">
        {navItems.map(({ to, icon: Icon, label, color: _color }) => (
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
                    isActive ? 'text-purple-400' : 'text-gray-400 group-hover:text-gray-900'
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
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploadingAvatar}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-md overflow-hidden relative disabled:opacity-70 cursor-pointer"
            title="点击更换头像"
            aria-label="点击更换头像"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="用户头像" className="w-full h-full object-cover" />
            ) : (
              <span>{user?.name?.[0]?.toUpperCase() ?? '?'}</span>
            )}
            {uploadingAvatar && (
              <span className="absolute inset-0 bg-black/45 flex items-center justify-center">
                <Loader size={14} className="animate-spin text-white" />
              </span>
            )}
          </button>
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
