import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Download, Mic, Music2, Volume2, VolumeX } from 'lucide-react';

interface StemMixerPlayerProps {
  vocalsUrl?: string;
  accompanimentUrl?: string;
  vocalsColor?: string;
  accompanimentColor?: string;
}

export default function StemMixerPlayer({
  vocalsUrl,
  accompanimentUrl,
  vocalsColor = '#f43f5e',
  accompanimentColor = '#10b981',
}: StemMixerPlayerProps) {
  const vocalsContainerRef = useRef<HTMLDivElement>(null);
  const accompContainerRef = useRef<HTMLDivElement>(null);
  const wsVocals = useRef<WaveSurfer | null>(null);
  const wsAccomp = useRef<WaveSurfer | null>(null);
  const isSyncing = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [vocalsReady, setVocalsReady] = useState(false);
  const [accompReady, setAccompReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [vocalVol, setVocalVol] = useState(1);
  const [accompVol, setAccompVol] = useState(1);

  const bothReady = vocalsReady && accompReady;

  useEffect(() => {
    if (!vocalsContainerRef.current || !accompContainerRef.current) return;

    const wvConfig = {
      waveColor: '#e5e7eb',
      height: 52,
      barWidth: 3,
      barGap: 1,
      barRadius: 2,
      cursorWidth: 0,
      normalize: true,
      interact: true,
    };

    const wv = WaveSurfer.create({
      container: vocalsContainerRef.current,
      ...wvConfig,
      progressColor: vocalsColor,
    });

    const wa = WaveSurfer.create({
      container: accompContainerRef.current,
      ...wvConfig,
      progressColor: accompanimentColor,
    });

    if (vocalsUrl) wv.load(vocalsUrl);
    if (accompanimentUrl) wa.load(accompanimentUrl);

    wsVocals.current = wv;
    wsAccomp.current = wa;

    wv.on('ready', () => {
      setVocalsReady(true);
      setDuration(wv.getDuration());
    });
    wa.on('ready', () => setAccompReady(true));

    wv.on('audioprocess', () => setCurrentTime(wv.getCurrentTime()));
    wv.on('seeking', () => setCurrentTime(wv.getCurrentTime()));

    wv.on('play', () => setPlaying(true));
    wv.on('pause', () => setPlaying(false));
    wv.on('finish', () => {
      wa.stop();
      setPlaying(false);
    });

    // 双向 seek 同步
    wv.on('seeking', () => {
      if (isSyncing.current) return;
      isSyncing.current = true;
      const t = wv.getCurrentTime();
      setCurrentTime(t);
      const dur = wa.getDuration();
      if (dur > 0) wa.seekTo(t / dur);
      isSyncing.current = false;
    });

    wa.on('seeking', () => {
      if (isSyncing.current) return;
      isSyncing.current = true;
      const t = wa.getCurrentTime();
      const dur = wv.getDuration();
      if (dur > 0) wv.seekTo(t / dur);
      isSyncing.current = false;
    });

    wv.on('error', (err: Error) => { if (err?.name !== 'AbortError') console.warn('[Vocals]', err); });
    wa.on('error', (err: Error) => { if (err?.name !== 'AbortError') console.warn('[Accomp]', err); });

    return () => {
      wv.destroy();
      wa.destroy();
      wsVocals.current = null;
      wsAccomp.current = null;
    };
  }, [vocalsUrl, accompanimentUrl, vocalsColor, accompanimentColor]);

  const togglePlay = useCallback(() => {
    const wv = wsVocals.current;
    const wa = wsAccomp.current;
    if (!wv || !wa) return;
    if (wv.isPlaying()) {
      wv.pause();
      wa.pause();
    } else {
      wv.play();
      wa.play();
    }
  }, []);

  const handleVocalVol = (v: number) => {
    setVocalVol(v);
    wsVocals.current?.setVolume(v);
  };

  const handleAccompVol = (v: number) => {
    setAccompVol(v);
    wsAccomp.current?.setVolume(v);
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className="space-y-4">
      {/* 统一播放控制 */}
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          disabled={!bothReady}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 shadow-sm"
          style={{ backgroundColor: vocalsColor }}
          aria-label={playing ? '暂停' : '播放'}
        >
          {playing
            ? <Pause size={15} fill="white" />
            : <Play size={15} fill="white" style={{ marginLeft: 1 }} />}
        </button>
        <span className="text-xs font-mono text-gray-400 tabular-nums">
          {fmt(currentTime)} / {fmt(duration)}
        </span>
        {!bothReady && (
          <span className="text-xs text-gray-400 animate-pulse">波形加载中…</span>
        )}
      </div>

      {/* 人声轨道 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Mic size={13} style={{ color: vocalsColor }} />
            <span className="text-xs font-semibold text-gray-600">人声</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleVocalVol(vocalVol > 0 ? 0 : 1)}
              className="text-gray-400 hover:text-gray-700 transition-colors"
              aria-label={vocalVol > 0 ? '静音人声' : '取消静音人声'}
            >
              {vocalVol === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>
            <input
              type="range" min={0} max={1} step={0.01} value={vocalVol}
              onChange={(e) => handleVocalVol(Number(e.target.value))}
              className="w-20 accent-rose-500 cursor-pointer"
              aria-label="人声音量"
            />
            {vocalsUrl && (
              <a
                href={vocalsUrl}
                download="vocals.wav"
                className="p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                aria-label="下载人声"
              >
                <Download size={13} style={{ color: vocalsColor }} />
              </a>
            )}
          </div>
        </div>
        <div ref={vocalsContainerRef} className="w-full" />
      </div>

      {/* 伴奏轨道 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Music2 size={13} style={{ color: accompanimentColor }} />
            <span className="text-xs font-semibold text-gray-600">伴奏</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAccompVol(accompVol > 0 ? 0 : 1)}
              className="text-gray-400 hover:text-gray-700 transition-colors"
              aria-label={accompVol > 0 ? '静音伴奏' : '取消静音伴奏'}
            >
              {accompVol === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>
            <input
              type="range" min={0} max={1} step={0.01} value={accompVol}
              onChange={(e) => handleAccompVol(Number(e.target.value))}
              className="w-20 accent-emerald-500 cursor-pointer"
              aria-label="伴奏音量"
            />
            {accompanimentUrl && (
              <a
                href={accompanimentUrl}
                download="accompaniment.wav"
                className="p-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                aria-label="下载伴奏"
              >
                <Download size={13} style={{ color: accompanimentColor }} />
              </a>
            )}
          </div>
        </div>
        <div ref={accompContainerRef} className="w-full" />
      </div>
    </div>
  );
}
