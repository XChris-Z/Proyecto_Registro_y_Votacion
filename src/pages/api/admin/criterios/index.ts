import type { APIRoute } from 'astro';
import { crearCriterioEvaluacion, registrarLog } from '@lib/db';

export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  const session = cookies.get('admin_session')?.value;
  if (!session) return redirect('/admin/login');

  const formData = await request.formData();
  const nombre = formData.get('nombre') as string;
  const descripcion = formData.get('descripcion') as string;
  const pesoStr = formData.get('peso_porcentual') as string;
  
  if (!nombre) {
    return redirect('/admin/criterios?error=Falta+el+nombre');
  }

  const peso = pesoStr ? parseFloat(pesoStr) : undefined;

  const { success, error } = await crearCriterioEvaluacion({
    nombre,
    descripcion,
    peso_porcentual: peso
  });

  if (success) {
    await registrarLog('creacion_criterio', 'admin', `Se creó el criterio: ${nombre}`);
    return redirect('/admin/criterios?success=1');
  } else {
    return redirect(`/admin/criterios?error=${encodeURIComponent(error || 'Error al crear el criterio')}`);
  }
};
