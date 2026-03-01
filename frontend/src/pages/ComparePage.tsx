import { useState, useRef } from 'react';
import { DEMUCS_CONFIG } from '../lib/config';
import StemMixerPlayer from '../components/StemMixerPlayer';
import { GitCompare, Loader, CheckCircle, Info } from 'lucide-react';

interface StemResult {
  vocals?: string;
  accompaniment?: string;
}

export default function ComparePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [official, setOfficial] = useState<StemResult | null>(null);
  const [finetuned, setFinetuned] = useState<StemResult | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File) => {
    setFile(f);
    setOfficial(null);
    setFinetuned(null);
    setError('');
  };

  async function runSeparation(modelName: 'official' | 'finetuned', f: File): Promise<StemResult> {
    const formData = new FormData();
    formData.append('file', f);
    formData.append('model', modelName);
    const res = await fetch(`${DEMUCS_CONFIG.baseUrl}/api/separate`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data: { task_id?: string; taskId?: string } = await res.json();
    const taskId = data.task_id ?? data.taskId;

    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const poll = await fetch(`${DEMUCS_CONFIG.baseUrl}/api/separate/status/${taskId}`);
      const result: { status: string; vocals_url?: string; accompaniment_url?: string; error?: string } = await poll.json();
      if (result.status === 'completed') return {
        vocals: result.vocals_url ? `${DEMUCS_CONFIG.baseUrl}${result.vocals_url}` : undefined,
        accompaniment: result.accompaniment_url ? `${DEMUCS_CONFIG.baseUrl}${result.accompaniment_url}` : undefined,
      };
      if (result.status === 'failed') throw new Error(`${modelName} 模型分轨失败: ${result.error ?? ''}`);
    }
    throw new Error(`${modelName} 模型处理超时`);
  }

  const handleCompare = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setOfficial(null);
    setFinetuned(null);
    try {
      setProgress('正在并行运行两个模型...');
      const [off, fine] = await Promise.all([
        runSeparation('official', file),
        runSeparation('finetuned', file),
      ]);
      setOfficial(off);
      setFinetuned(fine);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '对比失败');
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  const done = official && finetuned;

  return (
    <div className="flex h-full w-full overflow-hidden bg-gray-50">

      {/* ── 左侧：参数配置 ── */}
      <div className="w-1/2 shrink-0 bg-white border-r border-gray-100 flex flex-col h-full shadow-[4px_0_24px_-12px_rgba(0,0,0,0.06)]">
        <div className="px-6 pt-6 pb-5 border-b border-gray-100">
          <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">模型对比</h2>
          <p className="text-xs text-gray-400 mt-0.5">官方 vs EDM 微调 · 并行处理</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Tip */}
          <div className="bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3 flex items-start gap-2.5">
            <Info size={15} className="text-violet-500 mt-0.5 shrink-0" />
            <p className="text-xs text-violet-700 leading-relaxed">
              两个模型<strong>并行处理</strong>，节省一半时间。EDM 微调模型 SDR +2.37 dB。
            </p>
          </div>

          {/* 上传区 */}
          <div
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
              dragOver ? 'border-violet-400 bg-violet-50' : file ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          >
            <input ref={fileRef} type="file" accept="audio/*,.mp3,.wav,.flac" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle size={32} className="text-emerald-500" />
                <p className="font-bold text-gray-900 text-sm truncate max-w-full px-4">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5">
                <div className="w-14 h-14 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center">
                  <GitCompare size={24} className="text-violet-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-700 text-sm">拖放或点击选择音频文件</p>
                  <p className="text-xs text-gray-400 mt-0.5">MP3、WAV、FLAC</p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl px-4 py-3">{error}</div>
          )}
        </div>

        {/* 对比按钮 */}
        <div className="p-5 border-t border-gray-100 shrink-0 space-y-3">
          <button onClick={handleCompare} disabled={!file || loading}
            className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed rounded-2xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200">
            {loading ? <><Loader size={16} className="animate-spin" /> {progress}</> : <><GitCompare size={16} /> 开始双模型对比</>}
          </button>
          {loading && (
            <div className="flex items-center gap-2.5 bg-violet-50 border border-violet-100 rounded-xl px-4 py-2.5">
              <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse shrink-0" />
              <p className="text-xs text-violet-700 font-medium">{progress}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── 右侧：对比结果 ── */}
      <div className="w-1/2 flex flex-col min-w-0 bg-gray-50">
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl mx-auto space-y-6 pb-20">
            <div>
              <h2 className="text-[17px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <GitCompare size={16} className="text-violet-500" />
                对比结果
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">{loading ? '并行处理中…' : done ? '两个模型均已完成' : '等待开始对比'}</p>
            </div>

            {/* 加载状态 */}
            {loading && (
              <div className="grid grid-cols-2 gap-4">
                {(['官方模型', 'EDM 微调'] as const).map((_label, i) => (
                  <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm animate-pulse space-y-3">
                    <div className={`h-6 rounded-lg ${i === 0 ? 'bg-gray-100' : 'bg-violet-50'}`} />
                    <div className="h-14 bg-gray-100 rounded-xl" />
                    <div className="h-14 bg-gray-100 rounded-xl" />
                  </div>
                ))}
              </div>
            )}

            {/* 对比结果 */}
            {done && !loading && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <div className="bg-gray-100 rounded-xl px-3 py-2 text-center font-bold text-gray-600 text-xs mb-4">官方模型 (HTDemucs V4)</div>
                  <StemMixerPlayer vocalsUrl={official?.vocals} accompanimentUrl={official?.accompaniment} />
                </div>
                <div className="bg-white rounded-2xl border border-violet-100 shadow-sm p-5">
                  <div className="bg-violet-50 rounded-xl px-3 py-2 text-center font-bold text-violet-700 text-xs mb-4">EDM 微调模型 ✨</div>
                  <StemMixerPlayer vocalsUrl={finetuned?.vocals} accompanimentUrl={finetuned?.accompaniment} />
                </div>
              </div>
            )}

            {/* 空状态 */}
            {!loading && !done && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center mx-auto mb-4">
                  <GitCompare size={24} className="text-violet-300" />
                </div>
                <p className="text-sm font-semibold text-gray-500">上传音频后开始对比</p>
                <p className="text-xs text-gray-400 mt-1">两个模型的分轨结果将并排显示在这里</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
