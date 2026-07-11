import type { APIRoute } from 'astro';
import { supabase, cleanSupabaseUrl } from '@lib/db';

export const GET: APIRoute = async () => {
  const rawUrl =
    (import.meta.env.PUBLIC_SUPABASE_URL as string) ||
    (process.env.PUBLIC_SUPABASE_URL as string) || '';

  const rawKey =
    (import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string) ||
    (process.env.SUPABASE_SERVICE_ROLE_KEY as string) || '';

  const urlLimpia = cleanSupabaseUrl(rawUrl);

  let consultaRes: any = null;
  try {
    const { data, error } = await supabase
      .from('administradores')
      .select('id, usuario')
      .limit(1);

    consultaRes = {
      éxito: !error,
      error: error ? { message: error.message, code: error.code } : null,
      adminEncontrado: data && data.length > 0 ? data[0].usuario : null,
    };
  } catch (err: any) {
    consultaRes = { errorExcepcion: err.message };
  }

  return new Response(JSON.stringify({
    status: consultaRes.éxito ? 'OK' : 'ERROR',
    urlOriginal: rawUrl,
    urlLimpia: urlLimpia,
    resultadoBD: consultaRes,
  }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
