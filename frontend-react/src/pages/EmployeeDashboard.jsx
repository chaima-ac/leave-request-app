import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getMyRequests } from '../services/api';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import LeaveBalance from '../components/LeaveBalance';
import { FileText, Clock, CheckCircle, XCircle, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EmployeeDashboard = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyRequests().then(res => {
      setRequests(res.data.requests || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const recent = [...requests].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              👋 {i18n?.language === 'fr' ? 'Bonjour' : 'Hello'}, {user?.name}!
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{t('dashboard')}</p>
          </div>
          <button onClick={() => navigate('/employee/new')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors">
            <PlusCircle size={18} />
            {t('newRequest')}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title={t('totalRequests')} value={stats.total} icon={<FileText size={22} />} color="blue" />
          <StatCard title={t('pendingRequests')} value={stats.pending} icon={<Clock size={22} />} color="yellow" />
          <StatCard title={t('approvedRequests')} value={stats.approved} icon={<CheckCircle size={22} />} color="green" />
          <StatCard title={t('rejectedRequests')} value={stats.rejected} icon={<XCircle size={22} />} color="red" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent requests */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('recentRequests')}</h3>
              <button onClick={() => navigate('/employee/requests')}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                {t('myRequests')} →
              </button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <div className="p-8 text-center text-gray-400">{t('loading')}</div>
              ) : recent.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-2">📋</div>
                  <p className="text-gray-500 dark:text-gray-400">{t('noRequests')}</p>
                  <button onClick={() => navigate('/employee/new')}
                    className="mt-3 text-indigo-600 dark:text-indigo-400 text-sm hover:underline">
                    {t('newRequest')} →
                  </button>
                </div>
              ) : recent.map(req => (
                <div key={req.request_id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">{t(req.leave_type)}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{req.start_date} → {req.end_date}</p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Leave balance */}
          <LeaveBalance />
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;