import type { APIRoute } from 'astro';
import { crearProyecto, registrarLog, obtenerCategorias, crearCategoria } from '@lib/db';
import { Buffer } from 'node:buffer';
import exceljs from 'exceljs';

export const POST: APIRoute = async ({ request, redirect, cookies }) => {
  if (!cookies.get('admin_session')?.value) return redirect('/admin');

  try {
    const formData = await request.formData();
    const file = formData.get('excel') as File;

    if (!file) {
      return redirect('/admin/proyectos?msg=error');
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = new exceljs.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return redirect('/admin/proyectos?msg=error');
    }

    const adminNombre = cookies.get('admin_nombre')?.value || 'Admin Desconocido';
    let proyectosAgregados = 0;

    // Load existing categories to map names to IDs
    let categorias = await obtenerCategorias();

    const rows = worksheet.getRows(2, worksheet.rowCount - 1) || [];

    for (const row of rows) {
      const nombre = row.getCell(1).text?.trim();
      const categoriaNombre = row.getCell(2).text?.trim();
      const descripcion = row.getCell(3).text?.trim();
      const autores = row.getCell(4).text?.trim();

      if (!nombre || !categoriaNombre) continue;

      // Find category by name (case insensitive)
      let categoria = categorias.find(c => c.nombre.toLowerCase() === categoriaNombre.toLowerCase());
      
      let categoria_id;
      if (categoria) {
        categoria_id = categoria.id;
      } else {
        // Create category if it doesn't exist
        categoria_id = await crearCategoria({ nombre: categoriaNombre });
        // Refresh categories
        categorias = await obtenerCategorias();
      }

      await crearProyecto({ nombre, descripcion, autores, categoria_id });
      proyectosAgregados++;
    }

    await registrarLog(adminNombre, 'Importación de Proyectos', `Se importaron ${proyectosAgregados} proyectos desde Excel.`);

    return redirect('/admin/proyectos?msg=imported');
  } catch (error) {
    console.error('Error importando proyectos:', error);
    return redirect('/admin/proyectos?msg=error');
  }
};
