import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getUsers, createUser, updateUser, deleteUser, updateBalance, getLeavePolicy } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { UserPlus, Pencil, Trash2, X, Check, ShieldAlert, ChevronDown, ChevronUp, DollarSign } from 'lucide-react';

const ROLES       = ['employee', 'manager', 'hr'];
const DEPARTMENTS = ['Engineering', 'Finance', 'Marketing', 'Operations', 'IT'];
const LEAVE_TYPES = ['vacation', 'sick', 'remote', 'personal', 'maternity', 'paternity'];

const roleColors = {
  admin:    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  hr:       'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-400',
  manager:  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  employee: 'bg-gray-100   text-gray-700   dark:bg-gray-700      dark:text-gray-300',
};

const emptyForm = {
  name: '', email: '', password: '', role: 'employee',
  department: '', position: '', phone: '', manager_id: '',
  salary: '',
};

// ── Balance Editor Row ────────────────────────────────────────────────────────
// Shown inline under an employee row; lets admin/HR adjust total or used per type
const BalanceEditor = ({ employeeId, onClose }) => {
  const [policy,   setPolicy]   = useState({});
  const [balances, setBalances] = useState({}); // { vacation: { total, used }, ... }
  const [edits,    setEdits]    = useState({}); // { vacation: { total, used }, ... }
  const [saving,   setSaving]   = useState(null);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  useEffect(() => {
    // Load current policy (for defaults) + user's actual balance from users list
    Promise.all([getLeavePolicy(), getUsers()])
      .then(([polRes, usersRes]) => {
        const p = polRes.data.policy || {};
        const u = (usersRes.data.users || []).find(u => u.employee_id === employeeId);
        const lb = u?.leave_balance || {};

        setPolicy(p);

        // Build display: merge policy types with user's stored values
        const merged = {};
        LEAVE_TYPES.forEach(lt => {
          merged[lt] = {
            total: Number(lb[lt]?.total ?? p[lt] ?? 0),
            used:  Number(lb[lt]?.used  ?? 0),
          };
        });
        setBalances(merged);
        setEdits(JSON.parse(JSON.stringify(merged))); // deep copy for editing
      })
      .catch(() => setError('Failed to load balance data.'));
  }, [employeeId]);

  const handleSave = async (leaveType) => {
    setSaving(leaveType);
    setError('');
    setSuccess('');
    try {
      await updateBalance({
        employee_id: employeeId,
        leave_type:  leaveType,
        total:       Number(edits[leaveType].total),
        used:        Number(edits[leaveType].used),
      });
      setBalances(prev => ({ ...prev, [leaveType]: { ...edits[leaveType] } }));
      setSuccess(`${leaveType} updated`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update balance.');
    }
    setSaving(null);
  };

  const isDirty = (lt) =>
    Number(edits[lt]?.total) !== Number(balances[lt]?.total) ||
    Number(edits[lt]?.used)  !== Number(balances[lt]?.used);

  return (
    <div className="bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          Leave Balance Editor
        </p>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
          <X size={14} />
        </button>
      </div>

      {error   && <p className="text-xs text-red-500 mb-2">{error}</p>}
      {success && <p className="text-xs text-emerald-500 mb-2">✓ {success}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {LEAVE_TYPES.map(lt => {
          const remaining = Number(edits[lt]?.total ?? 0) - Number(edits[lt]?.used ?? 0);
          const dirty = isDirty(lt);
          return (
            <div key={lt}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
              <p className="text-xs font-semibold capitalize text-slate-700 dark:text-slate-300 mb-2">{lt}</p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide">Total</label>
                  <input type="number" min="0" max="365"
                    value={edits[lt]?.total ?? 0}
                    onChange={e => setEdits(prev => ({
                      ...prev, [lt]: { ...prev[lt], total: e.target.value }
                    }))}
                    className="w-full mt-0.5 px-2 py-1.5 text-sm font-bold text-center rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide">Used</label>
                  <input type="number" min="0"
                    value={edits[lt]?.used ?? 0}
                    onChange={e => setEdits(prev => ({
                      ...prev, [lt]: { ...prev[lt], used: e.target.value }
                    }))}
                    className="w-full mt-0.5 px-2 py-1.5 text-sm font-bold text-center rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${remaining < 0 ? 'text-red-500' : remaining <= 3 ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {remaining}d remaining
                </span>
                <button
                  onClick={() => handleSave(lt)}
                  disabled={!dirty || saving === lt}
                  className="flex items-center gap-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-2.5 py-1 rounded-lg transition-colors">
                  {saving === lt
                    ? <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <Check size={11} />}
                  Save
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const UsersPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const isAdmin   = user?.role === 'admin';
  const isHR      = user?.role === 'hr';
  const canWrite  = isAdmin;

  const [users,         setUsers]         = useState([]);
  const [managers,      setManagers]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showModal,     setShowModal]     = useState(false);
  const [editingUser,   setEditingUser]   = useState(null);
  const [form,          setForm]          = useState(emptyForm);
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState('');
  const [success,       setSuccess]       = useState('');
  const [search,        setSearch]        = useState('');
  const [filterRole,    setFilterRole]    = useState('all');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  // Which employee row has balance editor open
  const [balanceEditId, setBalanceEditId] = useState(null);

  const fetchUsers = () => {
    setLoading(true);
    getUsers()
      .then(res => {
        const all = res.data.users || [];
        setUsers(all);
        setManagers(all.filter(u => u.role === 'manager'));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setForm({
      name:       u.name       || '',
      email:      u.email      || '',
      password:   '',
      role:       u.role       || 'employee',
      department: u.department || '',
      position:   u.position   || '',
      phone:      u.phone      || '',
      manager_id: u.manager_id || '',
      salary:     u.salary !== undefined && u.salary !== null ? String(u.salary) : '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...form,
        salary:     form.salary !== '' ? Number(form.salary) : 0,
        department: form.role === 'hr' ? '' : form.department,
        manager_id: form.role === 'employee' ? form.manager_id : '',
      };
      if (editingUser) {
        await updateUser({ employee_id: editingUser.employee_id, ...payload });
        setSuccess('User updated successfully!');
      } else {
        await createUser(payload);
        setSuccess('User created successfully!');
      }
      setShowModal(false);
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || t('error'));
    }
    setSubmitting(false);
  };

  const handleDelete = async (employeeId) => {
    try {
      await deleteUser({ employee_id: employeeId });
      setDeleteConfirm(null);
      setSuccess('User deleted successfully!');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || t('error'));
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = u.name?.toLowerCase().includes(search.toLowerCase()) ||
                        u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole   = filterRole === 'all' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const managerName = (manager_id) => {
    const m = managers.find(m => m.employee_id === manager_id);
    return m ? m.name : null;
  };

  // Can edit balance: admin always, HR always (handler allows admin+HR)
  const canEditBalance = isAdmin || isHR;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('users')}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{users.length} total users</p>
          </div>
          {canWrite && (
            <button onClick={openCreate}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors">
              <UserPlus size={18} />
              Create User
            </button>
          )}
        </div>

        {/* HR read-only notice */}
        {isHR && (
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 text-blue-700 dark:text-blue-300 text-xs font-medium px-3 py-2 rounded-xl w-fit mb-4">
            <ShieldAlert size={13} />
            HR view — read only for user data. You can adjust leave balances.
          </div>
        )}

        {/* Banners */}
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl px-4 py-3 text-sm mb-4 flex items-center gap-2">
            <Check size={16} /> {success}
          </div>
        )}
        {error && !showModal && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <input type="text" placeholder={t('search')} value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64" />
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Roles</option>
            {ROLES.map(r => <option key={r} value={r}>{t(r)}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {['User', 'Role', 'Department', 'Manager', 'Position', 'Salary', 'Actions'].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">{t('loading')}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">{t('noRequests')}</td></tr>
              ) : filtered.map(u => (
                <>
                  <tr key={u.employee_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">

                    {/* User */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm flex-shrink-0">
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{u.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${roleColors[u.role] || roleColors.employee}`}>
                        {u.role}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {u.department || '—'}
                    </td>

                    {/* Manager */}
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {u.role === 'employee' && u.manager_id
                        ? <span className="flex items-center gap-1">
                            <span className="text-indigo-500">👔</span>
                            {managerName(u.manager_id) || <span className="text-gray-400 text-xs italic">Unknown</span>}
                          </span>
                        : '—'}
                    </td>

                    {/* Position */}
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {u.position || '—'}
                    </td>

                    {/* Salary */}
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {u.salary
                        ? <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                            <DollarSign size={12} />
                            {Number(u.salary).toLocaleString()}
                          </span>
                        : <span className="text-gray-400 text-xs italic">Not set</span>}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Balance editor toggle — admin + HR, employees only */}
                        {canEditBalance && u.role === 'employee' && (
                          <button
                            onClick={() => setBalanceEditId(balanceEditId === u.employee_id ? null : u.employee_id)}
                            title="Edit leave balance"
                            className={`p-1.5 rounded-lg transition-colors text-xs font-semibold flex items-center gap-1
                              ${balanceEditId === u.employee_id
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                : 'text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}>
                            {balanceEditId === u.employee_id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        )}

                        {canWrite && (
                          <>
                            <button onClick={() => openEdit(u)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                              <Pencil size={15} />
                            </button>
                            {deleteConfirm === u.employee_id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleDelete(u.employee_id)}
                                  className="p-1.5 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
                                  <Check size={15} />
                                </button>
                                <button onClick={() => setDeleteConfirm(null)}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                                  <X size={15} />
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteConfirm(u.employee_id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                <Trash2 size={15} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Inline balance editor row */}
                  {balanceEditId === u.employee_id && (
                    <tr key={`balance-${u.employee_id}`}>
                      <td colSpan={7} className="p-0">
                        <BalanceEditor
                          employeeId={u.employee_id}
                          onClose={() => setBalanceEditId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create / Edit Modal ──────────────────────────────────────────────── */}
      {showModal && canWrite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingUser ? 'Edit User' : 'Create New User'}
              </h2>
              <button onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('fullName')} *
                </label>
                <input type="text" required value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('email')} *
                </label>
                <input type="email" required value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  disabled={!!editingUser}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50" />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('password')}
                  {editingUser && <span className="text-gray-400 font-normal ml-1">(leave blank to keep)</span>}
                </label>
                <input type="password" value={form.password}
                  required={!editingUser}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role *</label>
                  <select value={form.role}
                    onChange={e => setForm({
                      ...form, role: e.target.value,
                      department: e.target.value === 'hr' ? '' : form.department,
                      manager_id: e.target.value !== 'employee' ? '' : form.manager_id,
                    })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {ROLES.map(r => <option key={r} value={r}>{t(r)}</option>)}
                  </select>
                </div>

                {/* Department — hidden for HR */}
                {form.role !== 'hr' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('department')}</label>
                    <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option value="">Select…</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Manager assignment — employees only */}
              {form.role === 'employee' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    👔 Assign to Manager
                  </label>
                  <select value={form.manager_id} onChange={e => setForm({ ...form, manager_id: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">No manager assigned</option>
                    {managers.map(m => (
                      <option key={m.employee_id} value={m.employee_id}>
                        {m.name} {m.department ? `(${m.department})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    The manager will see and review this employee's leave requests.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Position */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('position')}</label>
                  <input type="text" value={form.position}
                    onChange={e => setForm({ ...form, position: e.target.value })}
                    placeholder="e.g. Senior Developer"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('phone')}</label>
                  <input type="text" value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="+216 XX XXX XXX"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              {/* Salary — shown for all roles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  💰 Monthly Salary
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">TND</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.salary}
                    onChange={e => setForm({ ...form, salary: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-14 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Stored securely. Visible to admin only.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  {t('cancel')}
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors">
                  {submitting ? t('loading') : (editingUser ? t('save') : 'Create User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;