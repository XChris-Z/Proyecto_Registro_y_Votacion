import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies }) => {
  cookies.delete('admin_session', { path: '/' });
  cookies.delete('admin_nombre', { path: '/' });

  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/admin',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
};
