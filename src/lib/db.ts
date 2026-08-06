import { createClient } from '@supabase/supabase-js';

export function cleanEnvVar(val?: string): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
}

export function cleanSupabaseUrl(url?: string): string {
  let cleaned = cleanEnvVar(url);
  // Eliminar /rest/v1 o /auth/v1 con o sin barra final
  cleaned = cleaned.replace(/\/rest\/v1\/?.*$/i, '');
  cleaned = cleaned.replace(/\/auth\/v1\/?.*$/i, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}


const rawUrl =
  (import.meta.env.PUBLIC_SUPABASE_URL as string) ||
  (process.env.PUBLIC_SUPABASE_URL as string);

const rawKey =
  (import.meta.env.SUPABASE_SERVICE_ROLE_KEY as string) ||
  (process.env.SUPABASE_SERVICE_ROLE_KEY as string);

const supabaseUrl = cleanSupabaseUrl(rawUrl);
const supabaseKey = cleanEnvVar(rawKey);

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan variables de entorno: PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});



// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface Asistente {
  id: number;
  nombre: string;
  documento: string;
  dependencia: string;
  correo: string;
  telefono: string | null;
  fecha_registro: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
  orden: number;
}

export interface Proyecto {
  id: number;
  nombre: string;
  descripcion: string | null;
  autores: string | null;
  categoria_id: number;
  activo: boolean;
  fecha_creacion: string;
  categoria_nombre?: string;
}

export interface Voto {
  id: number;
  asistente_id: number;
  proyecto_id: number;
  categoria_id: number;
  fecha_voto: string;
}

export interface ResultadoVoto {
  proyecto_id: number;
  proyecto_nombre: string;
  categoria_id: number;
  categoria_nombre: string;
  total_votos: number;
}

export interface ResultadoFinal {
  proyecto_id: number;
  proyecto_nombre: string;
  categoria_id: number;
  categoria_nombre: string;
  votos_publico: number;
  puntaje_publico_normalizado: number;
  puntaje_publico_ponderado: number;
  promedio_jurado: number;
  puntaje_jurado_ponderado: number;
  puntaje_final: number;
}

// Interfaces Jurado
export interface Perfil {
  id: string;
  rol: string;
  nombre_completo: string | null;
  email?: string;
  creado_en: string;
}

export interface CriterioEvaluacion {
  id: number;
  nombre: string;
  descripcion: string | null;
  peso_porcentual: number | null;
  creado_en: string;
}

export interface VotoJurado {
  id?: number;
  jurado_id: string;
  proyecto_id: number;
  criterio_id: number;
  calificacion: number;
  fecha_voto?: string;
}

// ─── ASISTENTES ───────────────────────────────────────────────────────────────

export async function registrarAsistente(data: {
  nombre: string;
  documento: string;
  dependencia: string;
  correo: string;
  telefono?: string;
}): Promise<{ success: boolean; id?: number; error?: string }> {
  const { data: result, error } = await supabase
    .from('asistentes')
    .insert([{ nombre: data.nombre, documento: data.documento, dependencia: data.dependencia, correo: data.correo, telefono: data.telefono || null }])
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ya existe un registro con ese documento y correo.' };
    }
    return { success: false, error: 'Error al registrar. Intenta de nuevo.' };
  }

  return { success: true, id: result.id };
}

export async function buscarAsistente(identificador: string): Promise<Asistente | null> {
  const { data, error } = await supabase
    .from('asistentes')
    .select('*')
    .or(`documento.eq.${identificador},correo.eq.${identificador}`)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as Asistente;
}

export async function obtenerAsistentes(): Promise<Asistente[]> {
  const { data, error } = await supabase
    .from('asistentes')
    .select('*')
    .order('fecha_registro', { ascending: false });

  if (error) return [];
  return (data as Asistente[]) || [];
}

// ─── CATEGORÍAS ───────────────────────────────────────────────────────────────

export async function obtenerCategorias(): Promise<Categoria[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .order('orden', { ascending: true })
    .order('id', { ascending: true });

  if (error) return [];
  return (data as Categoria[]) || [];
}

