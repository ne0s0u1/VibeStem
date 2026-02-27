import { useState, useRef } from 'react';
import { databases, storage, ID } from '../lib/appwrite';
import { APPWRITE_CONFIG, DEMUCS_CONFIG } from '../lib/config';
import { useAuth } from '../contexts/AuthContext';
import WaveformPlayer from '../components/WaveformPlayer';
import {
  Scissors,
  Upload,
  Loader,
  CheckCircle,
  Music2,
  Mic,
  Drum,
  Guitar,
  Radio,
  Download,
} from 'lucide-react';

type DemucsModel = 'official' | 'finetuned';

interface StemUrls {
  vocals?: string;
  drums?: string;
  bass?: string;
  other?: string;
}

export default function SeparatePage() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [model, setModel] = useState<DemucsModel>('official');
  const [loading, setLoading] = useState(false);
  const [stems, setStems] = useState<StemUrls | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState('');

  const handleFile = (f: File) => {
    if (!f.type.startsWith('audio/') && !f.name.match(/\.(mp3|wav|flac|m4a|ogg)$/i)) {
      setError('请选择音频文件（MP3、WAV、FLAC 等）');
      return;
    }
    setFile(f);
    setStems(null);
    setError('');
  };

  const handleSeparate = async () => {
    if (!file || !user) return;
    setLoading(true);
    setError('');
    setProgress('正在上传文件...');
    try {
      // 1. Upload file to Appwrite storage
      const uploaded = await storage.createFile(
        APPWRITE_CONFIG.uploadsBucketId,
        ID.unique(),
        file
      );

      // 2. Call Demucs API
      setProgress('正在分析音频...');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', model);

      const res = await fetch(`${DEMUCS_CONFIG.baseUrl}/separate`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error(`分轨 API 错误: ${res.status}`);
      const data: { task_id?: string; taskId?: string } = await res.json();
      const taskId = data.task_id ?? data.taskId;

      // 3. Poll for results
      setProgress('分轨处理中...');
      let result: { status: string; outputs?: Record<string, string> } | null = null;
      for (let i = 0; i < 120; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const poll = await fetch(`${DEMUCS_CONFIG.baseUrl}/tasks/${taskId}`);
        result = await poll.json();
        if (result?.status === 'completed') break;
        if (result?.status === 'failed') throw new Error('分轨失败');
      }
      if (!result || result.status !== 'completed') throw new Error('处理超时');

      const outputs = result.outputs ?? {};

      // 4. Save task to Appwrite
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tasksCollectionId,
        ID.unique(),
        {
          ownerId: user.$id,
          type: 'separate',
          status: 'completed',
          model,
          createdAt: new Date().toISOString(),
        }
      );

      // 5. Save track to Appwrite
      await databases.createDocument(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tracksCollectionId,
        ID.unique(),
        {
          ownerId: user.$id,
          name: file.name.replace(/\.[^.]+$/, ''),
          originalFileId: uploaded.$id,
          model,
          createdAt: new Date().toISOString(),
        }
      );

      setStems({
        vocals: outputs.vocals,
        drums: outputs.drums,
        bass: outputs.bass,
        other: outputs.other,
      });
      setProgress('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '分轨失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const stemConfig = [
    { key: 'vocals' as const, label: '人声', icon: Mic, color: '#f43f5e' },
    { key: 'drums' as const, label: '鼓', icon: Drum, color: '#f59e0b' },
    { key: 'bass' as const, label: '贝斯', icon: Guitar, color: '#8b5cf6' },
    { key: 'other' as const, label: '其他', icon: Radio, color: '#06b6d4' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">智能分轨</h1>
          <p className="text-gray-500 text-sm mt-1">上传音频，AI 自动分离人声与各乐器轨道</p>
        </div>

        {/* Upload area */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Upload size={18} className="text-rose-500" />
              上传音频文件
            </h2>
          </div>
          <div className="p-6 space-y-5">
            <div
              className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
                dragOver ? 'border-rose-400 bg-rose-50' : file ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <input
                ref={fileRef}
                type="file"
                accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              {file ? (
                <div className="flex flex-col items-center gap-3">
                  <CheckCircle size={36} className="text-emerald-500" />
                  <p className="font-bold text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                    <Music2 size={28} className="text-rose-400" />
                  </div>
                  <p className="font-semibold text-gray-700">拖放文件到这里，或点击选择</p>
                  <p className="text-sm text-gray-400">支持 MP3、WAV、FLAC、M4A 等格式</p>
                </div>
              )}
            </div>

            {/* Model select */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">选择分轨模型</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'official' as DemucsModel, label: '官方模型', desc: 'HTDemucs V4 标准版' },
                  { value: 'finetuned' as DemucsModel, label: 'EDM 微调', desc: '针对 EDM 优化，SDR +2.37dB' },
                ].map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setModel(m.value)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                      model === m.value ? 'border-rose-400 bg-rose-50' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <p className={`font-bold text-sm ${model === m.value ? 'text-rose-700' : 'text-gray-900'}`}>{m.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <button
              onClick={handleSeparate}
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
                  <Scissors size={18} />
                  开始分轨
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        {stems && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle size={18} className="text-emerald-500" />
                分轨结果
              </h2>
            </div>
            <div className="p-6 grid sm:grid-cols-2 gap-6">
              {stemConfig.map(({ key, label, icon: Icon, color }) =>
                stems[key] ? (
                  <div key={key} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: color + '20', color }}
                        >
                          <Icon size={18} />
                        </div>
                        <span className="font-bold text-gray-900">{label}</span>
                      </div>
                      <a
                        href={stems[key]}
                        download
                        className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:border-gray-300 transition-all"
                      >
                        <Download size={13} />
                        下载
                      </a>
                    </div>
                    <WaveformPlayer url={stems[key]!} color={color} height={56} />
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
