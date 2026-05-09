import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getAllRequests, hrReview, deleteRequest } from '../services/api';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import { Search, Trash2, X, Check, Filter, FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import StatCard from '../components/StatCard';

const roleLabels = { admin: 'Administrator', hr: 'Human Resources' };

const AdminRequests = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isHR    = user?.role === 'hr';
  const [requests, setRequests]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState('all');
  const [search, setSearch]             = useState('');
  const [expandedId, setExpandedId]     = useState(null);
  const [comment, setComment]           = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchRequests = () => {
    getAllRequests()
      .then(res => { setRequests(res.data.requests || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleAction = async (requestId, decision) => {
    setActionLoading(requestId + decision);
    try {
      await hrReview({ request_id: requestId, decision, comment: comment.trim() });
      setExpandedId(null); setComment(''); fetchRequests();
    } catch (err) { 
      alert(err.response?.data?.error || 'Error updating status');
    }
    setActionLoading(null);
  };

  const handleDelete = async (requestId) => {
    try { await deleteRequest({ request_id: requestId }); setDeleteConfirm(null); fetchRequests(); }
    catch (err) { console.error(err); }
  };

  const normalize = s => s?.toLowerCase() || '';

  const stats = {
    total:           requests.length,
    pending_manager: requests.filter(r => r.status === 'pending_manager').length,
    pending_hr:      requests.filter(r => r.status === 'pending_hr').length,
    approved:        requests.filter(r => r.status === 'approved').length,
    rejected_combined:
      requests.filter(r => r.status === 'rejected_manager' || r.status === 'rejected_hr').length,
    cancelled:       requests.filter(r => r.status === 'cancelled').length,
  };

  const filtered = requests.filter(r => {
    let matchStatus = false;
    if (filter === 'all') matchStatus = true;
    else if (filter === 'pending_manager') matchStatus = r.status === 'pending_manager';
    else if (filter === 'pending_hr') matchStatus = r.status === 'pending_hr';
    else if (filter === 'approved') matchStatus = r.status === 'approved';
    else if (filter === 'rejected_combined')
      matchStatus = r.status === 'rejected_manager' || r.status === 'rejected_hr';
    else if (filter === 'cancelled') matchStatus = r.status === 'cancelled';

    const matchSearch = !search ||
      r.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.leave_type?.toLowerCase().includes(search.toLowerCase()) ||
      r.department?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const FILTER_TABS = [
    { key: 'all', label: 'All', color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400' },
    { key: 'pending_manager', label: 'Pending Mgr', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400' },
    { key: 'pending_hr', label: 'Pending HR', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' },
    { key: 'approved', label: 'Approved', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400' },
    { key: 'rejected_combined', label: 'Rejected', color: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400' },
    { key: 'cancelled', label: 'Cancelled', color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/20 dark:text-slate-400' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <span className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
            {roleLabels[user?.role] || user?.role}
          </span>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">{t('allRequests')}</h1>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard title="Total"        value={stats.total}             icon={<FileText size={20} />}     color="blue" />
          <StatCard title="Pending Mgr"  value={stats.pending_manager}   icon={<Clock size={20} />}        color="yellow" />
          <StatCard title="Pending HR"   value={stats.pending_hr}        icon={<Clock size={20} />}        color="blue" />
          <StatCard title="Approved"     value={stats.approved}          icon={<CheckCircle size={20} />}  color="green" />
          <StatCard title="Rejected"     value={stats.rejected_combined} icon={<XCircle size={20} />}      color="red" />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {FILTER_TABS.map(tab => (
                <button key={tab.key} onClick={() => setFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                    ${filter === tab.key ? tab.color : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                  {tab.label}
                  {tab.key !== 'all' && (
                    <span className="ml-1.5 opacity-70">{stats[tab.key] ?? 0}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder={t('search')} value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52" />
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-32" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-48" />
                  </div>
                  <div className="h-6 w-16 bg-slate-100 dark:bg-slate-800 rounded-full" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <Filter size={28} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p className="text-slate-400 dark:text-slate-500 text-sm">{t('noRequests')}</p>
              </div>
            ) : filtered.map(req => (
              <div key={req.request_id} className="px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {req.employee_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 dark:text-white text-sm truncate">{req.employee_name}</p>
                        {req.balance_exceeded && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                            OVER BALANCE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate">
                        {t(req.leave_type)} · {req.start_date} → {req.end_date}
                        {req.requested_days && <span className="ml-1 text-slate-400">({Number(req.requested_days)}d)</span>}
                        {req.department && <span className="ml-1">· {req.department}</span>}
                      </p>
                      {req.reason  && <p className="text-xs text-slate-400 italic mt-0.5 truncate">"{req.reason}"</p>}
                      {req.manager_comment && <p className="text-xs text-amber-500 dark:text-amber-400 mt-0.5 truncate">👔 {req.manager_comment}</p>}
                      {req.hr_comment && <p className="text-xs text-blue-500 dark:text-blue-400 mt-0.5 truncate">🏥 {req.hr_comment}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={req.status} />

                    {isHR && req.status === 'pending_hr' && (
                      expandedId === req.request_id ? (
                        <div className="flex items-center gap-1.5">
                          <input type="text" placeholder="HR Comment (req)" value={comment}
                            onChange={e => setComment(e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-28" />
                          <button onClick={() => handleAction(req.request_id, 'approve')}
                            disabled={actionLoading === req.request_id + 'approve' || !comment.trim()}
                            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                            <Check size={12} /> {t('approve')}
                          </button>
                          <button onClick={() => handleAction(req.request_id, 'reject')}
                            disabled={actionLoading === req.request_id + 'reject' || !comment.trim()}
                            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                            <X size={12} /> {t('reject')}
                          </button>
                          <button onClick={() => { setExpandedId(null); setComment(''); }}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setExpandedId(req.request_id); setComment(''); }}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-lg transition-colors">
                          HR Review
                        </button>
                      )
                    )}

                    {isAdmin && (
                      deleteConfirm === req.request_id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(req.request_id)}
                            className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                            <Check size={13} />
                          </button>
                          <button onClick={() => setDeleteConfirm(null)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(req.request_id)}
                          className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-400">{filtered.length} {filtered.length === 1 ? 'result' : 'results'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRequests;