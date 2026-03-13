import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMyRequests, getAllRequests } from '../services/api';

const NotificationsDropdown = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        if (user?.role === 'employee') {
          const res = await getMyRequests();
          const reqs = res.data.requests || [];
          const notifs = reqs
            .filter(r => r.status?.toLowerCase() !== 'pending')
            .map(r => ({
              id: r.request_id,
              message: `Your ${r.leave_type} request was ${r.status?.toLowerCase()}`,
              time: r.updated_at || r.created_at,
              type: r.status?.toLowerCase(),
              read: false,
            }))
            .slice(0, 10);
          setNotifications(notifs);
        } else if (['admin', 'manager', 'hr'].includes(user?.role)) {
          const res = await getAllRequests();
          const reqs = res.data.requests || [];
          const pending = reqs
            .filter(r => r.status?.toLowerCase() === 'pending')
            .map(r => ({
              id: r.request_id,
              message: `${r.employee_name} submitted a ${r.leave_type} request`,
              time: r.created_at,
              type: 'pending',
              read: false,
            }))
            .slice(0, 10);
          setNotifications(pending);
        }
      } catch (e) {}
    };
    if (user) fetchNotifs();
  }, [user]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const typeStyles = {
    approved: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    pending:  'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)}
        className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
            {unread > 0 && (
              <button onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                No notifications
              </div>
            ) : notifications.map(n => (
              <div key={n.id} className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!n.read ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${typeStyles[n.type] || typeStyles.pending}`}>
                    {n.type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {n.time ? new Date(n.time).toLocaleDateString() : ''}
                    </p>
                  </div>
                  {!n.read && <span className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;