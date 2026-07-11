import type { APIRoute } from 'astro';
import { registrarAsistente } from '@lib/db';

export const POST: APIRoute = async ({ request, redirect }) => {
  const formData = await request.formData();

  const nombre = (formData.get('nombre') as string || '').trim();
  const documento = (formData.get('documento') as string || '').trim();
  const dependencia = (formData.get('dependencia') as string || '').trim();
  const correo = (formData.get('correo') as string || '').trim().toLowerCase();
  const telefono = (formData.get('telefono') as string || '').trim();

  // Validaciones básicas
  if (!nombre || !documento || !dependencia || !correo) {
    return redirect('/?error=fields');
  }

  if (!/^\d+$/.test(documento)) {
    return redirect('/?error=documento');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return redirect('/?error=correo');
  }

  const result = await registrarAsistente({ nombre, documento, dependencia, correo, telefono });

  if (!result.success) {
    if (result.error?.includes('Ya existe')) {
      return redirect('/?error=duplicate');
    }
    return redirect('/?error=server');
  }

  const params = new URLSearchParams({
    nombre,
    dependencia,
  });

  return redirect(`/registro-exitoso?${params.toString()}`);
};
