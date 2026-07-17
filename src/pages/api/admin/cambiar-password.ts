import type { APIRoute } from 'astro';
import { obtenerAdminPorId, actualizarPasswordAdmin } from '@lib/db';
import bcrypt from 'bcryptjs';

function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  const sessionId = cookies.get('admin_session')?.value;
  if (!sessionId) {
    return redirect('/admin?error=credentials');
  }

  const formData = await request.formData();
  const passwordActual = (formData.get('password_actual') as string || '');
  const passwordNueva = (formData.get('password_nueva') as string || '');
  const passwordConfirmacion = (formData.get('password_confirmacion') as string || '');
  const redirectUrl = (formData.get('redirect_url') as string || '/admin/dashboard');

  if (!passwordActual || !passwordNueva || !passwordConfirmacion) {
    return redirect(`${redirectUrl}?error=pass_empty`);
  }

  if (passwordNueva.length < 6) {
    return redirect(`${redirectUrl}?error=pass_short`);
  }

  if (passwordNueva !== passwordConfirmacion) {
    return redirect(`${redirectUrl}?error=pass_mismatch`);
  }

  const admin = await obtenerAdminPorId(Number(sessionId));
  if (!admin || !verifyPassword(passwordActual, admin.password_hash)) {
    return redirect(`${redirectUrl}?error=pass_old_wrong`);
  }

  const nuevoHash = bcrypt.hashSync(passwordNueva, 10);
  const exito = await actualizarPasswordAdmin(admin.id, nuevoHash);

  if (!exito) {
    return redirect(`${redirectUrl}?error=pass_error`);
  }

  return redirect(`${redirectUrl}?exito=password_changed`);
};
