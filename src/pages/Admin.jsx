import { useState } from 'react';
import { api, getSession, saveSession } from '../api.js';
import { useAuth } from '../auth.jsx';
import { AutoTable, ConfirmAction, Status } from '../components.jsx';
import { useFetch } from '../hooks.js';

// type = 'etudiants' | 'professeurs'
export function AdminPersonnes({ type }) {
  const [filtre, setFiltre] = useState('inscrits'); // inscrits | non-inscrits
  const [q, setQ] = useState('');
  const [recherche, setRecherche] = useState('');
  const path = recherche ? `/${type}/rechercher?q=${encodeURIComponent(recherche)}` : `/${type}/${filtre}`;
  const { data, error, loading, reload } = useFetch(path);
  const [edition, setEdition] = useState(null); // { matricule, nom, email }
  const [msg, setMsg] = useState('');
  const [msgSuccess, setMsgSuccess] = useState(false);

  async function act(fn, successMessage) {
    try { await fn(); reload(); setMsg(successMessage); setMsgSuccess(true); }
    catch (e) { setMsg(e.message); setMsgSuccess(false); }
  }

  async function enregistrerModification(e) {
    e?.preventDefault();
    if (!edition.nom.trim() || !edition.email.trim() || !/^\S+@\S+\.\S+$/.test(edition.email.trim())) {
      setMsg('Vérifiez le nom et saisissez une adresse e-mail valide.');
      setMsgSuccess(false);
      return;
    }
    try {
      await api.put(`/${type}/${edition.matricule}`, { nom: edition.nom.trim(), email: edition.email.trim() });
      setEdition(null);
      reload();
      setMsg('Modification enregistrée avec succès.');
      setMsgSuccess(true);
    } catch (err) { setMsg(err.message); setMsgSuccess(false); }
  }

  const keys = Array.isArray(data) && data.length
    ? Object.keys(data[0]).filter((key) => key !== 'motDePasse')
    : [];

  return (
    <main>
      <h2>{type === 'etudiants' ? 'Étudiants' : 'Professeurs'}</h2>
      {msg && <p className={msgSuccess ? 'success-message' : ''} role={msgSuccess ? 'status' : 'alert'}>{msg}</p>}
      <p>
        <button onClick={() => { setRecherche(''); setFiltre('inscrits'); }}>Inscrits</button>{' '}
        <button onClick={() => { setRecherche(''); setFiltre('non-inscrits'); }}>Demandes en attente</button>
      </p>
      <form onSubmit={(e) => { e.preventDefault(); setRecherche(q); }}>
        <input placeholder="Rechercher un nom ..." value={q} onChange={(e) => setQ(e.target.value)} />
        <button>OK</button>
      </form>
      <Status loading={loading} error={error} />
      {Array.isArray(data) && data.length > 0 ? (
        <div className="scroll-x">
          <table>
            <thead><tr>{keys.map((key) => <th key={key}>{key}</th>)}<th className="no-print">Actions</th></tr></thead>
            <tbody>
              {data.map((personne) => {
                const enEdition = edition?.matricule === personne.matricule;
                return (
                  <tr key={personne.matricule}>
                    {keys.map((key) => (
                      <td key={key}>
                        {enEdition && key === 'nom' ? (
                          <input aria-label="Nom" value={edition.nom} onChange={(event) => setEdition({ ...edition, nom: event.target.value })} required />
                        ) : enEdition && key === 'email' ? (
                          <input aria-label="Email" type="email" value={edition.email} onChange={(event) => setEdition({ ...edition, email: event.target.value })} required />
                        ) : String(personne[key] ?? '')}
                      </td>
                    ))}
                    <td className="no-print">
                      {enEdition ? (
                        <>
                          <button onClick={enregistrerModification}>Enregistrer</button>{' '}
                          <button type="button" className="btn-secondary" onClick={() => setEdition(null)}>Annuler</button>
                        </>
                      ) : (
                        <>
                          {personne.inscrit === false && <button onClick={() => act(() => api.patch(`/${type}/${personne.matricule}/valider`), 'Inscription acceptée avec succès.')}>Accepter</button>}{' '}
                          {personne.inscrit === false
                            ? <button onClick={() => window.confirm('Refuser cette inscription ?') && act(() => api.patch(`/${type}/${personne.matricule}/refuser`), 'Inscription refusée avec succès.')}>Refuser</button>
                            : <ConfirmAction message={`Supprimer le compte ${personne.nom || personne.matricule} ?`} onConfirm={() => act(() => api.del(`/${type}/${personne.matricule}`), 'Suppression effectuée avec succès.')} />}{' '}
                          <button type="button" className="btn-secondary" onClick={() => setEdition({ matricule: personne.matricule, nom: personne.nom || '', email: personne.email || '' })}>Modifier</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : !loading && !error ? <p>Liste vide.</p> : null}
    </main>
  );
}

export function AdminClasses() {
  const niveaux = useFetch('/niveaux');
  const matieres = useFetch('/matieres');
  const [libN, setLibN] = useState('');
  const [libM, setLibM] = useState('');
  const [idN, setIdN] = useState('');

  const [msg, setMsg] = useState('');
  const [msgSuccess, setMsgSuccess] = useState(false);
  const run = async (fn, reload, successMessage) => {
    try { await fn(); reload(); setMsg(successMessage); setMsgSuccess(true); }
    catch (e) { setMsg(e.message); setMsgSuccess(false); }
  };

  return (
    <main>
      <h2>Classes</h2>
      {msg && <p className={msgSuccess ? 'success-message' : ''} role={msgSuccess ? 'status' : 'alert'}>{msg}</p>}
      <form onSubmit={(e) => { e.preventDefault(); run(() => api.post('/niveaux', { libelle: libN }), niveaux.reload, 'Classe ajoutée avec succès.'); setLibN(''); }}>
        <input placeholder="Nouvelle classe" value={libN} onChange={(e) => setLibN(e.target.value)} required />
        <button>Ajouter</button>
      </form>
      <Status loading={niveaux.loading} error={niveaux.error} />
      <AutoTable rows={niveaux.data} actions={(n) => (
        <>
          <button onClick={() => {
            const libelle = window.prompt('Nouveau libellé', n.libelle);
            if (libelle) run(() => api.put('/niveaux/' + n.id, { libelle }), niveaux.reload, 'Classe modifiée avec succès.');
          }}>Renommer</button>{' '}
          <ConfirmAction message={`Supprimer la classe « ${n.libelle} » ?`} onConfirm={() => run(() => api.del('/niveaux/' + n.id), niveaux.reload, 'Suppression effectuée avec succès.')} />
        </>
      )} />

      <h2>Matières</h2>
      <form onSubmit={(e) => { e.preventDefault(); run(() => api.post('/matieres', { libelle: libM, idNiveau: idN }), matieres.reload, 'Matière ajoutée avec succès.'); setLibM(''); }}>
        <input placeholder="Nouvelle matière" value={libM} onChange={(e) => setLibM(e.target.value)} required />
        <select value={idN} onChange={(e) => setIdN(e.target.value)} required>
          <option value="">-- Classe --</option>
          {(niveaux.data || []).map((n) => <option key={n.id} value={n.id}>{n.libelle}</option>)}
        </select>
        <button>Ajouter</button>
      </form>
      <Status loading={matieres.loading} error={matieres.error} />
      <AutoTable rows={matieres.data} actions={(m) => (
        <>
          <button onClick={() => {
            const libelle = window.prompt('Nouveau libellé', m.libelle);
            if (libelle) run(() => api.put('/matieres/' + m.id, { libelle }), matieres.reload, 'Matière modifiée avec succès.');
          }}>Renommer</button>{' '}
          <ConfirmAction message={`Supprimer la matière « ${m.libelle} » ?`} onConfirm={() => run(() => api.del('/matieres/' + m.id), matieres.reload, 'Suppression effectuée avec succès.')} />
        </>
      )} />
    </main>
  );
}

export function AdminExamens() {
  const tous = useFetch('/examens');
  const prochain = useFetch('/examens/prochain');
  const [msg, setMsg] = useState('');
  const [msgSuccess, setMsgSuccess] = useState(false);

  async function confirmer(id) {
    try {
      await api.patch(`/examens/${id}/confirmer`);
      setMsg('Examen confirmé avec succès.');
      setMsgSuccess(true);
      tous.reload();
    } catch (e) { setMsg(e.message); setMsgSuccess(false); }
  }

  return (
    <main>
      <h2>Séances d'examens</h2>
      {msg && <p className={msgSuccess ? 'success-message' : ''} role={msgSuccess ? 'status' : 'alert'}>{msg}</p>}
      <h3>Prochain examen</h3>
      <Status loading={prochain.loading} error={prochain.error} />
      <pre>{JSON.stringify(prochain.data, null, 2)}</pre>
      <h3>Tous les examens</h3>
      <Status loading={tous.loading} error={tous.error} />
      <AutoTable rows={tous.data} actions={(e) => (
        e.statut !== 'confirme'
          ? <button onClick={() => confirmer(e.id)}>Confirmer l’examen</button>
          : <span className="status-badge status-confirmed">Examen confirmé</span>
      )} />
    </main>
  );
}

export function AdminNotes() {
  const matieres = useFetch('/matieres');
  const [idM, setIdM] = useState('');
  const notes = useFetch(idM ? `/resultats/matiere/${idM}` : '/resultats');
  const matiereSelectionnee = (matieres.data || []).find((matiere) => String(matiere.id) === idM);
  return (
    <main className="notes-page">
      <h2>Fiches de notes</h2>
      <p className="print-only">Matière : {matiereSelectionnee?.libelle || 'Toutes les matières'}</p>
      <p className="no-print">
        <select value={idM} onChange={(e) => setIdM(e.target.value)}>
          <option value="">-- Toutes les matières --</option>
          {(matieres.data || []).map((m) => <option key={m.id} value={m.id}>{m.libelle}</option>)}
        </select>{' '}
        <button onClick={() => window.print()}>Imprimer / PDF</button>
      </p>
      <Status loading={notes.loading} error={notes.error} />
      <AutoTable rows={notes.data} />
    </main>
  );
}

export function AdminProfil() {
  const { user } = useAuth();
  const [nom, setNom] = useState(user?.nom || '');
  const [motDePasse, setMotDePasse] = useState('');
  const [voirMotDePasse, setVoirMotDePasse] = useState(false);
  const [nouveauNom, setNouveauNom] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [voirNouveauMotDePasse, setVoirNouveauMotDePasse] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgSuccess, setMsgSuccess] = useState(false);

  async function modifierProfil(event) {
    event.preventDefault();
    const donnees = { nom, ...(motDePasse ? { motDePasse } : {}) };
    try {
      const res = await api.put(`/admins/${encodeURIComponent(user.nom)}`, donnees);
      const compte = res?.admin || res?.utilisateur || res?.user || {};
      const session = getSession() || {};
      const utilisateur = { ...user, ...compte, nom, role: 'admin' };
      saveSession({ ...session, user: utilisateur });
      setMotDePasse('');
      setMsg('Profil administrateur modifié avec succès.');
      setMsgSuccess(true);
    } catch (error) { setMsg(error.message); setMsgSuccess(false); }
  }

  async function creerAdministrateur(event) {
    event.preventDefault();
    try {
      await api.post('/admins', { nom: nouveauNom, motDePasse: nouveauMotDePasse });
      setNouveauNom('');
      setNouveauMotDePasse('');
      setMsg('Compte administrateur créé avec succès.');
      setMsgSuccess(true);
    } catch (error) { setMsg(error.message); setMsgSuccess(false); }
  }

  return (
    <main>
      <h2>Profil administrateur</h2>
      {msg && <p className={msgSuccess ? 'success-message' : ''} role={msgSuccess ? 'status' : 'alert'}>{msg}</p>}
      <form className="admin-profile-form" onSubmit={modifierProfil}>
        <label>Nom d’utilisateur
          <input value={nom} onChange={(event) => setNom(event.target.value)} required />
        </label>
        <label>Nouveau mot de passe
          <span className="admin-password-field">
            <input type={voirMotDePasse ? 'text' : 'password'} value={motDePasse} onChange={(event) => setMotDePasse(event.target.value)} autoComplete="new-password" placeholder="Laisser vide pour ne pas le modifier" />
            <button type="button" className="admin-password-toggle" aria-label={voirMotDePasse ? 'Masquer le nouveau mot de passe' : 'Afficher le nouveau mot de passe'} onClick={() => setVoirMotDePasse(!voirMotDePasse)}>
              {voirMotDePasse ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a14.8 14.8 0 0 1-3.1 3.9M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7a10 10 0 0 0 3.1-.5" />
                </svg>
              )}
            </button>
          </span>
        </label>
        <button>Enregistrer les modifications</button>
      </form>

      <h3>Créer un compte administrateur</h3>
      <form className="admin-profile-form" onSubmit={creerAdministrateur}>
        <label>Nom d’utilisateur
          <input value={nouveauNom} onChange={(event) => setNouveauNom(event.target.value)} required />
        </label>
        <label>Mot de passe
          <span className="admin-password-field">
            <input type={voirNouveauMotDePasse ? 'text' : 'password'} value={nouveauMotDePasse} onChange={(event) => setNouveauMotDePasse(event.target.value)} autoComplete="new-password" required />
            <button type="button" className="admin-password-toggle" aria-label={voirNouveauMotDePasse ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onClick={() => setVoirNouveauMotDePasse(!voirNouveauMotDePasse)}>
              {voirNouveauMotDePasse ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a14.8 14.8 0 0 1-3.1 3.9M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7a10 10 0 0 0 3.1-.5" />
                </svg>
              )}
            </button>
          </span>
        </label>
        <button>Créer le compte</button>
      </form>
    </main>
  );
}

function formaterDonneesDemande(donnees) {
  let valeur = donnees;
  if (typeof valeur === 'string') {
    try { valeur = JSON.parse(valeur); } catch { return valeur || 'Aucune précision'; }
  }
  if (valeur === null || valeur === undefined) return 'Aucune précision fournie';
  if (typeof valeur !== 'object') return String(valeur);

  const labels = { email: 'Nouvel e-mail', nom: 'Nom', telephone: 'Téléphone', motif: 'Motif', message: 'Message', matricule: 'Matricule', idNiveau: 'Classe' };
  const details = Object.entries(valeur).map(([cle, contenu]) => {
    const libelle = labels[cle] || cle.replace(/([A-Z])/g, ' $1').replace(/^./, (lettre) => lettre.toUpperCase());
    const texte = contenu && typeof contenu === 'object' ? JSON.stringify(contenu) : String(contenu);
    return `${libelle} : ${texte}`;
  });
  return details.length ? details.join(' · ') : 'Aucune précision fournie';
}

function formaterDemande(demande) {
  const roles = { etudiant: 'Étudiant', professeur: 'Professeur' };
  const types = { modification: 'Modification', suppression: 'Suppression' };
  const statuts = { en_attente: 'En attente', acceptee: 'Acceptée', refusee: 'Refusée' };
  const date = demande.date ? new Date(demande.date) : null;
  return {
    ID: demande.id,
    Rôle: roles[demande.role] || demande.role || '—',
    Demandeur: demande.demandeur ?? '—',
    'Type de demande': types[demande.type] || demande.type || '—',
    Détails: formaterDonneesDemande(demande.donnees),
    Statut: statuts[demande.statut] || demande.statut || '—',
    Date: date && !Number.isNaN(date.getTime()) ? date.toLocaleString('fr-FR') : demande.date || '—'
  };
}

export function AdminDemandes() {
  const { data, error, loading, reload } = useFetch('/demandes');
  const [msg, setMsg] = useState('');
  const [msgSuccess, setMsgSuccess] = useState(false);

  async function traiter(id, action) {
    try {
      await api.patch(`/demandes/${id}/${action}`);
      reload();
      setMsg(action === 'accepter' ? 'Demande acceptée avec succès.' : 'Demande refusée avec succès.');
      setMsgSuccess(true);
    } catch (e) { setMsg(e.message); setMsgSuccess(false); }
  }

  async function supprimer(id) {
    try {
      await api.del(`/demandes/${id}`);
      reload();
      setMsg('Demande supprimée avec succès.');
      setMsgSuccess(true);
    } catch (e) { setMsg(e.message); setMsgSuccess(false); }
  }

  const enAttente = Array.isArray(data) ? data.filter((d) => d.statut === 'en_attente') : [];
  const traitees = Array.isArray(data) ? data.filter((d) => d.statut !== 'en_attente') : [];

  return (
    <main>
      <h2>Demandes des étudiants et professeurs</h2>
      {msg && <p className={msgSuccess ? 'success-message' : ''} role={msgSuccess ? 'status' : 'alert'}>{msg}</p>}
      <Status loading={loading} error={error} />
      <h3>En attente</h3>
      <AutoTable rows={enAttente.map(formaterDemande)} actions={(d) => (
        <>
          <button onClick={() => traiter(d.ID, 'accepter')}>Accepter</button>{' '}
          <button onClick={() => traiter(d.ID, 'refuser')}>Refuser</button>{' '}
          <ConfirmAction message={`Supprimer la demande n°${d.ID} ?`} onConfirm={() => supprimer(d.ID)} />
        </>
      )} />
      <h3>Traitées</h3>
      <AutoTable rows={traitees.map(formaterDemande)} actions={(d) => (
        <ConfirmAction message={`Supprimer la demande n°${d.ID} ?`} onConfirm={() => supprimer(d.ID)} />
      )} />
    </main>
  );
}
