import type { APIRoute } from 'astro';
import ExcelJS from 'exceljs';
import {
  obtenerAsistentes,
  obtenerCategorias,
  obtenerProyectos,
  obtenerResultados,
  obtenerJornadaHistorialPorId,
  obtenerJornadaActual
} from '@lib/db';

const formatBogotaDate = (date: Date) => {
  return date.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }) + ' (Hora Bogotá - Colombia)';
};

export const GET: APIRoute = async ({ url }) => {
  try {
    const idParam = url.searchParams.get('id');

    let tituloEvento = 'Jornada de Votación en Vivo';
    let fechaEvento = formatBogotaDate(new Date());
    let listaAsistentes: any[] = [];
    let listaCategorias: any[] = [];
    let listaProyectos: any[] = [];
    let listaResultados: any[] = [];

    if (idParam) {
      const jornada = await obtenerJornadaHistorialPorId(parseInt(idParam, 10));
      if (jornada && jornada.snapshot_json) {
        tituloEvento = jornada.nombre;
        fechaEvento = formatBogotaDate(new Date(jornada.fecha_cierre));
        listaCategorias = jornada.snapshot_json.categorias || [];
        listaProyectos = jornada.snapshot_json.proyectos || [];
        listaResultados = jornada.snapshot_json.resultados || [];
        listaAsistentes = jornada.snapshot_json.listaAsistentes || await obtenerAsistentes();
        // Intentar obtener jurados guardados en el snapshot
        (global as any).listaJuradosHistorial = jornada.snapshot_json.jurados || [];
      }
    } else {
      const jornadaActual = await obtenerJornadaActual();
      tituloEvento = jornadaActual.nombre;
      listaAsistentes = await obtenerAsistentes();
      listaCategorias = await obtenerCategorias();
      listaProyectos = await obtenerProyectos();
      listaResultados = await obtenerResultados();
    }

    const totalVotosGeneral = listaResultados.reduce((sum: number, r: any) => sum + (r.total_votos || r.votos_publico || 0), 0);

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
      const row = sheet1.getRow(idx + 9);
      row.getCell(1).value = idx + 1;
      row.getCell(2).value = a.nombre || '';
      row.getCell(3).value = a.documento || '';
      row.getCell(4).value = a.dependencia || '';
      row.getCell(5).value = a.correo || '';
      row.getCell(6).value = a.telefono || 'N/A';
      row.getCell(7).value = a.fecha_registro ? new Date(a.fecha_registro).toLocaleString('es-CO', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }) + ' (Bogotá)' : '';

      const isEven = idx % 2 === 0;
      for (let i = 1; i <= 7; i++) {
        const cell = row.getCell(i);
        cell.font = { name: 'Arial', size: 10 };
        if (!isEven) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F9F8' } };
        }
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };
      }
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



    // ─── PESTAÑA 3: JURADOS REGISTRADOS ──────────────────────────────────────
    const sheet3 = workbook.addWorksheet('Jurados Registrados', {
      views: [{ state: 'frozen', ySplit: 2 }]
    });

    sheet3.mergeCells('A1:C1');
    const title3 = sheet3.getCell('A1');
    title3.value = `JURADOS REGISTRADOS — ${tituloEvento.toUpperCase()}`;
    title3.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    title3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00594E' } };
    title3.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet3.getRow(1).height = 36;

    const headers3 = ['#', 'Nombre Completo', 'Correo Electrónico'];
    const row2 = sheet3.getRow(2);
    headers3.forEach((h, colIdx) => {
      const cell = row2.getCell(colIdx + 1);
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
    row2.height = 26;

    let listaJurados = (global as any).listaJuradosHistorial;
    if (!listaJurados) {
      // Si no es histórico o no estaba en el snapshot antiguo, intentamos traer de la DB actual
      const { obtenerJurados } = await import('@lib/db');
      listaJurados = await obtenerJurados();
    }

    if (!listaJurados || listaJurados.length === 0) {
      sheet3.mergeCells('A3:C3');
      const emptyCell = sheet3.getCell('A3');
      emptyCell.value = 'No se encontraron jurados registrados para esta jornada.';
      emptyCell.font = { italic: true, color: { argb: 'FF777777' } };
      emptyCell.alignment = { horizontal: 'center' };
    } else {
      listaJurados.forEach((j: any, idx: number) => {
        const row = sheet3.addRow([
          idx + 1,
          j.nombre_completo || 'Sin Nombre',
          j.email || 'Sin Correo'
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
    }

    sheet3.columns = [
      { width: 8 },  // #
      { width: 40 }, // Nombre
      { width: 40 }, // Correo
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
