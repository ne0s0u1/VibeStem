import { useRef, useCallback } from 'react';
import { Play, Pause, X, Volume2, VolumeX } from 'lucide-react';
import { usePlayer } from '../contexts/PlayerContext';

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function GlobalPlayer() {
  const { currentTrack, playing, currentTime, duration, volume, togglePlay, seekTo, setVolume, close } =
    usePlayer();

  const progressRef = useRef<HTMLDivElement>(null);

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = progressRef.current!.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      seekTo(ratio);
    },
    [seekTo]
  );

  const progress = duration > 0 ? currentTime / duration : 0;
  const color = currentTrack?.color ?? '#10b981';

  if (!currentTrack) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-[0_-4px_24px_-6px_rgba(0,0,0,0.08)] select-none">
      {/* Slim progress bar at very top edge */}
      <div
        ref={progressRef}
        className="absolute top-0 left-0 right-0 h-[3px] cursor-pointer group/bar"
        onClick={handleProgressClick}
        role="slider"
        aria-label="播放进度"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') seekTo(Math.min(1, progress + 0.02));
          if (e.key === 'ArrowLeft') seekTo(Math.max(0, progress - 0.02));
        }}
      >
        <div className="w-full h-full bg-gray-100" />
        <div
          className="absolute top-0 left-0 h-full transition-none rounded-r-full"
          style={{ width: `${progress * 100}%`, backgroundColor: color }}
        />
        {/* Scrubber thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow opacity-0 group-hover/bar:opacity-100 transition-opacity border-2 border-white"
          style={{ left: `${progress * 100}%`, transform: 'translate(-50%, -50%)', backgroundColor: color }}
        />
      </div>

      {/* Main bar content */}
      <div className="flex items-center gap-4 px-5 h-[60px]">
        {/* ─── Track info ─── */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Spinning vinyl disc */}
          <div className="relative shrink-0 w-10 h-10">
            <div className={`w-10 h-10 rounded-full overflow-hidden ${playing ? 'vinyl-spinning' : ''}`}>
              {currentTrack.imageUrl ? (
                <img src={currentTrack.imageUrl} alt="封面" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-900 flex items-center justify-center relative">
                  <div className="absolute inset-[2px] border border-white/10 rounded-full" />
                  <div className="absolute inset-[5px] border border-white/10 rounded-full" />
                  <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ backgroundColor: color }}>
                    <div className="w-1 h-1 bg-white rounded-full" />
                  </div>
                </div>
              )}
            </div>
            {/* Center hole overlay */}
            {currentTrack.imageUrl && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3 h-3 rounded-full bg-white border-2 border-gray-200" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{currentTrack.title}</p>
            {currentTrack.subtitle && (
              <p className="text-xs text-gray-400 truncate leading-tight mt-0.5">{currentTrack.subtitle}</p>
            )}
          </div>
        </div>

        {/* ─── Center controls ─── */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Time */}
          <span className="text-xs text-gray-400 tabular-nums w-10 text-right hidden sm:block">
            {formatTime(currentTime)}
          </span>

          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
            style={{ backgroundColor: color }}
            aria-label={playing ? '暂停' : '播放'}
          >
            {playing ? (
              <Pause size={16} className="text-white" fill="white" />
            ) : (
              <Play size={16} className="text-white" fill="white" style={{ marginLeft: 2 }} />
            )}
          </button>

          {/* Duration */}
          <span className="text-xs text-gray-400 tabular-nums w-10 hidden sm:block">
            {formatTime(duration)}
          </span>
        </div>

        {/* ─── Right controls ─── */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          {/* Volume */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setVolume(volume > 0 ? 0 : 1)}
              className="text-gray-400 hover:text-gray-700 transition-colors"
              aria-label={volume > 0 ? '静音' : '取消静音'}
            >
              {volume > 0 ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.02}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-20 accent-emerald-500 cursor-pointer"
              aria-label="音量"
            />
          </div>

          {/* Close */}
          <button
            onClick={close}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
            aria-label="关闭播放器"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
