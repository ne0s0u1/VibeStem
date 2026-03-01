import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import { APPWRITE_CONFIG } from '../lib/config';
import {
  listUsers, listStyles, createStyle, updateStyle, deleteStyle, listTracks, fetchFileBlobUrl,
  type AdminUser, type StyleDoc, type TrackDoc,
} from '../lib/appwriteAdmin';
import {
  LayoutDashboard, Palette, Users, LogOut, Plus, Pencil, Trash2,
  ChevronRight, Music2, Scissors, Search, X, Check, Loader,
  CircleDot, RefreshCw, ShieldAlert, Play, Pause,
} from 'lucide-react';

// ─── 管理员白名单 ────────────────────────────────────────────────
const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS as string ?? '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

// ─── Helpers ─────────────────────────────────────────────────────
function initials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
}
function fmtDate(iso: string) {
  if (!iso) return '-';
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
}
const TAG_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f43f5e','#f97316',
  '#eab308','#22c55e','#06b6d4','#3b82f6','#a855f7',
];

// ─────────────────────────────────────────────────────────────────
//  Style Form Modal
// ─────────────────────────────────────────────────────────────────
function StyleModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: StyleDoc;
  onClose: () => void;
  onSave: (data: Omit<StyleDoc, '$id'>) => Promise<void>;
}) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [color, setColor] = useState(initial?.color ?? TAG_COLORS[0]);
  const [subRaw, setSubRaw] = useState((initial?.sub ?? []).join(', '));
  const [order, setOrder] = useState<number>(initial?.order ?? 0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) { setErr('名称不能为空'); return; }
    setSaving(true);
    setErr('');
    try {
      const sub = subRaw.split(',').map(s => s.trim()).filter(Boolean);
      await onSave({ label: label.trim(), color, sub, order });
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">{initial ? '编辑预设' : '新建预设'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-500 mb-1 block">排序 (order)</label>
              <input
                type="number" value={order} onChange={e => setOrder(+e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">名称 *</label>
            <input
              value={label} onChange={e => setLabel(e.target.value)}
              placeholder="EDM"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">颜色</label>
            <div className="flex gap-2 flex-wrap">
              {TAG_COLORS.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? 'border-gray-800 scale-125' : 'border-transparent'}`}
                  style={{ background: c }}
                />
              ))}
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                className="w-6 h-6 rounded-full cursor-pointer border border-gray-200 bg-transparent p-0"
                title="自定义颜色"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">
              子风格 <span className="text-gray-400 font-normal">（逗号分隔）</span>
            </label>
            <textarea
              value={subRaw} onChange={e => setSubRaw(e.target.value)}
              rows={3}
              placeholder="UK Garage, Dubstep, Future Bass"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            />
          </div>

          {/* 预览 */}
          <div className="p-3 rounded-xl" style={{ background: color + '15' }}>
            <p className="text-[10px] text-gray-400 mb-1">预览</p>
            <span
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: color + '22', color }}
            >
              {label || '名称'}
            </span>
          </div>

          {err && <p className="text-xs text-red-500">{err}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              取消
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loader size={14} className="animate-spin" />}
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type TaskType = 'generated' | 'separated';

type TrackWithOwner = TrackDoc & {
  ownerEmail: string;
  ownerName: string;
  taskType: TaskType;
};

function resolvePlayableFile(track: TrackWithOwner): { bucketId: string; fileId: string } | null {
  if (track.taskType === 'generated') {
    const bucketId = track.bucketId || APPWRITE_CONFIG.generatedBucketId;
    if (bucketId && track.fileId) {
      return { bucketId, fileId: track.fileId };
    }
    return null;
  }

  const stems = [track.stemVocalsId, track.stemDrumsId, track.stemBassId, track.stemOtherId].filter(Boolean) as string[];
  if (stems.length > 0) {
    return { bucketId: APPWRITE_CONFIG.stemsBucketId, fileId: stems[0] };
  }
  if (track.originalFileId) {
    return { bucketId: APPWRITE_CONFIG.uploadsBucketId, fileId: track.originalFileId };
  }
  return null;
}

function UserWorksTab() {
  const { currentTrack, playing, playTrack } = usePlayer();
  const [tracks, setTracks] = useState<TrackWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [emailFilter, setEmailFilter] = useState('');
  const [titleFilter, setTitleFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TaskType>('all');
  const [loadingAudioId, setLoadingAudioId] = useState<string | null>(null);
  const blobUrlsRef = useRef<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const [users, docs] = await Promise.all([listUsers(), listTracks()]);
      const userMap = new Map(users.map(u => [u.$id, u]));
      const merged = docs
        .filter(d => d.ownerId)
        .map((d): TrackWithOwner | null => {
          const owner = userMap.get(d.ownerId);
          if (!owner) return null;
          return {
            ...d,
            ownerEmail: owner.email,
            ownerName: owner.name || '(未设置昵称)',
            taskType: d.source === 'generated' ? 'generated' : 'separated',
          };
        })
        .filter((d): d is TrackWithOwner => Boolean(d));
      setTracks(merged);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach(URL.revokeObjectURL);
      blobUrlsRef.current = [];
    };
  }, []);

  const filtered = useMemo(() => {
    const email = emailFilter.trim().toLowerCase();
    const title = titleFilter.trim().toLowerCase();
    return tracks.filter(t => {
      if (typeFilter !== 'all' && t.taskType !== typeFilter) return false;
      if (email && !t.ownerEmail.toLowerCase().includes(email)) return false;
      const songName = (t.title || t.name || '').toLowerCase();
      if (title && !songName.includes(title)) return false;
      return true;
    });
  }, [tracks, emailFilter, titleFilter, typeFilter]);

  async function handlePlay(track: TrackWithOwner) {
    if (currentTrack?.id === track.$id) {
      playTrack(currentTrack);
      return;
    }
    const playable = resolvePlayableFile(track);
    if (!playable) {
      alert('该记录没有可播放的音频文件');
      return;
    }
    setLoadingAudioId(track.$id);
    try {
      const url = await fetchFileBlobUrl(playable.bucketId, playable.fileId);
      blobUrlsRef.current.push(url);
      playTrack({
        id: track.$id,
        url,
        title: track.title || track.name || '(无标题)',
        subtitle: `${track.ownerEmail} · ${track.taskType === 'generated' ? 'AI 生成' : '智能分轨'}`,
        color: track.taskType === 'generated' ? '#8b5cf6' : '#10b981',
        imageUrl: track.imageUrl,
      });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '播放失败');
    } finally {
      setLoadingAudioId(null);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">用户作品</h2>
          <p className="text-sm text-gray-400 mt-0.5">试听用户的 AI 生成 / 智能分轨结果</p>
        </div>
        <button onClick={() => load()}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
          <RefreshCw size={14} /> 刷新
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">用户邮箱</label>
          <input
            value={emailFilter}
            onChange={e => setEmailFilter(e.target.value)}
            placeholder="按邮箱筛选"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">歌曲名</label>
          <input
            value={titleFilter}
            onChange={e => setTitleFilter(e.target.value)}
            placeholder="按歌曲名筛选"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">任务类型</label>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as 'all' | TaskType)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
          >
            <option value="all">全部</option>
            <option value="generated">AI 生成</option>
            <option value="separated">智能分轨</option>
          </select>
        </div>
        <div className="flex items-end">
          <div className="text-xs text-gray-400">当前结果：{filtered.length} 条</div>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <Loader size={20} className="animate-spin mr-2" /> 加载中…
        </div>
      )}
      {!loading && err && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <ShieldAlert size={32} className="text-red-300" />
          <p className="text-sm text-red-500">{err}</p>
          <button onClick={() => load()} className="mt-2 text-sm text-violet-600 underline">重试</button>
        </div>
      )}
      {!loading && !err && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">歌曲</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">用户邮箱</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">任务类型</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">时间</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">未找到匹配记录</td>
                </tr>
              )}
              {filtered.map(t => {
                const isCurrent = currentTrack?.id === t.$id;
                const isActive = isCurrent && playing;
                const typeColor = t.taskType === 'generated' ? 'bg-violet-100 text-violet-600' : 'bg-emerald-100 text-emerald-600';
                return (
                  <tr key={t.$id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {t.taskType === 'generated' && t.imageUrl ? (
                          <img src={t.imageUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${t.taskType === 'generated' ? 'bg-violet-100' : 'bg-emerald-100'}`}>
                            {t.taskType === 'generated' ? <Music2 size={15} className="text-violet-500" /> : <Scissors size={15} className="text-emerald-500" />}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate max-w-[240px]">{t.title || t.name || '(无标题)'}</p>
                          <p className="text-xs text-gray-400 truncate max-w-[240px]">{t.ownerName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{t.ownerEmail}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${typeColor}`}>
                        {t.taskType === 'generated' ? <Music2 size={10} /> : <Scissors size={10} />}
                        {t.taskType === 'generated' ? 'AI 生成' : '智能分轨'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(t.$createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void handlePlay(t)}
                        disabled={loadingAudioId === t.$id}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50"
                        title="试听"
                      >
                        {loadingAudioId === t.$id ? (
                          <Loader size={14} className="animate-spin" />
                        ) : isActive ? (
                          <Pause size={14} />
                        ) : (
                          <Play size={14} />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Styles Tab
// ─────────────────────────────────────────────────────────────────
function StylesTab() {
  const [styles, setStyles] = useState<StyleDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StyleDoc | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setErr('');
    listStyles()
      .then(setStyles)
      .catch(e => setErr(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data: Omit<StyleDoc, '$id'>) {
    if (editing) {
      const updated = await updateStyle(editing.$id, data);
      setStyles(prev => prev.map(s => s.$id === editing.$id ? updated : s));
    } else {
      const created = await createStyle(data);
      setStyles(prev => [...prev, created].sort((a, b) => a.order - b.order));
    }
  }

  async function handleDelete(s: StyleDoc) {
    if (!confirm(`确认删除「${s.label}」？`)) return;
    setDeletingId(s.$id);
    try {
      await deleteStyle(s.$id);
      setStyles(prev => prev.filter(x => x.$id !== s.$id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '删除失败');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">风格预设管理</h2>
          <p className="text-sm text-gray-400 mt-0.5">AI 音乐生成界面中显示的风格预设标签</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw size={14} /> 刷新
          </button>
          <button
            onClick={() => { setEditing(undefined); setShowModal(true); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            <Plus size={14} /> 新建预设
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <Loader size={20} className="animate-spin mr-2" /> 加载中…
        </div>
      )}
      {!loading && err && (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
          <ShieldAlert size={32} className="text-red-300" />
          <p className="text-sm text-red-500">{err}</p>
          <p className="text-xs text-gray-400">请确认 VITE_APPWRITE_API_KEY 已正确配置</p>
          <button onClick={load} className="mt-2 text-sm text-violet-600 underline">重试</button>
        </div>
      )}
      {!loading && !err && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">预设</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">颜色</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">子风格</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide w-16">排序</th>
                <th className="px-4 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {styles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    暂无预设，点击「新建预设」添加
                  </td>
                </tr>
              )}
              {styles.map(s => (
                <tr key={s.$id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: s.color + '22', color: s.color }}
                    >
                      {s.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ background: s.color }} />
                      <span className="text-xs text-gray-400 font-mono">{s.color}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(s.sub ?? []).slice(0, 5).map(sub => (
                        <span key={sub} className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
                          {sub}
                        </span>
                      ))}
                      {(s.sub ?? []).length > 5 && (
                        <span className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-400 rounded">
                          +{s.sub.length - 5}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400 text-xs">{s.order}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditing(s); setShowModal(true); }}
                        className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        disabled={deletingId === s.$id}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                        title="删除"
                      >
                        {deletingId === s.$id
                          ? <Loader size={14} className="animate-spin" />
                          : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <StyleModal
          initial={editing}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Users Tab
// ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback((q?: string) => {
    setLoading(true);
    setErr('');
    listUsers(q)
      .then(setUsers)
      .catch(e => setErr(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(search.trim() || undefined);
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">用户管理</h2>
          <p className="text-sm text-gray-400 mt-0.5">查看所有注册用户信息</p>
        </div>
        <div className="flex gap-2">
          <form onSubmit={handleSearch} className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索邮箱 / 昵称"
              className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 w-52"
            />
          </form>
          <button onClick={() => load(search || undefined)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">
            <RefreshCw size={14} /> 刷新
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <Loader size={20} className="animate-spin mr-2" /> 加载中…
        </div>
      )}
      {!loading && err && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <ShieldAlert size={32} className="text-red-300" />
          <p className="text-sm text-red-500">{err}</p>
          <p className="text-xs text-gray-400">请确认 VITE_APPWRITE_API_KEY 已正确配置，且权限包含 users.read</p>
          <button onClick={() => load()} className="mt-2 text-sm text-violet-600 underline">重试</button>
        </div>
      )}
      {!loading && !err && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">用户</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">邮箱</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">注册时间</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">标签</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">状态</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    {search ? `未找到「${search}」相关用户` : '暂无用户'}
                  </td>
                </tr>
              )}
              {users.map(u => (
                <tr key={u.$id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold shrink-0">
                        {initials(u.name)}
                      </div>
                      <span className="font-medium text-gray-800">{u.name || <span className="text-gray-400 italic">未设置</span>}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(u.$createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {(u.labels ?? []).map(label => (
                        <span key={label} className="text-[10px] font-semibold px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded">
                          {label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      u.status ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      <CircleDot size={8} />
                      {u.status ? '正常' : '禁用'}
                    </span>
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              ))}
            </tbody>
          </table>
          {users.length > 0 && (
            <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-400">
              共 {users.length} 个用户（最多显示 100 条）
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  Main Admin Page
// ─────────────────────────────────────────────────────────────────
type AdminTab = 'styles' | 'users' | 'works';

export default function AdminPage() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>('styles');

  // Auth guard
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/login', { replace: true }); return; }
    if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader size={24} className="animate-spin text-violet-400" />
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes(user.email.toLowerCase());
  if (!isAdmin) return null;

  const NAV: { key: AdminTab; icon: typeof Palette; label: string }[] = [
    { key: 'styles', icon: Palette, label: '风格预设' },
    { key: 'users',  icon: Users,   label: '用户管理' },
    { key: 'works',  icon: Music2,  label: '用户作品' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <LayoutDashboard size={14} className="text-white" />
            </div>
            <span className="font-bold text-gray-800 text-sm">管理后台</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                tab === key
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        {/* User info */}
        <div className="px-3 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold shrink-0">
              {initials(user.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">{user.name || user.email}</p>
              <p className="text-[10px] text-gray-400">
                <Check size={9} className="inline mr-0.5" />管理员
              </p>
            </div>
          </div>
          <button
            onClick={() => logout().then(() => navigate('/login', { replace: true }))}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors mt-1"
          >
            <LogOut size={14} />
            退出登录
          </button>
          <button
            onClick={() => navigate('/app', { replace: true })}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight size={14} className="rotate-180" />
            返回前台
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8">
        {tab === 'styles' && <StylesTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'works' && <UserWorksTab />}
      </main>
    </div>
  );
}
