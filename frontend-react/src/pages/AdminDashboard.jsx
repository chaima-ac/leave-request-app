import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getStats } from '../services/api';
import Navbar from '../components/Navbar';
import { CheckCircle, TrendingUp, AlertCircle, CalendarDays, ShieldAlert } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';

const roleLabels = { admin: 'Administrator', hr: 'Human Resources' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-lg text-xs">
      {label && <p className="text-slate-400 mb-0.5">{label}</p>}
      <p className="font-semibold text-slate-900 dark:text-white">{payload[0].value} requests</p>
    </div>
  );
};

const StatMini = ({ label, value, color }) => {
  const colors = {
    indigo:  'bg-indigo-50  dark:bg-indigo-900/20  text-indigo-700  dark:text-indigo-300',
    amber:   'bg-amber-50   dark:bg-amber-900/20   text-amber-700   dark:text-amber-300',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
    red:     'bg-red-50     dark:bg-red-900/20     text-red-700     dark:text-red-300',
    blue:    'bg-blue-50    dark:bg-blue-900/20    text-blue-700    dark:text-blue-300',
    slate:   'bg-slate-100  dark:bg-slate-800      text-slate-700   dark:text-slate-300',
  };
  return (
    <div className={`rounded-2xl p-5 ${colors[color]}`}>
      <p className="text-3xl font-bold tabular-nums">{value ?? '—'}</p>
      <p className="text-xs font-medium mt-1 opacity-75 uppercase tracking-wide">{label}</p>
    </div>
  );
};

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [requests,   setRequests]   = useState([]);
  const [statsData,  setStatsData]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState(null); // null = no error, string = error detail

  const isAdmin = user?.role === 'admin';
  const isHr    = user?.role === 'hr';
  const roleBase = isHr ? '/hr' : '/admin';

  useEffect(() => {
    // Single call to /admin/stats — returns both the stats counts AND the full
    // requests list, avoiding a redundant GET /requests scan.
    getStats()
      .then(res => {
        setRequests(res.data.requests || []);
        setStatsData(res.data.stats   || null);
        setLoading(false);
      })
      .catch((err) => {
        const status = err?.response?.status;
        const detail = status
          ? `HTTP ${status} — ${err?.response?.data?.error || err.message}`
          : (err?.code === 'ECONNABORTED' ? 'Request timed out (Lambda cold start?)' : err.message || 'Unknown error');
        setLoadError(detail);
        setLoading(false);
      });
  }, []);

  // ── Stats: prefer server-computed values, fall back to client-side counts ──
  const s = (status) => requests.filter(r => r.status === status).length;

  const stats = {
    total:           statsData?.total_requests          ?? requests.length,
    pendingManager:  statsData?.pending_manager         ?? s('pending_manager'),
    pendingHr:       statsData?.pending_hr              ?? s('pending_hr'),
    approved:        statsData?.approved                ?? s('approved'),
    rejectedManager: statsData?.rejected_manager        ?? s('rejected_manager'),
    rejectedHr:      statsData?.rejected_hr             ?? s('rejected_hr'),
    cancelled:       statsData?.cancelled               ?? s('cancelled'),
    balanceExceeded: statsData?.balance_exceeded_count  ?? requests.filter(r => r.balance_exceeded).length,
    // Accurate employee/manager/hr counts from server — not derived from requests
    totalEmployees:  statsData?.total_employees         ?? null,
    totalManagers:   statsData?.total_managers          ?? null,
    totalHr:         statsData?.total_hr                ?? null,
  };

  const totalRejected = stats.rejectedManager + stats.rejectedHr;
  const totalPending  = stats.pendingManager  + stats.pendingHr;

  // ── Who is off today ──────────────────────────────────────────────────────
  const today    = new Date().toISOString().split('T')[0];
  const offToday = requests.filter(
    r => r.status === 'approved' && r.start_date <= today && r.end_date >= today
  );

  // ── Monthly chart ─────────────────────────────────────────────────────────
  const monthData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const count = requests.filter(r => {
      const rd = new Date(r.created_at || '');
      return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
    }).length;
    return { month: d.toLocaleString('default', { month: 'short' }), count };
  });

  const approvalRate = (stats.approved + totalRejected) > 0
    ? Math.round((stats.approved / (stats.approved + totalRejected)) * 100)
    : null;

  // ── Dept breakdown ────────────────────────────────────────────────────────
  const deptMap = {};
  requests.forEach(r => {
    const dept = r.department || 'Unknown';
    deptMap[dept] = (deptMap[dept] || 0) + 1;
  });
  const deptData = Object.entries(deptMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const DEPT_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'];

  // ── Status breakdown rows ─────────────────────────────────────────────────
  const breakdown = [
    { label: 'Approved',           value: stats.approved,        cls: 'bg-emerald-500' },
    { label: 'Pending manager',    value: stats.pendingManager,  cls: 'bg-amber-400'   },
    { label: 'Pending HR',         value: stats.pendingHr,       cls: 'bg-blue-400'    },
    { label: 'Rejected (manager)', value: stats.rejectedManager, cls: 'bg-red-400'     },
    { label: 'Rejected (HR)',      value: stats.rejectedHr,      cls: 'bg-red-600'     },
    { label: 'Cancelled',          value: stats.cancelled,       cls: 'bg-slate-400'   },
  ].filter(item => item.value > 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-1">
            {roleLabels[user?.role] || user?.role}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dashboard')}</h1>

          {/* Admin read-only notice */}
          {isAdmin && (
            <div className="mt-3 flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 text-xs font-medium px-3 py-2 rounded-xl w-fit">
              <ShieldAlert size={13} />
              Admin view — read only. Approvals are handled by managers and HR.
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-slate-400 dark:text-slate-500 text-sm">Could not load dashboard data.</p>
            <p className="text-xs text-red-400 font-mono bg-slate-900 px-3 py-1.5 rounded-lg">{loadError}</p>
            <button
              onClick={() => {
                setLoadError(null);
                setLoading(true);
                getStats()
                  .then(res => { setRequests(res.data.requests || []); setStatsData(res.data.stats || null); setLoading(false); })
                  .catch((err) => {
                    const status = err?.response?.status;
                    const detail = status
                      ? `HTTP ${status} — ${err?.response?.data?.error || err.message}`
                      : (err?.code === 'ECONNABORTED' ? 'Request timed out (Lambda cold start?)' : err.message || 'Unknown error');
                    setLoadError(detail);
                    setLoading(false);
                  });
              }}
              className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {/* ── Request stat cards ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
              <StatMini label="Total"           value={stats.total}           color="indigo"  />
              <StatMini label="Pending manager" value={stats.pendingManager}  color="amber"   />
              <StatMini label="Pending HR"      value={stats.pendingHr}       color="blue"    />
              <StatMini label="Approved"        value={stats.approved}        color="emerald" />
              <StatMini label="Rejected"        value={totalRejected}         color="red"     />
              <StatMini label="⚠️ Over balance" value={stats.balanceExceeded} color="slate"   />
            </div>

            {/* ── People stat cards (server-accurate, admin/HR only) ─────────── */}
            {statsData && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <StatMini label="Employees" value={stats.totalEmployees} color="indigo"  />
                <StatMini label="Managers"  value={stats.totalManagers}  color="amber"   />
                <StatMini label="HR staff"  value={stats.totalHr}        color="blue"    />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">

              {/* ── Bar chart ─────────────────────────────────────────────── */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {t('requestsByMonth')}
                  </h3>
                  {approvalRate !== null && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full">
                      <TrendingUp size={11} /> {approvalRate}% approval rate
                    </span>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={190}>
                  <BarChart data={monthData} barSize={26}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {monthData.map((_, i) => (
                        <Cell key={i} fill={i === monthData.length - 1 ? '#6366f1' : '#e0e7ff'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* ── Right column ──────────────────────────────────────────── */}
              <div className="flex flex-col gap-4">

                {/* Off today */}
                {offToday.length > 0 ? (
                  <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarDays size={14} className="text-amber-500" />
                      <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                        {offToday.length} off today
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5 max-h-28 overflow-y-auto">
                      {offToday.map(r => (
                        <div key={r.request_id} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-amber-700 dark:text-amber-300 truncate">
                            {r.employee_name}
                          </span>
                          <span className="text-xs text-amber-500 capitalize ml-2 flex-shrink-0">
                            {r.department}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-2xl p-4 flex items-center gap-3">
                    <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      Everyone is in today
                    </p>
                  </div>
                )}

                {/* HR: action needed for pending_hr only */}
                {isHr && stats.pendingHr > 0 && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/15 border border-indigo-200 dark:border-indigo-800/40 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlertCircle size={14} className="text-indigo-500" />
                      <span className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
                        Action needed
                      </span>
                    </div>
                    <p className="text-sm text-indigo-600 dark:text-indigo-400">
                      <strong>{stats.pendingHr}</strong> request{stats.pendingHr > 1 ? 's' : ''} awaiting HR review.
                    </p>
                    <button
                      onClick={() => navigate(`${roleBase}/requests`)}
                      className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors"
                    >
                      Review now →
                    </button>
                  </div>
                )}

                {/* Admin: just info, no action */}
                {isAdmin && totalPending > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlertCircle size={14} className="text-slate-400" />
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                        In progress
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      <strong>{stats.pendingManager}</strong> with managers ·{' '}
                      <strong>{stats.pendingHr}</strong> with HR
                    </p>
                  </div>
                )}

                {/* Status breakdown */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                    Status breakdown
                  </p>
                  {breakdown.length === 0 ? (
                    <p className="text-xs text-slate-400">No requests yet.</p>
                  ) : (
                    breakdown.map(item => {
                      const pct = stats.total > 0
                        ? Math.round((item.value / stats.total) * 100)
                        : 0;
                      return (
                        <div key={item.label} className="mb-3 last:mb-0">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {item.label}
                            </span>
                            <span className="text-slate-400">{item.value} · {pct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                            <div
                              className={`${item.cls} h-1.5 rounded-full transition-all duration-700`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* ── Requests by department ───────────────────────────────────── */}
            {deptData.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-5">
                  Requests by Department
                </h3>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={deptData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Requests">
                      {deptData.map((_, i) => (
                        <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;