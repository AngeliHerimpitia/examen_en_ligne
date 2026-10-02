import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { AutoTable, ConfirmAction, Status } from '../components.jsx';
import { useFetch } from '../hooks.js';

export function ProfProfil() {
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

export function ProfMesExamens() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [msgSuccess, setMsgSuccess] = useState(false);
  const [corrige, setCorrige] = useState(null); // { idExamen, questions }

  async function charger() {
    try {
      const data = await api.get('/examens/professeur/' + user.matricule);
      setRows(data); setError('');
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { charger(); }, []); // eslint-disable-line

  async function confirmer(id) {
    try {
      await api.patch(`/examens/${id}/confirmer`);
      setMsg('Examen confirmé avec succès.');
      setMsgSuccess(true);
      charger();
    } catch (e) { setMsg(e.message); setMsgSuccess(false); }
  }

  async function voirCorrige(id) {
    try {
      const questions = await api.get(`/examens/${id}/questions-corrigees`);
      setCorrige({ idExamen: id, questions });
    } catch (e) { alert(e.message); }
  }

  return (
    <main>
      <h2>Mes examens</h2>
      {msg && <p className={msgSuccess ? 'success-message' : ''} role={msgSuccess ? 'status' : 'alert'}>{msg}</p>}
      <Status loading={rows === null && !error} error={error} />
      <AutoTable rows={rows} actions={(e) => (
        <>
          {e.statut !== 'confirme' ? <button onClick={() => confirmer(e.id)}>Confirmer</button> : 'Confirmé'}{' '}
          <button onClick={() => voirCorrige(e.id)}>Voir corrigé</button>
        </>
      )} />
      {corrige && (
        <>
          <h3>Corrigé — examen #{corrige.idExamen} <button onClick={() => setCorrige(null)}>Fermer</button></h3>
          {corrige.questions.map((q, i) => (
            <fieldset key={q.id}>
              <legend>Q{i + 1} ({q.bareme} pts) : {q.ennonce}</legend>
              <ul>
                {q.reponses.map((r) => (
                  <li key={r.id}>{r.contenu} {r.estVraie ? '✔ correcte' : ''}</li>
                ))}
              </ul>
            </fieldset>
          ))}
        </>
      )}
    </main>
  );
}

const newRep = () => ({ contenu: '', estVraie: false });
const sqlDate = (v) => v.replace('T', ' ') + ':00'; // datetime-local -> "YYYY-MM-DD HH:mm:ss"

export function ProfNouvelExamen() {
  const { data: niveaux } = useFetch('/niveaux');
  const { data: matieres } = useFetch('/matieres');
  const [ex, setEx] = useState({ idNiveau: '', idMatiere: '', debut: '', fin: '', type: 'normal' });
  const [idExamen, setIdExamen] = useState(null);
  const [q, setQ] = useState({ ennonce: '', bareme: '', reponses: [newRep(), newRep()] });
  const [ajoutees, setAjoutees] = useState([]); // [{ennonce, bareme}]
  const [msg, setMsg] = useState('');
  const [msgSuccess, setMsgSuccess] = useState(false);

  const total = ajoutees.reduce((s, a) => s + Number(a.bareme), 0);
  const matieresNiveau = (matieres || []).filter((m) => String(m.idNiveau) === String(ex.idNiveau));
  const setRep = (i, patch) => setQ({ ...q, reponses: q.reponses.map((r, j) => (j === i ? { ...r, ...patch } : r)) });

  async function creerExamen(e) {
    e.preventDefault();
    try {
      const res = await api.post('/examens', {
        debut: sqlDate(ex.debut), fin: sqlDate(ex.fin),
        idMatiere: Number(ex.idMatiere), idNiveau: Number(ex.idNiveau), type: ex.type
      });
      setIdExamen(res.id); setMsg('Brouillon d’examen créé avec succès.'); setMsgSuccess(true);
    } catch (err) { setMsg(err.message); setMsgSuccess(false); }
  }

  async function ajouterQuestion(e) {
    e.preventDefault();
    try {
      const res = await api.post('/questions', { ennonce: q.ennonce, bareme: Number(q.bareme), idExamen });
      for (const r of q.reponses.filter((r) => r.contenu)) {
        await api.post('/reponses', { contenu: r.contenu, estVraie: r.estVraie, idQuestion: res.id });
      }
      setAjoutees([...ajoutees, { ennonce: q.ennonce, bareme: q.bareme }]);
      setQ({ ennonce: '', bareme: '', reponses: [newRep(), newRep()] });
      setMsg('Question enregistrée avec succès.'); setMsgSuccess(true);
    } catch (err) { setMsg(err.message); setMsgSuccess(false); }
  }

  async function confirmer() {
    try {
      await api.patch(`/examens/${idExamen}/confirmer`);
      setMsg('Examen confirmé avec succès.');
      setMsgSuccess(true);
      setIdExamen(null); setAjoutees([]);
    } catch (err) { setMsg(err.message); setMsgSuccess(false); }
  }

  return (
    <main>
      <h2>Nouvel examen</h2>
      {msg && <p className={msgSuccess ? 'success-message' : ''} role={msgSuccess ? 'status' : 'alert'}>{msg}</p>}
      {!idExamen ? (
        <form onSubmit={creerExamen}>
          <p>
            <select value={ex.idNiveau} onChange={(e) => setEx({ ...ex, idNiveau: e.target.value, idMatiere: '' })} required>
              <option value="">-- Classe --</option>
              {(niveaux || []).map((n) => <option key={n.id} value={n.id}>{n.libelle}</option>)}
            </select>
          </p>
          <p>
            <select value={ex.idMatiere} onChange={(e) => setEx({ ...ex, idMatiere: e.target.value })} required>
              <option value="">-- Matière --</option>
              {matieresNiveau.map((m) => <option key={m.id} value={m.id}>{m.libelle}</option>)}
            </select>
          </p>
          <p>
            <select value={ex.type} onChange={(e) => setEx({ ...ex, type: e.target.value })}>
              <option value="normal">Normal</option>
              <option value="rattrapage">Rattrapage</option>
            </select>
          </p>
          <p><label>Début <input type="datetime-local" value={ex.debut} onChange={(e) => setEx({ ...ex, debut: e.target.value })} required /></label></p>
          <p><label>Fin <input type="datetime-local" value={ex.fin} onChange={(e) => setEx({ ...ex, fin: e.target.value })} required /></label></p>
          <button>Créer l'examen (brouillon)</button>
        </form>
      ) : (
        <>
          <p>Examen #{idExamen} en brouillon. Ajoute les questions :</p>
          <form onSubmit={ajouterQuestion}>
            <p><textarea placeholder="Énoncé" value={q.ennonce} onChange={(e) => setQ({ ...q, ennonce: e.target.value })} required /></p>
            <p><input type="number" step="0.5" min="0" placeholder="Barème" value={q.bareme} onChange={(e) => setQ({ ...q, bareme: e.target.value })} required /></p>
            {q.reponses.map((r, i) => (
              <p key={i}>
                <input placeholder={'Réponse ' + (i + 1)} value={r.contenu} onChange={(e) => setRep(i, { contenu: e.target.value })} />
                <label><input type="checkbox" checked={r.estVraie} onChange={(e) => setRep(i, { estVraie: e.target.checked })} /> Correcte</label>
              </p>
            ))}
            <button type="button" onClick={() => setQ({ ...q, reponses: [...q.reponses, newRep()] })}>+ Réponse</button>{' '}
            <button>Enregistrer la question</button>
          </form>
          <h3>Questions ajoutées ({ajoutees.length}) — total barème : {total} / 20</h3>
          <ol>{ajoutees.map((a, i) => <li key={i}>{a.ennonce} ({a.bareme})</li>)}</ol>
          <button onClick={confirmer} disabled={ajoutees.length === 0}>Confirmer l'examen</button>
        </>
      )}
    </main>
  );
}
