import type { APIRoute } from 'astro';
import { supabase, obtenerPerfil, emitirVotosJurado } from '@lib/db';
import type { VotoJurado } from '@lib/db';

export const POST: APIRoute = async ({ request, cookies }) => {
  const accessToken = cookies.get('sb-access-token')?.value;

  if (!accessToken) {
    return new Response(JSON.stringify({ success: false, error: 'No autenticado' }), { status: 401 });
  }

  // Verificar token
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  
  if (authError || !user) {
    return new Response(JSON.stringify({ success: false, error: 'Sesión inválida' }), { status: 401 });
  }

  // Verificar rol
  const perfil = await obtenerPerfil(user.id);
  if (!perfil || perfil.rol !== 'jurado') {
    return new Response(JSON.stringify({ success: false, error: 'No tienes permisos de jurado' }), { status: 403 });
  }

  try {
    const data = await request.json();
    const proyecto_id = parseInt(data.proyecto_id);
    
    if (isNaN(proyecto_id)) {
      return new Response(JSON.stringify({ success: false, error: 'ID de proyecto inválido' }), { status: 400 });
    }

    const votos: VotoJurado[] = [];

    // Extraer calificaciones del body (formato: "criterio_ID": "valor")
    for (const key in data) {
      if (key.startsWith('criterio_')) {
        const criterio_id = parseInt(key.replace('criterio_', ''));
        const calificacion = parseFloat(data[key]);

        if (!isNaN(criterio_id) && !isNaN(calificacion)) {
          if (calificacion < 1 || calificacion > 10) {
            return new Response(JSON.stringify({ success: false, error: 'Las calificaciones deben estar entre 1 y 10' }), { status: 400 });
          }
          
          votos.push({
            jurado_id: user.id,
            proyecto_id,
            criterio_id,
            calificacion
          });
        }
      }
    }

    if (votos.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No se enviaron calificaciones válidas' }), { status: 400 });
    }

    const result = await emitirVotosJurado(votos);

    if (!result.success) {
      return new Response(JSON.stringify({ success: false, error: result.error }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Error interno del servidor' }), { status: 500 });
  }
};
