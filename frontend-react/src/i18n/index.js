import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      login: "Login", register: "Register", email: "Email", password: "Password",
      fullName: "Full Name", department: "Department", forgotPassword: "Forgot password?",
      noAccount: "Don't have an account?", hasAccount: "Already have an account?",
      welcomeBack: "Welcome back", createAccount: "Create your account",
      employee: "Employee", manager: "Manager", hr: "HR", admin: "Admin",
      selectRole: "Select your role",
      dashboard: "Dashboard", myRequests: "My Requests", newRequest: "New Request",
      team: "My Team", allRequests: "All Requests", analytics: "Analytics",
      users: "Users", settings: "Settings", logout: "Logout", profile: "Profile",
      notifications: "Notifications",
      leaveType: "Leave Type", startDate: "Start Date", endDate: "End Date",
      reason: "Reason", status: "Status", days: "Days", submit: "Submit Request",
      approve: "Approve", reject: "Reject", pending: "Pending", approved: "Approved",
      rejected: "Rejected", cancel: "Cancel", comment: "Comment",
      vacation: "Vacation", sick: "Sick Leave", remote: "Remote Work",
      personal: "Personal Leave", maternity: "Maternity Leave", paternity: "Paternity Leave",
      leaveBalance: "Leave Balance", used: "Used", remaining: "Remaining", total: "Total",
      totalRequests: "Total Requests", pendingRequests: "Pending", approvedRequests: "Approved",
      rejectedRequests: "Rejected", recentRequests: "Recent Requests", teamCalendar: "Team Calendar",
      requestsByMonth: "Requests by Month", requestsByType: "Requests by Type",
      approvalRate: "Approval Rate", requestsByDepartment: "By Department",
      requestSubmitted: "Request submitted!", requestApproved: "Request approved!",
      requestRejected: "Request rejected!", noRequests: "No requests found",
      loading: "Loading...", error: "An error occurred", success: "Success",
      editProfile: "Edit Profile", changePassword: "Change Password",
      joinDate: "Join Date", position: "Position", phone: "Phone", save: "Save",
      name: "Name", actions: "Actions", from: "From", to: "To", all: "All",
      search: "Search", filter: "Filter", export: "Export PDF",
    }
  },
  fr: {
    translation: {
      login: "Connexion", register: "S'inscrire", email: "Email", password: "Mot de passe",
      fullName: "Nom complet", department: "Département", forgotPassword: "Mot de passe oublié?",
      noAccount: "Pas encore de compte?", hasAccount: "Déjà un compte?",
      welcomeBack: "Bon retour", createAccount: "Créer votre compte",
      employee: "Employé", manager: "Manager", hr: "RH", admin: "Admin",
      selectRole: "Sélectionnez votre rôle",
      dashboard: "Tableau de bord", myRequests: "Mes demandes", newRequest: "Nouvelle demande",
      team: "Mon équipe", allRequests: "Toutes les demandes", analytics: "Analytiques",
      users: "Utilisateurs", settings: "Paramètres", logout: "Déconnexion", profile: "Profil",
      notifications: "Notifications",
      leaveType: "Type de congé", startDate: "Date de début", endDate: "Date de fin",
      reason: "Motif", status: "Statut", days: "Jours", submit: "Soumettre",
      approve: "Approuver", reject: "Rejeter", pending: "En attente", approved: "Approuvé",
      rejected: "Rejeté", cancel: "Annuler", comment: "Commentaire",
      vacation: "Congé annuel", sick: "Congé maladie", remote: "Télétravail",
      personal: "Congé personnel", maternity: "Congé maternité", paternity: "Congé paternité",
      leaveBalance: "Solde de congés", used: "Utilisé", remaining: "Restant", total: "Total",
      totalRequests: "Total", pendingRequests: "En attente", approvedRequests: "Approuvés",
      rejectedRequests: "Rejetés", recentRequests: "Demandes récentes", teamCalendar: "Calendrier équipe",
      requestsByMonth: "Demandes par mois", requestsByType: "Par type",
      approvalRate: "Taux d'approbation", requestsByDepartment: "Par département",
      requestSubmitted: "Demande soumise!", requestApproved: "Demande approuvée!",
      requestRejected: "Demande rejetée!", noRequests: "Aucune demande",
      loading: "Chargement...", error: "Une erreur s'est produite", success: "Succès",
      editProfile: "Modifier profil", changePassword: "Changer mot de passe",
      joinDate: "Date d'entrée", position: "Poste", phone: "Téléphone", save: "Enregistrer",
      name: "Nom", actions: "Actions", from: "Du", to: "Au", all: "Tous",
      search: "Rechercher", filter: "Filtrer", export: "Exporter PDF",
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('language') || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false }
});

export default i18n;