import type { APIRoute } from 'astro';
import { actualizarCriterioEvaluacion, eliminarCriterioEvaluacion, registrarLog } from '@lib/db';

export const POST: APIRoute = async ({ request, params, redirect, cookies }) => {
  const session = cookies.get('admin_session')?.value;
  if (!session) return redirect('/admin/login');

  const { id } = params;
  if (!id) return redirect('/admin/criterios');
  const criterioId = parseInt(id, 10);

  const formData = await request.formData();
  const action = formData.get('action') as string;

  if (action === 'delete') {
    const { success, error } = await eliminarCriterioEvaluacion(criterioId);
    if (success) {
      await registrarLog('eliminacion_criterio', 'admin', `Se eliminó el criterio #${id}`);
      return redirect('/admin/criterios?success=1');
    } else {
      return redirect(`/admin/criterios?error=${encodeURIComponent(error || 'Error al eliminar')}`);
    }
  } else if (action === 'update') {
    const nombre = formData.get('nombre') as string;
    const descripcion = formData.get('descripcion') as string;
    const pesoStr = formData.get('peso_porcentual') as string;
    const peso = pesoStr ? parseFloat(pesoStr) : undefined;

    const { success, error } = await actualizarCriterioEvaluacion(criterioId, {
      nombre,
      descripcion,
      peso_porcentual: peso
    });

    if (success) {
      await registrarLog('edicion_criterio', 'admin', `Se editó el criterio #${id}`);
      return redirect('/admin/criterios?success=1');
    } else {
      return redirect(`/admin/criterios?error=${encodeURIComponent(error || 'Error al actualizar')}`);
    }
  }

  return redirect('/admin/criterios');
};
