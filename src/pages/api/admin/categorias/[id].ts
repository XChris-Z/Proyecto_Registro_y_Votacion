import type { APIRoute } from 'astro';
import { actualizarCategoria, eliminarCategoria } from '@lib/db';

export const POST: APIRoute = async ({ request, params, redirect, url, cookies }) => {
  if (!cookies.get('admin_session')?.value) return redirect('/admin');

  const id = Number(params.id);
  const method = url.searchParams.get('_method');
  const formData = await request.formData();

  if (method === 'DELETE') {
    await eliminarCategoria(id);
    return redirect('/admin/categorias?msg=deleted');
  }

  // PUT
  const nombre = (formData.get('nombre') as string || '').trim();
  const descripcion = (formData.get('descripcion') as string || '').trim();
  const orden = Number(formData.get('orden') || 0);
  const activa = formData.get('activa') !== '0';

  if (!nombre) return redirect('/admin/categorias?msg=error');

  await actualizarCategoria(id, { nombre, descripcion, orden, activa });
  return redirect('/admin/categorias?msg=updated');
};
