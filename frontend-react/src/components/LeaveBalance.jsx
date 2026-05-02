import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getMyRequests } from '../services/api';

const LEAVE_TOTALS = {
  vacation: 30,
  sick: 10,
  remote: 60,
  personal: 5,
  maternity: 90,
  paternity: 15,
};

const colors = {
  vacation: { bar: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' },
  sick:     { bar: 'bg-red-500',    text: 'text-red-600 dark:text-red-400' },
  remote:   { bar: 'bg-green-500',  text: 'text-green-600 dark:text-green-400' },
  personal: { bar: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400' },
  maternity:{ bar: 'bg-pink-500',   text: 'text-pink-600 dark:text-pink-400' },
  paternity:{ bar: 'bg-cyan-500',   text: 'text-cyan-600 dark:text-cyan-400' },
};

const LeaveBalance = () => {
  const { t } = useTranslation();
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyRequests()
      .then(res => {
        const requests = res.data.requests || [];
        // Count approved days per leave type
        const usedDays = {};
        requests
          .filter(r => r.status?.toLowerCase() === 'approved')
          .forEach(r => {
            const type = r.leave_type;
            if (!usedDays[type]) usedDays[type] = 0;
            if (r.start_date && r.end_date) {
              const diff = new Date(r.end_date) - new Date(r.start_date);
              usedDays[type] += Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
            } else {
              usedDays[type] += 1;
            }
          });

        const computed = Object.entries(LEAVE_TOTALS).map(([type, total]) => ({
          type,
          total,
          used: usedDays[type] || 0,
        }));
        setBalances(computed);
        setLoading(false);
      })
      .catch(() => {
        // Fallback to defaults if API fails
        setBalances(Object.entries(LEAVE_TOTALS).map(([type, total]) => ({ type, total, used: 0 })));
        setLoading(false);
      });
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('leaveBalance')}</h3>
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="animate-pulse">
              <div className="flex justify-between mb-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {balances.map(b => {
            const remaining = b.total - b.used;
            const pct = Math.min(100, (b.used / b.total) * 100);
            const c = colors[b.type] || colors.vacation;
            return (
              <div key={b.type}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t(b.type)}</span>
                  <span className={`text-sm font-semibold ${c.text}`}>{remaining} / {b.total} {t('days')}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className={`${c.bar} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LeaveBalance;