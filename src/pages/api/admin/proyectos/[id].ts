import type { APIRoute } from 'astro';
import { actualizarProyecto, eliminarProyecto, registrarLog } from '@lib/db';

export const POST: APIRoute = async ({ request, params, redirect, url, cookies }) => {
  if (!cookies.get('admin_session')?.value) return redirect('/admin');

  const id = Number(params.id);
  const method = url.searchParams.get('_method');
  const formData = await request.formData();

  const adminNombre = cookies.get('admin_nombre')?.value || 'Admin Desconocido';

  if (method === 'DELETE') {
    await eliminarProyecto(id);
    await registrarLog(adminNombre, 'Eliminación de Proyecto', `Se eliminó el proyecto con ID: ${id}.`);
    return redirect('/admin/proyectos?msg=deleted');
  }

  // PUT / update
  const nombre = (formData.get('nombre') as string || '').trim();
  const descripcion = (formData.get('descripcion') as string || '').trim();
  const autores = (formData.get('autores') as string || '').trim();
  const categoria_id = Number(formData.get('categoria_id'));

  if (!nombre || !categoria_id) return redirect('/admin/proyectos?msg=error');

  await actualizarProyecto(id, { nombre, descripcion, autores, categoria_id });
  await registrarLog(adminNombre, 'Actualización de Proyecto', `Se actualizó el proyecto "${nombre}" (ID: ${id}).`);
  return redirect('/admin/proyectos?msg=updated');
};
