import type { APIRoute } from 'astro';
import ExcelJS from 'exceljs';
import {
  obtenerAsistentes,
  obtenerCategorias,
  obtenerResultados,
  obtenerJornadaHistorialPorId
} from '@lib/db';

export const GET: APIRoute = async ({ url }) => {
  try {
    const idParam = url.searchParams.get('id');

    let tituloEvento = 'Jornada de Votación en Vivo';
    let fechaEvento = new Date().toLocaleDateString('es-CO');
    let listaAsistentes: any[] = [];
    let listaCategorias: any[] = [];
    let listaResultados: any[] = [];

    if (idParam) {
      const jornada = await obtenerJornadaHistorialPorId(parseInt(idParam, 10));
      if (jornada && jornada.snapshot_json) {
        tituloEvento = jornada.nombre;
        fechaEvento = new Date(jornada.fecha_cierre).toLocaleDateString('es-CO');
        listaCategorias = jornada.snapshot_json.categorias || [];
        listaResultados = jornada.snapshot_json.resultados || [];
        // Si no se guardó la lista de asistentes en el snapshot viejo, traer los actuales o un arreglo
        listaAsistentes = jornada.snapshot_json.listaAsistentes || await obtenerAsistentes();
      }
    } else {
      listaAsistentes = await obtenerAsistentes();
      listaCategorias = await obtenerCategorias();
      listaResultados = await obtenerResultados();
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Institucional EventoVota — Unitrópico';
    workbook.created = new Date();

    // ─── PESTAÑA 1: RESUMEN Y PARTICIPANTES ────────────────────────────────
    const sheet1 = workbook.addWorksheet('Participantes y Resumen', {
      views: [{ state: 'frozen', ySplit: 5 }]
    });

    // Título Principal
    sheet1.mergeCells('A1:G1');
    const titleCell = sheet1.getCell('A1');
    titleCell.value = `UNIVERSIDAD UNITRÓPICO — REPORTE DE EVENTO: ${tituloEvento.toUpperCase()}`;
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00594E' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet1.getRow(1).height = 36;

    // Subtítulo / Fecha
    sheet1.mergeCells('A2:G2');
    const subCell = sheet1.getCell('A2');
    subCell.value = `Fecha de generación: ${fechaEvento} | Total Asistentes: ${listaAsistentes.length}`;
    subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF0D231F' } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6EFEF' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet1.getRow(2).height = 22;

    sheet1.getRow(3).height = 10; // Fila vacía de separación

    // Encabezados de la tabla de Asistentes
    const headers1 = ['#', 'Nombre Completo', 'Documento', 'Dependencia / Programa', 'Correo Electrónico', 'Teléfono', 'Fecha de Registro'];
    const row4 = sheet1.getRow(4);
    headers1.forEach((h, colIdx) => {
      const cell = row4.getCell(colIdx + 1);
      cell.value = h;
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00594E' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF004A41' } },
        bottom: { style: 'medium', color: { argb: 'FF004A41' } },
        left: { style: 'thin', color: { argb: 'FF004A41' } },
        right: { style: 'thin', color: { argb: 'FF004A41' } },
      };
    });
    row4.height = 26;

    // Filas de asistentes
    listaAsistentes.forEach((a, idx) => {
      const row = sheet1.addRow([
        idx + 1,
        a.nombre || '',
        a.documento || '',
        a.dependencia || '',
        a.correo || '',
        a.telefono || 'N/A',
        a.fecha_registro ? new Date(a.fecha_registro).toLocaleString('es-CO') : ''
      ]);

      const isEven = idx % 2 === 0;
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = { name: 'Arial', size: 10 };
        if (!isEven) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F9F8' } };
        }
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };
      });
      row.height = 20;
    });

    // Ajustar anchos de columna Pestaña 1
    sheet1.columns = [
      { width: 8 },  // #
      { width: 34 }, // Nombre
      { width: 16 }, // Documento
      { width: 28 }, // Dependencia
      { width: 30 }, // Correo
      { width: 16 }, // Teléfono
      { width: 22 }, // Fecha
    ];

    // ─── PESTAÑA 2: RESULTADOS OFICIALES POR CATEGORÍA ─────────────────────
    const sheet2 = workbook.addWorksheet('Resultados y Ganadores', {
      views: [{ state: 'frozen', ySplit: 3 }]
    });

    sheet2.mergeCells('A1:E1');
    const title2 = sheet2.getCell('A1');
    title2.value = `RESULTADOS OFICIALES DE VOTACIÓN — ${tituloEvento.toUpperCase()}`;
    title2.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    title2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00594E' } };
    title2.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet2.getRow(1).height = 36;

    let currentRow = 3;

    listaCategorias.forEach((cat) => {
      // Encabezado de Categoría
      sheet2.mergeCells(`A${currentRow}:E${currentRow}`);
      const catTitle = sheet2.getCell(`A${currentRow}`);
      catTitle.value = `CATEGORÍA: ${cat.nombre.toUpperCase()}`;
      catTitle.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF041815' } };
      catTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB5A160' } }; // Color Oro institucional
      catTitle.alignment = { vertical: 'middle', horizontal: 'left' };
      sheet2.getRow(currentRow).height = 28;
      currentRow++;

      // Encabezados de tabla de resultados
      const resHeaders = ['Posición', 'Proyecto / Candidato', 'Total Votos', '% de Votos en Categoría', 'Estado'];
      const headRow = sheet2.getRow(currentRow);
      resHeaders.forEach((h, idx) => {
        const cell = headRow.getCell(idx + 1);
        cell.value = h;
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00594E' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });
      headRow.height = 24;
      currentRow++;

      const resCat = listaResultados.filter((r: any) => r.categoria_id === cat.id);
      const totalVotosCat = resCat.reduce((sum: number, r: any) => sum + (r.total_votos || 0), 0);

      if (resCat.length === 0) {
        sheet2.mergeCells(`A${currentRow}:E${currentRow}`);
        const emptyCell = sheet2.getCell(`A${currentRow}`);
        emptyCell.value = 'Sin votos registrados en esta categoría';
        emptyCell.font = { italic: true, color: { argb: 'FF777777' } };
        emptyCell.alignment = { horizontal: 'center' };
        currentRow += 2;
        return;
      }

      resCat.forEach((r: any, idx: number) => {
        const pos = idx + 1;
        const votos = r.total_votos || 0;
        const pct = totalVotosCat > 0 ? `${Math.round((votos / totalVotosCat) * 100)}%` : '0%';
        const esGanador = idx === 0 && votos > 0;
        const estado = esGanador ? '🏆 GANADOR / MÁS VOTADO' : 'Candidato';

        const row = sheet2.getRow(currentRow);
        row.getCell(1).value = pos;
        row.getCell(2).value = r.proyecto_nombre || '';
        row.getCell(3).value = votos;
        row.getCell(4).value = pct;
        row.getCell(5).value = estado;

        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.font = {
            name: 'Arial',
            size: 10,
            bold: esGanador,
            color: esGanador ? { argb: 'FF041815' } : { argb: 'FF222222' }
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: esGanador ? { argb: 'FFFFF3CD' } : { argb: 'FFFFFFFF' }
          };
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          };
        });
        row.height = esGanador ? 26 : 21;
        currentRow++;
      });

      currentRow += 2; // Espacio entre categorías
    });

    sheet2.columns = [
      { width: 12 }, // Posición
      { width: 38 }, // Proyecto
      { width: 16 }, // Votos
      { width: 24 }, // %
      { width: 30 }, // Estado
    ];

    const buffer = await workbook.xlsx.writeBuffer();

    const cleanFilename = tituloEvento.replace(/[^a-zA-Z0-9_-]/g, '_');
    return new Response(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Reporte_EventoVota_${cleanFilename}.xlsx"`,
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
