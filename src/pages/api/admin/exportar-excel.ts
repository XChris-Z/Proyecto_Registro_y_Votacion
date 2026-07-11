import type { APIRoute } from 'astro';
import ExcelJS from 'exceljs';
import {
  obtenerAsistentes,
  obtenerCategorias,
  obtenerProyectos,
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
    let listaProyectos: any[] = [];
    let listaResultados: any[] = [];

    if (idParam) {
      const jornada = await obtenerJornadaHistorialPorId(parseInt(idParam, 10));
      if (jornada && jornada.snapshot_json) {
        tituloEvento = jornada.nombre;
        fechaEvento = new Date(jornada.fecha_cierre).toLocaleDateString('es-CO');
        listaCategorias = jornada.snapshot_json.categorias || [];
        listaProyectos = jornada.snapshot_json.proyectos || [];
        listaResultados = jornada.snapshot_json.resultados || [];
        listaAsistentes = jornada.snapshot_json.listaAsistentes || await obtenerAsistentes();
      }
    } else {
      listaAsistentes = await obtenerAsistentes();
      listaCategorias = await obtenerCategorias();
      listaProyectos = await obtenerProyectos();
      listaResultados = await obtenerResultados();
    }

    const totalVotosGeneral = listaResultados.reduce((sum: number, r: any) => sum + (r.total_votos || 0), 0);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Institucional EventoVota — Unitrópico';
    workbook.created = new Date();

    // ─── PESTAÑA 1: RESUMEN Y PARTICIPANTES ────────────────────────────────
    const sheet1 = workbook.addWorksheet('Participantes y Resumen', {
      views: [{ state: 'frozen', ySplit: 8 }]
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
    subCell.value = `Fecha de generación: ${fechaEvento}`;
    subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF0D231F' } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6EFEF' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet1.getRow(2).height = 22;

    // Cuadro de Resumen Institucional (Filas 4 a 6)
    sheet1.getCell('B4').value = 'Total Asistentes Registrados:';
    sheet1.getCell('C4').value = listaAsistentes.length;
    sheet1.getCell('B5').value = 'TOTAL GENERAL DE VOTOS EMITIDOS:';
    sheet1.getCell('C5').value = totalVotosGeneral;
    sheet1.getCell('B6').value = 'Categorías / Proyectos Evaluados:';
    sheet1.getCell('C6').value = `${listaCategorias.length} Categorías | ${listaProyectos.length} Proyectos`;

    [4, 5, 6].forEach(r => {
      sheet1.getCell(`B${r}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF041815' } };
      sheet1.getCell(`C${r}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF00594E' } };
    });

    sheet1.getRow(7).height = 12; // Separación

    // Encabezados de la tabla de Asistentes
    const headers1 = ['#', 'Nombre Completo', 'Documento', 'Dependencia / Programa', 'Correo Electrónico', 'Teléfono', 'Fecha de Registro'];
    const row8 = sheet1.getRow(8);
    headers1.forEach((h, colIdx) => {
      const cell = row8.getCell(colIdx + 1);
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
    row8.height = 26;

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

    sheet1.columns = [
      { width: 8 },  // #
      { width: 34 }, // Nombre
      { width: 16 }, // Documento
      { width: 28 }, // Dependencia
      { width: 30 }, // Correo
      { width: 16 }, // Teléfono
      { width: 22 }, // Fecha
    ];

    // ─── PESTAÑA 2: RESULTADOS Y VOTOS POR PROYECTO ─────────────────────
    const sheet2 = workbook.addWorksheet('Resultados y Votos por Proyecto', {
      views: [{ state: 'frozen', ySplit: 4 }]
    });

    sheet2.mergeCells('A1:F1');
    const title2 = sheet2.getCell('A1');
    title2.value = `RESULTADOS OFICIALES POR CATEGORÍA Y PROYECTO — ${tituloEvento.toUpperCase()}`;
    title2.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    title2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00594E' } };
    title2.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet2.getRow(1).height = 36;

    // Resumen General de Votos en Pestaña 2
    sheet2.mergeCells('A2:F2');
    const subTitle2 = sheet2.getCell('A2');
    subTitle2.value = `GRAN TOTAL GENERAL DE VOTOS EMITIDOS EN EL EVENTO: ${totalVotosGeneral} VOTOS`;
    subTitle2.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF041815' } };
    subTitle2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB5A160' } };
    subTitle2.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet2.getRow(2).height = 25;

    let currentRow = 4;

    listaCategorias.forEach((cat) => {
      const resCat = listaResultados.filter((r: any) => r.categoria_id === cat.id);
      const totalVotosCat = resCat.reduce((sum: number, r: any) => sum + (r.total_votos || 0), 0);

      // Encabezado de Categoría
      sheet2.mergeCells(`A${currentRow}:F${currentRow}`);
      const catTitle = sheet2.getCell(`A${currentRow}`);
      catTitle.value = `CATEGORÍA: ${cat.nombre.toUpperCase()} (Total Votos Categoría: ${totalVotosCat})`;
      catTitle.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF041815' } };
      catTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6EFEF' } };
      catTitle.alignment = { vertical: 'middle', horizontal: 'left' };
      sheet2.getRow(currentRow).height = 26;
      currentRow++;

      // Encabezados de tabla de proyectos
      const resHeaders = ['Posición', 'Categoría', 'Proyecto / Candidato', 'Total Votos Obtenidos', '% en Categoría', 'Estado'];
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

      // Mapear los proyectos de esta categoría ordenados por votos
      const proyectosCat = listaProyectos.filter((p: any) => p.categoria_id === cat.id);

      const itemsAMostrar = proyectosCat.length > 0 ? proyectosCat.map((p: any) => {
        const r = resCat.find((res: any) => res.proyecto_id === p.id);
        return {
          proyecto_nombre: p.nombre,
          total_votos: r ? r.total_votos : 0
        };
      }).sort((a: any, b: any) => b.total_votos - a.total_votos) : resCat;

      if (itemsAMostrar.length === 0) {
        sheet2.mergeCells(`A${currentRow}:F${currentRow}`);
        const emptyCell = sheet2.getCell(`A${currentRow}`);
        emptyCell.value = 'Sin proyectos o votos registrados en esta categoría';
        emptyCell.font = { italic: true, color: { argb: 'FF777777' } };
        emptyCell.alignment = { horizontal: 'center' };
        currentRow += 2;
        return;
      }

      itemsAMostrar.forEach((item: any, idx: number) => {
        const pos = idx + 1;
        const votos = item.total_votos || 0;
        const pct = totalVotosCat > 0 ? `${Math.round((votos / totalVotosCat) * 100)}%` : '0%';
        const esGanador = idx === 0 && votos > 0;
        const estado = esGanador ? '🏆 GANADOR / MÁS VOTADO' : 'Candidato';

        const row = sheet2.getRow(currentRow);
        row.getCell(1).value = pos;
        row.getCell(2).value = cat.nombre;
        row.getCell(3).value = item.proyecto_nombre || '';
        row.getCell(4).value = votos;
        row.getCell(5).value = pct;
        row.getCell(6).value = estado;

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

      // Fila de Subtotal de Categoría
      sheet2.mergeCells(`A${currentRow}:C${currentRow}`);
      const subCellCat = sheet2.getCell(`A${currentRow}`);
      subCellCat.value = `TOTAL VOTOS CATEGORÍA: ${cat.nombre.toUpperCase()}`;
      subCellCat.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF041815' } };
      subCellCat.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F3' } };

      const subVotosCell = sheet2.getCell(`D${currentRow}`);
      subVotosCell.value = totalVotosCat;
      subVotosCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF00594E' } };
      subVotosCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F3' } };

      sheet2.getCell(`E${currentRow}`).value = '100%';
      sheet2.getCell(`E${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F3' } };
      sheet2.getCell(`F${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F3' } };

      currentRow += 2;
    });

    sheet2.columns = [
      { width: 10 }, // Posición
      { width: 26 }, // Categoría
      { width: 38 }, // Proyecto
      { width: 22 }, // Total Votos Obtenidos
      { width: 16 }, // %
      { width: 28 }, // Estado
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
