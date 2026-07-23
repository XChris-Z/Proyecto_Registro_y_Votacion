import type { APIRoute } from 'astro';
import { emitirVoto, obtenerVotosDeAsistente } from '@lib/db';

export const POST: APIRoute = async ({ request, cookies }) => {
  const asistente_id = Number(cookies.get('votacion_session')?.value);

  if (!asistente_id) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const proyecto_id = Number(body.proyecto_id);
  const categoria_id = Number(body.categoria_id);

  if (!proyecto_id || !categoria_id) {
    return new Response(JSON.stringify({ error: 'Datos inválidos' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verificar que no haya votado ya en esta categoría
  const votosExistentes = await obtenerVotosDeAsistente(asistente_id);
  const yaVoto = votosExistentes.some(v => v.categoria_id === categoria_id);

  if (yaVoto) {
    return new Response(JSON.stringify({ error: 'Ya votaste en esta categoría' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verificar que el proyecto pertenece a la categoría
  const proyecto = await import('@lib/db').then(db => db.obtenerProyectoPorId(proyecto_id));
  
  if (!proyecto || proyecto.categoria_id !== categoria_id) {
    return new Response(JSON.stringify({ error: 'El proyecto no pertenece a la categoría seleccionada o no existe' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const result = await emitirVoto({ asistente_id, proyecto_id, categoria_id });

  if (!result.success) {
    return new Response(JSON.stringify({ error: result.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Obtener votos actualizados para devolver el estado
  const votosActualizados = await obtenerVotosDeAsistente(asistente_id);
  const categoriasVotadas = votosActualizados.map(v => v.categoria_id);

  return new Response(
    JSON.stringify({ success: true, categoriasVotadas }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
