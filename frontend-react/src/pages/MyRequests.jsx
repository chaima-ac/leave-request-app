import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getMyRequests, cancelRequest } from '../services/api';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, AlertTriangle, X } from 'lucide-react';

const FILTER_TABS = [
  { key: 'all',              label: 'All' },
  { key: 'pending_manager',  label: 'Pending manager' },
  { key: 'pending_hr',       label: 'Pending HR' },
  { key: 'approved',         label: 'Approved' },
  { key: 'rejected_manager', label: 'Rejected (manager)' },
  { key: 'rejected_hr',      label: 'Rejected (HR)' },
  { key: 'cancelled',        label: 'Cancelled' },
];

const MyRequests = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('all');
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    getMyRequests()
      .then(res => { setRequests(res.data.requests || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered    = filter === 'all' ? requests : requests.filter(r => r.status === filter);
  const activeTabs  = FILTER_TABS.filter(tab => tab.key === 'all' || requests.some(r => r.status === tab.key));

  const handleCancel = async (request_id) => {
    if (!window.confirm('Cancel this request?')) return;
    setCancelling(request_id);
    try {
      await cancelRequest({ request_id });
      setRequests(prev => prev.map(r => r.request_id === request_id ? { ...r, status: 'cancelled' } : r));
    } catch (err) {
      alert(err.response?.data?.error || 'Could not cancel request.');
    }
    setCancelling(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('myRequests')}</h1>
          <button onClick={() => navigate('/employee/new')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors">
            <PlusCircle size={18} /> {t('newRequest')}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {activeTabs.map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors
                ${filter === tab.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-indigo-300'}`}>
              {tab.label}
              {tab.key !== 'all' && (
                <span className="ml-1.5 opacity-70">{requests.filter(r => r.status === tab.key).length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-gray-400">{t('loading')}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3">📋</div>
              <p className="text-gray-500 dark:text-gray-400">{t('noRequests')}</p>
            </div>
          ) : filtered
            .slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map(req => (
              <div key={req.request_id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-white capitalize">{t(req.leave_type)}</span>
                      <StatusBadge status={req.status} />
                      {req.balance_exceeded && (
                        <span className="flex items-center gap-1 text-xs font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 px-2 py-0.5 rounded-full">
                          <AlertTriangle size={10} /> Over balance
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      📅 {req.start_date} → {req.end_date}
                      {req.requested_days && (
                        <span className="ml-2 font-medium text-gray-600 dark:text-gray-300">
                          ({Number(req.requested_days)} day{Number(req.requested_days) !== 1 ? 's' : ''})
                        </span>
                      )}
                    </p>

                    {req.reason && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1.5 italic">"{req.reason}"</p>}

                    {req.manager_comment && (
                      <div className="mt-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 mb-0.5">👔 Manager comment</p>
                        <p className="text-sm text-indigo-700 dark:text-indigo-300">{req.manager_comment}</p>
                      </div>
                    )}

                    {req.hr_comment && (
                      <div className="mt-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg px-3 py-2">
                        <p className="text-xs font-semibold text-purple-500 dark:text-purple-400 mb-0.5">🏥 HR comment</p>
                        <p className="text-sm text-purple-700 dark:text-purple-300">{req.hr_comment}</p>
                      </div>
                    )}

                    {/* Approval flow tracker */}
                    <div className="mt-3 flex items-center gap-2">
                      {[
                        { label: 'Manager', done: ['pending_hr','approved','rejected_hr'].includes(req.status), rejected: req.status === 'rejected_manager', active: req.status === 'pending_manager' },
                        { label: 'HR',      done: req.status === 'approved', rejected: req.status === 'rejected_hr', active: req.status === 'pending_hr' },
                      ].map((step, i) => (
                        <div key={step.label} className="flex items-center gap-2">
                          {i > 0 && <div className="w-6 h-px bg-gray-200 dark:bg-gray-700" />}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium
                            ${step.done     ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : ''}
                            ${step.rejected ? 'bg-red-100     text-red-700     dark:bg-red-900/30     dark:text-red-300'     : ''}
                            ${step.active   ? 'bg-amber-100   text-amber-700   dark:bg-amber-900/30   dark:text-amber-300 animate-pulse' : ''}
                            ${!step.done && !step.rejected && !step.active ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500' : ''}
                          `}>
                            {step.done ? '✓' : step.rejected ? '✗' : step.active ? '…' : '○'} {step.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</span>
                    {['pending_manager','pending_hr'].includes(req.status) && (
                      <button onClick={() => handleCancel(req.request_id)} disabled={cancelling === req.request_id}
                        className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border border-red-200 dark:border-red-800/40 px-2 py-1 rounded-lg transition-colors disabled:opacity-50">
                        <X size={11} />
                        {cancelling === req.request_id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default MyRequests;