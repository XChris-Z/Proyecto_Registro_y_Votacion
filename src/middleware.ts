import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Solo protegemos rutas bajo /admin (excluyendo la página de login y las APIs de autenticación)
  const isAdminArea = pathname.startsWith('/admin');
  const isLoginPage = pathname === '/admin' || pathname === '/admin/';
  const isAuthApi = pathname.startsWith('/api/admin/login') || pathname.startsWith('/api/admin/logout');

  if (isAdminArea && !isLoginPage && !isAuthApi) {
    const session = context.cookies.get('admin_session')?.value;

    if (!session) {
      // No hay sesión: redirigir al login con headers de no-caché
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/admin',
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }
  }

  // Continuar con la request normal
  const response = await next();

  // Agregar headers de no-caché a TODAS las páginas del área admin autenticada
  if (isAdminArea && !isAuthApi) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
});
