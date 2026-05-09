import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getAllRequests } from '../services/api';
import Navbar from '../components/Navbar';
import { CheckCircle, CalendarDays, TrendingUp, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';

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
  };
  return (
    <div className={`rounded-2xl p-5 ${colors[color]}`}>
      <p className="text-3xl font-bold tabular-nums">{value}</p>
      <p className="text-xs font-medium mt-1 opacity-75 uppercase tracking-wide">{label}</p>
    </div>
  );
};

const ManagerDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllRequests()
      .then(res => { setRequests(res.data.requests || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ── Filter: only requests from this manager's group ──────────────────────
  // Backend already filters by manager_id, but we double-check on the frontend
  const mgrId = user?.employeeId ?? user?.employee_id;
  const myRequests = mgrId ? requests.filter(r => r.manager_id === mgrId) : requests;

  // ── Stats with new status values ─────────────────────────────────────────
  const stats = {
    members:         [...new Set(myRequests.map(r => r.employee_name))].length,
    pendingManager:  myRequests.filter(r => r.status === 'pending_manager').length,
    pendingHr:       myRequests.filter(r => r.status === 'pending_hr').length,
    approved:        myRequests.filter(r => r.status === 'approved').length,
    rejectedManager: myRequests.filter(r => r.status === 'rejected_manager').length,
    rejectedHr:      myRequests.filter(r => r.status === 'rejected_hr').length,
    cancelled:       myRequests.filter(r => r.status === 'cancelled').length,
  };

  // Total pending = requests awaiting manager action only
  const totalPendingAction = stats.pendingManager;
  const totalRejected      = stats.rejectedManager + stats.rejectedHr;

  // ── Who is off today ──────────────────────────────────────────────────────
  const today    = new Date().toISOString().split('T')[0];
  const offToday = myRequests.filter(
    r => r.status === 'approved' && r.start_date <= today && r.end_date >= today
  );

  // ── Monthly chart ─────────────────────────────────────────────────────────
  const monthData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const count = myRequests.filter(r => {
      const rd = new Date(r.created_at || '');
      return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
    }).length;
    return { month: d.toLocaleString('default', { month: 'short' }), count };
  });

  const approvalRate = (stats.approved + totalRejected) > 0
    ? Math.round((stats.approved / (stats.approved + totalRejected)) * 100)
    : null;

  // ── Status breakdown (all statuses) ──────────────────────────────────────
  const breakdown = [
    { label: 'Approved',           value: stats.approved,        cls: 'bg-emerald-500' },
    { label: 'Pending manager',    value: stats.pendingManager,  cls: 'bg-amber-400' },
    { label: 'Pending HR',         value: stats.pendingHr,       cls: 'bg-blue-400' },
    { label: 'Rejected (manager)', value: stats.rejectedManager, cls: 'bg-red-400' },
    { label: 'Rejected (HR)',      value: stats.rejectedHr,      cls: 'bg-red-600' },
    { label: 'Cancelled',          value: stats.cancelled,       cls: 'bg-slate-400' },
  ].filter(item => item.value > 0); // hide zero rows

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-1">
            Team Manager
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {user?.department ? `${user.department} — ${t('dashboard')}` : t('dashboard')}
          </h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* ── Stat cards ───────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <StatMini label="Team members"      value={stats.members}        color="indigo" />
              <StatMini label="Awaiting my review" value={stats.pendingManager} color="amber" />
              <StatMini label="Pending HR"         value={stats.pendingHr}      color="blue" />
              <StatMini label="Approved"           value={stats.approved}       color="emerald" />
              <StatMini label="Rejected"           value={totalRejected}        color="red" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* ── Bar chart ─────────────────────────────────────────── */}
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

              {/* ── Right column ──────────────────────────────────────── */}
              <div className="flex flex-col gap-4">

                {/* Off today */}
                {offToday.length > 0 ? (
                  <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarDays size={14} className="text-amber-500" />
                      <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">Off today</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {offToday.map(r => (
                        <div key={r.request_id} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                            {r.employee_name}
                          </span>
                          <span className="text-xs text-amber-500 capitalize">{t(r.leave_type)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-2xl p-4 flex items-center gap-3">
                    <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      Full team available today
                    </p>
                  </div>
                )}

                {/* ⚠️ Action needed alert — only for pending_manager */}
                {totalPendingAction > 0 && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/15 border border-indigo-200 dark:border-indigo-800/40 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlertCircle size={14} className="text-indigo-500" />
                      <span className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">
                        Action needed
                      </span>
                    </div>
                    <p className="text-sm text-indigo-600 dark:text-indigo-400">
                      <strong>{totalPendingAction}</strong> request{totalPendingAction > 1 ? 's' : ''} awaiting your review.
                    </p>
                    <button
                      onClick={() => navigate('/manager/requests')}
                      className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors"
                    >
                      Review now →
                    </button>
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
                      const pct = myRequests.length > 0
                        ? Math.round((item.value / myRequests.length) * 100)
                        : 0;
                      return (
                        <div key={item.label} className="mb-3 last:mb-0">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-slate-600 dark:text-slate-300">{item.label}</span>
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
          </>
        )}
      </div>
    </div>
  );
};

export default ManagerDashboard;