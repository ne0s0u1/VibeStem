import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <Sidebar />
      <main className="flex-1 flex min-w-0 h-full bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
