import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { AutoTable, ConfirmAction, Status } from '../components.jsx';
import { useFetch } from '../hooks.js';

export function EtuProfil() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [msgSuccess, setMsgSuccess] = useState(false);

  async function demanderModification(e) {
    e.preventDefault();
    try {
      await api.post('/demandes', { type: 'modification', donnees: { email } });
      setMsg('Demande envoyée, en attente de validation par un admin.');
      setMsgSuccess(true);
      setEmail('');
    } catch (err) { setMsg(err.message); setMsgSuccess(false); }
  }

  async function demanderSuppression() {
    try {
      await api.post('/demandes', { type: 'suppression' });
      setMsg('Demande de suppression envoyée.');
      setMsgSuccess(true);
    } catch (err) { setMsg(err.message); setMsgSuccess(false); }
  }

  return (
    <main>
      <h2>Mon profil</h2>
      <p>Matricule : {String(user.matricule)}</p>
      <p>Nom : {user.nom}</p>
      <p>Email : {user.email}</p>
      <p>Classe (idNiveau) : {String(user.idNiveau)}</p>
      <h3>Demande de modification</h3>
      <form onSubmit={demanderModification}>
        <input type="email" placeholder="Nouvel email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <button>Envoyer la demande</button>
      </form>
      <ConfirmAction children="Demander la suppression du compte" message="Envoyer une demande de suppression de ton compte ?" onConfirm={demanderSuppression} />
      {msg && <p className={msgSuccess ? 'success-message' : ''} role={msgSuccess ? 'status' : 'alert'}>{msg}</p>}
    </main>
  );
}

export function EtuEvaluations() {
  const prevues = useFetch('/examens/etudiant');
  const faites = useFetch('/moi/resultats');
  const now = new Date();
  const list = Array.isArray(prevues.data) ? prevues.data : [];

  return (
    <main>
      <h2>Évaluations</h2>
      <h3>Prévues / en cours</h3>
      <Status loading={prevues.loading} error={prevues.error} />
      <AutoTable rows={list} actions={(e) => {
        const ouvert = new Date(e.debut) <= now && now <= new Date(e.fin);
        return ouvert
          ? <Link to={`/etudiant/examen/${e.id}`} state={{ fin: e.fin }}>Passer</Link>
          : 'Pas encore ouvert';
      }} />
      <h3>Déjà passées</h3>
      <Status loading={faites.loading} error={faites.error} />
      <AutoTable rows={faites.data} />
    </main>
  );
}

export function EtuPasserExamen() {
  const { id } = useParams();
  const { state } = useLocation();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [choix, setChoix] = useState({}); // { idQuestion: idReponse }
  const [reste, setReste] = useState(null);
  const [msg, setMsg] = useState('');
  const [fini, setFini] = useState(false);
  const [resultat, setResultat] = useState(null);
  const envoye = useRef(false);
  const choixRef = useRef(choix);
  choixRef.current = choix;

  // ATTENTION : le serveur refuse une 2e ouverture (403). Pas de StrictMode dans main.jsx.
  useEffect(() => {
    api.get(`/examens/${id}/passage`).then(setData).catch((e) => setMsg(e.message));
  }, [id]);

  const fin = (state && state.fin) || (data && (data.fin || (data.examen && data.examen.fin)));

  useEffect(() => {
    if (!fin) return;
    const tick = () => setReste(Math.max(0, Math.floor((new Date(fin) - new Date()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [fin]);

  async function envoyer() {
    if (envoye.current) return;
    envoye.current = true;
    try {
      const res = await api.post(`/examens/${id}/soumettre`, { choix: choixRef.current });
      setFini(true);
      setResultat(res && (res.resultat ?? res.note ?? res.score ?? null));
      setMsg('');
    } catch (e) { envoye.current = false; setMsg(e.message); }
  }

  useEffect(() => { if (reste === 0 && data && !envoye.current) envoyer(); }, [reste]); // eslint-disable-line

  const questions = (data && data.questions) || [];

  return (
    <main>
      <h2>Examen #{id}</h2>
      {reste !== null && !fini && (
        <div className={`exam-timer ${reste <= 60 && reste > 0 ? 'exam-timer-warning' : ''}`} role="timer" aria-label={`Temps restant : ${Math.floor(reste / 60)} minutes et ${reste % 60} secondes`}>
          <span>Temps restant</span>
          <strong>{Math.floor(reste / 60)}:{String(reste % 60).padStart(2, '0')}</strong>
        </div>
      )}
      {msg && <p role="alert">{msg}</p>}
      {fini && (
        <section className="exam-result" aria-live="polite">
          <p className="success-message">Copie envoyée avec succès.</p>
          <h3>Résultat de l’évaluation</h3>
          <strong>{resultat === null ? 'Résultat enregistré' : typeof resultat === 'object' ? JSON.stringify(resultat) : resultat}</strong>
        </section>
      )}
      {fini && <button onClick={() => nav('/etudiant/evaluations')}>Retour aux évaluations</button>}
      {!fini && questions.map((q, i) => (
        <fieldset key={q.id}>
          <legend>Q{i + 1} ({q.bareme} pts) : {q.ennonce}</legend>
          {(q.reponses || []).map((r) => (
            <p key={r.id}>
              <label>
                <input type="radio" name={'q' + q.id} checked={choix[q.id] === r.id}
                  onChange={() => setChoix({ ...choix, [q.id]: r.id })} />
                {' '}{r.contenu}
              </label>
            </p>
          ))}
        </fieldset>
      ))}
      {!fini && questions.length > 0 && <button onClick={envoyer}>Envoyer ma copie</button>}
    </main>
  );
}

export function EtuResultats() {
  const { data, error, loading } = useFetch('/moi/resultats');
  const [q, setQ] = useState('');
  const rows = Array.isArray(data)
    ? data.filter((r) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))
    : [];
  return (
    <main>
      <h2>Mes résultats</h2>
      <input placeholder="Rechercher (matière...)" value={q} onChange={(e) => setQ(e.target.value)} />
      <Status loading={loading} error={error} />
      {!loading && !error && (rows.length ? <AutoTable rows={rows} /> : <p>{q ? 'Aucun résultat ne correspond à la recherche.' : 'Aucun résultat d’examen disponible pour le moment.'}</p>)}
    </main>
  );
}
