const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function query(text, params) {
  const client = await pool.connect();
  try { return await client.query(text, params); }
  finally { client.release(); }
}

async function initDB() {
  await query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol TEXT NOT NULL DEFAULT 'usuario',
      departamento TEXT,
      activo INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS oficios (
      id SERIAL PRIMARY KEY,
      numero TEXT NOT NULL,
      tema TEXT NOT NULL,
      descripcion TEXT,
      fecha_inicio TEXT,
      fecha_despacho TEXT,
      fecha_respuesta TEXT,
      fecha_terminacion TEXT,
      asignado_a INTEGER,
      prioridad TEXT DEFAULT 'normal',
      departamento TEXT,
      observaciones TEXT,
      requiere_respuesta BOOLEAN DEFAULT false,
      estado TEXT DEFAULT 'pendiente',
      etapa TEXT DEFAULT 'recibido',
      creado_por INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS instrucciones (
      id SERIAL PRIMARY KEY,
      folio TEXT NOT NULL,
      instruccion TEXT NOT NULL,
      fecha TEXT,
      asignado_a INTEGER,
      prioridad TEXT DEFAULT 'normal',
      estado TEXT DEFAULT 'pendiente',
      observaciones TEXT,
      convertido_oficio INTEGER,
      creado_por INTEGER,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS movimientos (
      id SERIAL PRIMARY KEY,
      oficio_id INTEGER,
      instruccion_id INTEGER,
      etapa_anterior TEXT,
      etapa_nueva TEXT,
      comentario TEXT,
      usuario_id INTEGER,
      fecha TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS historial (
      id SERIAL PRIMARY KEY,
      usuario_id INTEGER,
      accion TEXT NOT NULL,
      detalle TEXT,
      tabla TEXT,
      registro_id INTEGER,
      fecha TIMESTAMP DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS plantillas (
      id SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      tipo TEXT DEFAULT 'pdf',
      contenido TEXT,
      activa BOOLEAN DEFAULT true,
      creado_por INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  const admin = await query('SELECT id FROM usuarios WHERE email = $1', ['admin@sitt.gob.mx']);
  if (admin.rows.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await query('INSERT INTO usuarios (nombre, email, password, rol, departamento) VALUES ($1,$2,$3,$4,$5)',
      ['Administrador SITT', 'admin@sitt.gob.mx', hash, 'admin', 'Dirección General']);
    console.log('Admin creado: admin@sitt.gob.mx / admin123');
  }

  const plant = await query('SELECT id FROM plantillas WHERE nombre = $1', ['Reporte Oficial SITT']);
  if (plant.rows.length === 0) {
    const contenidoDefault = JSON.stringify({
      encabezado: 'H. AYUNTAMIENTO DE TIJUANA XXV — SITT',
      pie: 'Sistema de Transporte Masivo Urbano de Pasajeros de Tijuana',
      campos: ['numero','tema','descripcion','fecha_inicio','fecha_despacho','estado','etapa','asignado','departamento','observaciones']
    });
    await query('INSERT INTO plantillas (nombre, tipo, contenido) VALUES ($1,$2,$3)',
      ['Reporte Oficial SITT', 'pdf', contenidoDefault]);
  }

  console.log('Base de datos PostgreSQL lista');
}

module.exports = { query, initDB };
