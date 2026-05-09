import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMyRequests, getAllRequests, getUsers } from '../services/api';

const POLL_INTERVAL = 30000;

const typeStyles = {
  approved:          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  pending_manager:   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  pending_hr:        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  rejected_manager:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  rejected_hr:       'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  cancelled:         'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400',
};

const getReadKey = (userId) => `ld_read_${userId}`;

const NotificationsDropdown = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const ref = useRef(null);
  const intervalRef = useRef(null);

  // Load persisted read IDs when user changes
  useEffect(() => {
    if (!user) return;
    try {
      const stored = JSON.parse(localStorage.getItem(getReadKey(user.employeeId || user.email)) || '[]');
      setReadIds(new Set(stored));
    } catch {
      setReadIds(new Set());
    }
  }, [user?.employeeId]);

  const fetchNotifs = useCallback(async () => {
    if (!user) return;
    try {
      let items = [];
      if (user.role === 'employee') {
        const res = await getMyRequests();
        const stillPending = (s) => ['pending_manager', 'pending_hr'].includes((s || '').toLowerCase());
        items = (res.data.requests || [])
          .filter(r => !stillPending(r.status))
          .map(r => ({
            id: r.request_id,
            message: `Your ${r.leave_type} request was ${(r.status || '').replace(/_/g, ' ')}`,
            time: r.updated_at || r.created_at,
            type: (r.status || '').toLowerCase(),
          }))
          .slice(0, 10);
      } else if (['admin', 'manager', 'hr'].includes(user.role)) {
        const res = await getAllRequests();
        let allReqs = res.data.requests || [];

        // Managers only see their department's notifications
        if (user.role === 'manager' && user.department) {
          const dept = user.department.toLowerCase();
          try {
            const usersRes = await getUsers();
            const deptIds = new Set(
              (usersRes.data.users || [])
                .filter(u => (u.department || '').toLowerCase() === dept && u.role === 'employee')
                .map(u => u.employee_id)
            );
            allReqs = allReqs.filter(r => deptIds.has(r.employee_id));
          } catch {}
        }

        const awaitsMe = (r) => {
          const s = (r.status || '').toLowerCase();
          if (user.role === 'manager') return s === 'pending_manager';
          if (user.role === 'hr') return s === 'pending_hr';
          return s === 'pending_manager' || s === 'pending_hr';
        };
        items = allReqs
          .filter(awaitsMe)
          .map(r => ({
            id: r.request_id,
            message: `${r.employee_name}'s ${r.leave_type} leave needs review`,
            time: r.updated_at || r.created_at,
            type: (r.status || '').toLowerCase(),
          }))
          .slice(0, 10);
      }
      setNotifications(items);
    } catch {}
  }, [user]);

  useEffect(() => {
    fetchNotifs();
    intervalRef.current = setInterval(fetchNotifs, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchNotifs]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const saveReadIds = (ids) => {
    if (!user) return;
    localStorage.setItem(getReadKey(user.employeeId || user.email), JSON.stringify([...ids]));
    setReadIds(ids);
  };

  const markAllRead = () => {
    const next = new Set([...readIds, ...notifications.map(n => n.id)]);
    saveReadIds(next);
  };

  const dismiss = (id) => {
    const next = new Set([...readIds, id]);
    saveReadIds(next);
  };

  const unread = notifications.filter(n => !readIds.has(n.id)).length;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setOpen(!open); if (!open && unread > 0) {} }}
        className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative">
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1 leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Notifications</h3>
              {unread > 0 && (
                <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold px-1.5 py-0.5 rounded-full">
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors">
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell size={24} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-slate-400 dark:text-slate-500 text-xs">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map(n => {
                  const isUnread = !readIds.has(n.id);
                  return (
                    <div key={n.id}
                      className={`px-4 py-3 flex items-start gap-3 transition-colors group ${isUnread ? 'bg-indigo-50/60 dark:bg-indigo-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                      <span className={`mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold capitalize flex-shrink-0 ${typeStyles[n.type] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
                        {n.type}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {n.time ? new Date(n.time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isUnread && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />}
                        <button onClick={() => dismiss(n.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-slate-500 dark:hover:text-slate-400 transition-all">
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-400">Updates every 30s</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;