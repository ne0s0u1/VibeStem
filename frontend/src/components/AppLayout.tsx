import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import GlobalPlayer from './GlobalPlayer';
import { usePlayer } from '../contexts/PlayerContext';

export default function AppLayout() {
  const { currentTrack } = usePlayer();
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <Sidebar />
      <main
        className="flex-1 flex min-w-0 h-full bg-gray-50"
        style={{ paddingBottom: currentTrack ? 64 : 0 }}
      >
        <Outlet />
      </main>
      <GlobalPlayer />
    </div>
  );
}
