export type Selfie = {
  id: string;
  dataUrl: string;
  createdAt: number;
};

const API_URL = 'http://localhost:3001/api';

export async function listSelfies(): Promise<Selfie[]> {
  try {
    const response = await fetch(`${API_URL}/selfies`);
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

export async function addSelfie(dataUrl: string): Promise<Selfie> {
  const response = await fetch(`${API_URL}/selfies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_data: dataUrl })
  });
  
  if (!response.ok) throw new Error('Failed to save selfie');
  const data = await response.json();
  
  const selfie: Selfie = {
    id: data.id,
    dataUrl: data.image_data,
    createdAt: new Date(data.created_at).getTime()
  };

  try {
    sessionStorage.setItem("bob_last_selfie", selfie.id);
    sessionStorage.setItem(`bob_selfie_${selfie.id}`, selfie.dataUrl);
  } catch {
    /* ignore */
  }
  return selfie;
}

export async function getSelfie(id: string): Promise<Selfie | undefined> {
  try {
    const cached = sessionStorage.getItem(`bob_selfie_${id}`);
    if (cached) return { id, dataUrl: cached, createdAt: Date.now() };
  } catch {
    /* ignore */
  }
  // Not implemented in API yet, but usually we just list them or use cache
  return undefined;
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
          createdAt: new Date(data.created_at).getTime()
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

  return () => {
    eventSource.close();
  };
}

export async function deleteAllSelfies(): Promise<void> {
  const response = await fetch(`${API_URL}/selfies`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    throw new Error('Failed to delete selfies');
  }
}