import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getAllRequests, getUsers } from '../services/api';
import Navbar from '../components/Navbar';
import { CheckCircle, CalendarDays, TrendingUp, AlertCircle, Users } from 'lucide-react';
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

  const dept = (user?.department || '').toLowerCase();
  const myRequests = dept
    ? requests.filter(r => (r.department || '').toLowerCase() === dept)
    : requests;

  const stats = {
    members:  [...new Set(myRequests.map(r => r.employee_name))].length,
    pending:  myRequests.filter(r => r.status === 'pending').length,
    approved: myRequests.filter(r => r.status === 'approved').length,
    rejected: myRequests.filter(r => r.status === 'rejected').length,
  };

  const today    = new Date().toISOString().split('T')[0];
  const offToday = myRequests.filter(r => r.status === 'approved' && r.start_date <= today && r.end_date >= today);

  const monthData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const count = myRequests.filter(r => {
      const rd = new Date(r.created_at || '');
      return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
    }).length;
    return { month: d.toLocaleString('default', { month: 'short' }), count };
  });

  const approvalRate = (stats.approved + stats.rejected) > 0
    ? Math.round((stats.approved / (stats.approved + stats.rejected)) * 100)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-1">Team Manager</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {user?.department ? `${user.department} — ${t('dashboard')}` : t('dashboard')}
          </h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatMini label="Team members"         value={stats.members}  color="indigo" />
              <StatMini label={t('pendingRequests')} value={stats.pending}  color="amber" />
              <StatMini label={t('approvedRequests')}value={stats.approved} color="emerald" />
              <StatMini label={t('rejectedRequests')}value={stats.rejected} color="red" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Bar chart */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('requestsByMonth')}</h3>
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
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', className: 'dark:fill-slate-800/50' }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {monthData.map((_, i) => (
                        <Cell key={i} fill={i === monthData.length - 1 ? '#6366f1' : '#e0e7ff'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Right cards */}
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
                          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">{r.employee_name}</span>
                          <span className="text-xs text-amber-500 capitalize">{t(r.leave_type)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-2xl p-4 flex items-center gap-3">
                    <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Full team available today</p>
                  </div>
                )}

                {/* Pending alert */}
                {stats.pending > 0 && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/15 border border-indigo-200 dark:border-indigo-800/40 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlertCircle size={14} className="text-indigo-500" />
                      <span className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">Action needed</span>
                    </div>
                    <p className="text-sm text-indigo-600 dark:text-indigo-400">
                      <strong>{stats.pending}</strong> request{stats.pending > 1 ? 's' : ''} awaiting review.
                    </p>
                    <button onClick={() => navigate('/manager/requests')}
                      className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors">
                      Review now →
                    </button>
                  </div>
                )}

                {/* Breakdown bars */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Status breakdown</p>
                  {[
                    { label: t('approved'), value: stats.approved, cls: 'bg-emerald-500' },
                    { label: t('pending'),  value: stats.pending,  cls: 'bg-amber-400' },
                    { label: t('rejected'), value: stats.rejected, cls: 'bg-red-400' },
                  ].map(item => {
                    const total = myRequests.length;
                    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return (
                      <div key={item.label} className="mb-3 last:mb-0">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-slate-600 dark:text-slate-300">{item.label}</span>
                          <span className="text-slate-400">{item.value} · {pct}%</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                          <div className={`${item.cls} h-1.5 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
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