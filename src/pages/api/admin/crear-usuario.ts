import type { APIRoute } from 'astro';
import { crearAdmin, crearJurado, registrarLog, obtenerAdminPorId } from '@lib/db';
import bcrypt from 'bcryptjs';

export const GET: APIRoute = async ({ redirect }) => {
  return redirect('/admin/usuarios');
};

export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  const session = cookies.get('admin_session')?.value;
  const adminNombre = cookies.get('admin_nombre')?.value || 'Admin Desconocido';
  
  if (!session) {
    return redirect('/admin');
  }

  const requester = await obtenerAdminPorId(Number(session));
  if (!requester || requester.usuario !== 'admin') {
    return redirect('/admin/usuarios?error=unauthorized');
  }

  const formData = await request.formData();
  const rol = (formData.get('rol') as string || 'admin').trim();
  const nombre = (formData.get('nombre') as string || '').trim();
  const password = (formData.get('password') as string || '');
  
  if (!nombre || !password) {
    return redirect('/admin/usuarios?error=missing_fields');
  }

  if (password.length < 6) {
    return redirect('/admin/usuarios?error=pass_short');
  }

  if (rol === 'jurado') {
    const email = (formData.get('email') as string || '').trim();
    if (!email) {
      return redirect('/admin/usuarios?error=missing_fields');
    }

    const result = await crearJurado(email, password, nombre);

    if (!result.success) {
      if (result.error === 'El correo electrónico ya está registrado.') {
        return redirect('/admin/usuarios?error=user_exists');
      }
      return redirect('/admin/usuarios?error=unknown');
    }

    await registrarLog(adminNombre, 'Creación de Jurado', `Creó un nuevo jurado de votación: ${email} (${nombre})`);
    return redirect('/admin/usuarios?exito=user_created');

  } else {
    // Es administrador
    const usuario = (formData.get('usuario') as string || '').trim();
    if (!usuario) {
      return redirect('/admin/usuarios?error=missing_fields');
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    const result = await crearAdmin(usuario, hash, nombre);

    if (!result.success) {
      if (result.error === 'El usuario ya existe.') {
        return redirect('/admin/usuarios?error=user_exists');
      }
      return redirect('/admin/usuarios?error=unknown');
    }

    await registrarLog(adminNombre, 'Creación de Administrador', `Creó un nuevo usuario admin: ${usuario} (${nombre})`);
    return redirect('/admin/usuarios?exito=user_created');
  }
};
