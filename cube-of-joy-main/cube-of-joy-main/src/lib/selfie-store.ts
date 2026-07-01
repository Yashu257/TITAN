export type Selfie = {
  id: string;
  dataUrl: string;
  createdAt: number;
  userId?: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
};

const API_URL = '/api';

// ─── User helpers ─────────────────────────────────────────────────────────────

export async function loginUser(name: string, email: string): Promise<User> {
  const res = await fetch(`${API_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email })
  });
  if (!res.ok) throw new Error('Failed to login');
  const data = await res.json();
  const user: User = { id: data.id, name: data.name, email: data.email };
  try { localStorage.setItem('bob_user', JSON.stringify(user)); } catch { /* ignore */ }
  return user;
}

export function getLocalUser(): User | null {
  try {
    const raw = localStorage.getItem('bob_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function logoutUser() {
  try { localStorage.removeItem('bob_user'); } catch { /* ignore */ }
}

// ─── Selfie helpers ───────────────────────────────────────────────────────────

export async function listSelfies(type?: 'selfie' | 'upload' | 'all', user_id?: string, latestPerUser = false): Promise<Selfie[]> {
  try {
    const params = new URLSearchParams();
    if (type && type !== 'all') params.set('type', type);
    if (user_id) params.set('user_id', user_id);
    if (latestPerUser) params.set('latest_per_user', '1');
    const query = params.toString() ? `?${params}` : '';
    const response = await fetch(`${API_URL}/selfies${query}`);
    if (!response.ok) throw new Error('Failed to fetch selfies');
    const data = await response.json();
    return data.map((r: any) => ({
      id: r.id,
      dataUrl: r.image_data,
      createdAt: new Date(r.created_at).getTime()
    }));
  } catch (error) {
    console.error("listSelfies:", error);
    return [];
  }
}

export async function addSelfie(dataUrl: string, type: 'selfie' | 'upload' = 'selfie'): Promise<Selfie> {
  const user = getLocalUser();
  const response = await fetch(`${API_URL}/selfies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_data: dataUrl, type, user_id: user?.id ?? null })
  });

  if (!response.ok) throw new Error('Failed to save selfie');
  const data = await response.json();

  const selfie: Selfie = {
    id: data.id,
    dataUrl: data.image_data,
    createdAt: new Date(data.created_at).getTime()
  };

  try { localStorage.setItem(`bob_selfie_${selfie.id}`, selfie.dataUrl); } catch { /* ignore */ }
  return selfie;
}

export async function getSelfie(id: string): Promise<Selfie | undefined> {
  try {
    const cached = localStorage.getItem(`bob_selfie_${id}`);
    if (cached) return { id, dataUrl: cached, createdAt: Date.now() };
  } catch { /* ignore */ }
  try {
    const res = await fetch(`${API_URL}/selfies/${id}`);
    if (!res.ok) return undefined;
    const data = await res.json();
    return { id: data.id, dataUrl: data.image_data, createdAt: new Date(data.created_at).getTime() };
  } catch { return undefined; }
}

export function subscribeRealtime(onInsert: (selfie: Selfie) => void, onDeleteAll?: () => void): () => void {
  const eventSource = new EventSource(`${API_URL}/events`);

  eventSource.addEventListener('INSERT', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (data.id) {
        onInsert({
          id: data.id,
          dataUrl: data.image_data,
          createdAt: new Date(data.created_at).getTime(),
          userId: data.user_id ?? undefined,
        });
      }
    } catch (err) {
      console.error('Error parsing SSE INSERT event', err);
    }
  });

  eventSource.addEventListener('DELETE_ALL', () => {
    if (onDeleteAll) onDeleteAll();
  });

  eventSource.onerror = (error) => {
    console.error('SSE Error:', error);
    eventSource.close();
  };

  return () => { eventSource.close(); };
}

export async function deleteAllSelfies(): Promise<void> {
  const response = await fetch(`${API_URL}/selfies`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete selfies');
}
