import type { APIRoute } from 'astro';
import { obtenerEstadisticasEnVivo } from '@lib/db';

export const GET: APIRoute = async () => {
  try {
    const stats = await obtenerEstadisticasEnVivo();
    return new Response(JSON.stringify({
      success: true,
      asistentes: stats.asistentes,
      votos: stats.votos,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
      asistentes: 0,
      votos: 0,
      error: err.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
