import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getMyRequests } from '../services/api';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import LeaveBalance from '../components/LeaveBalance';
import { FileText, Clock, CheckCircle, XCircle, PlusCircle, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EmployeeDashboard = () => {
  const { t, i18n } = useTranslation();
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getMyRequests()
      .then(res => { setRequests(res.data.requests || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const s = (status) => requests.filter(r => r.status === status).length;
  const stats = {
    total:          requests.length,
    pendingManager: s('pending_manager'),
    pendingHr:      s('pending_hr'),
    approved:       s('approved'),
    rejected:       s('rejected_manager') + s('rejected_hr'),
  };
  const totalPending  = stats.pendingManager + stats.pendingHr;
  const exceededActive = requests.filter(
    r => r.balance_exceeded && ['pending_manager', 'pending_hr'].includes(r.status)
  );
  const recent = [...requests]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              👋 {i18n?.language === 'fr' ? 'Bonjour' : 'Hello'}, {user?.name}!
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{t('dashboard')}</p>
          </div>
          <button onClick={() => navigate('/employee/new')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors">
            <PlusCircle size={18} /> {t('newRequest')}
          </button>
        </div>

        {/* Balance exceeded banner */}
        {exceededActive.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                Leave balance exceeded on {exceededActive.length} pending request{exceededActive.length > 1 ? 's' : ''}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                Your request{exceededActive.length > 1 ? 's were' : ' was'} submitted but your balance was insufficient. Manager and HR have been notified.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title={t('totalRequests')}    value={stats.total}    icon={<FileText size={22} />}    color="blue" />
          <StatCard title="Pending"               value={totalPending}   icon={<Clock size={22} />}       color="yellow"
            subtitle={totalPending > 0 ? `${stats.pendingManager} manager · ${stats.pendingHr} HR` : undefined} />
          <StatCard title={t('approvedRequests')} value={stats.approved} icon={<CheckCircle size={22} />} color="green" />
          <StatCard title={t('rejectedRequests')} value={stats.rejected} icon={<XCircle size={22} />}    color="red" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('recentRequests')}</h3>
              <button onClick={() => navigate('/employee/requests')} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
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
                  <button onClick={() => navigate('/employee/new')} className="mt-3 text-indigo-600 dark:text-indigo-400 text-sm hover:underline">
                    {t('newRequest')} →
                  </button>
                </div>
              ) : recent.map(req => (
                <div key={req.request_id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900 dark:text-white capitalize">{t(req.leave_type)}</p>
                      {req.balance_exceeded && (
                        <span className="flex items-center gap-1 text-xs font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40 px-1.5 py-0.5 rounded-full">
                          <AlertTriangle size={9} /> Over balance
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {req.start_date} → {req.end_date}
                      {req.requested_days && <span className="ml-1 text-gray-400">· {Number(req.requested_days)}d</span>}
                    </p>
                    {/* Approval tracker */}
                    {['pending_manager','pending_hr'].includes(req.status) && (
                      <div className="flex items-center gap-1.5 mt-1">
                        {[
                          { label: 'Mgr', active: req.status === 'pending_manager', done: req.status === 'pending_hr' },
                          { label: 'HR',  active: req.status === 'pending_hr',      done: false },
                        ].map((step, i) => (
                          <div key={step.label} className="flex items-center gap-1">
                            {i > 0 && <span className="text-gray-300 dark:text-gray-600 text-xs">→</span>}
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium
                              ${step.done   ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : ''}
                              ${step.active ? 'bg-amber-100   text-amber-700   dark:bg-amber-900/30   dark:text-amber-300'   : ''}
                              ${!step.done && !step.active ? 'bg-gray-100 text-gray-400 dark:bg-gray-800' : ''}
                            `}>
                              {step.done ? '✓' : step.active ? '…' : '○'} {step.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {req.status === 'rejected_manager' && req.manager_comment && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1 truncate">👔 {req.manager_comment}</p>
                    )}
                    {req.status === 'rejected_hr' && req.hr_comment && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1 truncate">🏥 {req.hr_comment}</p>
                    )}
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              ))}
            </div>
          </div>
          <LeaveBalance />
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;