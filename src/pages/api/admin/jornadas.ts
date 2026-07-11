import type { APIRoute } from 'astro';
import {
  crearJornadaHistorial,
  actualizarJornadaHistorial,
  eliminarJornadaHistorial
} from '@lib/db';

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();
  const accion = formData.get('accion') as string;

  if (accion === 'crear') {
    const nombre = (formData.get('nombre') as string || 'Jornada de Votación').trim();
    const notas = (formData.get('notas') as string || '').trim();
    const res = await crearJornadaHistorial(nombre, notas);

    if (!res.success) {
      return redirect(`/admin/historial?error=${encodeURIComponent(res.error || 'Error al archivar jornada')}`);
    }
    return redirect('/admin/historial?exito=creado');
  }

  if (accion === 'editar') {
    const id = parseInt(formData.get('id') as string, 10);
    const nombre = (formData.get('nombre') as string || '').trim();
    const notas = (formData.get('notas') as string || '').trim();
    await actualizarJornadaHistorial(id, { nombre, notas });
    return redirect('/admin/historial?exito=editado');
  }

  if (accion === 'eliminar') {
    const id = parseInt(formData.get('id') as string, 10);
    await eliminarJornadaHistorial(id);
    return redirect('/admin/historial?exito=eliminado');
  }

  return redirect('/admin/historial');
};
