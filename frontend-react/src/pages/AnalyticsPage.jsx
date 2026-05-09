import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { getAllRequests, getUsers } from '../services/api';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import { FileText, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899'];
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-lg text-sm">
      {label && <p className="text-gray-500 dark:text-gray-400 mb-1 text-xs">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="font-semibold text-gray-900 dark:text-white">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};



const AnalyticsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Backend now pre-filters by manager_id for managers
    getAllRequests()
      .then(res => { setRequests(res.data.requests || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const s = (status) => requests.filter(r => r.status === status).length;

  const stats = {
    total:           requests.length,
    pendingManager:  s('pending_manager'),
    pendingHr:       s('pending_hr'),
    approved:        s('approved'),
    rejectedManager: s('rejected_manager'),
    rejectedHr:      s('rejected_hr'),
    cancelled:       s('cancelled'),
  };

  const totalRejected = stats.rejectedManager + stats.rejectedHr;
  const totalPending  = stats.pendingManager + stats.pendingHr;

  const approvalRate = (stats.approved + totalRejected) > 0
    ? Math.round((stats.approved / (stats.approved + totalRejected)) * 100)
    : null;

  // Requests by month (last 12 months)
  const monthData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    const month = d.toLocaleString('default', { month: 'short' });
    const year = d.getFullYear();
    const count = requests.filter(r => {
      const rd = new Date(r.created_at || '');
      return rd.getMonth() === d.getMonth() && rd.getFullYear() === year;
    }).length;
    return { month, count };
  });

  // Requests by type
  const leaveTypes = ['vacation', 'sick', 'remote', 'personal', 'maternity', 'paternity'];
  const typeData = leaveTypes.map(type => ({
    name: t(type),
    value: requests.filter(r => r.leave_type === type).length
  })).filter(d => d.value > 0);

  // Requests by department
  const deptMap = {};
  requests.forEach(r => {
    const dept = r.department || 'Unknown';
    deptMap[dept] = (deptMap[dept] || 0) + 1;
  });
  const deptData = Object.entries(deptMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Status breakdown
  const statusData = [
    { name: 'Approved',           value: stats.approved },
    { name: 'Pending manager',    value: stats.pendingManager },
    { name: 'Pending HR',         value: stats.pendingHr },
    { name: 'Rejected (manager)', value: stats.rejectedManager },
    { name: 'Rejected (HR)',      value: stats.rejectedHr },
    { name: 'Cancelled',          value: stats.cancelled },
  ].filter(d => d.value > 0);

  // Top employees by requests
  const empMap = {};
  requests.forEach(r => {
    const name = r.employee_name || 'Unknown';
    empMap[name] = (empMap[name] || 0) + 1;
  });
  const topEmployees = Object.entries(empMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('analytics')}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {user?.role === 'manager' ? 'Your team analytics' : 'Full overview of all leave requests'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <StatCard title="Total"        value={stats.total}          icon={<FileText size={22} />} color="blue" />
          <StatCard title="Pending Mgr"  value={stats.pendingManager} icon={<Clock size={22} />}    color="yellow" />
          <StatCard title="Pending HR"   value={stats.pendingHr}      icon={<Clock size={22} />}    color="blue" />
          <StatCard title="Approved"     value={stats.approved}       icon={<CheckCircle size={22} />} color="green" />
          <StatCard title="Rejected"     value={totalRejected}        icon={<XCircle size={22} />}  color="red" />
          <StatCard title="Approval Rate" value={approvalRate !== null ? `${approvalRate}%` : '—'} icon={<TrendingUp size={22} />} color="indigo" />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Requests by month */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('requestsByMonth')}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Requests" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status breakdown — donut + legend */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status Breakdown</h3>
            {statusData.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%"
                      innerRadius={52} outerRadius={80}
                      dataKey="value" startAngle={90} endAngle={-270}>
                      {statusData.map((entry, i) => {
                        const colorMap = {
                          'Approved':           '#10b981', // emerald-500
                          'Pending manager':    '#fbbf24', // amber-400
                          'Pending HR':         '#60a5fa', // blue-400
                          'Rejected (manager)': '#f87171', // red-400
                          'Rejected (HR)':      '#dc2626', // red-600
                          'Cancelled':          '#94a3b8', // slate-400
                        };
                        return <Cell key={i} fill={colorMap[entry.name] || COLORS[i]} strokeWidth={0} />;
                      })}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-3 flex-1">
                  {statusData.map((entry) => {
                    const colorMap = {
                      'Approved':           { dot: 'bg-emerald-500',  text: 'text-emerald-600 dark:text-emerald-400' },
                      'Pending manager':    { dot: 'bg-amber-400',    text: 'text-amber-600 dark:text-amber-400' },
                      'Pending HR':         { dot: 'bg-blue-400',     text: 'text-blue-600 dark:text-blue-400' },
                      'Rejected (manager)': { dot: 'bg-red-400',      text: 'text-red-500 dark:text-red-400' },
                      'Rejected (HR)':      { dot: 'bg-red-600',      text: 'text-red-700 dark:text-red-500' },
                      'Cancelled':          { dot: 'bg-slate-400',    text: 'text-slate-600 dark:text-slate-400' },
                    };
                    const c = colorMap[entry.name] || { dot: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400' };
                    const pct = stats.total > 0 ? Math.round((entry.value / stats.total) * 100) : 0;
                    return (
                      <div key={entry.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.dot}`} />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{entry.name}</span>
                          </div>
                          <span className={`text-sm font-bold ${c.text}`}>{entry.value} · {pct}%</span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                          <div className={`${c.dot} h-1.5 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400">{t('noRequests')}</div>
            )}
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* By leave type */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('requestsByType')}</h3>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={typeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" stroke="#9ca3af" tick={{ fontSize: 12 }} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Requests">
                    {typeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400">{t('noRequests')}</div>
            )}
          </div>

          {/* By department — hidden for managers (they only see their own dept) */}
          {user?.role !== 'manager' && <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{t('requestsByDepartment')}</h3>
            {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={deptData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Requests">
                    {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400">{t('noRequests')}</div>
            )}
          </div>}
        </div>

        {/* Top employees */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Employees by Requests</h3>
          <div className="space-y-3">
            {topEmployees.map((emp, i) => (
              <div key={emp.name} className="flex items-center gap-4">
                <span className="text-sm font-bold text-gray-400 w-4">{i + 1}</span>
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                  {emp.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{emp.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{emp.count} requests</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div className="bg-indigo-500 h-1.5 rounded-full"
                      style={{ width: `${(emp.count / topEmployees[0].count) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalyticsPage;