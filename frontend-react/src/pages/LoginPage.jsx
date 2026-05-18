import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { login as loginApi, adminLogin } from '../services/api';
import { Sun, Moon, Globe, Eye, EyeOff, Shield, ArrowRight } from 'lucide-react';
import AppLogo from '../components/AppLogo';
import { cognitoLogin } from '../services/cognito'

const LoginPage = () => {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const { dark, setDark } = useTheme();
  const navigate = useNavigate();

  const [adminMode, setAdminMode] = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [form, setForm]           = useState({ email: '', password: '' });

  const toggleLang = () => {
    const nl = i18n.language === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(nl);
    localStorage.setItem('language', nl);
  };

    const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (adminMode) {
        const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
        const result = await cognitoLogin(adminEmail, form.password.trim());
        login({
          token:      result.idToken,
          role:       'admin',
          name:       'Admin',
          email:      adminEmail,
          employeeId: 'admin',
          department: '',
        });
        navigate('/admin');
      } else {
        const result = await cognitoLogin(form.email.trim(), form.password);
        const payload = result.payload;
        login({
          token:      result.idToken,
          role:       payload['custom:role']        || 'employee',
          name:       payload['name']               || form.email,
          email:      form.email.trim(),
          employeeId: payload['custom:employee_id'] || '',
          department: '',
        });
        navigate(`/${payload['custom:role'] || 'employee'}`);
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    }
    setLoading(false);
  };

  const isFr = i18n.language === 'fr';

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', filter: 'blur(40px)' }} />

        <div className="relative z-10">
          <AppLogo inverse />
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            {isFr ? 'Gérez les congés\nsans friction.' : 'Manage leave\nwithout friction.'}
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            {isFr
              ? 'Une plateforme unifiée pour les demandes, validations et analytics.'
              : 'One unified platform for requests, approvals, and analytics.'}
          </p>
          <div className="mt-10 flex flex-col gap-3">
            {[
              { icon: '⚡', text: isFr ? 'Approbations en un clic' : 'One-click approvals' },
              { icon: '📊', text: isFr ? 'Analytics en temps réel' : 'Real-time analytics' },
              { icon: '🌍', text: isFr ? 'Français & anglais' : 'French & English support' },
            ].map(f => (
              <div key={f.text} className="flex items-center gap-3">
                <span className="text-lg">{f.icon}</span>
                <span className="text-slate-300 text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-slate-600 text-xs">© {new Date().getFullYear()} Leave Desk</div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-950">
        <div className="flex justify-between items-center px-6 py-5">
          <div className="lg:hidden">
            <AppLogo compact />
          </div>
          <div className="hidden lg:block" />
          <div className="flex gap-1 items-center">
            <button onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Globe size={13} /> {i18n.language.toUpperCase()}
            </button>
            <button onClick={() => setDark(!dark)}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                {adminMode ? (isFr ? 'Accès administrateur' : 'Admin access') : (isFr ? 'Bon retour' : 'Welcome back')}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {adminMode
                  ? (isFr ? 'Entrez le mot de passe admin' : 'Enter the admin password')
                  : (isFr ? 'Connectez-vous à votre espace de travail' : 'Sign in to your workspace')}
              </p>
            </div>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!adminMode && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">{t('email')}</label>
                  <input type="email" required value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder={isFr ? 'vous@entreprise.com' : 'you@company.com'}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm" />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">{t('password')}</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} required value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm mt-2">
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <>{isFr ? 'Se connecter' : 'Sign in'} <ArrowRight size={15} /></>}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
              <button onClick={() => { setAdminMode(!adminMode); setError(''); setForm({ email: '', password: '' }); }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-colors text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900">
                <Shield size={12} />
                {adminMode ? (isFr ? '← Connexion standard' : '← Standard login') : (isFr ? 'Accès administrateur' : 'Admin access')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;