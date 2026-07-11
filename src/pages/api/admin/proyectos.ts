import type { APIRoute } from 'astro';
import { crearProyecto } from '@lib/db';

export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  if (!cookies.get('admin_session')?.value) return redirect('/admin');

  const formData = await request.formData();

  const nombre = (formData.get('nombre') as string || '').trim();
  const descripcion = (formData.get('descripcion') as string || '').trim();
  const autores = (formData.get('autores') as string || '').trim();
  const categoria_id = Number(formData.get('categoria_id'));

  if (!nombre || !categoria_id) return redirect('/admin/proyectos?msg=error');

  await crearProyecto({ nombre, descripcion, autores, categoria_id });
  return redirect('/admin/proyectos?msg=created');
};
