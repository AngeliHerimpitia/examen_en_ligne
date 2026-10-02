import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

// Charge une route GET. path = null pour ne rien charger.
export function useFetch(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!!path);

  const reload = useCallback(() => {
    if (!path) return;
    setLoading(true);
    api.get(path)
      .then((d) => { setData(d); setError(''); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(reload, [reload]);
  return { data, error, loading, reload };
}
