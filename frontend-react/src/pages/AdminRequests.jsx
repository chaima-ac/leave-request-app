import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getAllRequests, updateStatus, deleteRequest } from '../services/api';
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

  const handleAction = async (requestId, status) => {
    setActionLoading(requestId + status);
    try {
      await updateStatus({ request_id: requestId, status, comment });
      setExpandedId(null); setComment(''); fetchRequests();
    } catch (err) { console.error(err); }
    setActionLoading(null);
  };

  const handleDelete = async (requestId) => {
    try { await deleteRequest({ request_id: requestId }); setDeleteConfirm(null); fetchRequests(); }
    catch (err) { console.error(err); }
  };

  const normalize = s => s?.toLowerCase() || '';

  const stats = {
    total:    requests.length,
    pending:  requests.filter(r => normalize(r.status) === 'pending').length,
    approved: requests.filter(r => normalize(r.status) === 'approved').length,
    rejected: requests.filter(r => normalize(r.status) === 'rejected').length,
  };

  const filtered = requests.filter(r => {
    const matchStatus = filter === 'all' || normalize(r.status) === filter;
    const matchSearch = !search ||
      r.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.leave_type?.toLowerCase().includes(search.toLowerCase()) ||
      r.department?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const filterColors = {
    pending:  'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400',
    approved: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400',
    rejected: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
    all:      'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400',
  };

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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title={t('totalRequests')}    value={stats.total}    icon={<FileText size={20} />}     color="blue" />
          <StatCard title={t('pendingRequests')}  value={stats.pending}  icon={<Clock size={20} />}        color="yellow" />
          <StatCard title={t('approvedRequests')} value={stats.approved} icon={<CheckCircle size={20} />}  color="green" />
          <StatCard title={t('rejectedRequests')} value={stats.rejected} icon={<XCircle size={20} />}      color="red" />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-1">
              {['all','pending','approved','rejected'].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize
                    ${filter === f ? filterColors[f] : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                  {t(f === 'all' ? 'all' : f)}
                  {f !== 'all' && <span className="ml-1.5 opacity-70">{stats[f]}</span>}
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
                      <p className="font-medium text-slate-900 dark:text-white text-sm truncate">{req.employee_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate">
                        {t(req.leave_type)} · {req.start_date} → {req.end_date}
                        {req.department && <span className="ml-1">· {req.department}</span>}
                      </p>
                      {req.reason  && <p className="text-xs text-slate-400 italic mt-0.5 truncate">"{req.reason}"</p>}
                      {req.comment && <p className="text-xs text-indigo-400 mt-0.5 truncate">↳ {req.comment}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={req.status} />

                    {normalize(req.status) === 'pending' && !isHR && (
                      expandedId === req.request_id ? (
                        <div className="flex items-center gap-1.5">
                          <input type="text" placeholder={t('comment')} value={comment}
                            onChange={e => setComment(e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-28" />
                          <button onClick={() => handleAction(req.request_id, 'approved')}
                            disabled={actionLoading === req.request_id + 'approved'}
                            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                            <Check size={12} /> {t('approve')}
                          </button>
                          <button onClick={() => handleAction(req.request_id, 'rejected')}
                            disabled={actionLoading === req.request_id + 'rejected'}
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
                          {t('actions')}
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