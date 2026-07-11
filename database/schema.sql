-- ============================================================
-- SISTEMA DE REGISTRO Y VOTACIÓN
-- Schema SQL compatible con SQLite
-- ============================================================

-- Tabla de asistentes / registrados
CREATE TABLE IF NOT EXISTS asistentes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    documento TEXT NOT NULL,
    dependencia TEXT NOT NULL,
    correo TEXT NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(documento, correo)
);

-- Tabla de categorías de proyectos
CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    activa INTEGER DEFAULT 1,
    orden INTEGER DEFAULT 0
);

-- Tabla de proyectos candidatos
CREATE TABLE IF NOT EXISTS proyectos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    autores TEXT,
    categoria_id INTEGER NOT NULL,
    activo INTEGER DEFAULT 1,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE
);

-- Tabla de votos emitidos
CREATE TABLE IF NOT EXISTS votos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asistente_id INTEGER NOT NULL,
    proyecto_id INTEGER NOT NULL,
    categoria_id INTEGER NOT NULL,
    fecha_voto DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(asistente_id, categoria_id),
    FOREIGN KEY (asistente_id) REFERENCES asistentes(id),
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id),
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

-- Tabla de administradores
CREATE TABLE IF NOT EXISTS administradores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    nombre TEXT,
    activo INTEGER DEFAULT 1
);

-- ============================================================
-- DATOS INICIALES
-- ============================================================

-- Categorías de ejemplo (el admin puede modificarlas)
INSERT OR IGNORE INTO categorias (id, nombre, descripcion, orden) VALUES
    (1, 'Tecnología e Innovación', 'Proyectos de desarrollo tecnológico e innovación', 1),
    (2, 'Ciencia y Medio Ambiente', 'Proyectos de investigación científica y sostenibilidad', 2),
    (3, 'Ciencias Sociales y Humanidades', 'Proyectos de impacto social y humanístico', 3);

-- Administrador por defecto: usuario=admin, password=admin123
-- IMPORTANTE: Cambia esta contraseña en producción
INSERT OR IGNORE INTO administradores (usuario, password_hash, nombre) VALUES
    ('admin', '$2b$10$ewyvVKYYGuMDRE9inARWW.qmW58uhRifsspMQ0O0OjhdbQbdSs1M.', 'Administrador');
