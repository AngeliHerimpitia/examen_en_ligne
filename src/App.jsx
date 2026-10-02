import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { ConfirmAction } from './components.jsx';
import { Login, Register } from './pages/Public.jsx';
import { EtuProfil, EtuEvaluations, EtuPasserExamen, EtuResultats } from './pages/Etudiant.jsx';
import { ProfProfil, ProfNouvelExamen, ProfMesExamens } from './pages/Professeur.jsx';
import { AdminPersonnes, AdminClasses, AdminExamens, AdminNotes, AdminDemandes, AdminProfil } from './pages/Admin.jsx';

const MENUS = {
  etudiant: [['/etudiant/profil', 'Profil'], ['/etudiant/evaluations', 'Évaluations'], ['/etudiant/resultats', 'Résultats']],
  professeur: [['/professeur/profil', 'Profil'], ['/professeur/examen/nouveau', 'Nouvel examen'], ['/professeur/examens', 'Mes examens']],
  admin: [['/admin/profil', 'Profil'], ['/admin/etudiants', 'Étudiants'], ['/admin/professeurs', 'Professeurs'], ['/admin/demandes', 'Demandes'], ['/admin/classes', 'Classes & matières'], ['/admin/examens', 'Examens'], ['/admin/notes', 'Fiches de notes']]
};

const initiales = (nom) => (nom || '?').trim().split(/\s+/).slice(0, 2).map((m) => m[0]).join('').toUpperCase();

function Layout({ role, children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  if (!user || user.role !== role) return <Navigate to="/" replace />;
  return (
    <>
      <header className="topbar">
        <div className="topbar-row">
          <div className="avatar-circle">{initiales(user.nom)}</div>
          <h1>{user.nom || role}</h1>
          <ConfirmAction
            className="topbar-logout"
            title="Confirmer la déconnexion"
            message="Voulez-vous vraiment vous déconnecter ?"
            confirmLabel="Déconnexion"
            onConfirm={() => { logout(); nav('/'); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
            </svg>
            Déconnexion
          </ConfirmAction>
        </div>
        <nav className="topbar-menu">
          {MENUS[role].map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}
        </nav>
      </header>
      {children}
    </>
  );
}

const wrap = (role, el) => <Layout role={role}>{el}</Layout>;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/inscription" element={<Register />} />

      <Route path="/etudiant/profil" element={wrap('etudiant', <EtuProfil />)} />
      <Route path="/etudiant/evaluations" element={wrap('etudiant', <EtuEvaluations />)} />
      <Route path="/etudiant/examen/:id" element={wrap('etudiant', <EtuPasserExamen />)} />
      <Route path="/etudiant/resultats" element={wrap('etudiant', <EtuResultats />)} />

      <Route path="/professeur/profil" element={wrap('professeur', <ProfProfil />)} />
      <Route path="/professeur/examen/nouveau" element={wrap('professeur', <ProfNouvelExamen />)} />
      <Route path="/professeur/examens" element={wrap('professeur', <ProfMesExamens />)} />

      <Route path="/admin/etudiants" element={wrap('admin', <AdminPersonnes type="etudiants" />)} />
      <Route path="/admin/professeurs" element={wrap('admin', <AdminPersonnes type="professeurs" />)} />
      <Route path="/admin/profil" element={wrap('admin', <AdminProfil />)} />
      <Route path="/admin/classes" element={wrap('admin', <AdminClasses />)} />
      <Route path="/admin/examens" element={wrap('admin', <AdminExamens />)} />
      <Route path="/admin/demandes" element={wrap('admin', <AdminDemandes />)} />
      <Route path="/admin/notes" element={wrap('admin', <AdminNotes />)} />

      <Route path="*" element={<p>Page introuvable</p>} />
    </Routes>
  );
}
