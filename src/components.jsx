import { useState } from 'react';

// Tableau automatique : colonnes = clés du premier objet (pratique pour tester l'API)
export function AutoTable({ rows, actions }) {
  if (!Array.isArray(rows)) return <p>Aucune donnée.</p>;
  if (rows.length === 0) return <p>Liste vide.</p>;
  const keys = Object.keys(rows[0]).filter((k) => k !== 'motDePasse');
  return (
    <div className="scroll-x">
      <table>
        <thead>
          <tr>
            {keys.map((k) => <th key={k}>{k}</th>)}
            {actions && <th className="no-print">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {keys.map((k) => <td key={k}>{String(r[k])}</td>)}
              {actions && <td className="no-print">{actions(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ConfirmAction({ children = 'Supprimer', message, onConfirm, title = 'Confirmer la suppression', confirmLabel = 'Supprimer', className = 'btn-danger' }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>{children}</button>
      {open && (
        <div className="dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
            <h2 id="confirm-title">{title}</h2>
            <p>{message}</p>
            <div className="dialog-actions">
              <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Annuler</button>
              <button type="button" className="btn-danger" onClick={() => { setOpen(false); onConfirm(); }}>{confirmLabel}</button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export function Status({ loading, error }) {
  if (loading) return <p>Chargement...</p>;
  if (error) return <p role="alert">Erreur : {error}</p>;
  return null;
}
