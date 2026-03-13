import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { login as loginApi, adminLogin, register as registerApi } from '../services/api';
import { Sun, Moon, Globe, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
  const { role } = useParams();
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const { dark, setDark } = useTheme();
  const navigate = useNavigate();

  const [tab, setTab] = useState('login');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ email: '', password: '', name: '', department: '' });

  // Non-employee roles can only login
  useEffect(() => {
    if (role !== 'employee') setTab('login');
  }, [role]);

  const toggleLang = () => {
    const newLang = i18n.language === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let res;
      if (role === 'admin') {
        res = await adminLogin({ password: form.password });
        login({ token: res.data.token, role: 'admin', name: 'Admin', email: 'admin', employeeId: 'admin' });
        navigate('/admin');
      } else if (tab === 'login') {
        res = await loginApi({ email: form.email, password: form.password });
        login({
          token: res.data.token,
          role: res.data.role || role,
          name: res.data.name,
          email: form.email,
          employeeId: res.data.employee_id,
        });
        navigate(`/${res.data.role || role}`);
      } else {
        res = await registerApi({ email: form.email, password: form.password, name: form.name, department: form.department, role });
        login({
          token: res.data.token,
          role,
          name: form.name,
          email: form.email,
          employeeId: res.data.employee_id,
        });
        navigate(`/${role}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || t('error'));
    }
    setLoading(false);
  };

  const roleEmoji = { employee: '👤', manager: '👔', hr: '🏢', admin: '⚙️' };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Top bar */}
      <div className="flex justify-between items-center p-4">
        <button onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          <ArrowLeft size={18} />
          <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">🏢 LeaveDesk</span>
        </button>
        <div className="flex gap-2">
          <button onClick={toggleLang}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <Globe size={16} /> {i18n.language.toUpperCase()}
          </button>
          <button onClick={() => setDark(!dark)}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">{roleEmoji[role]}</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
              {tab === 'login' ? t('welcomeBack') : t('createAccount')}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 capitalize">{t(role)}</p>
          </div>

          {/* Tabs (employee only — manager/hr/admin can only login) */}
          {role === 'employee' && (
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 mb-6">
              {['login', 'register'].map(t2 => (
                <button key={t2} onClick={() => setTab(t2)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
                    ${tab === t2 ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}>
                  {t2 === 'login' ? t('login') : t('register')}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && role !== 'admin' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('fullName')}</label>
                  <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('department')}</label>
                  <select value={form.department} onChange={e => setForm({ ...form, department: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition">
                    <option value="">Select...</option>
                    {['Engineering', 'HR', 'Finance', 'Marketing', 'Operations', 'IT'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {role !== 'admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('email')}</label>
                <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('password')}</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} required value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition pr-10" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors mt-2">
              {loading ? t('loading') : (tab === 'login' ? t('login') : t('register'))}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;