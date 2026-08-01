import type { APIRoute } from 'astro';
import { supabase, obtenerPerfil } from '@lib/db';

export const GET: APIRoute = async ({ redirect }) => {
  return redirect('/jurado/login');
};

export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  const formData = await request.formData();
  const email = (formData.get('email') as string || '').trim();
  const password = (formData.get('password') as string || '');

  if (!email || !password) {
    return redirect('/jurado/login?error=credentials');
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user || !data.session) {
      return redirect('/jurado/login?error=credentials');
    }

    // Verificar que tenga el rol jurado en la tabla perfiles
    const perfil = await obtenerPerfil(data.user.id);
    
    if (!perfil || perfil.rol !== 'jurado') {
      // Si no es jurado, cerrar su sesión
      await supabase.auth.signOut();
      return redirect('/jurado/login?error=credentials');
    }

    // Guardar tokens en cookies
    cookies.set('sb-access-token', data.session.access_token, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 días
    });
    
    cookies.set('sb-refresh-token', data.session.refresh_token, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });

    return redirect('/jurado/dashboard');
  } catch (err) {
    return redirect('/jurado/login?error=server');
  }
};
