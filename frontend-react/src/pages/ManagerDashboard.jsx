import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getAllRequests, updateStatus } from '../services/api';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { Users, Clock, CheckCircle, XCircle, Search, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ManagerDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState('requests');

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

  const filtered = requests.filter(r => {
    const matchStatus = filter === 'all' || r.status === filter;
    const matchSearch = r.employee_name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  // Who's off today
  const today = new Date().toISOString().split('T')[0];
  const offToday = requests.filter(r =>
    r.status === 'approved' &&
    r.start_date <= today &&
    r.end_date >= today
  );

  // Monthly chart
  const monthData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.toLocaleString('default', { month: 'short' });
    const count = requests.filter(r => new Date(r.created_at || '').getMonth() === d.getMonth()).length;
    return { month, count };
  });

  // Team members (unique names)
  const teamMembers = [...new Map(requests.map(r => [r.employee_name, r])).values()];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            👔 {t('dashboard')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {user?.name} — {t('manager')}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title={t('team')} value={teamMembers.length} icon={<Users size={22} />} color="indigo" />
          <StatCard title={t('pendingRequests')} value={stats.pending} icon={<Clock size={22} />} color="yellow" />
          <StatCard title={t('approvedRequests')} value={stats.approved} icon={<CheckCircle size={22} />} color="green" />
          <StatCard title={t('rejectedRequests')} value={stats.rejected} icon={<XCircle size={22} />} color="red" />
        </div>

        {/* Who's off today */}
        {offToday.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays size={18} className="text-amber-600 dark:text-amber-400" />
              <span className="font-semibold text-amber-800 dark:text-amber-300">
                {offToday.length} {offToday.length === 1 ? 'person' : 'people'} off today
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {offToday.map(r => (
                <span key={r.request_id}
                  className="bg-amber-100 dark:bg-amber-800/40 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full text-sm font-medium">
                  {r.employee_name} ({t(r.leave_type)})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6 w-fit">
          {['requests', 'team', 'analytics'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors capitalize
                ${activeTab === tab
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}>
              {tab === 'requests' ? t('allRequests') : tab === 'team' ? t('team') : t('analytics')}
            </button>
          ))}
        </div>

        {/* REQUESTS TAB */}
        {activeTab === 'requests' && (
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
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={req.status} />
                      {req.status === 'pending' && (
                        <button
                          onClick={() => setExpandedId(expandedId === req.request_id ? null : req.request_id)}
                          className="p-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                          {expandedId === req.request_id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded action panel */}
                  {expandedId === req.request_id && (
                    <div className="mt-3 ml-13 pl-13 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      {req.reason && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 italic">
                          💬 "{req.reason}"
                        </p>
                      )}
                      <div className="flex gap-2 items-center">
                        <input type="text" placeholder={t('comment')} value={comment}
                          onChange={e => setComment(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        <button onClick={() => handleAction(req.request_id, 'approved')}
                          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                          <CheckCircle size={16} /> {t('approve')}
                        </button>
                        <button onClick={() => handleAction(req.request_id, 'rejected')}
                          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                          <XCircle size={16} /> {t('reject')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TEAM TAB */}
        {activeTab === 'team' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMembers.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-gray-400">{t('noRequests')}</div>
            ) : teamMembers.map(member => {
              const memberReqs = requests.filter(r => r.employee_name === member.employee_name);
              const isOffToday = offToday.some(r => r.employee_name === member.employee_name);
              return (
                <div key={member.employee_name}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                      {member.employee_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{member.employee_name}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                        ${isOffToday
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                        {isOffToday ? '🏖️ Off today' : '✅ Available'}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {['pending', 'approved', 'rejected'].map(s => (
                      <div key={s} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {memberReqs.filter(r => r.status === s).length}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{t(s)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('requestsByMonth')}</h3>
              <ResponsiveContainer width="100%" height={220}>
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('approvalRate')}</h3>
              <div className="space-y-4 mt-6">
                {[
                  { label: t('approved'), value: stats.approved, total: stats.total, color: 'bg-green-500' },
                  { label: t('pending'), value: stats.pending, total: stats.total, color: 'bg-yellow-500' },
                  { label: t('rejected'), value: stats.rejected, total: stats.total, color: 'bg-red-500' },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{item.label}</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {item.value} ({item.total > 0 ? Math.round((item.value / item.total) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                      <div className={`${item.color} h-3 rounded-full transition-all`}
                        style={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ManagerDashboard;