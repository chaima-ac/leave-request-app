import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getLeavePolicy, updateLeavePolicy } from '../services/api';
import Navbar from '../components/Navbar';
import { Save, RotateCcw, CheckCircle } from 'lucide-react';

const LEAVE_TYPES = [
  { key: 'vacation',  label: 'Vacation',       color: 'indigo' },
  { key: 'sick',      label: 'Sick Leave',      color: 'red' },
  { key: 'remote',    label: 'Remote Work',     color: 'green' },
  { key: 'personal',  label: 'Personal',        color: 'yellow' },
  { key: 'maternity', label: 'Maternity Leave', color: 'pink' },
  { key: 'paternity', label: 'Paternity Leave', color: 'cyan' },
];

const DEFAULT_POLICY = { vacation: 30, sick: 10, remote: 60, personal: 5, maternity: 90, paternity: 15 };

const colorMap = {
  indigo: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300',
  red:    'bg-red-50    dark:bg-red-900/20    border-red-200    dark:border-red-800    text-red-700    dark:text-red-300',
  green:  'bg-green-50  dark:bg-green-900/20  border-green-200  dark:border-green-800  text-green-700  dark:text-green-300',
  yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
  pink:   'bg-pink-50   dark:bg-pink-900/20   border-pink-200   dark:border-pink-800   text-pink-700   dark:text-pink-300',
  cyan:   'bg-cyan-50   dark:bg-cyan-900/20   border-cyan-200   dark:border-cyan-800   text-cyan-700   dark:text-cyan-300',
};

const AdminSettings = () => {
  const { t } = useTranslation();
  const [policy, setPolicy]     = useState(DEFAULT_POLICY);
  const [original, setOriginal] = useState(DEFAULT_POLICY);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    getLeavePolicy()
      .then(res => {
        const p = res.data.policy || DEFAULT_POLICY;
        setPolicy(p);
        setOriginal(p);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChange = (key, value) => {
    // Allow empty string while typing
    if (value === '' || value === '-') {
      setPolicy(prev => ({ ...prev, [key]: '' }));
      return;
    }
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0) return;
    setPolicy(prev => ({ ...prev, [key]: num }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateLeavePolicy({ quotas: policy });
      setOriginal(policy);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save policy');
    }
    setSaving(false);
  };

  const handleReset = () => {
    setPolicy(original);
    setError('');
  };

  const hasChanges = JSON.stringify(policy) !== JSON.stringify(original);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-1">Administrator</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Leave Policy</h1>
          <p className="text-sm text-slate-400 mt-1">Set the annual leave quota (in days) for each leave type. Applies to all employees.</p>
        </div>

        {success && (
          <div className="mb-5 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-xl px-4 py-3 text-sm">
            <CheckCircle size={16} /> Policy saved successfully
          </div>
        )}

        {error && (
          <div className="mb-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Annual Quotas</h2>
            <p className="text-xs text-slate-400 mt-0.5">Days per year per employee</p>
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {LEAVE_TYPES.map(lt => (
                <div key={lt.key} className="px-6 py-4 flex items-center justify-between gap-6">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{lt.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{t(lt.key)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      max="365"
                      value={policy[lt.key] ?? DEFAULT_POLICY[lt.key]}
                      onChange={e => handleChange(lt.key, e.target.value)}
                      className="w-24 px-3 py-2 text-center text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-400 w-8">days</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${colorMap[lt.color]}`}>
                      {policy[lt.key] ?? DEFAULT_POLICY[lt.key]}d / year
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button onClick={handleReset} disabled={!hasChanges || saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors">
              <RotateCcw size={14} /> Discard changes
            </button>
            <button onClick={handleSave} disabled={!hasChanges || saving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors">
              {saving
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Save size={14} />}
              Save Policy
            </button>
          </div>
        </div>

        <div className="mt-4 bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/40 rounded-xl px-4 py-3">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <strong>Note:</strong> Changes apply immediately to all employees' leave balance display. Existing approved requests are not affected.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;