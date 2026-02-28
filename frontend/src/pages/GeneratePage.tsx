import { useState, useEffect, useRef } from "react";
import { generateMusic, pollTaskUntilDone, type SunoGenerateParams, type SunoTaskStatus, type SunoTrack } from "../lib/suno";
import { databases, storage, ID, Permission, Role, Query } from "../lib/appwrite";
import { APPWRITE_CONFIG } from "../lib/config";
import { useAuth } from "../contexts/AuthContext";
import { usePlayer } from "../contexts/PlayerContext";
import type { GeneratedTrack } from "../types";
import { Music, Loader, Info, Play, Pause, ChevronRight, Wand2, Sparkles, Radio, Trash2, ChevronLeft } from "lucide-react";

/** 使用 credentials:include 预取音频并返回 blob URL（解决 Appwrite 跨域 401） */
async function fetchAudioBlobUrl(url: string): Promise<string> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

const HISTORY_PAGE_SIZE = 6;

const statusLabels: Record<SunoTaskStatus, string> = {
  PENDING: "排队中…",
  TEXT_SUCCESS: "歌词已生成",
  FIRST_SUCCESS: "第一首已完成",
  SUCCESS: "全部生成完成！",
  CREATE_TASK_FAILED: "任务创建失败",
  GENERATE_AUDIO_FAILED: "音频生成失败",
  CALLBACK_EXCEPTION: "回调异常",
  SENSITIVE_WORD_ERROR: "内容被过滤",
};

const EDM_GENRES: { label: string; emoji: string; color: string; sub: string[] }[] = [
  { label: 'House', emoji: '🏠', color: 'orange', sub: ['Future House', 'Bass House', 'Deep House', 'Tech House', 'Chicago House', 'Acid House'] },
  { label: 'Techno', emoji: '⚙️', color: 'slate', sub: ['Berlin Techno', 'Industrial Techno', 'Melodic Techno', 'Detroit Techno', 'Acid Techno'] },
  { label: 'Trance', emoji: '🌊', color: 'cyan', sub: ['Progressive Trance', 'Psytrance', 'Uplifting Trance', 'Vocal Trance', 'Dark Psy', 'Full On'] },
  { label: 'Drum & Bass', emoji: '🥁', color: 'red', sub: ['Liquid DnB', 'Neurofunk', 'Jump Up', 'Jungle', 'Rollers'] },
  { label: 'Dubstep', emoji: '💥', color: 'green', sub: ['Brostep', 'Riddim', 'Melodic Dubstep', 'Chillstep'] },
  { label: 'Ambient', emoji: '🌌', color: 'blue', sub: ['Chillout', 'Lo-fi', 'Ambient Techno', 'Trip Hop', 'Downtempo'] },
  { label: 'Electro', emoji: '⚡', color: 'yellow', sub: ['Electropop', 'French Touch', 'Big Room', 'Electroclash', 'Complextro'] },
  { label: 'Hardcore', emoji: '🔥', color: 'pink', sub: ['Happy Hardcore', 'Gabber', 'Hardstyle', 'Frenchcore'] },
];

