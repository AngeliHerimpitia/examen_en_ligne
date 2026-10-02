import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, saveSession } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useFetch } from '../hooks.js';

function FieldIcon({ kind }) {
  return (
    <svg className="auth-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === 'user' ? <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></> : <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>}
    </svg>
  );
}

function PasswordIcon({ visible }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {visible ? <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></> : <><path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a14.8 14.8 0 0 1-3.1 3.9M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7a10 10 0 0 0 3.1-.5" /></>}
    </svg>
  );
}

export function Login() {
  const [role, setRole] = useState('etudiant');
  const [identifiant, setIdentifiant] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState('');
  const { login } = useAuth();
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    try {
      const body = role === 'admin' ? { nom: identifiant, motDePasse } : { email: identifiant, motDePasse };
      const res = await api.post('/auth/' + role, body);
      if (!res || !res.token) return setMsg('Réponse inattendue : ' + JSON.stringify(res));

      saveSession({ token: res.token, user: { role } }); // nécessaire pour l'appel /moi
      let moi = {};
      try { moi = await api.get('/moi'); } catch { moi = res.utilisateur || res.user || {}; }

      login(res.token, { ...moi, role });
      nav(role === 'admin' ? '/admin/etudiants' : role === 'etudiant' ? '/etudiant/evaluations' : '/professeur/examens');
    } catch (err) { setMsg(err.message); }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Se connecter</h1>
        <div className="auth-fields">
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="etudiant">Étudiant</option>
            <option value="professeur">Professeur</option>
            <option value="admin">Super Admin</option>
          </select>
          <div className="auth-input-wrap">
            <FieldIcon kind="user" />
            <input autoComplete="username" placeholder={role === 'admin' ? 'Nom admin' : 'Email'} value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} required />
          </div>
          <div className="auth-input-wrap has-password-toggle">
            <FieldIcon kind="lock" />
            <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Mot de passe" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required />
            <button className="auth-password-toggle" type="button" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onClick={() => setShowPassword(!showPassword)}>
              <PasswordIcon visible={showPassword} />
            </button>
          </div>
        </div>
        <div className="auth-actions">
          <button className="btn">Se connecter</button>
        </div>
        {msg && <p className="auth-msg" role="alert">{msg}</p>}
        <div className="auth-footer">
          <h2>S'inscrire</h2>
          <p>Pas encore de compte ? <Link to="/inscription">Demander une inscription</Link></p>
        </div>
      </form>
    </div>
  );
}

export function Register() {
  const { data: niveaux } = useFetch('/niveaux');
  const [role, setRole] = useState('etudiant');
  const [f, setF] = useState({ matricule: '', nom: '', email: '', motDePasse: '', idNiveau: '' });
  const [msg, setMsg] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    try {
      await api.post('/' + (role === 'etudiant' ? 'etudiants' : 'professeurs'), f);
      setMsg("Demande envoyée. En attente de confirmation par l'admin.");
    } catch (err) { setMsg(err.message); }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Demande d'inscription</h1>
        <div className="auth-fields">
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="etudiant">Étudiant</option>
            <option value="professeur">Professeur</option>
          </select>
          <input placeholder="Matricule / N° d'inscription" value={f.matricule} onChange={set('matricule')} required />
          <input placeholder="Nom complet" value={f.nom} onChange={set('nom')} required />
          <input type="email" placeholder="Email" value={f.email} onChange={set('email')} required />
          <input type="password" placeholder="Mot de passe" value={f.motDePasse} onChange={set('motDePasse')} required />
          {role === 'etudiant' && (
            <select value={f.idNiveau} onChange={set('idNiveau')} required>
              <option value="">-- Classe --</option>
              {(niveaux || []).map((n) => <option key={n.id} value={n.id}>{n.libelle}</option>)}
            </select>
          )}
        </div>
        <div className="auth-actions">
          <button className="btn">Envoyer</button>
        </div>
        {msg && <p className={`auth-msg ${msg.startsWith('Demande envoyée') ? 'success-message' : ''}`} role={msg.startsWith('Demande envoyée') ? 'status' : 'alert'}>{msg}</p>}
        <div className="auth-footer">
          <h2>Se connecter</h2>
          <p><Link to="/">Retour à la connexion</Link></p>
        </div>
      </form>
    </div>
  );
}
