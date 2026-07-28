import type { APIRoute } from 'astro';
import { cambiarEstadoAdmin, obtenerAdminPorId, registrarLog } from '@lib/db';

export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  const session = cookies.get('admin_session')?.value;
  if (!session) {
    return redirect('/admin');
  }

  const requester = await obtenerAdminPorId(Number(session));
  if (!requester || requester.usuario !== 'admin') {
    return redirect('/admin/usuarios?error=unauthorized');
  }

  const formData = await request.formData();
  const targetIdStr = formData.get('id') as string;
  const nuevoEstadoStr = formData.get('estado') as string;
  
  if (!targetIdStr || !nuevoEstadoStr) {
    return redirect('/admin/usuarios?error=missing_data');
  }

  const targetId = Number(targetIdStr);
  const nuevoEstado = nuevoEstadoStr === 'true';

  const targetAdmin = await obtenerAdminPorId(targetId);
  if (!targetAdmin) {
    return redirect('/admin/usuarios?error=not_found');
  }

  // No permitir que el admin principal se desactive a sí mismo
  if (targetAdmin.usuario === 'admin' && !nuevoEstado) {
    return redirect('/admin/usuarios?error=cannot_disable_self');
  }

  const success = await cambiarEstadoAdmin(targetId, nuevoEstado);

  if (success) {
    const accion = nuevoEstado ? 'Activó Usuario' : 'Desactivó Usuario';
    await registrarLog(requester.nombre || requester.usuario, accion, `El usuario administrador "${targetAdmin.usuario}" ha sido ${nuevoEstado ? 'activado' : 'desactivado'}.`);
    return redirect('/admin/usuarios?exito=status_changed');
  } else {
    return redirect('/admin/usuarios?error=db_error');
  }
};
