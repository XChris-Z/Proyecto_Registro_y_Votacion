import type { APIRoute } from 'astro';
import {
  crearJornadaHistorial,
  actualizarJornadaHistorial,
  eliminarJornadaHistorial,
  reiniciarJornada,
  guardarJornadaActual
} from '@lib/db';

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const accion = formData.get('accion') as string;

  // 1. Modificar Jornada Actual Activa
  if (accion === 'modificar_actual') {
    const nombre = (formData.get('nombre') as string || '').trim();
    const notas = (formData.get('notas') as string || '').trim();
    const res = await guardarJornadaActual(nombre, notas);
    if (!res.success) {
      return redirect(`/admin/historial?error=${encodeURIComponent(res.error || 'Error al actualizar jornada actual')}`);
    }
    return redirect('/admin/historial?exito=actual_modificada');
  }

  // 2. Solo Archivar
  if (accion === 'crear') {
    const nombre = (formData.get('nombre') as string || 'Jornada de Votación').trim();
    const notas = (formData.get('notas') as string || '').trim();
    const res = await crearJornadaHistorial(nombre, notas);

    if (!res.success) {
      return redirect(`/admin/historial?error=${encodeURIComponent(res.error || 'Error al archivar jornada')}`);
    }
    return redirect('/admin/historial?exito=creado');
  }

  // 3. Archivar Jornada Actual e Iniciar NUEVA Jornada Limpia
  if (accion === 'crear_y_reiniciar') {
    const nombreActual = (formData.get('nombre_actual') as string || 'Jornada Anterior').trim();
    const notasActual = (formData.get('notas_actual') as string || '').trim();
    
    const nombreNuevo = (formData.get('nombre_nuevo') as string || 'Nueva Jornada de Votación').trim();
    const notasNuevo = (formData.get('notas_nuevo') as string || '').trim();
    const reiniciarAsistentes = formData.get('reiniciar_asistentes') === 'si';

    // 3a. Archivar en historial la jornada que se cierra
    const res = await crearJornadaHistorial(nombreActual, notasActual);
    if (!res.success) {
      return redirect(`/admin/historial?error=${encodeURIComponent(res.error || 'Error al archivar jornada')}`);
    }

    // 3b. Limpiar contadores
    const resetRes = await reiniciarJornada(reiniciarAsistentes);
    if (!resetRes.success) {
      return redirect(`/admin/historial?error=${encodeURIComponent(resetRes.error || 'Jornada archivada, pero error al limpiar conteos')}`);
    }

    // 3c. Configurar la NUEVA jornada en curso
    await guardarJornadaActual(nombreNuevo, notasNuevo);

    return redirect('/admin/historial?exito=nueva_jornada');
  }

  // 4. Editar Registro Histórico
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

  // 5. Eliminar Registro Histórico
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
