const KEY = 'session';
const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

export function getSession() {
  try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; }
}
export function saveSession(s) {
  try { s ? sessionStorage.setItem(KEY, JSON.stringify(s)) : sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}

async function call(path, method = 'GET', body) {
  const token = (getSession() || {}).token;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;

  let res;
  try {
    res = await fetch(API_BASE_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new Error('Impossible de contacter le serveur. Veuillez vérifier votre connexion et réessayer.');
  }
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401 && token) { saveSession(null); window.location.href = '/'; }
    const base = path.startsWith('/auth/') && [401, 403].includes(res.status)
      ? 'Identifiant ou mot de passe incorrect.'
      : res.status >= 500
        ? 'Une erreur est survenue de notre côté. Veuillez réessayer plus tard.'
        : (data && (data.erreur || data.message)) || (data ? JSON.stringify(data) : 'Erreur ' + res.status);
    const err = new Error(base + (data && data.detail ? ' — ' + data.detail : ''));
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => call(p),
  post: (p, b) => call(p, 'POST', b),
  put: (p, b) => call(p, 'PUT', b),
  patch: (p, b) => call(p, 'PATCH', b),
  del: (p) => call(p, 'DELETE')
};
