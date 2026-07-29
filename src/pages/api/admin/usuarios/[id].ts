import type { APIRoute } from 'astro';
import { actualizarAdmin, eliminarAdmin, obtenerAdminPorId, registrarLog } from '@lib/db';
import bcrypt from 'bcryptjs';

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

  const id = Number(params.id);
  const targetAdmin = await obtenerAdminPorId(id);
  
  if (!targetAdmin) {
    return redirect('/admin/usuarios?error=not_found');
  }

  if (targetAdmin.usuario === 'admin') {
    return redirect('/admin/usuarios?error=cannot_modify_superadmin');
  }

  const method = url.searchParams.get('_method');
  const formData = await request.formData();

  if (method === 'DELETE') {
    const res = await eliminarAdmin(id);
    if (res.success) {
      await registrarLog(adminNombre, 'Eliminación de Administrador', `Se eliminó el usuario administrador "${targetAdmin.usuario}".`);
      return redirect('/admin/usuarios?exito=user_deleted');
    }
    return redirect(`/admin/usuarios?error=${encodeURIComponent(res.error || 'Error al eliminar usuario')}`);
  }

  // PUT / update
  const usuario = (formData.get('usuario') as string || '').trim();
  const nombre = (formData.get('nombre') as string || '').trim();
  const password = (formData.get('password') as string || '');

  if (!usuario || !nombre) {
    return redirect('/admin/usuarios?error=missing_fields');
  }

  const dataToUpdate: { usuario: string; nombre: string; password_hash?: string } = {
    usuario,
    nombre
  };

  if (password) {
    if (password.length < 6) {
      return redirect('/admin/usuarios?error=pass_short');
    }
    const salt = bcrypt.genSaltSync(10);
    dataToUpdate.password_hash = bcrypt.hashSync(password, salt);
  }

  const res = await actualizarAdmin(id, dataToUpdate);

  if (res.success) {
    await registrarLog(adminNombre, 'Actualización de Administrador', `Se actualizó el usuario administrador "${usuario}" (ID: ${id}).${password ? ' (Contraseña modificada)' : ''}`);
    return redirect('/admin/usuarios?exito=user_updated');
  }
  
  if (res.error === 'El usuario ya existe.') {
    return redirect('/admin/usuarios?error=user_exists');
  }
  
  return redirect(`/admin/usuarios?error=${encodeURIComponent(res.error || 'Error al actualizar usuario')}`);
};
