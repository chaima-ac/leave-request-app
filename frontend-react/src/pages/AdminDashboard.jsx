import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getAllRequests, updateStatus } from '../services/api';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { FileText, Clock, CheckCircle, XCircle, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b'];

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [comment, setComment] = useState('');
  const [actionId, setActionId] = useState(null);

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
      setActionId(null);
      setComment('');
      fetchRequests();
    } catch (err) { console.error(err); }
  };

  const filtered = requests.filter(r => {
    const matchStatus = filter === 'all' || r.status === filter;
    const matchSearch = r.employee_name?.toLowerCase().includes(search.toLowerCase()) || r.leave_type?.includes(search);
    return matchStatus && matchSearch;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  // Chart data
  const monthData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.toLocaleString('default', { month: 'short' });
    const count = requests.filter(r => new Date(r.created_at).getMonth() === d.getMonth()).length;
    return { month, count };
  });

  const typeData = ['vacation', 'sick', 'remote', 'personal'].map(type => ({
    name: t(type),
    value: requests.filter(r => r.leave_type === type).length
  })).filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">LeaveDesk Admin</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title={t('totalRequests')} value={stats.total} icon={<FileText size={22} />} color="blue" />
          <StatCard title={t('pendingRequests')} value={stats.pending} icon={<Clock size={22} />} color="yellow" />
          <StatCard title={t('approvedRequests')} value={stats.approved} icon={<CheckCircle size={22} />} color="green" />
          <StatCard title={t('rejectedRequests')} value={stats.rejected} icon={<XCircle size={22} />} color="red" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('requestsByMonth')}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('requestsByType')}</h3>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400">{t('noRequests')}</div>
            )}
          </div>
        </div>

        {/* Requests table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('allRequests')}</h3>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" placeholder={t('search')} value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-48" />
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
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <div className="p-8 text-center text-gray-400">{t('loading')}</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-400">{t('noRequests')}</div>
            ) : filtered.map(req => (
              <div key={req.request_id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                      {req.employee_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{req.employee_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {t(req.leave_type)} • {req.start_date} → {req.end_date}
                      </p>
                      {req.reason && <p className="text-xs text-gray-400 mt-0.5 italic">"{req.reason}"</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={req.status} />
                    {req.status === 'pending' && (
                      <div className="flex gap-2">
                        {actionId === req.request_id ? (
                          <div className="flex items-center gap-2">
                            <input type="text" placeholder={t('comment')} value={comment}
                              onChange={e => setComment(e.target.value)}
                              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36" />
                            <button onClick={() => handleAction(req.request_id, 'approved')}
                              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                              ✓
                            </button>
                            <button onClick={() => handleAction(req.request_id, 'rejected')}
                              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                              ✗
                            </button>
                            <button onClick={() => setActionId(null)}
                              className="text-gray-400 hover:text-gray-600 px-2 text-sm">×</button>
                          </div>
                        ) : (
                          <button onClick={() => setActionId(req.request_id)}
                            className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                            {t('actions')}
                          </button>
                        )}
                      </div>
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