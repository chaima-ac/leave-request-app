import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Globe } from 'lucide-react';

const roles = [
  { key: 'employee', emoji: '👤', desc_en: 'Submit and track your leave requests',  desc_fr: 'Soumettez et suivez vos demandes de congé' },
  { key: 'manager',  emoji: '👔', desc_en: "Manage your team's leave requests",     desc_fr: 'Gérez les congés de votre équipe' },
  { key: 'hr',       emoji: '🏢', desc_en: 'Oversee all employees and analytics',   desc_fr: 'Supervisez tous les employés et analyses' },
  { key: 'admin',    emoji: '⚙️', desc_en: 'Full system administration',            desc_fr: 'Administration complète du système' },
];

const RoleSelect = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { dark, setDark } = useTheme();

  const toggleLang = () => {
    const newLang = i18n.language === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  // All roles use the single /login page.
  // LoginPage handles employee/manager/hr via email+password,
  // and admin via the "Admin access" toggle + password-only form.
  const handleRoleClick = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Top bar */}
      <div className="flex justify-between items-center p-4">
        <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">🏢 LeaveDesk</span>
        <div className="flex gap-2">
          <button onClick={toggleLang}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            <Globe size={16} /> {i18n.language.toUpperCase()}
          </button>
          <button onClick={() => setDark(!dark)}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            {t('selectRole')}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {i18n.language === 'fr'
              ? 'Choisissez votre rôle pour continuer'
              : 'Choose your role to continue'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
          {roles.map(role => (
            <button
              key={role.key}
              onClick={handleRoleClick}
              className="group bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-6 text-left transition-all hover:shadow-lg hover:-translate-y-1"
            >
              <div className="text-4xl mb-3">{role.emoji}</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 capitalize">
                {t(role.key)}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {i18n.language === 'fr' ? role.desc_fr : role.desc_en}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoleSelect;