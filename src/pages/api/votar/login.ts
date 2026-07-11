import type { APIRoute } from 'astro';
import { buscarAsistente } from '../../../lib/db';

export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  const formData = await request.formData();
  const identificador = (formData.get('identificador') as string || '').trim();

  if (!identificador) {
    return redirect('/votacion?error=empty');
  }

  const asistente = buscarAsistente(identificador);

  if (!asistente) {
    return redirect('/votacion?error=notfound');
  }

  // Guardar en cookie de sesión (temporal, dura la sesión del navegador)
  cookies.set('votacion_session', String(asistente.id), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
  });
  cookies.set('votacion_nombre', asistente.nombre, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
  });

  return redirect('/votacion/votar');
};
