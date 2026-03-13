import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { submitRequest } from '../services/api';
import { CheckCircle } from 'lucide-react';

const leaveTypes = ['vacation', 'sick', 'remote', 'personal', 'maternity', 'paternity'];

const NewRequest = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ leave_type: 'vacation', start_date: '', end_date: '', reason: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const calcDays = () => {
    if (!form.start_date || !form.end_date) return 0;
    const diff = new Date(form.end_date) - new Date(form.start_date);
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await submitRequest(form);
      setSuccess(true);
      setTimeout(() => navigate('/employee/requests'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || t('error'));
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('requestSubmitted')}</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">{t('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('newRequest')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {t('leaveType')} • {t('startDate')} • {t('endDate')}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Leave type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('leaveType')}</label>
              <div className="grid grid-cols-3 gap-2">
                {leaveTypes.map(type => (
                  <button key={type} type="button"
                    onClick={() => setForm({ ...form, leave_type: type })}
                    className={`py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all
                      ${form.leave_type === type
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}>
                    {t(type)}
                  </button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('startDate')}</label>
                <input type="date" required value={form.start_date}
                  onChange={e => setForm({ ...form, start_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('endDate')}</label>
                <input type="date" required value={form.end_date}
                  onChange={e => setForm({ ...form, end_date: e.target.value })}
                  min={form.start_date || new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
              </div>
            </div>

            {/* Days calculated */}
            {calcDays() > 0 && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-indigo-600 dark:text-indigo-400 font-semibold text-lg">{calcDays()}</span>
                <span className="text-indigo-600 dark:text-indigo-400 text-sm">{t('days')}</span>
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('reason')}</label>
              <textarea rows={4} value={form.reason}
                onChange={e => setForm({ ...form, reason: e.target.value })}
                placeholder="Optional..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none" />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => navigate('/employee')}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                {t('cancel')}
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors">
                {loading ? t('loading') : t('submit')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewRequest;