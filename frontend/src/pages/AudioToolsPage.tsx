import { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Play, Pause, RotateCcw, Gauge, Volume2, Music2, CheckCircle, Wand2 } from 'lucide-react';
import { detectBPM } from '../lib/bpm';

// ─── EQ 配置 ───────────────────────────────────────────────────────────────
const EQ_BANDS = [
  { freq: 31, label: '31' },
  { freq: 62, label: '62' },
  { freq: 125, label: '125' },
  { freq: 250, label: '250' },
  { freq: 500, label: '500' },
  { freq: 1000, label: '1k' },
  { freq: 2000, label: '2k' },
  { freq: 4000, label: '4k' },
  { freq: 8000, label: '8k' },
  { freq: 16000, label: '16k' },
] as const;

const EQ_PRESETS: Record<string, number[]> = {
  '平直': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  '低音增强': [6, 5, 4, 2, 0, -1, -1, 0, 0, 0],
  '人声清晰': [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1],
  'EDM': [5, 4, 2, -1, -2, -1, 1, 3, 4, 3],
  '古典': [0, 1, 2, 2, 1, 0, -1, -2, -2, -3],
  '高音增强': [0, 0, 0, 0, 0, 1, 2, 3, 4, 5],
};

// ─── Waveform Canvas ────────────────────────────────────────────────────────
function drawWaveform(
  canvas: HTMLCanvasElement,
  buffer: AudioBuffer,
  progressRatio: number,
  color: string,
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  const mid = height / 2;
  const data = buffer.getChannelData(0);
  const step = Math.ceil(data.length / width);

  ctx.clearRect(0, 0, width, height);

  for (let x = 0; x < width; x++) {
    let max = 0;
    const start = x * step;
    for (let j = start; j < start + step && j < data.length; j++) {
      const v = Math.abs(data[j]);
      if (v > max) max = v;
    }
    const barH = Math.max(1, max * mid * 0.9);
    const done = x / width < progressRatio;
    ctx.fillStyle = done ? color : color + '44';
    ctx.fillRect(x, mid - barH, 1, barH * 2);
  }
}

// ─── Freq Response Canvas ───────────────────────────────────────────────────
function drawFreqResponse(canvas: HTMLCanvasElement, filters: BiquadFilterNode[], _ctx: AudioContext) {
  const c = canvas.getContext('2d');
  if (!c) return;
  const { width, height } = canvas;
  c.clearRect(0, 0, width, height);

  // Grid
  c.strokeStyle = '#e5e7eb';
  c.lineWidth = 1;
  for (let db = -12; db <= 12; db += 6) {
    const y = height / 2 - (db / 12) * (height / 2 - 8);
    c.beginPath(); c.moveTo(0, y); c.lineTo(width, y); c.stroke();
    c.fillStyle = '#9ca3af';
    c.font = '9px monospace';
    c.fillText(`${db > 0 ? '+' : ''}${db}`, 3, y - 2);
  }
  // 0dB line
  c.strokeStyle = '#d1d5db';
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(0, height / 2); c.lineTo(width, height / 2); c.stroke();

  // Combine all filters into one magnitude response
  const freqs = new Float32Array(width);
  for (let i = 0; i < width; i++) {
    // Log scale: 20 Hz → 20000 Hz
    freqs[i] = 20 * Math.pow(1000, i / width);
  }

  const totalMag = new Float32Array(width).fill(1);
  const tmpMag = new Float32Array(width);
  const tmpPhase = new Float32Array(width);
  for (const f of filters) {
    f.getFrequencyResponse(freqs, tmpMag, tmpPhase);
    for (let i = 0; i < width; i++) totalMag[i] *= tmpMag[i];
  }

  // Draw curve
  c.strokeStyle = '#10b981';
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i < width; i++) {
    const db = 20 * Math.log10(Math.max(1e-6, totalMag[i]));
    const y = height / 2 - (db / 14) * (height / 2 - 8);
    if (i === 0) c.moveTo(i, y); else c.lineTo(i, y);
  }
  c.stroke();

  // Fill under curve
  c.lineTo(width, height / 2);
  c.lineTo(0, height / 2);
  c.closePath();
  c.fillStyle = 'rgba(16,185,129,0.08)';
  c.fill();
}

