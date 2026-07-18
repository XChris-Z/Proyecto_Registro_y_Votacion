import type { APIRoute } from 'astro';
import { buscarAsistente, obtenerJornadaActual } from '@lib/db';

export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  const jornada = await obtenerJornadaActual();
  if (jornada.estado === 'CERRADA') {
    return redirect('/votacion?error=closed');
  }

  const formData = await request.formData();
  const documento = (formData.get('documento') as string || '').trim();
  const correo = (formData.get('correo') as string || '').trim();
  const identificador = documento || correo || (formData.get('identificador') as string || '').trim();

  if (!identificador) {
    return redirect('/votacion?error=empty');
  }

  const asistente = await buscarAsistente(identificador);

  if (!asistente) {
    return redirect('/votacion?error=notfound');
  }

  // Limpiar y capitalizar adecuadamente el nombre antes de guardarlo
  let nombreLimpio = asistente.nombre.trim();
  if (nombreLimpio.toLowerCase().startsWith('has ') || nombreLimpio.toLowerCase() === 'has') {
    nombreLimpio = 'Participante';
  }

  // Guardar en cookie de sesión (temporal, dura la sesión del navegador)
  cookies.set('votacion_session', String(asistente.id), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  });
  cookies.set('votacion_nombre', nombreLimpio, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
  });

  return redirect('/votacion/votar');
};
