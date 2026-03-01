import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Volume2 } from 'lucide-react';

interface WaveformPlayerProps {
  url: string;
  label?: string;
  color?: string;
  height?: number;
  /** 外部通知此播放器暂停（用于单曲播放控制） */
  shouldPause?: boolean;
  /** 此播放器开始播放时回调 */
  onPlay?: () => void;
}

export default function WaveformPlayer({
  url,
  label,
  color = '#10b981',
  height = 64,
  shouldPause,
  onPlay,
}: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);

  // 外部暂停控制
  useEffect(() => {
    if (shouldPause && wsRef.current?.isPlaying()) {
      wsRef.current.pause();
    }
  }, [shouldPause]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#e5e7eb',
      progressColor: color,
      height,
      barWidth: 3,
      barGap: 1,
      barRadius: 2,
      cursorWidth: 0,
      normalize: true,
    });

    ws.load(url);
    wsRef.current = ws;

    ws.on('ready', () => {
      setReady(true);
      setDuration(ws.getDuration());
    });
    ws.on('audioprocess', () => setCurrentTime(ws.getCurrentTime()));
    ws.on('seeking', () => setCurrentTime(ws.getCurrentTime()));
    ws.on('play', () => setPlaying(true));
    ws.on('pause', () => setPlaying(false));
    ws.on('finish', () => setPlaying(false));
    // 忽略 AbortError（组件卸载时 fetch 被中断）
    ws.on('error', (err: Error) => {
      if (err?.name === 'AbortError') return;
      console.warn('[WaveformPlayer] error:', err);
    });

    return () => {
      ws.destroy();
      wsRef.current = null;
    };
  }, [url, color, height]);

  const togglePlay = () => {
    if (!wsRef.current) return;
    if (!wsRef.current.isPlaying()) onPlay?.();
    wsRef.current.playPause();
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  const handleVolume = (v: number) => {
    setVolume(v);
    wsRef.current?.setVolume(v);
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>}
      <div ref={containerRef} className="w-full" />
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          disabled={!ready}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-40"
          style={{ backgroundColor: color + '22', color }}
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <span className="text-xs font-mono text-gray-500 tabular-nums w-20">
          {fmt(currentTime)} / {fmt(duration)}
        </span>
        <div className="flex items-center gap-1.5 ml-auto">
          <Volume2 size={14} className="text-gray-400" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => handleVolume(Number(e.target.value))}
            className="w-20 accent-emerald-500"
            aria-label="音量"
          />
        </div>
      </div>
    </div>
  );
}