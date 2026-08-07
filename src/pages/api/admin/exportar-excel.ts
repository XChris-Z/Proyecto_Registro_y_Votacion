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

    // ─── TABLA DE REPOSITORIOS GITHUB (A LA DERECHA EN HOJA 1) ───
    const githubRow = 8;
    const gHeader1 = sheet1.getCell(`I${githubRow}`);
    const gHeader2 = sheet1.getCell(`J${githubRow}`);
    gHeader1.value = 'Proyecto';
    gHeader2.value = 'Enlace de GitHub';
    
    [gHeader1, gHeader2].forEach(cell => {
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

    const extractGithub = (text: string) => {
      if (!text) return 'No registrado';
      const match = text.match(/https?:\/\/(www\.)?github\.com\/[^\s]+/i);
      return match ? match[0] : 'No registrado';
    };

    listaProyectos.forEach((p, idx) => {
      const row = sheet1.getRow(idx + 9);
      const cellProj = row.getCell(9); // Columna I
      const cellGit = row.getCell(10); // Columna J
      
      cellProj.value = p.nombre;
      
      const link = extractGithub(p.descripcion || '') || extractGithub(p.autores || '');
      if (link !== 'No registrado') {
        cellGit.value = { text: link, hyperlink: link, tooltip: 'Abrir GitHub' };
        cellGit.font = { name: 'Arial', size: 10, underline: true, color: { argb: 'FF0563C1' } };
      } else {
        cellGit.value = 'No registrado';
        cellGit.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF999999' } };
      }

      const isEven = idx % 2 === 0;
      [cellProj, cellGit].forEach(cell => {
        if (!cell.font || !cell.font.underline) cell.font = { name: 'Arial', size: 10 };
        if (!isEven) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F9F8' } };
        }
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };
      });
    });

    sheet1.columns = [
      { width: 8 },  // A: #
      { width: 34 }, // B: Nombre
      { width: 16 }, // C: Documento
      { width: 28 }, // D: Dependencia
      { width: 30 }, // E: Correo
      { width: 16 }, // F: Teléfono
      { width: 22 }, // G: Fecha
      { width: 5 },  // H: (Espacio en blanco)
      { width: 40 }, // I: Nombre Proyecto
      { width: 50 }, // J: GitHub
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
