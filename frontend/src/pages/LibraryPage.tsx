import { useState, useEffect } from 'react';
import { databases, storage, Query } from '../lib/appwrite';
import { APPWRITE_CONFIG } from '../lib/config';
import { useAuth } from '../contexts/AuthContext';
import WaveformPlayer from '../components/WaveformPlayer';
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
} from 'lucide-react';

export default function LibraryPage() {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [generatedTracks, setGeneratedTracks] = useState<GeneratedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [stemUrls, setStemUrls] = useState<Record<string, Record<string, string>>>({})
  const [generatedUrls, setGeneratedUrls] = useState<Record<string, string>>({});
  const [loadingStems, setLoadingStems] = useState<string | null>(null);

  useEffect(() => {
    fetchTracks();
  }, []);

  async function fetchTracks() {
    setLoading(true);
    try {
      console.log('[library] 查询 tracks, ownerId:', user!.$id);
      console.log('[library] databaseId:', APPWRITE_CONFIG.databaseId, 'collectionId:', APPWRITE_CONFIG.tracksCollectionId);
      const res = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tracksCollectionId,
        [Query.equal('ownerId', user!.$id), Query.orderDesc('$createdAt')]
      );
      console.log('[library] 查询结果 total:', res.total, '文档数:', res.documents.length);
      console.log('[library] 原始文档:', res.documents);
      const all = res.documents as unknown as (Track & GeneratedTrack)[];
      // 过滤掉软删除的记录
      const active = all.filter(d => !d.isDeleted);
      const stem = active.filter(d => (d as unknown as {source?: string}).source !== 'generated') as Track[];
      const gen = active.filter(d => (d as unknown as {source?: string}).source === 'generated') as unknown as GeneratedTrack[];
      console.log('[library] 分轨曲目:', stem.length, '生成曲目:', gen.length);
      setTracks(stem);
      setGeneratedTracks(gen);
      // 预取所有生成曲目的播放 URL
      const urls: Record<string, string> = {};
      for (const t of gen) {
        if (!t.bucketId || t.bucketId === '__suno__') {
          console.warn(`[library] 跳过无效 bucket 的生成曲目: ${t.$id} (bucketId: ${t.bucketId})`);
          continue;
        }
        try {
          const url = storage.getFileView(t.bucketId, t.fileId).toString();
          console.log(`[library] 生成曲目 URL: ${t.$id} → ${url}`);
          urls[t.$id] = url;
        } catch (e) {
          console.error('[library] 获取生成曲目 URL 失败:', t.$id, e);
        }
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

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
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

            {/* AI 生成曲目 */}
            {generatedTracks.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Sparkles size={18} className="text-emerald-500" />
                  AI 生成曲目
                </h2>
                {generatedTracks.map((track) => {
                  const audioUrl = generatedUrls[track.$id];
                  return (
                    <div key={track.$id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="p-5">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                              <Music size={20} className="text-emerald-500" />
                            </div>
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
                              <a href={audioUrl} download={`${track.title}.mp3`} className="p-2.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all rounded-xl" aria-label="下载">
                                <Download size={16} />
                              </a>
                            )}
                            <button onClick={() => deleteGeneratedTrack(track)} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all rounded-xl" aria-label="删除">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        {audioUrl ? (
                          <WaveformPlayer url={audioUrl} color="#10b981" height={56} />
                        ) : (
                          <div className="h-14 bg-gray-50 rounded-xl flex items-center justify-center">
                            <p className="text-xs text-gray-400">音频加载失败</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 分轨曲目 */}
            {tracks.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Music size={18} className="text-blue-500" />
                  分轨曲目
                </h2>
                {tracks.map((track) => (
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
                    <button
                      onClick={() => deleteTrack(track)}
                      className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 rounded-xl"
                      aria-label="删除"
                      title="删除"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      onClick={() => toggleExpand(track)}
                      className="p-2.5 text-gray-600 hover:bg-gray-100 transition-all duration-200 rounded-xl"
                      aria-label={expanded === track.$id ? '收起' : '展开'}
                    >
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
                          return (
                            <div key={key} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '20', color }}>
                                    <Icon size={15} />
                                  </div>
                                  <span className="text-sm font-bold text-gray-700">{label}</span>
                                </div>
                                <a href={url} download className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all">
                                  <Download size={14} />
                                </a>
                              </div>
                              <WaveformPlayer url={url} color={color} height={48} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
