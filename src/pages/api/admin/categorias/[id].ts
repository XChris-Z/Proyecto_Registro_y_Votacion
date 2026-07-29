import type { APIRoute } from 'astro';
import { actualizarCategoria, eliminarCategoria, registrarLog, obtenerCategorias } from '@lib/db';

export const POST: APIRoute = async ({ request, params, redirect, url, cookies }) => {
  if (!cookies.get('admin_session')?.value) return redirect('/admin');

  const id = Number(params.id);
  const method = url.searchParams.get('_method');
  const formData = await request.formData();

  const adminNombre = cookies.get('admin_nombre')?.value || 'Admin Desconocido';

  if (method === 'DELETE') {
    await eliminarCategoria(id);
    await registrarLog(adminNombre, 'Eliminación de Categoría', `Se eliminó la categoría con ID: ${id}.`);
    return redirect('/admin/categorias?msg=deleted');
  }

  // PUT
  const nombre = (formData.get('nombre') as string || '').trim();
  const descripcion = (formData.get('descripcion') as string || '').trim();
  const orden = Number(formData.get('orden') || 0);
  const activa = formData.get('activa') !== '0';

  if (!nombre) return redirect('/admin/categorias?msg=error');

  await actualizarCategoria(id, { nombre, descripcion, orden, activa });
  await registrarLog(adminNombre, 'Actualización de Categoría', `Se actualizó la categoría "${nombre}" (ID: ${id}).`);
  
  return redirect('/admin/categorias?msg=updated');
};