export async function crearCategoria(data: {
  nombre: string;
  descripcion?: string;
  orden?: number;
}): Promise<number> {
  const { data: result, error } = await supabase
    .from('categorias')
    .insert([{ nombre: data.nombre, descripcion: data.descripcion || null, orden: data.orden || 0, activa: true }])
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return result.id;
}

export async function actualizarCategoria(
  id: number,
  data: { nombre: string; descripcion?: string; orden?: number; activa?: boolean | number }
): Promise<void> {
  const activa = data.activa === undefined ? true : Boolean(data.activa);
  await supabase
    .from('categorias')
    .update({ nombre: data.nombre, descripcion: data.descripcion || null, orden: data.orden || 0, activa })
    .eq('id', id);
}

export async function eliminarCategoria(id: number): Promise<void> {
  await supabase.from('categorias').delete().eq('id', id);
}

// ─── PROYECTOS ────────────────────────────────────────────────────────────────

export async function obtenerProyectos(): Promise<Proyecto[]> {
  const { data, error } = await supabase
    .from('proyectos')
    .select(`
      *,
      categorias!inner(nombre, orden)
    `)
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) return [];

  return (data || []).map((p: any) => ({
    ...p,
    categoria_nombre: p.categorias?.nombre,
  })) as Proyecto[];
}

export async function obtenerProyectoPorId(id: number): Promise<Proyecto | null> {
  const { data, error } = await supabase
    .from('proyectos')
    .select(`*, categorias!inner(nombre)`)
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return { ...data, categoria_nombre: data.categorias?.nombre } as Proyecto;
}

export async function crearProyecto(data: {
  nombre: string;
  descripcion?: string;
  autores?: string;
  categoria_id: number;
}): Promise<number> {
  const { data: result, error } = await supabase
    .from('proyectos')
    .insert([{
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      autores: data.autores || null,
      categoria_id: data.categoria_id,
      activo: true
    }])
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return result.id;
}

export async function actualizarProyecto(
  id: number,
  data: { nombre: string; descripcion?: string; autores?: string; categoria_id: number }
): Promise<void> {
  await supabase
    .from('proyectos')
    .update({
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      autores: data.autores || null,
      categoria_id: data.categoria_id,
    })
    .eq('id', id);
}

export async function eliminarProyecto(id: number): Promise<void> {
  await supabase.from('proyectos').update({ activo: false }).eq('id', id);
}

// ─── VOTOS ────────────────────────────────────────────────────────────────────

export async function obtenerVotosDeAsistente(asistente_id: number): Promise<Voto[]> {
  const { data, error } = await supabase
    .from('votos')
    .select('*')
    .eq('asistente_id', asistente_id);

  if (error) return [];
  return (data as Voto[]) || [];
}

export async function emitirVoto(data: {
  asistente_id: number;
  proyecto_id: number;
  categoria_id: number;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('votos')
    .insert([{ asistente_id: data.asistente_id, proyecto_id: data.proyecto_id, categoria_id: data.categoria_id }]);

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ya votaste en esta categoría.' };
    }
    return { success: false, error: 'Error al emitir voto.' };
  }

  return { success: true };
}

export async function obtenerResultados(): Promise<ResultadoVoto[]> {
  const { data, error } = await supabase
    .from('proyectos')
    .select(`
      id,
      nombre,
      categorias!inner(id, nombre, orden),
      votos(id)
    `)
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) return [];

  const resultados: ResultadoVoto[] = (data || []).map((p: any) => ({
    proyecto_id: p.id,
    proyecto_nombre: p.nombre,
    categoria_id: p.categorias.id,
    categoria_nombre: p.categorias.nombre,
    total_votos: Array.isArray(p.votos) ? p.votos.length : 0,
  }));

  // Ordenar por categoría (orden) y luego por votos descendente
  return resultados.sort((a, b) => {
    const catA = (data as any[]).find(p => p.id === a.proyecto_id)?.categorias?.orden ?? 0;
    const catB = (data as any[]).find(p => p.id === b.proyecto_id)?.categorias?.orden ?? 0;
    if (catA !== catB) return catA - catB;
    return b.total_votos - a.total_votos;
  });
}

