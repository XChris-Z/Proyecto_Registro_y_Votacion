import type { APIRoute } from 'astro';
import { actualizarJurado, eliminarJurado, obtenerAdminPorId, registrarLog } from '@lib/db';

export const POST: APIRoute = async ({ request, params, redirect, url, cookies }) => {
  const session = cookies.get('admin_session')?.value;
  const adminNombre = cookies.get('admin_nombre')?.value || 'Admin Desconocido';
  
  if (!session) {
    return redirect('/admin');
  }

  const requester = await obtenerAdminPorId(Number(session));
  if (!requester || requester.usuario !== 'admin') {
    return redirect('/admin/usuarios?error=unauthorized');
  }

  const id = params.id as string;
  const method = url.searchParams.get('_method');
  const formData = await request.formData();

  if (method === 'DELETE') {
    const res = await eliminarJurado(id);
    if (res.success) {
      await registrarLog(adminNombre, 'Eliminación de Jurado', `Se eliminó el jurado con ID "${id}".`);
      return redirect('/admin/usuarios?exito=user_deleted');
    }
    return redirect(`/admin/usuarios?error=${encodeURIComponent(res.error || 'Error al eliminar usuario')}`);
  }

  // PUT / update
  const email = (formData.get('email') as string || '').trim();
  const nombre_completo = (formData.get('nombre') as string || '').trim();
  const password = (formData.get('password') as string || '');

  if (!email || !nombre_completo) {
    return redirect('/admin/usuarios?error=missing_fields');
  }

  if (password && password.length < 6) {
    return redirect('/admin/usuarios?error=pass_short');
  }

  const res = await actualizarJurado(id, { 
    email, 
    nombre_completo, 
    password: password ? password : undefined 
  });

  if (res.success) {
    await registrarLog(adminNombre, 'Actualización de Jurado', `Se actualizó el jurado "${email}".${password ? ' (Contraseña modificada)' : ''}`);
    return redirect('/admin/usuarios?exito=user_updated');
  }
  
  return redirect(`/admin/usuarios?error=${encodeURIComponent(res.error || 'Error al actualizar usuario')}`);
};
