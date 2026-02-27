import { useState, useRef } from 'react';
import { DEMUCS_CONFIG } from '../lib/config';
import WaveformPlayer from '../components/WaveformPlayer';
import {
  GitCompare,
  Upload,
  Loader,
  CheckCircle,
  Mic,
  Drum,
  Guitar,
  Radio,
  Info,
} from 'lucide-react';

interface StemResult {
  vocals?: string;
  drums?: string;
  bass?: string;
  other?: string;
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
    const res = await fetch(`${DEMUCS_CONFIG.baseUrl}/separate`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data: { task_id?: string; taskId?: string } = await res.json();
    const taskId = data.task_id ?? data.taskId;

    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const poll = await fetch(`${DEMUCS_CONFIG.baseUrl}/tasks/${taskId}`);
      const result: { status: string; outputs?: Record<string, string> } = await poll.json();
      if (result.status === 'completed') return result.outputs ?? {};
      if (result.status === 'failed') throw new Error(`${modelName} 模型分轨失败`);
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

  const stemConfig = [
    { key: 'vocals' as const, label: '人声', icon: Mic, color: '#f43f5e' },
    { key: 'drums' as const, label: '鼓', icon: Drum, color: '#f59e0b' },
    { key: 'bass' as const, label: '贝斯', icon: Guitar, color: '#8b5cf6' },
    { key: 'other' as const, label: '其他', icon: Radio, color: '#06b6d4' },
  ];

  const done = official && finetuned;

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">模型对比</h1>
          <p className="text-gray-500 text-sm mt-1">同一首歌同时经过两个模型，横向对比分轨质量</p>
        </div>

        {/* Tip */}
        <div className="bg-violet-50 border border-violet-100 rounded-2xl px-5 py-4 flex items-start gap-3">
          <Info size={18} className="text-violet-500 mt-0.5 shrink-0" />
          <p className="text-sm text-violet-700">
            两个模型将<strong>并行处理</strong>，节省一半时间。EDM 微调模型在电子音乐类型上 SDR 提升 +2.37 dB，人声分离更干净。
          </p>
        </div>

        {/* Upload */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Upload size={18} className="text-violet-500" />
            上传音频
          </h2>
          <div
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
              dragOver ? 'border-violet-400 bg-violet-50' : file ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,.mp3,.wav,.flac"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle size={32} className="text-emerald-500" />
                <p className="font-bold text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <GitCompare size={32} className="text-violet-300" />
                <p className="font-semibold text-gray-700">拖放或点击选择音频文件</p>
                <p className="text-sm text-gray-400">MP3、WAV、FLAC</p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            onClick={handleCompare}
            disabled={!file || loading}
            className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2.5"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                {progress}
              </>
            ) : (
              <>
                <GitCompare size={18} />
                开始双模型对比
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {done && (
          <div className="space-y-5">
            <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-500" />
              对比结果
            </h2>

            {/* Column headers */}
            <div className="grid grid-cols-2 gap-5">
              <div className="bg-gray-100 rounded-2xl px-5 py-3 text-center font-bold text-gray-600 text-sm">官方模型 (HTDemucs V4)</div>
              <div className="bg-violet-100 rounded-2xl px-5 py-3 text-center font-bold text-violet-700 text-sm">EDM 微调模型 ✨</div>
            </div>

            {stemConfig.map(({ key, label, icon: Icon, color }) => (
              <div key={key} className="grid grid-cols-2 gap-5">
                {[official, finetuned].map((result, idx) => {
                  const url = result?.[key];
                  if (!url) return <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-center text-gray-300 text-sm">无数据</div>;
                  return (
                    <div key={idx} className="bg-white rounded-2xl border border-gray-100 p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '20', color }}>
                          <Icon size={15} />
                        </div>
                        <span className="font-bold text-gray-800 text-sm">{label}</span>
                      </div>
                      <WaveformPlayer url={url} color={color} height={56} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
