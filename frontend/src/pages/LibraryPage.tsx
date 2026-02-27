import { useState, useEffect } from 'react';
import { databases, storage, Query } from '../lib/appwrite';
import { APPWRITE_CONFIG } from '../lib/config';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import type { Track, GeneratedTrack } from '../types';
import {
  Music,
  Mic,
  Drum,
  Guitar,
  Radio,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp,
  Loader,
  Sparkles,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const ITEMS_PER_PAGE = 4;

export default function LibraryPage() {
  const { user } = useAuth();
  const { currentTrack, playing, playTrack } = usePlayer();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [generatedTracks, setGeneratedTracks] = useState<GeneratedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [stemUrls, setStemUrls] = useState<Record<string, Record<string, string>>>({});
  const [generatedUrls, setGeneratedUrls] = useState<Record<string, string>>({});
  const [loadingStems, setLoadingStems] = useState<string | null>(null);

  // Pagination
  const [genPage, setGenPage] = useState(0);
  const [stemPage, setStemPage] = useState(0);

  useEffect(() => {
    fetchTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchTracks() {
    setLoading(true);
    try {
      const res = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tracksCollectionId,
        [Query.equal('ownerId', user!.$id), Query.orderDesc('$createdAt')]
      );
      const all = res.documents as unknown as (Track & GeneratedTrack)[];
      const active = all.filter((d) => !d.isDeleted);
      const stem = active.filter(
        (d) => (d as unknown as { source?: string }).source !== 'generated'
      ) as Track[];
      const gen = active.filter(
        (d) => (d as unknown as { source?: string }).source === 'generated'
      ) as unknown as GeneratedTrack[];
      setTracks(stem);
      setGeneratedTracks(gen);
      // Pre-fetch URLs for generated tracks
      const urls: Record<string, string> = {};
      for (const t of gen) {
        if (!t.bucketId || t.bucketId === '__suno__') continue;
        try {
          urls[t.$id] = storage.getFileView(t.bucketId, t.fileId).toString();
        } catch { /* skip */ }
      }
      setGeneratedUrls(urls);
    } catch (e) {
      console.error('[library] fetchTracks 失败:', e);
    } finally {
      setLoading(false);
    }
  }

  async function toggleExpand(track: Track) {
    if (expanded === track.$id) {
      setExpanded(null);
      return;
    }
    setExpanded(track.$id);
    if (stemUrls[track.$id]) return;

    setLoadingStems(track.$id);
    const stems: Record<string, string> = {};
    const bucketId = APPWRITE_CONFIG.stemsBucketId;
    const fields: [keyof Track, string][] = [
      ['stemVocalsId', 'vocals'],
      ['stemDrumsId', 'drums'],
      ['stemBassId', 'bass'],
      ['stemOtherId', 'other'],
    ];
    for (const [field, label] of fields) {
      const fileId = track[field] as string | undefined;
      if (fileId) {
        const url = storage.getFileView(bucketId, fileId);
        stems[label] = url.toString();
      }
    }
    setStemUrls((prev) => ({ ...prev, [track.$id]: stems }));
    setLoadingStems(null);
  }

  async function deleteGeneratedTrack(track: GeneratedTrack) {
    if (!confirm(`确认删除「${track.title}」？记录将在 30 天后自动清除。`)) return;
    try {
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tracksCollectionId,
        track.$id,
        { isDeleted: true, deletedAt: new Date().toISOString() }
      );
      setGeneratedTracks((prev) => prev.filter((t) => t.$id !== track.$id));
    } catch (e) {
      console.error('[library] 删除失败:', e);
      alert('删除失败，请重试');
    }
  }

  async function deleteTrack(track: Track) {
    if (!confirm(`确认删除「${track.name}」？记录将在 30 天后自动清除。`)) return;
    try {
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tracksCollectionId,
        track.$id,
        { isDeleted: true, deletedAt: new Date().toISOString() }
      );
      setTracks((prev) => prev.filter((t) => t.$id !== track.$id));
    } catch (e) {
      console.error('[library] 删除失败:', e);
      alert('删除失败，请重试');
    }
  }

  const stemConfig = [
    { key: 'vocals', label: '人声', icon: Mic, color: '#f43f5e' },
    { key: 'drums', label: '鼓', icon: Drum, color: '#f59e0b' },
    { key: 'bass', label: '贝斯', icon: Guitar, color: '#8b5cf6' },
    { key: 'other', label: '其他', icon: Radio, color: '#06b6d4' },
  ];

  // ─── Pagination helpers ───────────────────────────────────────────────
  const genTotalPages = Math.ceil(generatedTracks.length / ITEMS_PER_PAGE);
  const stemTotalPages = Math.ceil(tracks.length / ITEMS_PER_PAGE);
  const pagedGen = generatedTracks.slice(genPage * ITEMS_PER_PAGE, (genPage + 1) * ITEMS_PER_PAGE);
  const pagedStem = tracks.slice(stemPage * ITEMS_PER_PAGE, (stemPage + 1) * ITEMS_PER_PAGE);

  function isActivePlaying(id: string) {
    return currentTrack?.id === id && playing;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8 pb-24">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">音乐库</h1>
          <p className="text-gray-500 text-sm mt-1">浏览并播放你的所有分轨结果</p>
        </div>

        {loading ? (
          <div className="text-center py-32 bg-white rounded-3xl border border-gray-100">
            <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500 font-medium">加载音乐库...</p>
          </div>
        ) : tracks.length === 0 && generatedTracks.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-3xl border border-gray-100">
            <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-5">
              <Music size={32} className="text-gray-300" />
            </div>
            <p className="text-gray-900 font-bold text-lg">音乐库为空</p>
            <p className="text-gray-500 text-sm mt-2">生成或分轨后，结果会自动保存到这里</p>
          </div>
        ) : (
          <div className="space-y-8">

            {/* ─── AI 生成曲目 ────────────────────────────────────────── */}
            {generatedTracks.length > 0 && (
              <div className="space-y-4">
                {/* Section header + pagination controls */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Sparkles size={18} className="text-emerald-500" />
                    AI 生成曲目
                    <span className="text-sm font-normal text-gray-400">({generatedTracks.length})</span>
                  </h2>
                  {genTotalPages > 1 && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="tabular-nums">{genPage + 1} / {genTotalPages}</span>
                      <button disabled={genPage === 0} onClick={() => setGenPage((p) => p - 1)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all" aria-label="上一页">
                        <ChevronLeft size={16} />
                      </button>
                      <button disabled={genPage >= genTotalPages - 1} onClick={() => setGenPage((p) => p + 1)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all" aria-label="下一页">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {pagedGen.map((track) => {
                  const audioUrl = generatedUrls[track.$id];
                  const active = isActivePlaying(track.$id);
                  return (
                    <div key={track.$id}
                      className={`bg-white rounded-3xl border shadow-sm overflow-hidden transition-all duration-200 ${
                        currentTrack?.id === track.$id ? 'border-emerald-200 ring-1 ring-emerald-200/60' : 'border-gray-100'
                      }`}
                    >
                      <div className="p-5 flex items-center gap-4">
                        {/* Play button replaces old cover */}
                        <button
                          disabled={!audioUrl}
                          onClick={() => audioUrl && playTrack({ id: track.$id, url: audioUrl, title: track.title, subtitle: 'AI 生成', color: '#10b981' })}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200 ${
                            audioUrl ? 'bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 hover:scale-105 active:scale-95' : 'bg-gray-50 border border-gray-100 cursor-not-allowed opacity-40'
                          }`}
                          aria-label={active ? '暂停' : '播放'}
                        >
                          {active
                            ? <Pause size={18} className="text-emerald-600" fill="currentColor" />
                            : <Play size={18} className="text-emerald-500" fill="currentColor" style={{ marginLeft: 2 }} />
                          }
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 truncate">{track.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                            AI 生成
                            {track.duration && (
                              <><span className="text-gray-200">·</span>{Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}</>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {audioUrl && (
                            <a href={audioUrl} download={`${track.title}.mp3`}
                              className="p-2.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all rounded-xl" aria-label="下载">
                              <Download size={16} />
                            </a>
                          )}
                          <button onClick={() => deleteGeneratedTrack(track)}
                            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all rounded-xl" aria-label="删除">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Page dots */}
                {genTotalPages > 1 && (
                  <div className="flex justify-center gap-1.5 pt-1">
                    {Array.from({ length: genTotalPages }).map((_, i) => (
                      <button key={i} onClick={() => setGenPage(i)}
                        className={`rounded-full transition-all duration-200 ${i === genPage ? 'w-5 h-2 bg-emerald-500' : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'}`}
                        aria-label={`第 ${i + 1} 页`} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── 分轨曲目 ────────────────────────────────────────────── */}
            {tracks.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Music size={18} className="text-blue-500" />
                    分轨曲目
                    <span className="text-sm font-normal text-gray-400">({tracks.length})</span>
                  </h2>
                  {stemTotalPages > 1 && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="tabular-nums">{stemPage + 1} / {stemTotalPages}</span>
                      <button disabled={stemPage === 0} onClick={() => setStemPage((p) => p - 1)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all" aria-label="上一页">
                        <ChevronLeft size={16} />
                      </button>
                      <button disabled={stemPage >= stemTotalPages - 1} onClick={() => setStemPage((p) => p + 1)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all" aria-label="下一页">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {pagedStem.map((track) => (
                  <div key={track.$id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300">
                    <div className="p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                        <Music size={20} className="text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 truncate">{track.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                          {track.model === 'finetuned' ? 'EDM 微调模型' : '官方模型'}
                          <span className="text-gray-300">·</span>
                          {new Date(track.createdAt).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => deleteTrack(track)}
                          className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 rounded-xl" aria-label="删除">
                          <Trash2 size={16} />
                        </button>
                        <button onClick={() => toggleExpand(track)}
                          className="p-2.5 text-gray-600 hover:bg-gray-100 transition-all duration-200 rounded-xl"
                          aria-label={expanded === track.$id ? '收起' : '展开分轨'}>
                          {expanded === track.$id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      </div>
                    </div>

                    {expanded === track.$id && (
                      <div className="px-5 pb-6 border-t border-gray-100 pt-4">
                        {loadingStems === track.$id ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader size={24} className="animate-spin text-blue-400" />
                          </div>
                        ) : (
                          <div className="grid sm:grid-cols-2 gap-4">
                            {stemConfig.map(({ key, label, icon: Icon, color }) => {
                              const url = stemUrls[track.$id]?.[key];
                              if (!url) return null;
                              const stemId = `${track.$id}__${key}`;
                              const stemActive = isActivePlaying(stemId);
                              return (
                                <div key={key}
                                  className={`rounded-2xl p-4 border transition-all ${
                                    currentTrack?.id === stemId ? 'bg-white' : 'bg-gray-50 border-gray-100'
                                  }`}
                                  style={currentTrack?.id === stemId ? { borderColor: color + '80' } : undefined}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => playTrack({ id: stemId, url, title: `${track.name} — ${label}`, subtitle: label, color })}
                                        className="w-9 h-9 rounded-xl flex items-center justify-center hover:scale-105 transition-all active:scale-95"
                                        style={{ backgroundColor: color + '20', color }}
                                        aria-label={stemActive ? '暂停' : `播放${label}`}
                                      >
                                        {stemActive
                                          ? <Pause size={15} fill="currentColor" />
                                          : <Play size={15} fill="currentColor" style={{ marginLeft: 1 }} />
                                        }
                                      </button>
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '15', color }}>
                                          <Icon size={12} />
                                        </div>
                                        <span className="text-sm font-bold text-gray-700">{label}</span>
                                      </div>
                                    </div>
                                    <a href={url} download
                                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all">
                                      <Download size={14} />
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Page dots */}
                {stemTotalPages > 1 && (
                  <div className="flex justify-center gap-1.5 pt-1">
                    {Array.from({ length: stemTotalPages }).map((_, i) => (
                      <button key={i} onClick={() => setStemPage(i)}
                        className={`rounded-full transition-all duration-200 ${i === stemPage ? 'w-5 h-2 bg-blue-500' : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'}`}
                        aria-label={`第 ${i + 1} 页`} />
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
