-- ============================================================
-- SISTEMA DE REGISTRO Y VOTACIÓN
-- Schema SQL para PostgreSQL (Supabase)
-- Ejecuta este script en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- Tabla de asistentes / registrados
CREATE TABLE IF NOT EXISTS asistentes (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    documento TEXT NOT NULL,
    dependencia TEXT NOT NULL,
    correo TEXT NOT NULL,
    telefono TEXT,
    fecha_registro TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(documento, correo)
);

-- Tabla de categorías de proyectos
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    activa BOOLEAN DEFAULT TRUE,
    orden INTEGER DEFAULT 0
);

-- Tabla de proyectos candidatos
CREATE TABLE IF NOT EXISTS proyectos (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    autores TEXT,
    categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de votos emitidos
CREATE TABLE IF NOT EXISTS votos (
    id SERIAL PRIMARY KEY,
    asistente_id INTEGER NOT NULL REFERENCES asistentes(id),
    proyecto_id INTEGER NOT NULL REFERENCES proyectos(id),
    categoria_id INTEGER NOT NULL REFERENCES categorias(id),
    fecha_voto TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(asistente_id, categoria_id)
);

-- Tabla de administradores
CREATE TABLE IF NOT EXISTS administradores (
    id SERIAL PRIMARY KEY,
    usuario TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    nombre TEXT,
    activo BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- DATOS INICIALES
-- ============================================================

-- Categorías de ejemplo (el admin puede modificarlas)
INSERT INTO categorias (nombre, descripcion, orden) VALUES
    ('Tecnología e Innovación', 'Proyectos de desarrollo tecnológico e innovación', 1),
    ('Ciencia y Medio Ambiente', 'Proyectos de investigación científica y sostenibilidad', 2),
    ('Ciencias Sociales y Humanidades', 'Proyectos de impacto social y humanístico', 3)
ON CONFLICT DO NOTHING;

-- Administrador por defecto: usuario=admin, password=admin123
-- IMPORTANTE: Cambia esta contraseña en producción desde el panel admin
INSERT INTO administradores (usuario, password_hash, nombre) VALUES
    ('admin', '$2b$10$ThuV.Kq6mBzV2.wc7HuX3.J3fMtNJtwcZA3G5.vVtvbCa/yP1hISy', 'Administrador')
ON CONFLICT DO NOTHING;

-- ============================================================
-- DESHABILITAR Row Level Security (RLS) para acceso desde servidor
-- NOTA: Solo usar service_role key en el servidor, nunca en cliente
-- ============================================================
ALTER TABLE asistentes DISABLE ROW LEVEL SECURITY;
ALTER TABLE categorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE proyectos DISABLE ROW LEVEL SECURITY;
ALTER TABLE votos DISABLE ROW LEVEL SECURITY;
ALTER TABLE administradores DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- TABLA DE HISTORIAL DE JORNADAS (CIERRE DE EVENTO)
-- ============================================================
CREATE TABLE IF NOT EXISTS jornadas_historial (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    fecha_cierre TIMESTAMPTZ DEFAULT NOW(),
    total_asistentes INTEGER DEFAULT 0,
    total_votos INTEGER DEFAULT 0,
    snapshot_json JSONB NOT NULL,
    notas TEXT
);

ALTER TABLE jornadas_historial DISABLE ROW LEVEL SECURITY;

