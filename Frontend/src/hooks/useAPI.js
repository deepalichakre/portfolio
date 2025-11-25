export async function apiFetch(path, { method='GET', body } = {}) {
  // Point to our same-origin proxy
  const base = '/admin/api';                 // important change
  const headers = { 'Content-Type': 'application/json' };

  const res = await fetch(`${base}${path.startsWith('/') ? '' : '/'}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
}
