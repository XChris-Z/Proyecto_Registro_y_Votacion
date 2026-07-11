import type { APIRoute } from 'astro';
import { crearCategoria } from '@lib/db';

export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  if (!cookies.get('admin_session')?.value) return redirect('/admin');

  const formData = await request.formData();
  const nombre = (formData.get('nombre') as string || '').trim();
  const descripcion = (formData.get('descripcion') as string || '').trim();
  const orden = Number(formData.get('orden') || 0);

  if (!nombre) return redirect('/admin/categorias?msg=error');

  await crearCategoria({ nombre, descripcion, orden });
  return redirect('/admin/categorias?msg=created');
};
