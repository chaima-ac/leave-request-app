import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token      = localStorage.getItem('ld_token');
    const role       = localStorage.getItem('ld_role');
    const name       = localStorage.getItem('ld_name');
    const email      = localStorage.getItem('ld_email');
    const employeeId = localStorage.getItem('ld_employee_id');
    const department = localStorage.getItem('ld_department') || '';
    if (token) {
      const eid = employeeId || '';
      setUser({ token, role, name, email, employeeId: eid, employee_id: eid, department });
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    const eid = userData.employeeId || userData.employee_id || '';
    localStorage.setItem('ld_token',       userData.token);
    localStorage.setItem('ld_role',        userData.role);
    localStorage.setItem('ld_name',        userData.name);
    localStorage.setItem('ld_email',       userData.email);
    localStorage.setItem('ld_employee_id', eid);
    localStorage.setItem('ld_department',  userData.department || '');
    setUser({ ...userData, employeeId: eid, employee_id: eid });
  };

  const logout = () => {
    // Only clear auth keys — preserve per-user read notification state
    ['ld_token','ld_role','ld_name','ld_email','ld_employee_id','ld_department'].forEach(k =>
      localStorage.removeItem(k)
    );
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);