// ─── Format time ────────────────────────────────────────────────────────────
const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// ═══════════════════════════════════════════════════════════════════════
export default function AudioToolsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [objectURL, setObjectURL] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // Playback state
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // BPM
  const [bpm, setBpm] = useState<number | null>(null);
  const [detectingBPM, setDetectingBPM] = useState(false);

  // EQ
  const [gains, setGains] = useState<number[]>(Array(10).fill(0));
  const [activePreset, setActivePreset] = useState('平直');

  // Decoded buffer for waveform + BPM
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const freqCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef(0);

  // ── Build Web Audio chain ────────────────────────────────────────────
  const buildChain = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || ctxRef.current) return;

    const actx = new AudioContext();
    ctxRef.current = actx;

    const src = actx.createMediaElementSource(audio);
    sourceRef.current = src;

    // 10 BiquadFilter nodes
    const filters = EQ_BANDS.map((band, i) => {
      const f = actx.createBiquadFilter();
      f.type = i === 0 ? 'lowshelf' : i === EQ_BANDS.length - 1 ? 'highshelf' : 'peaking';
      f.frequency.value = band.freq;
      f.Q.value = 1.41;
      f.gain.value = gains[i];
      return f;
    });
    filtersRef.current = filters;

    // Chain: src → f0 → f1 → ... → gainNode → destination
    const gainNode = actx.createGain();
    gainNode.gain.value = volume;
    gainNodeRef.current = gainNode;

    let node: AudioNode = src;
    for (const f of filters) { node.connect(f); node = f; }
    node.connect(gainNode);
    gainNode.connect(actx.destination);

    drawFreqResponse(freqCanvasRef.current!, filters, actx);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle file selection ─────────────────────────────────────────────
  const handleFile = useCallback(async (f: File) => {
    // Tear down old chain
    if (ctxRef.current) {
      await ctxRef.current.close();
      ctxRef.current = null;
      sourceRef.current = null;
      filtersRef.current = [];
      gainNodeRef.current = null;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (objectURL) URL.revokeObjectURL(objectURL);

    const url = URL.createObjectURL(f);
    setFile(f);
    setObjectURL(url);
    setPlaying(false);
    setBpm(null);
    setCurrentTime(0);
    setDuration(0);
    setAudioBuffer(null);
    progressRef.current = 0;

    // Decode for waveform + BPM
    try {
      const arrBuf = await f.arrayBuffer();
      const tmpCtx = new AudioContext();
      const buf = await tmpCtx.decodeAudioData(arrBuf.slice(0));
      await tmpCtx.close();
      setAudioBuffer(buf);
      setDuration(buf.duration);

      // Auto-detect BPM
      setDetectingBPM(true);
      const detected = detectBPM(buf);
      setBpm(detected);
      setDetectingBPM(false);

      // Draw initial waveform
      if (waveCanvasRef.current) {
        drawWaveform(waveCanvasRef.current, buf, 0, '#10b981');
      }
    } catch (e) {
      console.warn('Decode error', e);
    }
  }, [objectURL]);

  // ── Attach audio element events ──────────────────────────────────────
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      const ratio = audio.currentTime / (audio.duration || 1);
      progressRef.current = ratio;
      setCurrentTime(audio.currentTime);
    });
    audio.addEventListener('ended', () => setPlaying(false));
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Point audio element at new URL
  useEffect(() => {
    if (!audioRef.current || !objectURL) return;
    audioRef.current.src = objectURL;
    audioRef.current.load();
  }, [objectURL]);

  // ── Animate waveform progress ─────────────────────────────────────────
  useEffect(() => {
    if (!playing || !audioBuffer || !waveCanvasRef.current) return;
    const step = () => {
      if (waveCanvasRef.current && audioBuffer) {
        drawWaveform(waveCanvasRef.current, audioBuffer, progressRef.current, '#10b981');
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, audioBuffer]);

  // Redraw waveform when file first loaded (not playing)
  useEffect(() => {
    if (audioBuffer && waveCanvasRef.current) {
      drawWaveform(waveCanvasRef.current, audioBuffer, progressRef.current, '#10b981');
    }
  }, [audioBuffer]);

  // ── Volume sync ───────────────────────────────────────────────────────
  useEffect(() => {
    if (gainNodeRef.current) gainNodeRef.current.gain.value = volume;
    if (audioRef.current) audioRef.current.volume = gainNodeRef.current ? 1 : volume;
  }, [volume]);

  // ── Play / Pause ──────────────────────────────────────────────────────
  const togglePlay = async () => {
    if (!audioRef.current || !objectURL) return;
    if (!ctxRef.current) buildChain();
    if (ctxRef.current?.state === 'suspended') await ctxRef.current.resume();

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      await audioRef.current.play();
      setPlaying(true);
    }
  };

  // ── Seek ──────────────────────────────────────────────────────────────
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value);
    if (audioRef.current) audioRef.current.currentTime = t;
    progressRef.current = t / (duration || 1);
    setCurrentTime(t);
    if (audioBuffer && waveCanvasRef.current) {
      drawWaveform(waveCanvasRef.current, audioBuffer, progressRef.current, '#10b981');
    }
  };

  // ── EQ gain change ────────────────────────────────────────────────────
  const setGain = (idx: number, val: number) => {
    const next = [...gains];
    next[idx] = val;
    setGains(next);
    setActivePreset('');
    if (filtersRef.current[idx]) filtersRef.current[idx].gain.value = val;
    if (freqCanvasRef.current && filtersRef.current.length && ctxRef.current) {
      drawFreqResponse(freqCanvasRef.current, filtersRef.current, ctxRef.current);
    }
  };

  // ── Apply preset ──────────────────────────────────────────────────────
  const applyPreset = (name: string) => {
    const p = EQ_PRESETS[name];
    if (!p) return;
    setGains([...p]);
    setActivePreset(name);
    filtersRef.current.forEach((f, i) => { f.gain.value = p[i]; });
    if (freqCanvasRef.current && filtersRef.current.length && ctxRef.current) {
      drawFreqResponse(freqCanvasRef.current, filtersRef.current, ctxRef.current);
    }
  };

  // Draw freq response when EQ initialised (after first play)
  useEffect(() => {
    if (filtersRef.current.length && ctxRef.current && freqCanvasRef.current) {
      drawFreqResponse(freqCanvasRef.current, filtersRef.current, ctxRef.current);
    }
  });

  const resetEQ = () => applyPreset('平直');

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">音频工具</h1>
          <p className="text-gray-500 text-sm mt-1">上传任意音频，立即测试均衡器（EQ）与 BPM 检测，无需分轨</p>
        </div>

        {/* Upload */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Upload size={18} className="text-emerald-500" />
              选择音频文件
            </h2>
          </div>
          <div className="p-6">
            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                dragOver ? 'border-emerald-400 bg-emerald-50' : file ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.flac,.m4a,.ogg,.aac"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle size={28} className="text-emerald-500" />
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-400">{(file.size / 1024 / 1024).toFixed(1)} MB · {fmt(duration)}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="ml-4 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-2 py-1 rounded-lg"
                  >
                    更换
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <Music2 size={26} className="text-emerald-400" />
                  </div>
                  <p className="font-semibold text-gray-700">拖放文件到这里，或点击选择</p>
                  <p className="text-sm text-gray-400">支持 MP3、WAV、FLAC、M4A、AAC 等格式</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {file && (
          <>
            {/* Player */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Play size={18} className="text-emerald-500" />
                播放器
                <span className="text-xs font-normal text-gray-400 ml-1">（EQ 实时生效）</span>
              </h2>

              {/* Waveform canvas */}
              <div
                className="relative cursor-pointer"
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const ratio = (e.clientX - rect.left) / rect.width;
                  const t = ratio * duration;
                  if (audioRef.current) audioRef.current.currentTime = t;
                  progressRef.current = ratio;
                  setCurrentTime(t);
                  if (audioBuffer && waveCanvasRef.current) {
                    drawWaveform(waveCanvasRef.current, audioBuffer, ratio, '#10b981');
                  }
                }}
              >
                <canvas
                  ref={waveCanvasRef}
                  width={800}
                  height={80}
                  className="w-full h-[80px] rounded-xl bg-gray-50"
                />
                {!audioBuffer && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                    解码中…
                  </div>
                )}
              </div>

              {/* Seek */}
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full accent-emerald-500 cursor-pointer"
              />

              {/* Controls row */}
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  disabled={!audioBuffer}
                  className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors disabled:opacity-40"
                >
                  {playing ? <Pause size={18} /> : <Play size={18} />}
                </button>

                <span className="text-sm font-mono text-gray-500 tabular-nums">
                  {fmt(currentTime)} / {fmt(duration)}
                </span>

                <div className="flex items-center gap-2 ml-auto">
                  <Volume2 size={16} className="text-gray-400 shrink-0" />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-24 accent-emerald-500"
                    aria-label="音量"
                  />
                </div>
              </div>
            </div>

            {/* BPM */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Gauge size={18} className="text-emerald-500" />
                BPM 检测
              </h2>
              <div className="flex items-center gap-6">
                <div className="bg-gray-50 rounded-2xl px-8 py-4 text-center border border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">检测结果</p>
                  {detectingBPM ? (
                    <p className="text-3xl font-black text-emerald-500">…</p>
                  ) : bpm ? (
                    <p className="text-3xl font-black text-emerald-500 font-mono">{bpm}</p>
                  ) : (
                    <p className="text-3xl font-black text-gray-300">—</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">BPM</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 leading-relaxed">
                    基于低频能量峰值检测算法自动估算 BPM。
                    {bpm && <strong className="text-gray-700"> 音乐节拍约为 {bpm} BPM（{(60 / bpm).toFixed(2)}s / 拍）。</strong>}
                  </p>
                  {bpm && (
                    <div className="flex gap-2 mt-3 flex-wrap">
                      {[Math.round(bpm / 2), bpm, Math.round(bpm * 2)].filter(b => b > 0).map(b => (
                        <span key={b} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full font-mono font-semibold">
                          {b} BPM{b === bpm ? ' ✓' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* EQ */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <Wand2 size={18} className="text-emerald-500" />
                  10 段图形均衡器
                  <span className="text-xs font-normal text-gray-400">播放时实时生效</span>
                </h2>
                <button
                  onClick={resetEQ}
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg hover:border-gray-300 transition-all"
                >
                  <RotateCcw size={12} />
                  重置
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Presets */}
                <div className="flex flex-wrap gap-2">
                  {Object.keys(EQ_PRESETS).map((name) => (
                    <button
                      key={name}
                      onClick={() => applyPreset(name)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all font-medium ${
                        activePreset === name
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-600'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>

                {/* Frequency response canvas */}
                <canvas
                  ref={freqCanvasRef}
                  width={760}
                  height={100}
                  className="w-full h-[100px] rounded-xl bg-gray-50 border border-gray-100"
                />

                {/* 10-band sliders */}
                <div className="flex items-end justify-between gap-1 px-2">
                  {EQ_BANDS.map((band, i) => (
                    <div key={band.freq} className="flex flex-col items-center gap-1.5 flex-1">
                      <span
                        className={`text-[10px] font-mono font-semibold ${
                          gains[i] > 0 ? 'text-emerald-500' : gains[i] < 0 ? 'text-red-400' : 'text-gray-400'
                        }`}
                      >
                        {gains[i] > 0 ? '+' : ''}
                        {gains[i] === 0 ? '0' : gains[i].toFixed(1)}
                      </span>
                      <input
                        type="range"
                        min={-12}
                        max={12}
                        step={0.5}
                        value={gains[i]}
                        onChange={(e) => setGain(i, Number(e.target.value))}
                        aria-label={`${band.label}Hz EQ gain`}
                        className="h-28 accent-emerald-500 cursor-pointer"
                        style={{
                          writingMode: 'vertical-lr',
                          direction: 'rtl',
                          width: '20px',
                        } as React.CSSProperties}
                      />
                      <span className="text-[10px] text-gray-400 font-mono">{band.label}</span>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-400 text-center">
                  拖动滑块调节各频段增益（dB）· 点击播放后 EQ 立即生效 · 更换文件自动重置连接
                </p>
              </div>
            </div>
          </>
        )}

        {!file && (
          <div className="text-center py-16 text-gray-400">
            <Music2 size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">上传音频文件后，此处将显示播放器、BPM 检测和均衡器</p>
          </div>
        )}
      </div>
    </div>
  );
}
