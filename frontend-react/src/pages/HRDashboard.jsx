import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getAllRequests, getUsers } from '../services/api';
import Navbar from '../components/Navbar';
import { Users, CheckCircle, Clock, XCircle, TrendingUp, CalendarDays, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-lg text-xs">
      {label && <p className="text-slate-400 mb-0.5">{label}</p>}
      <p className="font-semibold text-slate-900 dark:text-white">{payload[0].value} days</p>
    </div>
  );
};

const LEAVE_QUOTA = { vacation: 30, sick: 10, remote: 60, personal: 5, maternity: 90, paternity: 15 };
const DEPT_COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#ec4899'];

const HRDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([getAllRequests(), getUsers()])
      .then(([reqRes, usersRes]) => {
        setRequests(reqRes.data.requests || []);
        setUsers(usersRes.data.users     || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const normalize = s => s?.toLowerCase() || '';

  const stats = {
    total:     requests.length,
    pending:   requests.filter(r => normalize(r.status) === 'pending').length,
    approved:  requests.filter(r => normalize(r.status) === 'approved').length,
    rejected:  requests.filter(r => normalize(r.status) === 'rejected').length,
    employees: users.filter(u => u.role === 'employee').length,
  };

  const today = new Date().toISOString().split('T')[0];
  const offToday = requests.filter(r =>
    normalize(r.status) === 'approved' && r.start_date <= today && r.end_date >= today
  );

  // Leave balance by department — filter by employee_id to handle old requests with empty department
  const depts = [...new Set(users.filter(u => u.role === 'employee' && u.department).map(u => u.department))].sort();

  const deptBalances = depts.map(dept => {
    const deptEmployees = users.filter(u => u.role === 'employee' && u.department === dept);
    const deptIds = new Set(deptEmployees.map(u => u.employee_id));
    const deptRequests  = requests.filter(r => normalize(r.status) === 'approved' && deptIds.has(r.employee_id));

    const totalDaysTaken = deptRequests.reduce((acc, r) => {
      if (!r.start_date || !r.end_date) return acc + 1;
      return acc + Math.max(1, Math.ceil((new Date(r.end_date) - new Date(r.start_date)) / 86400000) + 1);
    }, 0);

    const totalQuota = deptEmployees.length * LEAVE_QUOTA.vacation;
    const usagePct   = totalQuota > 0 ? Math.round((totalDaysTaken / totalQuota) * 100) : 0;

    return { dept, employees: deptEmployees.length, daysTaken: totalDaysTaken, quota: totalQuota, usagePct };
  });

  // Days taken by dept for bar chart
  const deptChartData = deptBalances.map(d => ({ name: d.dept, value: d.daysTaken }));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-1">Human Resources</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('dashboard')}</h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />)}
          </div>
        ) : (<>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Total Employees', value: stats.employees, color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' },
              { label: t('totalRequests'),    value: stats.total,    color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' },
              { label: t('pendingRequests'),  value: stats.pending,  color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' },
              { label: t('approvedRequests'), value: stats.approved, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' },
              { label: t('rejectedRequests'), value: stats.rejected, color: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl p-5 ${s.color}`}>
                <p className="text-3xl font-bold tabular-nums">{s.value}</p>
                <p className="text-xs font-medium mt-1 opacity-75 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
            {/* Days taken by dept chart */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-5">Approved Leave Days by Department</h3>
              {deptChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={deptChartData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Bar dataKey="value" radius={[6,6,0,0]}>
                      {deptChartData.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
              )}
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-4">
              {offToday.length > 0 ? (
                <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarDays size={14} className="text-amber-500" />
                    <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">{offToday.length} off today</span>
                  </div>
                  <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto">
                    {offToday.map(r => (
                      <div key={r.request_id} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-amber-700 dark:text-amber-300 truncate">{r.employee_name}</span>
                        <span className="text-xs text-amber-500 ml-2 flex-shrink-0">{r.department}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-2xl p-4 flex items-center gap-3">
                  <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Everyone is in today</p>
                </div>
              )}

              {stats.pending > 0 && (
                <div className="bg-indigo-50 dark:bg-indigo-900/15 border border-indigo-200 dark:border-indigo-800/40 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <AlertCircle size={14} className="text-indigo-500" />
                    <span className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">Pending review</span>
                  </div>
                  <p className="text-sm text-indigo-600 dark:text-indigo-400">
                    <strong>{stats.pending}</strong> request{stats.pending > 1 ? 's' : ''} awaiting manager approval.
                  </p>
                  <button onClick={() => navigate('/hr/requests')}
                    className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors">
                    View requests →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Leave balance per department */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Leave Balance by Department</h3>
              <p className="text-xs text-slate-400 mt-0.5">Based on {LEAVE_QUOTA.vacation} vacation days quota per employee</p>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {deptBalances.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">No department data available</div>
              ) : deptBalances.map((d, i) => (
                <div key={d.dept} className="px-6 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                      <span className="text-sm font-semibold text-slate-900 dark:text-white">{d.dept}</span>
                      <span className="text-xs text-slate-400">{d.employees} employee{d.employees !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{d.daysTaken} / {d.quota}</span>
                      <span className="text-xs text-slate-400 ml-1">days</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                    <div className="h-2 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(d.usagePct, 100)}%`, background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-400">{d.usagePct}% used</span>
                    <span className="text-xs text-slate-400">{Math.max(0, d.quota - d.daysTaken)} days remaining</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </>)}
      </div>
    </div>
  );
};

export default HRDashboard;