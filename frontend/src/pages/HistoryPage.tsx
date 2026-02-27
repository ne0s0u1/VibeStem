import React, { useState, useEffect } from 'react';
import { databases, Query } from '../lib/appwrite';
import { APPWRITE_CONFIG } from '../lib/config';
import { useAuth } from '../contexts/AuthContext';
import type { Task } from '../types';
import {
  History,
  CheckCircle,
  XCircle,
  Clock,
  Loader,
  Scissors,
  Sparkles,
} from 'lucide-react';

type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export default function HistoryPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'separate' | 'generate'>('all');

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  async function fetchTasks() {
    setLoading(true);
    try {
      const queries = [Query.equal('ownerId', user!.$id), Query.orderDesc('$createdAt')];
      if (filter !== 'all') {
        queries.push(Query.equal('type', filter));
      }
      const res = await databases.listDocuments(
        APPWRITE_CONFIG.databaseId,
        APPWRITE_CONFIG.tasksCollectionId,
        queries
      );
      setTasks(res.documents as unknown as Task[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const statusIcon: Record<TaskStatus, React.ReactNode> = {
    pending: <Clock size={16} className="text-amber-500" />,
    processing: <Loader size={16} className="text-blue-500 animate-spin" />,
    completed: <CheckCircle size={16} className="text-emerald-500" />,
    failed: <XCircle size={16} className="text-red-500" />,
  };

  const statusLabel: Record<TaskStatus, string> = {
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-medium text-gray-900 tracking-tight relative inline-block">
              Task History
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-200/50 via-orange-100/50 to-amber-200/50 blur-lg -z-10"></div>
            </h1>
            <p className="text-gray-500 text-sm mt-1">Track your separation and generation tasks</p>
          </div>

          {/* Filter */}
          <div className="flex p-1 bg-gray-200/50 rounded-xl w-full sm:w-auto">
            {(['all', 'separate', 'generate'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 sm:flex-none px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                  filter === f
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f === 'all' ? 'All Tasks' : f === 'separate' ? 'Separation' : 'Generation'}
              </button>
            ))}
          </div>
        </header>

        {/* Task List */}
        {loading ? (
          <div className="text-center py-32 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <div className="w-10 h-10 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="font-medium text-gray-500">Loading history...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-5">
              <History size={32} className="text-gray-300" />
            </div>
            <p className="text-gray-900 font-medium text-lg">No tasks found</p>
            <p className="text-gray-500 text-sm mt-2">You haven't run any separation or generation tasks yet.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tasks.map((task) => (
              <div
                key={task.$id}
                className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-5 hover:shadow-md transition-all duration-300 group"
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                    task.type === 'separate'
                      ? 'bg-rose-50 text-rose-500 border border-rose-100'
                      : 'bg-emerald-50 text-emerald-500 border border-emerald-100'
                  }`}
                >
                  {task.type === 'separate' ? (
                    <Scissors size={24} />
                  ) : (
                    <Sparkles size={24} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-base font-bold text-gray-900">
                      {task.type === 'separate' ? 'Stem Separation' : 'Music Generation'}
                    </p>
                    {task.model && (
                      <span className="text-[11px] px-2.5 py-1 rounded-md font-medium bg-gray-50 border border-gray-100 text-gray-600">
                        {task.model === 'finetuned' ? 'EDM Enhanced' : task.model}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 flex items-center gap-1.5">
                    <Clock size={14} className="text-gray-400" />
                    {new Date(task.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-4 sm:justify-end">
                  {task.error && (
                    <div className="max-w-[200px] px-3 py-2 rounded-xl bg-red-50 border border-red-100">
                      <span className="text-xs text-red-600 truncate block font-medium" title={task.error}>
                        {task.error}
                      </span>
                    </div>
                  )}
                  
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
                    task.status === 'completed' ? 'bg-emerald-50 border-emerald-100' :
                    task.status === 'failed' ? 'bg-red-50 border-red-100' :
                    task.status === 'processing' ? 'bg-blue-50 border-blue-100' :
                    'bg-amber-50 border-amber-100'
                  }`}>
                    {statusIcon[(task.status as TaskStatus)]}
                    <span
                      className={`text-sm font-bold ${
                        task.status === 'completed' ? 'text-emerald-700' :
                        task.status === 'failed' ? 'text-red-700' :
                        task.status === 'processing' ? 'text-blue-700' :
                        'text-amber-700'
                      }`}
                    >
                      {statusLabel[(task.status as TaskStatus)]}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