export async function obtenerResultadosFinales(): Promise<ResultadoFinal[]> {
  const { data, error } = await supabase
    .from('proyectos')
    .select(`
      id,
      nombre,
      categorias!inner(id, nombre, orden),
      votos(id),
      votos_jurado(calificacion)
    `)
    .eq('activo', true)
    .order('nombre', { ascending: true });

  if (error) return [];

  // 1. Obtener datos brutos
  const rawData = (data || []).map((p: any) => {
    const total_votos_publico = Array.isArray(p.votos) ? p.votos.length : 0;
    
    // Promedio jurado (sobre 5)
    let promedio_jurado = 0;
    if (Array.isArray(p.votos_jurado) && p.votos_jurado.length > 0) {
      const sum = p.votos_jurado.reduce((acc: number, v: any) => acc + (v.calificacion || 0), 0);
      promedio_jurado = sum / p.votos_jurado.length;
    }

    return {
      proyecto_id: p.id,
      proyecto_nombre: p.nombre,
      categoria_id: p.categorias.id,
      categoria_nombre: p.categorias.nombre,
      orden_categoria: p.categorias.orden,
      total_votos_publico,
      promedio_jurado
    };
  });

  // 2. Agrupar para normalizar votos del público por categoría
  // La normalización consiste en: el proyecto con más votos en la categoría obtiene 5 puntos.
  const maxVotosPorCategoria: Record<number, number> = {};
  rawData.forEach(p => {
    if (!maxVotosPorCategoria[p.categoria_id] || p.total_votos_publico > maxVotosPorCategoria[p.categoria_id]) {
      maxVotosPorCategoria[p.categoria_id] = p.total_votos_publico;
    }
  });

  // 3. Calcular porcentajes finales
  const resultados: ResultadoFinal[] = rawData.map(p => {
    const maxVotos = maxVotosPorCategoria[p.categoria_id] || 0;
    // Puntaje público sobre 5
    const puntaje_publico_normalizado = maxVotos > 0 ? (p.total_votos_publico / maxVotos) * 5 : 0;
    
    // Ponderación: Público 40% (x 0.40), Jurado 60% (x 0.60)
    const puntaje_publico_ponderado = puntaje_publico_normalizado * 0.40;
    const puntaje_jurado_ponderado = p.promedio_jurado * 0.60;
    
    return {
      proyecto_id: p.proyecto_id,
      proyecto_nombre: p.proyecto_nombre,
      categoria_id: p.categoria_id,
      categoria_nombre: p.categoria_nombre,
      votos_publico: p.total_votos_publico,
      puntaje_publico_normalizado: Number(puntaje_publico_normalizado.toFixed(2)),
      puntaje_publico_ponderado: Number(puntaje_publico_ponderado.toFixed(2)),
      promedio_jurado: Number(p.promedio_jurado.toFixed(2)),
      puntaje_jurado_ponderado: Number(puntaje_jurado_ponderado.toFixed(2)),
      puntaje_final: Number((puntaje_publico_ponderado + puntaje_jurado_ponderado).toFixed(2))
    };
  });

  // 4. Ordenar por categoría y luego por puntaje final descendente
  return resultados.sort((a, b) => {
    const catA = rawData.find(p => p.proyecto_id === a.proyecto_id)?.orden_categoria ?? 0;
    const catB = rawData.find(p => p.proyecto_id === b.proyecto_id)?.orden_categoria ?? 0;
    if (catA !== catB) return catA - catB;
    return b.puntaje_final - a.puntaje_final;
  });
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────

export async function buscarAdmin(
  usuario: string
): Promise<{ id: number; usuario: string; password_hash: string; nombre: string; activo: boolean } | null> {
  const { data, error } = await supabase
    .from('administradores')
    .select('*')
    .eq('usuario', usuario)
    .maybeSingle();

  if (error || !data) return null;
  return data as any;
}

export async function obtenerAdminPorId(
  id: number
): Promise<{ id: number; usuario: string; password_hash: string; nombre: string; activo: boolean } | null> {
  const { data, error } = await supabase
    .from('administradores')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return data as any;
}

export async function actualizarPasswordAdmin(id: number, passwordHash: string): Promise<boolean> {
  const { error } = await supabase
    .from('administradores')
    .update({ password_hash: passwordHash })
    .eq('id', id);

  return !error;
}

export async function crearAdmin(usuario: string, passwordHash: string, nombre: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('administradores')
    .insert([{ usuario, password_hash: passwordHash, nombre }]);
  if (error) {
    if (error.code === '23505') return { success: false, error: 'El usuario ya existe.' };
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function cambiarEstadoAdmin(id: number, activo: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('administradores')
    .update({ activo })
    .eq('id', id);

  return !error;
}

export async function actualizarAdmin(id: number, data: { usuario: string; nombre: string; password_hash?: string }): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('administradores')
    .update(data)
    .eq('id', id);
  if (error) {
    if (error.code === '23505') return { success: false, error: 'El usuario ya existe.' };
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function eliminarAdmin(id: number): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('administradores')
    .delete()
    .eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function obtenerAdministradores(): Promise<{ id: number; usuario: string; nombre: string; activo: boolean }[]> {
  const { data, error } = await supabase
    .from('administradores')
    .select('id, usuario, nombre, activo')
    .order('id', { ascending: true });
  if (error || !data) return [];
  return data as any;
}

// ─── LOGS ─────────────────────────────────────────────────────────────────────

export interface LogSistema {
  id: number;
  admin_nombre: string;
  accion: string;
  detalle: string | null;
  fecha: string;
}

export async function registrarLog(admin_nombre: string, accion: string, detalle?: string): Promise<void> {
  await supabase
    .from('logs')
    .insert([{ admin_nombre, accion, detalle: detalle || null }]);
}

export async function obtenerLogs(limite: number = 50): Promise<LogSistema[]> {
  const { data, error } = await supabase
    .from('logs')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(limite);
  if (error || !data) return [];
  return data as LogSistema[];
}

// ─── HISTORIAL DE JORNADAS (CIERRE DE EVENTO) ─────────────────────────────────

export interface JornadaHistorial {
  id: number;
  nombre: string;
  fecha_cierre: string;
  total_asistentes: number;
  total_votos: number;
  snapshot_json: any;
  notas?: string;
}

export async function obtenerJornadasHistorial(): Promise<JornadaHistorial[]> {
  const { data, error } = await supabase
    .from('jornadas_historial')
    .select('*')
    .order('fecha_cierre', { ascending: false });

  if (error || !data) return [];
  return data as JornadaHistorial[];
}

export async function obtenerJornadaHistorialPorId(id: number): Promise<JornadaHistorial | null> {
  const { data, error } = await supabase
    .from('jornadas_historial')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return data as JornadaHistorial;
}

export async function crearJornadaHistorial(
  nombre: string,
  notas?: string
): Promise<{ success: boolean; error?: string; id?: number }> {
  try {
    const asistentes = await obtenerAsistentes();
    const resultados = await obtenerResultados();
    const categorias = await obtenerCategorias();
    const proyectos = await obtenerProyectos();

    const total_votos = resultados.reduce((sum, r) => sum + r.total_votos, 0);

    const snapshot = {
      fecha: new Date().toISOString(),
      asistentes: asistentes.length,
      votos: total_votos,
      categorias,
      proyectos,
      resultados,
      listaAsistentes: asistentes
    };

    const { data, error } = await supabase
      .from('jornadas_historial')
      .insert({
        nombre,
        total_asistentes: asistentes.length,
        total_votos,
        snapshot_json: snapshot,
        notas: notas || ''
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: data.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function actualizarJornadaHistorial(
  id: number,
  datos: Partial<Pick<JornadaHistorial, 'nombre' | 'notas'>>
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('jornadas_historial')
    .update(datos)
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function eliminarJornadaHistorial(
  id: number
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('jornadas_historial')
    .delete()
    .eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export interface JornadaActual {
  id: number;
  nombre: string;
  descripcion: string;
  fecha_inicio: string;
  estado?: 'ACTIVA' | 'CERRADA';
}

export async function obtenerJornadaActual(): Promise<JornadaActual> {
  try {
    const { data, error } = await supabase
      .from('jornada_actual')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) {
      return {
        id: 1,
        nombre: 'Votación EXIS 9.ª edición',
        descripcion: 'Elección Oficial de Proyectos y Prototipos — Unitrópico',
        fecha_inicio: new Date().toISOString(),
        estado: 'ACTIVA'
      };
    }
    return {
      ...data,
      estado: data.estado || 'ACTIVA'
    } as JornadaActual;
  } catch {
    return {
      id: 1,
      nombre: 'Votación EXIS 9.ª edición',
      descripcion: 'Elección Oficial de Proyectos y Prototipos — Unitrópico',
      fecha_inicio: new Date().toISOString(),
      estado: 'ACTIVA'
    };
  }
}

export async function guardarJornadaActual(
  nombre: string,
  descripcion: string,
  estado: 'ACTIVA' | 'CERRADA' = 'ACTIVA'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Intentar con la columna 'estado' (schema completo)
    const { error } = await supabase
      .from('jornada_actual')
      .upsert({
        id: 1,
        nombre: nombre || 'Votación EXIS 9.ª edición',
        descripcion: descripcion || '',
        fecha_inicio: new Date().toISOString(),
        estado,
      });

    if (error) {
      // Si el error es por la columna 'estado' faltante, reintentar sin ella
      if (error.message?.includes("'estado'") || error.message?.includes('estado')) {
        const { error: error2 } = await supabase
          .from('jornada_actual')
          .upsert({
            id: 1,
            nombre: nombre || 'Votación EXIS 9.ª edición',
            descripcion: descripcion || '',
            fecha_inicio: new Date().toISOString(),
          });
        if (error2) return { success: false, error: error2.message };
        return { success: true };
      }
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function actualizarEstadoJornadaActual(
  estado: 'ACTIVA' | 'CERRADA'
): Promise<{ success: boolean; error?: string }> {
  try {
    const actual = await obtenerJornadaActual();

    // Intentar con la columna 'estado' (schema completo)
    const { error } = await supabase
      .from('jornada_actual')
      .upsert({
        id: 1,
        nombre: actual.nombre,
        descripcion: actual.descripcion,
        fecha_inicio: actual.fecha_inicio || new Date().toISOString(),
        estado,
      });

    if (error) {
      // Si el error es por la columna 'estado' faltante, solo actualizar nombre/descripcion
      if (error.message?.includes("'estado'") || error.message?.includes('estado')) {
        // La columna no existe aún — operación exitosa sin cambiar estado
        return { success: true };
      }
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function obtenerEstadoRegistro(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('jornada_actual')
      .select('estado')
      .eq('id', 2)
      .maybeSingle();

    if (error || !data) return true; // Si no existe el registro de configuración (id: 2), por defecto está activo
    return data.estado === 'ACTIVA';
  } catch {
    return true;
  }
}

export async function actualizarEstadoRegistro(
  activo: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const estado = activo ? 'ACTIVA' : 'CERRADA';
    const { error } = await supabase
      .from('jornada_actual')
      .upsert({
        id: 2,
        nombre: 'Configuración de Sistema',
        descripcion: 'Control de Registro Independiente',
        fecha_inicio: new Date().toISOString(),
        estado,
      });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function reiniciarJornada(
  reiniciarAsistentes: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Eliminar todos los votos para iniciar nueva jornada limpia
    const { error: errVotos } = await supabase
      .from('votos')
      .delete()
      .neq('id', 0);

    if (errVotos) return { success: false, error: errVotos.message };

    // 2. Opcionalmente limpiar asistentes si quieren nuevo censo
    if (reiniciarAsistentes) {
      const { error: errAsist } = await supabase
        .from('asistentes')
        .delete()
        .neq('id', 0);
      if (errAsist) return { success: false, error: errAsist.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function obtenerEstadisticasEnVivo(): Promise<{ asistentes: number; votos: number }> {
  try {
    const [resAsistentes, resVotos] = await Promise.all([
      supabase.from('asistentes').select('*', { count: 'exact', head: true }),
      supabase.from('votos').select('*', { count: 'exact', head: true })
    ]);
    if (resAsistentes.error || resVotos.error || resAsistentes.count === null || resVotos.count === null) {
      const asistentes = await obtenerAsistentes();
      const resultados = await obtenerResultados();
      const totalVotos = resultados.reduce((sum, r) => sum + r.total_votos, 0);
      return { asistentes: asistentes.length, votos: totalVotos };
    }
    return {
      asistentes: resAsistentes.count,
      votos: resVotos.count,
    };
  } catch {
    return { asistentes: 0, votos: 0 };
  }
}

// ─── JURADOS ──────────────────────────────────────────────────────────────────

export async function obtenerPerfil(user_id: string): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user_id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Perfil;
}

export async function obtenerCriteriosEvaluacion(): Promise<CriterioEvaluacion[]> {
  const { data, error } = await supabase
    .from('criterios_evaluacion')
    .select('*')
    .order('id', { ascending: true });

  if (error) return [];
  return data as CriterioEvaluacion[];
}

export async function crearCriterioEvaluacion(data: { nombre: string; descripcion?: string; peso_porcentual?: number }): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('criterios_evaluacion')
    .insert([data]);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function actualizarCriterioEvaluacion(id: number, data: { nombre?: string; descripcion?: string; peso_porcentual?: number }): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('criterios_evaluacion')
    .update(data)
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function eliminarCriterioEvaluacion(id: number): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('criterios_evaluacion')
    .delete()
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function emitirVotosJurado(votos: VotoJurado[]): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('votos_jurado')
    .insert(votos);

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ya has calificado uno o más criterios de este proyecto.' };
    }
    return { success: false, error: error.message || 'Error al guardar las calificaciones.' };
  }

  return { success: true };
}

export async function obtenerProyectosVotadosPorJurado(jurado_id: string): Promise<number[]> {
  const { data, error } = await supabase
    .from('votos_jurado')
    .select('proyecto_id')
    .eq('jurado_id', jurado_id);

  if (error || !data) return [];
  // Retornar lista de IDs únicos de proyectos votados
  const ids = data.map(v => v.proyecto_id);
  return [...new Set(ids)];
}

export async function crearJurado(email: string, passwordHash: string, nombre: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Crear usuario en Auth de Supabase
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: passwordHash,
      email_confirm: true
    });

    if (authError || !authData.user) {
      if (authError?.message?.includes('already registered')) {
        return { success: false, error: 'El correo electrónico ya está registrado.' };
      }
      return { success: false, error: authError?.message || 'Error al crear usuario en Auth' };
    }

    // 2. Insertar en tabla perfiles
    const { error: profileError } = await supabase
      .from('perfiles')
      .insert([{
        id: authData.user.id,
        rol: 'jurado',
        nombre_completo: nombre,
        email: email
      }]);

    if (profileError) {
      // Intento de limpieza si falla
      await supabase.auth.admin.deleteUser(authData.user.id);
      return { success: false, error: profileError.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function obtenerJurados(): Promise<Perfil[]> {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('rol', 'jurado')
    .order('creado_en', { ascending: false });

  if (error || !data) return [];
  if (error || !data) return [];
  return data as Perfil[];
}

export async function eliminarJurado(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Esto debería eliminar el perfil también por ON DELETE CASCADE
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function actualizarJurado(id: string, data: { nombre_completo?: string; password?: string; email?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Actualizar credenciales en Auth si fueron provistas
    if (data.password || data.email) {
      const authUpdates: any = {};
      if (data.password) authUpdates.password = data.password;
      if (data.email) authUpdates.email = data.email;
      
      const { error: authError } = await supabase.auth.admin.updateUserById(id, authUpdates);
      if (authError) {
        return { success: false, error: authError.message };
      }
    }

    // 2. Actualizar perfil
    const profileUpdates: any = {};
    if (data.nombre_completo !== undefined) profileUpdates.nombre_completo = data.nombre_completo;
    if (data.email !== undefined) profileUpdates.email = data.email;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabase
        .from('perfiles')
        .update(profileUpdates)
        .eq('id', id);

      if (profileError) {
        return { success: false, error: profileError.message };
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

