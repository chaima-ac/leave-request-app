import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getAllRequests, updateStatus, deleteRequest } from '../services/api';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { FileText, Clock, CheckCircle, XCircle, Search, Trash2, X, Check } from 'lucide-react';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [comment, setComment] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchRequests = () => {
    getAllRequests().then(res => {
      setRequests(res.data.requests || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleAction = async (requestId, status) => {
    try {
      await updateStatus({ request_id: requestId, status, comment });
      setExpandedId(null);
      setComment('');
      fetchRequests();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (requestId) => {
    try {
      await deleteRequest({ request_id: requestId });
      setDeleteConfirm(null);
      fetchRequests();
    } catch (err) { console.error(err); }
  };

  const normalize = (s) => s?.toLowerCase() || '';

  const filtered = requests.filter(r => {
    const matchStatus = filter === 'all' || normalize(r.status) === filter;
    const matchSearch = r.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
                        r.leave_type?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => normalize(r.status) === 'pending').length,
    approved: requests.filter(r => normalize(r.status) === 'approved').length,
    rejected: requests.filter(r => normalize(r.status) === 'rejected').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('allRequests')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 capitalize">{user?.role} — LeaveDesk</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title={t('totalRequests')} value={stats.total} icon={<FileText size={22} />} color="blue" />
          <StatCard title={t('pendingRequests')} value={stats.pending} icon={<Clock size={22} />} color="yellow" />
          <StatCard title={t('approvedRequests')} value={stats.approved} icon={<CheckCircle size={22} />} color="green" />
          <StatCard title={t('rejectedRequests')} value={stats.rejected} icon={<XCircle size={22} />} color="red" />
        </div>

        {/* Requests table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('allRequests')}</h3>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder={t('search')} value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-44" />
              </div>
              <select value={filter} onChange={e => setFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="all">{t('all')}</option>
                <option value="pending">{t('pending')}</option>
                <option value="approved">{t('approved')}</option>
                <option value="rejected">{t('rejected')}</option>
              </select>
            </div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <div className="p-8 text-center text-gray-400">{t('loading')}</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-400">{t('noRequests')}</div>
            ) : filtered.map(req => (
              <div key={req.request_id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                      {req.employee_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{req.employee_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {t(req.leave_type)} • {req.start_date} → {req.end_date}
                        {req.department && <span className="ml-1">• {req.department}</span>}
                      </p>
                      {req.reason && <p className="text-xs text-gray-400 italic mt-0.5">"{req.reason}"</p>}
                      {req.comment && <p className="text-xs text-indigo-500 mt-0.5">💬 {req.comment}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge status={req.status} />

                    {/* Approve/Reject for pending */}
                    {normalize(req.status) === 'pending' && (
                      expandedId === req.request_id ? (
                        <div className="flex items-center gap-2">
                          <input type="text" placeholder={t('comment')} value={comment}
                            onChange={e => setComment(e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-32" />
                          <button onClick={() => handleAction(req.request_id, 'approved')}
                            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                            <Check size={14} /> {t('approve')}
                          </button>
                          <button onClick={() => handleAction(req.request_id, 'rejected')}
                            className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                            <X size={14} /> {t('reject')}
                          </button>
                          <button onClick={() => { setExpandedId(null); setComment(''); }}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setExpandedId(req.request_id); setComment(''); }}
                          className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                          {t('actions')}
                        </button>
                      )
                    )}

                    {/* Delete button for admin */}
                    {isAdmin && (
                      deleteConfirm === req.request_id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(req.request_id)}
                            className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setDeleteConfirm(null)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(req.request_id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <Trash2 size={16} />
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;