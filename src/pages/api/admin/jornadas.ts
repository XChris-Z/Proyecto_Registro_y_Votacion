import type { APIRoute } from 'astro';
import {
  crearJornadaHistorial,
  actualizarJornadaHistorial,
  eliminarJornadaHistorial,
  reiniciarJornada,
  guardarJornadaActual,
  obtenerJornadaActual,
  actualizarEstadoJornadaActual
} from '@lib/db';

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const accion = formData.get('accion') as string;

  // 1. Modificar Jornada Actual Activa (Nombre y Descripción)
  if (accion === 'modificar_actual') {
    const nombre = (formData.get('nombre') as string || '').trim();
    const notas = (formData.get('notas') as string || '').trim();
    const actual = await obtenerJornadaActual();
    const res = await guardarJornadaActual(nombre, notas, actual.estado || 'ACTIVA');
    if (!res.success) {
      return redirect(`/admin/historial?error=${encodeURIComponent(res.error || 'Error al actualizar jornada actual')}`);
    }
    return redirect('/admin/historial?exito=actual_modificada');
  }

  // 2. Cerrar Jornada y Archivar en el Historial (Inhabilita Registro y Votación)
  if (accion === 'cerrar_y_archivar') {
    const actual = await obtenerJornadaActual();
    const res = await crearJornadaHistorial(actual.nombre, actual.descripcion);
    if (!res.success) {
      return redirect(`/admin/historial?error=${encodeURIComponent(res.error || 'Error al archivar jornada')}`);
    }

    // Cambiar estado a CERRADA
    await actualizarEstadoJornadaActual('CERRADA');

    return redirect('/admin/historial?exito=jornada_cerrada');
  }

  // 3. Iniciar NUEVA Jornada Limpia (Habilita de nuevo y limpia contadores)
  if (accion === 'iniciar_nueva_jornada') {
    const nombreNuevo = (formData.get('nombre_nuevo') as string || 'Nueva Jornada de Votación').trim();
    const notasNuevo = (formData.get('notas_nuevo') as string || '').trim();
    const reiniciarAsistentes = formData.get('reiniciar_asistentes') === 'si';

    // 3a. Limpiar contadores
    const resetRes = await reiniciarJornada(reiniciarAsistentes);
    if (!resetRes.success) {
      return redirect(`/admin/historial?error=${encodeURIComponent(resetRes.error || 'Error al limpiar conteos para nueva jornada')}`);
    }

    // 3b. Configurar la NUEVA jornada y activar
    await guardarJornadaActual(nombreNuevo, notasNuevo, 'ACTIVA');

    return redirect('/admin/historial?exito=nueva_jornada');
  }

  // 4. Reabrir Jornada actual si se cerró por error
  if (accion === 'reabrir_jornada') {
    await actualizarEstadoJornadaActual('ACTIVA');
    return redirect('/admin/historial?exito=jornada_reabierta');
  }

  // 5. Editar Registro Histórico
  if (accion === 'editar') {
    const id = parseInt(formData.get('id') as string, 10);
    const nombre = (formData.get('nombre') as string || '').trim();
    const notas = (formData.get('notas') as string || '').trim();
    const res = await actualizarJornadaHistorial(id, { nombre, notas });
    if (!res.success) {
      return redirect(`/admin/historial?error=${encodeURIComponent(res.error || 'Error al editar histórico')}`);
    }
    return redirect('/admin/historial?exito=editado');
  }

  // 6. Eliminar Registro Histórico
  if (accion === 'eliminar') {
    const id = parseInt(formData.get('id') as string, 10);
    const res = await eliminarJornadaHistorial(id);
    if (!res.success) {
      return redirect(`/admin/historial?error=${encodeURIComponent(res.error || 'Error al eliminar histórico')}`);
    }
    return redirect('/admin/historial?exito=eliminado');
  }

  return redirect('/admin/historial');
};
