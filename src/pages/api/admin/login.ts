import type { APIRoute } from 'astro';
import { buscarAdmin, registrarLog } from '@lib/db';
import bcrypt from 'bcryptjs';

function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export const GET: APIRoute = async ({ redirect }) => {
  return redirect('/admin');
};

export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  const formData = await request.formData();
  const usuario = (formData.get('usuario') as string || '').trim();
  const password = (formData.get('password') as string || '');

  if (!usuario || !password) {
    return redirect('/admin?error=credentials');
  }

  const admin = await buscarAdmin(usuario);

  if (!admin || !verifyPassword(password, admin.password_hash)) {
    return redirect('/admin?error=credentials');
  }

  // Crear sesión
  cookies.set('admin_session', String(admin.id), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 horas
  });
  cookies.set('admin_nombre', admin.nombre || admin.usuario, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
  });

  // Registrar inicio de sesión
  await registrarLog(admin.nombre || admin.usuario, 'Inicio de Sesión', `El administrador ingresó al sistema.`);

  return redirect('/admin/dashboard');
};
