import { useTranslation } from 'react-i18next';

const balances = [
  { type: 'vacation', total: 30, used: 8, color: 'indigo' },
  { type: 'sick', total: 10, used: 2, color: 'red' },
  { type: 'remote', total: 60, used: 15, color: 'green' },
  { type: 'personal', total: 5, used: 1, color: 'yellow' },
];

const colors = {
  indigo: { bar: 'bg-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400' },
  red: { bar: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400' },
  green: { bar: 'bg-green-500', bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400' },
  yellow: { bar: 'bg-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-600 dark:text-yellow-400' },
};

const LeaveBalance = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('leaveBalance')}</h3>
      <div className="space-y-4">
        {balances.map(b => {
          const remaining = b.total - b.used;
          const pct = (b.used / b.total) * 100;
          const c = colors[b.color];
          return (
            <div key={b.type}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t(b.type)}</span>
                <span className={`text-sm font-semibold ${c.text}`}>{remaining} / {b.total} {t('days')}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className={`${c.bar} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }}></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LeaveBalance;