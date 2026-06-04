import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNotifications, markNotificationRead } from '../services/api';

const POLL_INTERVAL = 30000;

// Infer a colour style from the notification message content
function getTypeStyle(message = '') {
  const m = message.toLowerCase();
  if (m.includes('approved'))          return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
  if (m.includes('rejected'))          return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  if (m.includes('awaiting your review') || m.includes('pending'))
                                       return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  if (m.includes('cancelled'))         return 'bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-400';
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
}

function getTypeLabel(message = '') {
  const m = message.toLowerCase();
  if (m.includes('approved'))          return 'approved';
  if (m.includes('rejected'))          return 'rejected';
  if (m.includes('awaiting your review')) return 'pending review';
  if (m.includes('cancelled'))         return 'cancelled';
  return 'info';
}

const NotificationsDropdown = () => {
  const { user } = useAuth();
  const [open, setOpen]                   = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const ref         = useRef(null);
  const intervalRef = useRef(null);

  const fetchNotifs = useCallback(async () => {
    if (!user) return;
    try {
      const res    = await getNotifications();
      const items  = res.data.notifications  || [];
      const unread = res.data.unread_count   ?? items.filter(n => !n.is_read).length;
      setNotifications(items);
      setUnreadCount(unread);
    } catch {
      // silent — network errors shouldn't crash the bell
    }
  }, [user]);

  // Initial fetch + polling
  useEffect(() => {
    fetchNotifs();
    intervalRef.current = setInterval(fetchNotifs, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchNotifs]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (notificationId) => {
    try {
      await markNotificationRead({ notification_id: notificationId });
      // Optimistic update
      setNotifications(prev =>
        prev.map(n => n.notification_id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // silent
    }
  };

  const markAllRead = async () => {
    const unreadItems = notifications.filter(n => !n.is_read);
    // Fire all mark-read requests in parallel
    await Promise.allSettled(
      unreadItems.map(n => markNotificationRead({ notification_id: n.notification_id }))
    );
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors relative"
      >
        <Bell size={17} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-1 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold px-1.5 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors"
              >
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell size={24} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-slate-400 dark:text-slate-500 text-xs">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map(n => {
                  const isUnread = !n.is_read;
                  return (
                    <div
                      key={n.notification_id}
                      className={`px-4 py-3 flex items-start gap-3 transition-colors group ${
                        isUnread
                          ? 'bg-indigo-50/60 dark:bg-indigo-900/10'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <span className={`mt-0.5 px-2 py-0.5 rounded-full text-xs font-semibold capitalize flex-shrink-0 ${getTypeStyle(n.message)}`}>
                        {getTypeLabel(n.message)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                          {n.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {n.created_at
                            ? new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                            : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {isUnread && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />}
                        {isUnread && (
                          <button
                            onClick={() => markRead(n.notification_id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-slate-500 dark:hover:text-slate-400 transition-all"
                            title="Mark as read"
                          >
                            <X size={11} />
                          </button>
                        )}
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
