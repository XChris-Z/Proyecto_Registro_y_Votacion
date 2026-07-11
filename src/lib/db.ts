import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

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
    .insert([{ nombre: data.nombre, descripcion: data.descripcion || null, orden: data.orden || 0 }])
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

// ─── ADMIN ────────────────────────────────────────────────────────────────────

export async function buscarAdmin(
  usuario: string
): Promise<{ id: number; usuario: string; password_hash: string; nombre: string } | null> {
  const { data, error } = await supabase
    .from('administradores')
    .select('*')
    .eq('usuario', usuario)
    .eq('activo', true)
    .maybeSingle();

  if (error || !data) return null;
  return data as any;
}