export default function GeneratePage() {
  const { user } = useAuth();
  const { currentTrack, playing, playTrack } = usePlayer();

  const [prompt, setPrompt] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [instrumental, setInstrumental] = useState(false);
  const [model] = useState<SunoGenerateParams["model"]>("V5");
  const [style, setStyle] = useState("");
  const [title, setTitle] = useState("");
  const [vocalGender] = useState<"m" | "f" | "">("");
  const [negativeTags] = useState("");
  const [styleWeight] = useState(0.5);
  const [weirdnessConstraint] = useState(0.5);
  const [audioWeight] = useState(0.5);
  const [personaId] = useState("");

  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<SunoTaskStatus | null>(null);
  const [results, setResults] = useState<SunoTrack[]>([]);
  const [error, setError] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  // 历史曲目
  const [savedTracks, setSavedTracks] = useState<GeneratedTrack[]>([]);
  const [savedUrls, setSavedUrls] = useState<Record<string, string>>({});
  const [loadingHistory, setLoadingHistory] = useState(true);
  const blobUrlsRef = useRef<string[]>([]);  // 追踪 blob URL 以便清理

  // 分页
  const [historyPage, setHistoryPage] = useState(0);

  const promptMax = customMode ? (["V4"].includes(model) ? 3000 : 5000) : 500;

  // 组件卸载时释放 blob URLs
  useEffect(() => {
    return () => { blobUrlsRef.current.forEach(URL.revokeObjectURL); };
  }, []);

  useEffect(() => {
    loadSavedTracks();
  }, []);

  async function loadSavedTracks() {
    setLoadingHistory(true);
    try {
      const res = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tracksCollectionId,
        [
          Query.equal("ownerId", user!.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(50),
        ]
      );
      // 客户端过滤：只取生成曲目，排除软删除
      const tracks = (res.documents as unknown as GeneratedTrack[]).filter(
        t => (t as { source?: string }).source === "generated" && !t.isDeleted
      );
      setSavedTracks(tracks);

      // 逐个预取 blob URL（带 credentials 解决 401）
      const urls: Record<string, string> = {};
      await Promise.allSettled(
        tracks
          .filter(t => t.bucketId && t.bucketId !== "__suno__" && t.fileId)
          .map(async (t) => {
            try {
              const viewUrl = storage.getFileView(t.bucketId, t.fileId).toString();
              const blobUrl = await fetchAudioBlobUrl(viewUrl);
              blobUrlsRef.current.push(blobUrl);
              urls[t.$id] = blobUrl;
            } catch (e) {
              console.warn(`[generate] 无法加载曲目 ${t.$id}:`, e);
            }
          })
      );
      setSavedUrls(urls);
    } catch (e) {
      console.error("[generate] 加载历史失败:", e);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function deleteSavedTrack(track: GeneratedTrack) {
    if (!confirm(`确认删除「${track.title}」？记录将在 30 天后自动清除。`)) return;
    try {
      await databases.updateDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tracksCollectionId,
        track.$id,
        { isDeleted: true, deletedAt: new Date().toISOString() }
      );
      setSavedTracks(prev => prev.filter(t => t.$id !== track.$id));
    } catch (e) {
      console.error("[generate] 删除失败:", e);
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError("");
    setStatus(null);
    setResults([]);
    try {
      const params: SunoGenerateParams = { prompt, customMode, instrumental, model };
      if (customMode) {
        if (style) params.style = style;
        if (title) params.title = title;
        if (vocalGender) params.vocalGender = vocalGender;
        if (personaId) params.personaId = personaId;
      }
      if (negativeTags) params.negativeTags = negativeTags;
      params.styleWeight = styleWeight;
      params.weirdnessConstraint = weirdnessConstraint;
      params.audioWeight = audioWeight;

      console.log('[generate] 开始生成, params:', params);
      const taskId = await generateMusic(params);
      console.log('[generate] taskId 获取成功:', taskId);

      const tracks = await pollTaskUntilDone(taskId, (s: SunoTaskStatus) => {
        console.log('[generate] 轮询状态更新:', s);
        setStatus(s);
      });
      console.log('[generate] 生成完成, tracks:', tracks.length, tracks);
      setResults(tracks);

      // 写入 Appwrite — 独立 try/catch，写库失败不影响显示结果
      for (const track of tracks) {
        try {
          console.log(`[appwrite] 开始处理 track: ${track.id} audioUrl: ${track.audioUrl}`);

          // 1. 下载音频文件
          console.log('[appwrite] 下载音频中...');
          const audioRes = await fetch(track.audioUrl);
          if (!audioRes.ok) throw new Error(`下载音频失败: ${audioRes.status}`);
          const audioBlob = await audioRes.blob();
          const audioFile = new File([audioBlob], `${track.id}.mp3`, { type: 'audio/mpeg' });
          console.log(`[appwrite] 音频下载完成, 大小: ${(audioBlob.size / 1024).toFixed(1)} KB`);

          // 2. 上传到 Appwrite generatedBucket
          const filePerms = [
            Permission.read(Role.user(user!.$id)),
            Permission.delete(Role.user(user!.$id)),
          ];
          console.log('[appwrite] 上传到 bucket:', APPWRITE_CONFIG.generatedBucketId);
          const uploaded = await storage.createFile(
            APPWRITE_CONFIG.generatedBucketId,
            ID.unique(),
            audioFile,
            filePerms,
          );
          console.log('[appwrite] 上传成功, fileId:', uploaded.$id);

          // 3. 写入 tracks collection
          const docPayload: Record<string, unknown> = {
            title: track.title || prompt.slice(0, 30),
            source: 'generated',
            fileId: uploaded.$id,
            bucketId: APPWRITE_CONFIG.generatedBucketId,
            duration: track.duration ?? null,
            ownerId: user!.$id,
          };
          if (track.imageUrl) docPayload.imageUrl = track.imageUrl;
          // kie.ai 返回逗号分隔字符串，Appwrite 存 String[] 数组
          if (track.tags) docPayload.tags = track.tags.split(",").map(t => t.trim()).filter(Boolean);
          const docPerms = [
            Permission.read(Role.user(user!.$id)),
            Permission.update(Role.user(user!.$id)),
            Permission.delete(Role.user(user!.$id)),
          ];
          console.log('[appwrite] 写入 tracks collection:', docPayload);
          const doc = await databases.createDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.tracksCollectionId,
            ID.unique(),
            docPayload,
            docPerms,
          );
          console.log('[appwrite] 文档写入成功:', doc.$id);
        } catch (dbErr: unknown) {
          console.error('[appwrite] track 处理失败:', dbErr);
          console.error('[appwrite] 错误详情:', dbErr instanceof Error ? dbErr.message : String(dbErr));
        }
      }
    } catch (err: unknown) {
      console.error('[generate] 顶层错误:', err);
      setError(err instanceof Error ? err.message : "生成失败，请重试");
    } finally {
      setGenerating(false);
    }
  };

  const handleTagClick = (tag: string) => {
    if (customMode) {
      setStyle(prev => prev ? `${prev}, ${tag}` : tag);
    } else {
      setPrompt(prev => prev ? `${prev}, ${tag}` : tag);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-gray-50">

      {/* 左侧：参数配置 */}
      <div className="w-1/2 shrink-0 bg-white border-r border-gray-100 flex flex-col h-full shadow-[4px_0_24px_-12px_rgba(0,0,0,0.06)]">

        <div className="px-6 pt-6 pb-5 border-b border-gray-100">
          <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">AI 电子乐生成</h2>
          <p className="text-xs text-gray-400 mt-0.5">基于 Suno V5 · 选择风格即生成</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* 模式切换 */}
          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setCustomMode(false)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${!customMode ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
            >
              描述生成
            </button>
            <button
              onClick={() => setCustomMode(true)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${customMode ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
            >
              自定义歌词
            </button>
          </div>

          {/* 纯音乐开关 */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
            <div className="flex items-center gap-2.5">
              <Radio size={15} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">纯音乐（无人声）</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={instrumental} onChange={(e) => setInstrumental(e.target.checked)} />
              <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600" />
            </label>
          </div>

          {/* 描述词/歌词 */}
          <div className="rounded-2xl border border-gray-200 bg-white focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/10 transition-all overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                {customMode ? "歌词内容" : "描述词"}
                <Info size={12} className="text-gray-300 cursor-help" />
              </label>
              <button className="text-xs font-medium text-gray-500 hover:text-violet-600 bg-gray-50 hover:bg-violet-50 border border-gray-200 hover:border-violet-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all">
                <Wand2 size={11} />
                获取灵感
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              maxLength={promptMax}
              placeholder={customMode ? "在此输入歌词内容…" : "描述你想要的 EDM 风格、节拍、合成器音色、情绪…"}
              className="w-full bg-transparent px-4 pb-3 text-sm text-gray-800 placeholder-gray-300 resize-none focus:outline-none leading-relaxed"
            />
            <div className="px-4 pb-3.5">
              {/* EDM 风格预设按鈕 */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">风格预设</p>
                {/* 一级：风格类别 */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {EDM_GENRES.map(g => (
                    <button
                      key={g.label}
                      onClick={() => setSelectedGenre(prev => prev === g.label ? null : g.label)}
                      className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border transition-all ${
                        selectedGenre === g.label
                          ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50'
                      }`}
                    >
                      <span>{g.emoji}</span>
                      {g.label}
                    </button>
                  ))}
                </div>
                {/* 二级：子风格 */}
                {selectedGenre && (() => {
                  const genre = EDM_GENRES.find(g => g.label === selectedGenre);
                  if (!genre) return null;
                  return (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100 animate-in fade-in duration-150">
                      {genre.sub.map(sub => (
                        <button
                          key={sub}
                          onClick={() => handleTagClick(sub)}
                          className="text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 hover:border-violet-400 px-2.5 py-1 rounded-full transition-all"
                        >
                          + {sub}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="flex items-center justify-between px-4 pt-2 pb-3 border-t border-gray-100">
              <span className="text-xs text-gray-300 font-mono">{prompt.length} / {promptMax}</span>
              <div className="flex gap-3">
                <button className="text-xs font-medium text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors">
                  <Music size={11} /> 添加参考音频
                </button>
                <button onClick={() => { setPrompt(""); setStyle(""); setTitle(""); }} className="text-xs font-medium text-gray-400 hover:text-red-500 transition-colors">
                  清空
                </button>
              </div>
            </div>
          </div>

          {/* 自定义模式额外字段 */}
          {customMode && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-1.5">歌曲标题</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="未命名" className="w-full bg-white border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none transition-all" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-1.5">音乐风格</label>
                <input type="text" value={style} onChange={(e) => setStyle(e.target.value)} placeholder="如：Dark Synthwave、Future House…" className="w-full bg-white border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none transition-all" />
              </div>
            </div>
          )}

        </div>

        {/* Generate button */}
        <div className="p-5 border-t border-gray-100 shrink-0 space-y-3">
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            {generating ? (
              <><Loader size={16} className="animate-spin" /> 生成中…</>
            ) : (
              <><Sparkles size={16} className="text-violet-400" /> 尽情生成 EDM</>
            )}
          </button>

          {status && (
            <div className="flex items-center gap-2.5 bg-violet-50 border border-violet-100 rounded-xl px-4 py-2.5">
              <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse shrink-0" />
              <p className="text-xs text-violet-700 font-medium" aria-live="polite">{statusLabels[status]}</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5" role="alert">
              <div className="w-1.5 h-1.5 bg-red-400 rounded-full shrink-0" />
              <p className="text-xs text-red-600 font-medium">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* 右侧：统一列表（新生成在顶部 + 历史永远可见） */}
      <div className="w-1/2 flex flex-col min-w-0 bg-gray-50">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-xl mx-auto space-y-6 pb-20">

            {/* 标题行 */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[17px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <Sparkles size={16} className="text-violet-500" />
                  Workspace
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {loadingHistory ? "加载中…" : `共 ${savedTracks.length + results.length} 首`}
                </p>
              </div>
            </div>

            {/* ① 正在生成 / 刚生成完成 区块 */}
            {(generating || results.length > 0) && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-violet-600">
                    {generating && results.length === 0 ? (status ? statusLabels[status] : "排队中…") : "刚刚生成"}
                  </span>
                  {generating && (
                    <div className="w-3 h-3 border-[1.5px] border-violet-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                {results.length === 0 ? (
                  /* 骨架卡片 */
                  [0, 1].map(i => (
                    <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm animate-pulse">
                        <div className="w-12 h-12 rounded-xl bg-gray-200 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 bg-gray-200 rounded-lg w-3/4" />
                          <div className="h-3 bg-gray-100 rounded-lg w-1/3" />
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
                      </div>
                  ))
                ) : (
                  /* 刚生成完的曲目（直接播放 kie.ai URL） */
                  results.map((track) => {
                    const pid = `result-${track.id}`;
                    const isActive = currentTrack?.id === pid;
                    const isPlaying = isActive && playing;
                    return (
                      <div key={track.id} className="bg-white border border-violet-100 hover:border-violet-300 hover:shadow-md rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 shadow-sm">
                        <TrackCover imageUrl={track.imageUrl} isPlaying={isPlaying} size={48} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-gray-900 font-semibold text-sm truncate">{track.title || "未命名曲目"}</h3>
                            <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-md shrink-0">NEW</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {track.duration != null && (
                              <span className="text-xs text-gray-400 font-mono">
                                {`${Math.floor(track.duration / 60)}:${String(Math.floor(track.duration % 60)).padStart(2, "0")}`}
                              </span>
                            )}
                            {track.tags?.split(",").slice(0, 2).map(tag => (
                              <span key={tag} className="text-xs font-medium text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-md">
                                {tag.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => playTrack({ id: pid, url: track.audioUrl, title: track.title || "未命名曲目", subtitle: track.tags?.split(",")[0]?.trim(), color: '#7c3aed', imageUrl: track.imageUrl })}
                          className="w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center shrink-0 transition-all hover:scale-105 active:scale-95 shadow-sm shadow-violet-500/20"
                          aria-label={isPlaying ? "暂停" : "播放"}
                        >
                          {isPlaying
                            ? <Pause size={15} className="text-white" fill="white" />
                            : <Play size={15} className="text-white" fill="white" style={{ marginLeft: 1 }} />
                          }
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* ② 历史曲目（始终显示） */}
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12 gap-3">
                <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
                <p className="text-xs text-gray-400">加载历史…</p>
              </div>
            ) : savedTracks.length > 0 ? (
              <div className="space-y-3">
                {/* Section header */}
                <div className="flex items-center justify-between">
                  {(generating || results.length > 0) && (
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">历史记录</p>
                  )}
                  {/* Pagination controls */}
                  {Math.ceil(savedTracks.length / HISTORY_PAGE_SIZE) > 1 && (
                    <div className="flex items-center gap-2 ml-auto text-xs text-gray-400">
                      <span className="tabular-nums">{historyPage + 1} / {Math.ceil(savedTracks.length / HISTORY_PAGE_SIZE)}</span>
                      <button
                        disabled={historyPage === 0}
                        onClick={() => setHistoryPage(p => p - 1)}
                        className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        aria-label="上一页"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        disabled={historyPage >= Math.ceil(savedTracks.length / HISTORY_PAGE_SIZE) - 1}
                        onClick={() => setHistoryPage(p => p + 1)}
                        className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        aria-label="下一页"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {savedTracks.slice(historyPage * HISTORY_PAGE_SIZE, (historyPage + 1) * HISTORY_PAGE_SIZE).map((track) => {
                  const blobUrl = savedUrls[track.$id];
                  const pid = `saved-${track.$id}`;
                  const isActive = currentTrack?.id === pid;
                  const isPlaying = isActive && playing;
                  return (
                    <div key={track.$id} className={`bg-white border rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 shadow-sm group ${isActive ? 'border-violet-200 ring-1 ring-violet-100' : 'border-gray-100 hover:border-violet-200 hover:shadow-md'}`}>
                      <TrackCover imageUrl={track.imageUrl} isPlaying={isPlaying} size={48} />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-gray-900 font-semibold text-sm mb-1 truncate">{track.title || "未命名曲目"}</h3>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {track.tags?.slice(0, 2).map(tag => (
                            <span key={tag} className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded-md">
                              {tag.trim()}
                            </span>
                          ))}
                          <span className="text-xs text-gray-400">
                            {track.duration ? `${Math.floor(track.duration / 60)}:${String(Math.floor(track.duration % 60)).padStart(2, "0")} · ` : ""}
                            {new Date(track.$createdAt).toLocaleDateString("zh-CN")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Action buttons: visible on hover or when active */}
                        <div className={`flex items-center gap-1 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          {blobUrl && (
                            <a href={blobUrl} download={`${track.title || "track"}.mp3`}
                              className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all" aria-label="下载">
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            </a>
                          )}
                          <button onClick={() => deleteSavedTrack(track)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" aria-label="删除">
                            <Trash2 size={13} />
                          </button>
                        </div>
                        {/* Play button */}
                        <button
                          disabled={!blobUrl}
                          onClick={() => blobUrl && playTrack({ id: pid, url: blobUrl, title: track.title || "未命名曲目", subtitle: track.tags?.[0]?.trim(), color: '#7c3aed', imageUrl: track.imageUrl })}
                          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
                            blobUrl
                              ? isActive
                                ? 'bg-violet-600 shadow-sm shadow-violet-500/20'
                                : 'bg-gray-100 hover:bg-violet-600 group-hover:bg-violet-600'
                              : 'bg-gray-100 opacity-40 cursor-not-allowed'
                          }`}
                          aria-label={isPlaying ? "暂停" : "播放"}
                        >
                          {isPlaying
                            ? <Pause size={14} className={isActive ? "text-white" : "text-gray-500 group-hover:text-white"} fill="currentColor" />
                            : <Play size={14} className={isActive ? "text-white" : "text-gray-500 group-hover:text-white"} fill="currentColor" style={{ marginLeft: 1 }} />
                          }
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Page dots */}
                {Math.ceil(savedTracks.length / HISTORY_PAGE_SIZE) > 1 && (
                  <div className="flex justify-center gap-1.5 pt-1">
                    {Array.from({ length: Math.ceil(savedTracks.length / HISTORY_PAGE_SIZE) }).map((_, i) => (
                      <button key={i} onClick={() => setHistoryPage(i)}
                        className={`rounded-full transition-all duration-200 ${i === historyPage ? 'w-4 h-1.5 bg-violet-600' : 'w-1.5 h-1.5 bg-gray-200 hover:bg-gray-300'}`}
                        aria-label={`第 ${i + 1} 页`} />
                    ))}
                  </div>
                )}
              </div>
            ) : !generating && results.length === 0 ? (
              /* 空状态 Showcase */
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">示例展示</p>
                <ShowcaseCard title="Glass Garden — 弦乐轻鸣，映如浅光" time="3:21" tags={["平静","Ambient","空灵"]} dotColor="bg-teal-400" tagColor="text-teal-600 bg-teal-50 border-teal-100" />
                <ShowcaseCard title="Silent Ember — 低沉钢琴，余温渐逝" time="2:35" tags={["忧郁","Acoustic","人声"]} dotColor="bg-orange-400" tagColor="text-orange-600 bg-orange-50 border-orange-100" />
                <ShowcaseCard title="Drifted Skyline — 模糊合成，银云漂移" time="3:05" tags={["梦幻","Electronic","飘渺"]} dotColor="bg-violet-400" tagColor="text-violet-600 bg-violet-50 border-violet-100" />
              </div>
            ) : null}

          </div>
        </div>
      </div>
    </div>
  );
}

/** 圆角方形封面：播放时模糊+均衡器 overlay */
function TrackCover({ imageUrl, isPlaying, size = 48 }: { imageUrl?: string; isPlaying: boolean; size?: number }) {
  return (
    <div className="relative shrink-0 rounded-xl overflow-hidden" style={{ width: size, height: size }}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="封面"
          className={`w-full h-full object-cover transition-all duration-300 ${isPlaying ? 'scale-110 brightness-50' : ''}`}
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          <Music size={Math.round(size * 0.35)} className="text-gray-600" />
        </div>
      )}
      {/* Playing indicator overlay */}
      {isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-end gap-[3px]" style={{ height: 18 }}>
            <div className="eq-bar w-[3px] bg-violet-400 rounded-full" style={{ height: '100%' }} />
            <div className="eq-bar w-[3px] bg-violet-400 rounded-full" style={{ height: '100%' }} />
            <div className="eq-bar w-[3px] bg-violet-400 rounded-full" style={{ height: '100%' }} />
          </div>
        </div>
      )}
    </div>
  );
}

function ShowcaseCard({ title, time, tags, dotColor, tagColor }: { title: string; time: string; tags: string[]; dotColor: string; tagColor: string }) {
  return (
    <div className="group bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 cursor-pointer">
      <div className="relative w-12 h-12 shrink-0">
        <div className="absolute inset-0 bg-gray-900 rounded-full flex items-center justify-center group-hover:animate-[spin_4s_linear_infinite]">
          <div className="absolute inset-[3px] border border-white/10 rounded-full" />
          <div className="absolute inset-[6px] border border-white/10 rounded-full" />
          <div className="absolute inset-[10px] border border-white/10 rounded-full" />
          <div className={`w-4 h-4 rounded-full ${dotColor} flex items-center justify-center z-10`}>
            <div className="w-1 h-1 bg-white rounded-full" />
          </div>
        </div>
        <div className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
          <Play className="text-white fill-white ml-0.5" size={16} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-gray-900 font-medium text-sm mb-1.5 truncate">{title}</h3>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md font-mono">
            <Play size={8} className="text-gray-300" /> {time}
          </span>
          {tags.map(tag => (
            <span key={tag} className={`text-xs font-medium border px-2 py-0.5 rounded-md ${tagColor}`}>{tag}</span>
          ))}
        </div>
      </div>
      <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
    </div>
  );
}

