import type { APIRoute } from 'astro';
import { supabase } from '@lib/db';

export const GET: APIRoute = async () => {
  try {
    const { data, error } = await supabase
      .from('administradores')
      .select('id, usuario')
      .limit(1);

    if (error) {
      return new Response(JSON.stringify({
        status: 'ERROR',
        mensaje: 'Supabase conectado pero query falló',
        error: error.message,
        code: error.code,
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      status: 'OK',
      mensaje: 'Supabase conectado correctamente ✅',
      adminEncontrado: data?.length > 0,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({
      status: 'ERROR',
      mensaje: 'Error al conectar con Supabase',
      error: err.message,
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};
