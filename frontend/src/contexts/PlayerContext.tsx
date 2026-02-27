import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

export interface PlayableTrack {
  id: string;
  url: string;
  title: string;
  subtitle?: string;
  color?: string; // accent color for the player bar
  imageUrl?: string; // album art for player disc
}

interface PlayerContextType {
  currentTrack: PlayableTrack | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playTrack: (track: PlayableTrack) => void;
  togglePlay: () => void;
  seekTo: (ratio: number) => void;
  setVolume: (v: number) => void;
  close: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  // Persist the audio element across renders/navigation
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [currentTrack, setCurrentTrack] = useState<PlayableTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);

  // Create the audio element once on mount
  useEffect(() => {
    const audio = new Audio();
    audio.volume = 1;
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(isNaN(audio.duration) ? 0 : audio.duration);
    const onEnded = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.pause();
      audio.src = '';
    };
  }, []);

  const playTrack = useCallback(
    (track: PlayableTrack) => {
      const audio = audioRef.current!;
      // Toggle if same track
      if (currentTrack?.id === track.id) {
        if (audio.paused) audio.play();
        else audio.pause();
        return;
      }
      audio.src = track.url;
      audio.play().catch(console.error);
      setCurrentTrack(track);
      setCurrentTime(0);
      setDuration(0);
    },
    [currentTrack]
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current!;
    if (audio.paused) audio.play().catch(console.error);
    else audio.pause();
  }, []);

  const seekTo = useCallback((ratio: number) => {
    const audio = audioRef.current!;
    if (audio.duration && !isNaN(audio.duration)) {
      audio.currentTime = ratio * audio.duration;
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    const audio = audioRef.current!;
    audio.volume = v;
    setVolumeState(v);
  }, []);

  const close = useCallback(() => {
    const audio = audioRef.current!;
    audio.pause();
    audio.src = '';
    setCurrentTrack(null);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        playing,
        currentTime,
        duration,
        volume,
        playTrack,
        togglePlay,
        seekTo,
        setVolume,
        close,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}
