import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getAllRequests, getUsers } from '../services/api';
import Navbar from '../components/Navbar';
import { Users } from 'lucide-react';

const ManagerTeam = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getUsers(), getAllRequests()])
      .then(([usersRes, reqRes]) => {
        const allUsers    = usersRes.data.users    || [];
        const allRequests = reqRes.data.requests   || [];

        // getUsers() is already filtered server-side for managers
        // but keep client-side filter as safety net
        const dept = (user?.department || '').toLowerCase();
        const deptUsers = dept
          ? allUsers.filter(u => (u.department || '').toLowerCase() === dept && u.role === 'employee')
          : allUsers.filter(u => u.role === 'employee');

        // Attach request stats to each member using employee_id
        const enriched = deptUsers.map(u => ({
          ...u,
          requests: allRequests.filter(r => r.employee_id === u.employee_id),
        }));

        setMembers(enriched);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.department]);

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500 dark:text-indigo-400 mb-1">Team Manager</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('team')}</h1>
          {user?.department && (
            <p className="text-sm text-slate-400 mt-0.5">
              {members.length} member{members.length !== 1 ? 's' : ''} · <strong className="text-slate-500 dark:text-slate-300">{user.department}</strong>
            </p>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-40 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="py-24 text-center">
            <Users size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-slate-400 text-sm">
              No team members found for <strong>{user?.department}</strong>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map(member => {
              const mReqs = member.requests;
              const isOff = mReqs.some(r =>
                r.status === 'approved' && r.start_date <= today && r.end_date >= today
              );
              const totalDays = mReqs
                .filter(r => r.status === 'approved')
                .reduce((acc, r) => {
                  if (!r.start_date || !r.end_date) return acc + 1;
                  return acc + Math.max(1, Math.ceil(
                    (new Date(r.end_date) - new Date(r.start_date)) / 86400000
                  ) + 1);
                }, 0);

              return (
                <div key={member.employee_id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
                      {member.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{member.name}</p>
                      {member.position && (
                        <p className="text-xs text-slate-400 truncate">{member.position}</p>
                      )}
                      <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full mt-0.5
                        ${isOff
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                        {isOff ? 'Off today' : 'Available'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center mb-4">
                    {['pending', 'approved', 'rejected'].map(s => (
                      <div key={s} className="bg-slate-50 dark:bg-slate-800 rounded-xl py-2.5">
                        <p className="text-base font-bold text-slate-900 dark:text-white tabular-nums">
                          {mReqs.filter(r => r.status === s).length}
                        </p>
                        <p className="text-xs text-slate-400 capitalize">{t(s)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">Days taken</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{totalDays} days</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerTeam;