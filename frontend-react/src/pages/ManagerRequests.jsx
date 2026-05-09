import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getAllRequests, managerReview } from '../services/api';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import { Search, CheckCircle, XCircle, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react';

const ManagerRequests = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [requests, setRequests]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState('pending_manager');
  const [search, setSearch]               = useState('');
  const [expandedId, setExpandedId]       = useState(null);
  const [comment, setComment]             = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError]     = useState('');

  const fetchRequests = () => {
    getAllRequests()
      .then(res => { setRequests(res.data.requests || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchRequests(); }, []);

  const filtered = requests.filter(r => {
    const matchStatus =
      filter === 'all'             ? true :
      filter === 'pending_manager' ? r.status === 'pending_manager' :
      filter === 'approved'        ? r.status === 'approved' :
      filter === 'rejected_manager' ? r.status === 'rejected_manager' :
      true;
    const matchSearch = !search || r.employee_name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const pendingCount = requests.filter(r => r.status === 'pending_manager').length;

  const handleAction = async (requestId, decision) => {
    if (!comment.trim()) return;
    setActionLoading(requestId + decision);
    setActionError('');
    try {
      await managerReview({ request_id: requestId, decision, comment: comment.trim() });
      setExpandedId(null);
      setComment('');
      fetchRequests();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Error updating request');
    }
    setActionLoading(null);
  };

  const FILTER_TABS = [
    { key: 'pending_manager', label: 'Pending',  count: pendingCount },
    { key: 'all',             label: 'All',       count: null },
    { key: 'approved',        label: 'Approved',  count: null },
    { key: 'rejected_manager', label: 'Rejected', count: null },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-1">Team Manager</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('allRequests')}</h1>
          {user?.department && <p className="text-sm text-slate-400 mt-0.5 capitalize">{user.department} department</p>}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-1">
              {FILTER_TABS.map(tab => (
                <button key={tab.key} onClick={() => setFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors
                    ${filter === tab.key
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                      : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
                  {tab.label}
                  {tab.count !== null && tab.count > 0 && <span className="ml-1 opacity-60">{tab.count}</span>}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder={t('search')} value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44" />
            </div>
          </div>

          {actionError && (
            <div className="px-5 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800/40">
              <p className="text-xs text-red-600 dark:text-red-400">{actionError}</p>
            </div>
          )}

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-32" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-48" />
                  </div>
                  <div className="h-6 w-16 bg-slate-100 dark:bg-slate-800 rounded-full" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <ClipboardList size={28} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-slate-400 text-sm">{t('noRequests')}</p>
              </div>
            ) : filtered.map(req => (
              <div key={req.request_id} className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {req.employee_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 dark:text-white text-sm">{req.employee_name}</p>
                        {req.balance_exceeded && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">OVER BALANCE</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {t(req.leave_type)} · {req.start_date} → {req.end_date}
                        {req.requested_days && <span className="ml-1 text-slate-400">({Number(req.requested_days)}d)</span>}
                      </p>
                      {req.reason && <p className="text-xs text-slate-400 italic mt-0.5 truncate">"{req.reason}"</p>}
                      {req.manager_comment && <p className="text-xs text-indigo-400 mt-0.5 truncate">↳ {req.manager_comment}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={req.status} />
                    {req.status === 'pending_manager' && (
                      <button
                        onClick={() => { setExpandedId(expandedId === req.request_id ? null : req.request_id); setComment(''); setActionError(''); }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                        {expandedId === req.request_id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>
                    )}
                  </div>
                </div>

                {expandedId === req.request_id && (
                  <div className="mt-3 ml-12 bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                    {req.reason && <p className="text-xs text-slate-500 italic mb-3">"{req.reason}"</p>}
                    <p className="text-xs text-slate-400 mb-2">Comment is required to approve or reject.</p>
                    <div className="flex gap-2 items-center flex-wrap">
                      <input type="text" placeholder="Add a comment…" value={comment}
                        onChange={e => setComment(e.target.value)}
                        className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      <button onClick={() => handleAction(req.request_id, 'approve')}
                        disabled={actionLoading === req.request_id + 'approve' || !comment.trim()}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors">
                        <CheckCircle size={13} /> {t('approve')}
                      </button>
                      <button onClick={() => handleAction(req.request_id, 'reject')}
                        disabled={actionLoading === req.request_id + 'reject' || !comment.trim()}
                        className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors">
                        <XCircle size={13} /> {t('reject')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerRequests;