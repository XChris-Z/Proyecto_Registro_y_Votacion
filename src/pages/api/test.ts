import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const supabaseUrl =
    (import.meta.env.PUBLIC_SUPABASE_URL as string) ||
    (process.env.PUBLIC_SUPABASE_URL as string) || '';

  const supabaseKey =
    (import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string) ||
    (process.env.SUPABASE_SERVICE_ROLE_KEY as string) || '';

  // Diagnóstico de las variables
  const urlInfo = {
    tieneUrl: !!supabaseUrl,
    urlInicio: supabaseUrl ? supabaseUrl.substring(0, 40) + '...' : 'VACÍO',
    tieneBarraFinal: supabaseUrl.endsWith('/'),
    formatoCorrecto: supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co'),
    tieneKey: !!supabaseKey,
    keyInicio: supabaseKey ? supabaseKey.substring(0, 20) + '...' : 'VACÍO',
    keyLongitud: supabaseKey.length,
  };

  // Si la URL tiene barra final, arreglarla
  const urlLimpia = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;

  // Probar la conexión directamente con fetch
  let testResult: any = null;
  try {
    const res = await fetch(`${urlLimpia}/rest/v1/administradores?select=id,usuario&limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    const body = await res.text();
    testResult = {
      httpStatus: res.status,
      respuesta: body.substring(0, 300),
    };
  } catch (err: any) {
    testResult = { fetchError: err.message };
  }

  return new Response(JSON.stringify({
    diagnostico: urlInfo,
    testDirecto: testResult,
    urlUsada: `${urlLimpia}/rest/v1/administradores`,
  }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
