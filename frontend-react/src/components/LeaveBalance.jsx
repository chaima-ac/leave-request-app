import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getMyBalance } from '../services/api';

const colors = {
  vacation:  { bar: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' },
  sick:      { bar: 'bg-red-500',    text: 'text-red-600    dark:text-red-400'    },
  remote:    { bar: 'bg-green-500',  text: 'text-green-600  dark:text-green-400'  },
  personal:  { bar: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400' },
  maternity: { bar: 'bg-pink-500',   text: 'text-pink-600   dark:text-pink-400'   },
  paternity: { bar: 'bg-cyan-500',   text: 'text-cyan-600   dark:text-cyan-400'   },
};

const LeaveBalance = () => {
  const { t } = useTranslation();
  const [balances, setBalances] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);

  useEffect(() => {
    getMyBalance()
      .then(res => {
        const raw = res.data.leave_balance || {};
        setBalances(Object.entries(raw).map(([type, vals]) => ({
          type,
          total:     Number(vals.total     ?? 0),
          used:      Number(vals.used      ?? 0),
          remaining: Number(vals.remaining ?? 0),
        })));
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('leaveBalance')}</h3>

      {loading && (
        <div className="space-y-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="animate-pulse">
              <div className="flex justify-between mb-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2" />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-red-500 dark:text-red-400">Could not load balance. Please refresh.</p>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {balances.length === 0 ? (
            <p className="text-sm text-gray-400">No balance data available.</p>
          ) : balances.map(b => {
            const pct   = Math.min(100, b.total > 0 ? (b.used / b.total) * 100 : 0);
            const c     = colors[b.type] || colors.vacation;
            const isOut = b.remaining <= 0;
            const isLow = !isOut && b.remaining <= Math.ceil(b.total * 0.2);
            return (
              <div key={b.type}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{t(b.type)}</span>
                  <div className="flex items-center gap-2">
                    {isOut && (
                      <span className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-full">Exceeded</span>
                    )}
                    {isLow && !isOut && (
                      <span className="text-xs font-semibold text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-full">Low</span>
                    )}
                    <span className={`text-sm font-semibold tabular-nums ${isOut ? 'text-red-500' : isLow ? 'text-amber-500' : c.text}`}>
                      {b.remaining} / {b.total} {t('days')}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${isOut ? 'bg-red-500' : isLow ? 'bg-amber-400' : c.bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between mt-0.5">
                  {isOut
                    ? <p className="text-xs text-red-400">No days remaining — requests may still be submitted</p>
                    : isLow
                    ? <p className="text-xs text-amber-400">Running low</p>
                    : <span />}
                  <p className="text-xs text-gray-400 tabular-nums">{b.used} used</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && balances.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 border-t border-gray-100 dark:border-gray-700 pt-3">
          Balance is deducted after final HR approval. Going over your balance is allowed but flagged.
        </p>
      )}
    </div>
  );
};

export default LeaveBalance;