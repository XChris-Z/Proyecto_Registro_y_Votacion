import type { APIRoute } from 'astro';
import { obtenerLogs } from '@lib/db';

export const GET: APIRoute = async ({ cookies }) => {
  const session = cookies.get('admin_session')?.value;
  if (!session) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const logs = await obtenerLogs(100);
  
  return new Response(JSON.stringify(logs), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
