import { useState, useRef, useEffect } from 'react';
import { databases, storage, ID, Query, Permission, Role } from '../lib/appwrite';
import { APPWRITE_CONFIG, DEMUCS_CONFIG } from '../lib/config';
import { useAuth } from '../contexts/AuthContext';
import { usePlayer } from '../contexts/PlayerContext';
import StemMixerPlayer from '../components/StemMixerPlayer';
import {
  Scissors, Upload, Loader, CheckCircle, Music2,
  Play, Pause, Trash2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import type { Models } from 'appwrite';

type DemucsModel = 'official' | 'finetuned';
interface StemUrls { vocals?: string; accompaniment?: string; }
interface SeparatedTrackDoc extends Models.Document {
  ownerId: string;
  source: 'separated';
  title?: string;
  tags?: string[];
  fileId?: string;
  bucketId?: string;
  originalFileId?: string;
  stemVocalsId?: string;
  stemOtherId?: string;
  isDeleted?: boolean;
}

async function fetchAudioBlobUrl(url: string): Promise<string> {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return URL.createObjectURL(await res.blob());
}

const HISTORY_PAGE_SIZE = 6;

export default function SeparatePage() {
  const { user } = useAuth();
  const { currentTrack, playing, playTrack } = usePlayer();
  const fileRef = useRef<HTMLInputElement>(null);
  const blobUrlsRef = useRef<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [model, setModel] = useState<DemucsModel>('finetuned');
  const [loading, setLoading] = useState(false);
  const [stems, setStems] = useState<StemUrls | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState('');
  const [historyTracks, setHistoryTracks] = useState<SeparatedTrackDoc[]>([]);
  const [historyUrls, setHistoryUrls] = useState<Record<string, string>>({});
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyPage, setHistoryPage] = useState(0);

  useEffect(() => {
    loadHistory();
    return () => { blobUrlsRef.current.forEach(URL.revokeObjectURL); };
  }, []);

  function resolveSeparatedPlayable(track: SeparatedTrackDoc): { bucketId: string; fileId: string } | null {
    if (track.stemOtherId) {
      return { bucketId: APPWRITE_CONFIG.stemsBucketId, fileId: track.stemOtherId };
    }
    if (track.stemVocalsId) {
      return { bucketId: APPWRITE_CONFIG.stemsBucketId, fileId: track.stemVocalsId };
    }
    if (track.fileId && track.bucketId) {
      return { bucketId: track.bucketId, fileId: track.fileId };
    }
    if (track.originalFileId) {
      return { bucketId: APPWRITE_CONFIG.uploadsBucketId, fileId: track.originalFileId };
    }
    return null;
  }

  async function loadHistory() {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const res = await databases.listDocuments(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.tracksCollectionId,
        [Query.equal('ownerId', user.$id), Query.equal('source', 'separated'), Query.orderDesc('$createdAt'), Query.limit(50)]);
      const tracks = (res.documents as unknown as SeparatedTrackDoc[]).filter(t => !t.isDeleted);
      setHistoryTracks(tracks);
      const urls: Record<string, string> = {};
      await Promise.allSettled(tracks.map(async (t) => {
        try {
          const playable = resolveSeparatedPlayable(t);
          if (!playable) return;
          const viewUrl = storage.getFileView(playable.bucketId, playable.fileId).toString();
          const blob = await fetchAudioBlobUrl(viewUrl);
          blobUrlsRef.current.push(blob);
          urls[t.$id] = blob;
        } catch { /* skip */ }
      }));
      setHistoryUrls(urls);
    } catch (e) { console.error('[separate] load history failed:', e); }
    finally { setLoadingHistory(false); }
  }

  async function deleteTrack(track: SeparatedTrackDoc) {
    if (!confirm(`确认删除「${track.title}」？`)) return;
    try {
      await databases.updateDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.tracksCollectionId, track.$id, { isDeleted: true, deletedAt: new Date().toISOString() });
      setHistoryTracks(prev => prev.filter(t => t.$id !== track.$id));
    } catch (e) { console.error('[separate] 删除失败:', e); }
  }

  const handleFile = (f: File) => {
    if (!f.type.startsWith('audio/') && !f.name.match(/\.(mp3|wav|flac|m4a|ogg)$/i)) {
      setError('请选择音频文件（MP3、WAV、FLAC 等）'); return;
    }
    setFile(f); setStems(null); setError('');
  };

  const handleSeparate = async () => {
    if (!file || !user) return;
    setLoading(true); setError(''); setStems(null); setProgress('正在上传文件…');
    try {
      const permissions = user
        ? [
            Permission.read(Role.user(user.$id)),
            Permission.update(Role.user(user.$id)),
            Permission.delete(Role.user(user.$id)),
          ]
        : undefined;

      const uploaded = await storage.createFile(
        APPWRITE_CONFIG.uploadsBucketId,
        ID.unique(),
        file,
        permissions
      );
      setProgress('正在分析音频…');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', model);
      const res = await fetch(`${DEMUCS_CONFIG.baseUrl}/api/separate`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error(`分轨 API 错误: ${res.status}`);
      const data: { task_id?: string; taskId?: string } = await res.json();
      const taskId = data.task_id ?? data.taskId;
      setProgress('分轨处理中…');
      let result: { status: string; vocals_url?: string; accompaniment_url?: string; error?: string } | null = null;
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const poll = await fetch(`${DEMUCS_CONFIG.baseUrl}/api/separate/status/${taskId}`);
        result = await poll.json();
        if (result?.status === 'completed') break;
        if (result?.status === 'failed') throw new Error(result.error ?? '分轨失败');
      }
      if (!result || result.status !== 'completed') throw new Error('处理超时');
      const outputs: StemUrls = {
        vocals: result.vocals_url ? `${DEMUCS_CONFIG.baseUrl}${result.vocals_url}` : undefined,
        accompaniment: result.accompaniment_url ? `${DEMUCS_CONFIG.baseUrl}${result.accompaniment_url}` : undefined,
      };

      setProgress('正在保存分轨文件…');

      let stemVocalsId: string | undefined;
      let stemOtherId: string | undefined;

      if (outputs.vocals) {
        const vocalsRes = await fetch(outputs.vocals);
        if (!vocalsRes.ok) throw new Error(`下载人声失败: ${vocalsRes.status}`);
        const vocalsBlob = await vocalsRes.blob();
        const vocalsFile = new File([vocalsBlob], `${taskId}-vocals.wav`, { type: vocalsBlob.type || 'audio/wav' });
        const vocalsUploaded = await storage.createFile(
          APPWRITE_CONFIG.stemsBucketId,
          ID.unique(),
          vocalsFile,
          permissions
        );
        stemVocalsId = vocalsUploaded.$id;
      }

      if (outputs.accompaniment) {
        const accRes = await fetch(outputs.accompaniment);
        if (!accRes.ok) throw new Error(`下载伴奏失败: ${accRes.status}`);
        const accBlob = await accRes.blob();
        const accFile = new File([accBlob], `${taskId}-accompaniment.wav`, { type: accBlob.type || 'audio/wav' });
        const accUploaded = await storage.createFile(
          APPWRITE_CONFIG.stemsBucketId,
          ID.unique(),
          accFile,
          permissions
        );
        stemOtherId = accUploaded.$id;
      }

      await databases.createDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.tasksCollectionId, ID.unique(), {
        ownerId: user.$id, type: 'separate', status: 'completed', model, createdAt: new Date().toISOString(),
      });
      const doc = await databases.createDocument(APPWRITE_CONFIG.databaseId, APPWRITE_CONFIG.tracksCollectionId, ID.unique(), {
        ownerId: user.$id, title: file.name.replace(/\.[^.]+$/, ''), source: 'separated',
        originalFileId: uploaded.$id,
        stemVocalsId,
        stemOtherId,
        fileId: stemOtherId ?? stemVocalsId ?? uploaded.$id,
        bucketId: stemOtherId || stemVocalsId ? APPWRITE_CONFIG.stemsBucketId : APPWRITE_CONFIG.uploadsBucketId,
        tags: [model],
      });
      setHistoryTracks(prev => [doc as unknown as SeparatedTrackDoc, ...prev]);
      setStems(outputs); setProgress('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '分轨失败，请重试');
    } finally { setLoading(false); }
  };

  const totalPages = Math.ceil(historyTracks.length / HISTORY_PAGE_SIZE);

  return (
    <div className="flex h-full w-full overflow-hidden bg-gray-50">

      {/* ── 左侧：参数配置 ── */}
      <div className="w-1/2 shrink-0 bg-white border-r border-gray-100 flex flex-col h-full shadow-[4px_0_24px_-12px_rgba(0,0,0,0.06)]">
        <div className="px-6 pt-6 pb-5 border-b border-gray-100">
          <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">智能分轨</h2>
          <p className="text-xs text-gray-400 mt-0.5">HTDemucs V4 · 人声 & 伴奏分离</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 上传区 */}
          <div
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
              dragOver ? 'border-rose-400 bg-rose-50' : file ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          >
            <input ref={fileRef} type="file" accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle size={32} className="text-emerald-500" />
                <p className="font-bold text-gray-900 text-sm truncate max-w-full px-4">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                  <Music2 size={24} className="text-rose-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-700 text-sm">拖放文件到这里，或点击选择</p>
                  <p className="text-xs text-gray-400 mt-0.5">MP3、WAV、FLAC、M4A 等格式</p>
                </div>
              </div>
            )}
          </div>

          {/* 模型选择 */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2.5">分轨模型</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: 'official' as DemucsModel, label: '官方模型', desc: 'HTDemucs V4 标准版' },
                { value: 'finetuned' as DemucsModel, label: 'EDM 微调', desc: 'SDR +2.37 dB' },
              ] as const).map((m) => (
                <button key={m.value} onClick={() => setModel(m.value)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 ${model === m.value ? 'border-rose-400 bg-rose-50' : 'border-gray-100 hover:border-gray-200'}`}>
                  <p className={`font-bold text-sm ${model === m.value ? 'text-rose-700' : 'text-gray-900'}`}>{m.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl px-4 py-3">{error}</div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 shrink-0">
          <button onClick={handleSeparate} disabled={!file || loading}
            className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200">
            {loading ? <><Loader size={16} className="animate-spin" /> {progress}</> : <><Scissors size={16} /> 开始分轨</>}
          </button>
        </div>
      </div>

      {/* ── 右侧：结果 + 历史 ── */}
      <div className="w-1/2 flex flex-col min-w-0 bg-gray-50">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-xl mx-auto space-y-6 pb-20">

            <div>
              <h2 className="text-[17px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <Scissors size={16} className="text-rose-500" />
                分轨记录
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">{loadingHistory ? '加载中…' : `共 ${historyTracks.length} 条`}</p>
            </div>

            {/* 当前分轨结果 */}
            {(loading || stems) && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-rose-600 flex items-center gap-2">
                  {loading ? '分轨进行中' : '刚刚完成'}
                  {loading && <span className="w-3 h-3 border-[1.5px] border-rose-500 border-t-transparent rounded-full animate-spin" />}
                </p>
                <div className="bg-white border border-rose-100 rounded-2xl p-5 shadow-sm">
                  {loading ? (
                    <div className="space-y-3 animate-pulse">
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                      <div className="h-14 bg-gray-100 rounded-xl" />
                      <div className="h-14 bg-gray-100 rounded-xl" />
                    </div>
                  ) : stems ? (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <Upload size={14} className="text-gray-400" />
                        <span className="text-sm font-semibold text-gray-800 truncate">{file?.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${model === 'finetuned' ? 'text-rose-600 bg-rose-50 border border-rose-200' : 'text-gray-500 bg-gray-100 border border-gray-200'}`}>
                          {model === 'finetuned' ? 'EDM 微调' : '官方模型'}
                        </span>
                      </div>
                      <StemMixerPlayer vocalsUrl={stems.vocals} accompanimentUrl={stems.accompaniment} />
                    </>
                  ) : null}
                </div>
              </div>
            )}

            {/* 历史列表 */}
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12 gap-3">
                <div className="w-6 h-6 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin" />
                <p className="text-xs text-gray-400">加载历史…</p>
              </div>
            ) : historyTracks.length > 0 ? (
              <div className="space-y-3">
                {(loading || stems) && <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">历史记录</p>}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2 justify-end text-xs text-gray-400">
                    <span className="tabular-nums">{historyPage + 1} / {totalPages}</span>
                    <button disabled={historyPage === 0} onClick={() => setHistoryPage(p => p - 1)} className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-all" aria-label="上一页"><ChevronLeft size={14} /></button>
                    <button disabled={historyPage >= totalPages - 1} onClick={() => setHistoryPage(p => p + 1)} className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-all" aria-label="下一页"><ChevronRight size={14} /></button>
                  </div>
                )}
                {historyTracks.slice(historyPage * HISTORY_PAGE_SIZE, (historyPage + 1) * HISTORY_PAGE_SIZE).map((track) => {
                  const blobUrl = historyUrls[track.$id];
                  const pid = `sep-${track.$id}`;
                  const isActive = currentTrack?.id === pid;
                  const isPlaying = isActive && playing;
                  const trackModel = track.tags?.[0] ?? 'official';
                  return (
                    <div key={track.$id} className={`bg-white border rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 shadow-sm group ${isActive ? 'border-rose-200 ring-1 ring-rose-100' : 'border-gray-100 hover:border-rose-200 hover:shadow-md'}`}>
                      <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                        <Scissors size={18} className="text-rose-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-gray-900 font-semibold text-sm mb-1 truncate">{track.title || '未命名'}</h3>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${trackModel === 'finetuned' ? 'text-rose-600 bg-rose-50 border border-rose-200' : 'text-gray-500 bg-gray-100 border border-gray-200'}`}>
                            {trackModel === 'finetuned' ? 'EDM 微调' : '官方模型'}
                          </span>
                          <span className="text-xs text-gray-400">{new Date(track.$createdAt).toLocaleDateString('zh-CN')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className={`flex items-center gap-1 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          <button onClick={() => deleteTrack(track)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" aria-label="删除"><Trash2 size={13} /></button>
                        </div>
                        <button disabled={!blobUrl}
                          onClick={() => blobUrl && playTrack({ id: pid, url: blobUrl, title: track.title || '未命名', subtitle: trackModel === 'finetuned' ? 'EDM 微调' : '官方模型', color: '#f43f5e' })}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${blobUrl ? isActive ? 'bg-rose-500 shadow-sm shadow-rose-500/20' : 'bg-gray-100 hover:bg-rose-500 group-hover:bg-rose-500' : 'bg-gray-100 opacity-40 cursor-not-allowed'}`}
                          aria-label={isPlaying ? '暂停' : '播放'}>
                          {isPlaying
                            ? <Pause size={14} className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-white'} fill="currentColor" />
                            : <Play size={14} className={isActive ? 'text-white' : 'text-gray-500 group-hover:text-white'} fill="currentColor" style={{ marginLeft: 1 }} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-1.5 pt-1">
                    {Array.from({ length: totalPages }).map((_, i) => (
                      <button key={i} onClick={() => setHistoryPage(i)}
                        className={`rounded-full transition-all duration-200 ${i === historyPage ? 'w-4 h-1.5 bg-rose-500' : 'w-1.5 h-1.5 bg-gray-200 hover:bg-gray-300'}`}
                        aria-label={`第 ${i + 1} 页`} />
                    ))}
                  </div>
                )}
              </div>
            ) : !loading && !stems ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4">
                  <Scissors size={24} className="text-rose-300" />
                </div>
                <p className="text-sm font-semibold text-gray-500">暂无分轨记录</p>
                <p className="text-xs text-gray-400 mt-1">上传音频后，分轨结果将在这里显示</p>
              </div>
            ) : null}

          </div>
        </div>
      </div>
    </div>
  );
}
