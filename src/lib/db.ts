import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../../database/registro_votacion.db');
const SCHEMA_PATH = join(__dirname, '../../database/schema.sql');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    // Inicializar schema si no existe
    const schema = readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema);
  }
  return db;
}

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export interface Asistente {
  id: number;
  nombre: string;
  documento: string;
  dependencia: string;
  correo: string;
  fecha_registro: string;
}

export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
  activa: number;
  orden: number;
}

export interface Proyecto {
  id: number;
  nombre: string;
  descripcion: string | null;
  autores: string | null;
  categoria_id: number;
  activo: number;
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

export function registrarAsistente(data: {
  nombre: string;
  documento: string;
  dependencia: string;
  correo: string;
}): { success: boolean; id?: number; error?: string } {
  const db = getDb();
  try {
    const stmt = db.prepare(
      `INSERT INTO asistentes (nombre, documento, dependencia, correo) VALUES (?, ?, ?, ?)`
    );
    const result = stmt.run(data.nombre, data.documento, data.dependencia, data.correo);
    return { success: true, id: result.lastInsertRowid as number };
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { success: false, error: 'Ya existe un registro con ese documento y correo.' };
    }
    return { success: false, error: 'Error al registrar. Intenta de nuevo.' };
  }
}

export function buscarAsistente(identificador: string): Asistente | null {
  const db = getDb();
  const stmt = db.prepare(
    `SELECT * FROM asistentes WHERE documento = ? OR correo = ? LIMIT 1`
  );
  return (stmt.get(identificador, identificador) as Asistente) || null;
}

export function obtenerAsistentes(): Asistente[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM asistentes ORDER BY fecha_registro DESC`).all() as Asistente[];
}

// ─── CATEGORÍAS ───────────────────────────────────────────────────────────────

export function obtenerCategorias(): Categoria[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM categorias ORDER BY orden, id`).all() as Categoria[];
}

export function crearCategoria(data: { nombre: string; descripcion?: string; orden?: number }): number {
  const db = getDb();
  const result = db
    .prepare(`INSERT INTO categorias (nombre, descripcion, orden) VALUES (?, ?, ?)`)
    .run(data.nombre, data.descripcion || null, data.orden || 0);
  return result.lastInsertRowid as number;
}

export function actualizarCategoria(
  id: number,
  data: { nombre: string; descripcion?: string; orden?: number; activa?: number }
): void {
  const db = getDb();
  db.prepare(
    `UPDATE categorias SET nombre=?, descripcion=?, orden=?, activa=? WHERE id=?`
  ).run(data.nombre, data.descripcion || null, data.orden || 0, data.activa ?? 1, id);
}

export function eliminarCategoria(id: number): void {
  const db = getDb();
  db.prepare(`DELETE FROM categorias WHERE id=?`).run(id);
}

// ─── PROYECTOS ────────────────────────────────────────────────────────────────

export function obtenerProyectos(): Proyecto[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT p.*, c.nombre as categoria_nombre
       FROM proyectos p
       JOIN categorias c ON c.id = p.categoria_id
       WHERE p.activo = 1
       ORDER BY c.orden, p.nombre`
    )
    .all() as Proyecto[];
}

export function obtenerProyectoPorId(id: number): Proyecto | null {
  const db = getDb();
  return (
    (db
      .prepare(
        `SELECT p.*, c.nombre as categoria_nombre
         FROM proyectos p
         JOIN categorias c ON c.id = p.categoria_id
         WHERE p.id = ?`
      )
      .get(id) as Proyecto) || null
  );
}

export function crearProyecto(data: {
  nombre: string;
  descripcion?: string;
  autores?: string;
  categoria_id: number;
}): number {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO proyectos (nombre, descripcion, autores, categoria_id) VALUES (?, ?, ?, ?)`
    )
    .run(data.nombre, data.descripcion || null, data.autores || null, data.categoria_id);
  return result.lastInsertRowid as number;
}

export function actualizarProyecto(
  id: number,
  data: { nombre: string; descripcion?: string; autores?: string; categoria_id: number }
): void {
  const db = getDb();
  db.prepare(
    `UPDATE proyectos SET nombre=?, descripcion=?, autores=?, categoria_id=? WHERE id=?`
  ).run(data.nombre, data.descripcion || null, data.autores || null, data.categoria_id, id);
}

export function eliminarProyecto(id: number): void {
  const db = getDb();
  db.prepare(`UPDATE proyectos SET activo=0 WHERE id=?`).run(id);
}

// ─── VOTOS ────────────────────────────────────────────────────────────────────

export function obtenerVotosDeAsistente(asistente_id: number): Voto[] {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM votos WHERE asistente_id = ?`)
    .all(asistente_id) as Voto[];
}

export function emitirVoto(data: {
  asistente_id: number;
  proyecto_id: number;
  categoria_id: number;
}): { success: boolean; error?: string } {
  const db = getDb();
  try {
    db.prepare(
      `INSERT INTO votos (asistente_id, proyecto_id, categoria_id) VALUES (?, ?, ?)`
    ).run(data.asistente_id, data.proyecto_id, data.categoria_id);
    return { success: true };
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return { success: false, error: 'Ya votaste en esta categoría.' };
    }
    return { success: false, error: 'Error al emitir voto.' };
  }
}

export function obtenerResultados(): ResultadoVoto[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT p.id as proyecto_id, p.nombre as proyecto_nombre,
              c.id as categoria_id, c.nombre as categoria_nombre,
              COUNT(v.id) as total_votos
       FROM proyectos p
       JOIN categorias c ON c.id = p.categoria_id
       LEFT JOIN votos v ON v.proyecto_id = p.id
       WHERE p.activo = 1
       GROUP BY p.id
       ORDER BY c.orden, total_votos DESC`
    )
    .all() as ResultadoVoto[];
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────

export function buscarAdmin(usuario: string): { id: number; usuario: string; password_hash: string; nombre: string } | null {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM administradores WHERE usuario = ? AND activo = 1`)
    .get(usuario) as any || null;
}
