import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getMyRequests } from '../services/api';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';

const MyRequests = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getMyRequests().then(res => {
      setRequests(res.data.requests || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('myRequests')}</h1>
          <button onClick={() => navigate('/employee/new')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors">
            <PlusCircle size={18} />
            {t('newRequest')}
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {['all', 'pending', 'approved', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
                ${filter === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                }`}>
              {t(s === 'all' ? 'all' : s)}
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
          ) : filtered.map(req => (
            <div key={req.request_id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900 dark:text-white capitalize">{t(req.leave_type)}</span>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    📅 {req.start_date} → {req.end_date}
                  </p>
                  {req.reason && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 italic">"{req.reason}"</p>
                  )}
                  {req.comment && (
                    <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-1">
                      💬 {req.comment}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400">{new Date(req.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MyRequests;