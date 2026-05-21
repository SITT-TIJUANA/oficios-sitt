const express = require('express');
const router = express.Router();
const { query } = require('../db/database');
const bcrypt = require('bcryptjs');

const ETAPAS = ['recibido','en_proceso','firmado','requiere_respuesta','sin_respuesta','reiterar','respondido','terminado','archivado'];

function auth(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: 'No autorizado' });
  next();
}
function adminOnly(req, res, next) {
  if (req.session.rol !== 'admin') return res.status(403).json({ error: 'Solo administrador' });
  next();
}
async function log(userId, accion, detalle, tabla, id) {
  try { await query('INSERT INTO historial (usuario_id,accion,detalle,tabla,registro_id) VALUES ($1,$2,$3,$4,$5)', [userId,accion,detalle,tabla,id]); } catch(e){}
}

// ── AUTH ──
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const r = await query('SELECT * FROM usuarios WHERE email=$1 AND activo=1', [email]);
  const u = r.rows[0];
  if (!u || !bcrypt.compareSync(password, u.password)) return res.status(401).json({ error: 'Credenciales incorrectas' });
  req.session.userId = u.id;
  req.session.nombre = u.nombre;
  req.session.rol = u.rol;
  req.session.departamento = u.departamento;
  res.json({ ok: true, nombre: u.nombre, rol: u.rol, departamento: u.departamento });
});
router.post('/logout', (req, res) => { req.session.destroy(); res.json({ ok: true }); });
router.get('/me', auth, (req, res) => res.json({ nombre: req.session.nombre, rol: req.session.rol, departamento: req.session.departamento }));
router.post('/cambiar-password', auth, async (req, res) => {
  const { actual, nueva } = req.body;
  if (!nueva || nueva.length < 6) return res.status(400).json({ error: 'Mínimo 6 caracteres' });
  const r = await query('SELECT * FROM usuarios WHERE id=$1', [req.session.userId]);
  if (!bcrypt.compareSync(actual, r.rows[0].password)) return res.status(401).json({ error: 'Contraseña actual incorrecta' });
  await query('UPDATE usuarios SET password=$1 WHERE id=$2', [bcrypt.hashSync(nueva, 10), req.session.userId]);
  res.json({ ok: true });
});

// ── USUARIOS ──
router.get('/usuarios', auth, async (req, res) => {
  const r = await query('SELECT id,nombre,email,rol,departamento,activo,created_at FROM usuarios ORDER BY nombre');
  res.json(r.rows);
});
router.post('/usuarios', auth, adminOnly, async (req, res) => {
  const { nombre, email, password, rol, departamento } = req.body;
  try {
    const r = await query('INSERT INTO usuarios (nombre,email,password,rol,departamento) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [nombre, email, bcrypt.hashSync(password, 10), rol||'usuario', departamento||'']);
    await log(req.session.userId, 'Nuevo usuario', nombre, 'usuarios', r.rows[0].id);
    res.json({ ok: true });
  } catch(e) { res.status(400).json({ error: 'El correo ya existe' }); }
});
router.put('/usuarios/:id', auth, adminOnly, async (req, res) => {
  const { rol, activo, departamento } = req.body;
  if (rol !== undefined) await query('UPDATE usuarios SET rol=$1 WHERE id=$2', [rol, req.params.id]);
  if (activo !== undefined) await query('UPDATE usuarios SET activo=$1 WHERE id=$2', [activo, req.params.id]);
  if (departamento !== undefined) await query('UPDATE usuarios SET departamento=$1 WHERE id=$2', [departamento, req.params.id]);
  res.json({ ok: true });
});

// ── DASHBOARD ──
router.get('/dashboard', auth, async (req, res) => {
  const pendientes = await query(`SELECT COUNT(*) as c FROM oficios WHERE estado='pendiente'`);
  const enProceso = await query(`SELECT COUNT(*) as c FROM oficios WHERE etapa NOT IN ('archivado','terminado') AND estado='pendiente'`);
  const terminados = await query(`SELECT COUNT(*) as c FROM oficios WHERE etapa='terminado' OR etapa='archivado'`);
  const archivados = await query(`SELECT COUNT(*) as c FROM oficios WHERE etapa='archivado'`);
  const instrPend = await query(`SELECT COUNT(*) as c FROM instrucciones WHERE estado='pendiente'`);
  const sinResp = await query(`SELECT COUNT(*) as c FROM oficios WHERE etapa='sin_respuesta'`);
  const recientes = await query(`SELECT o.*, u.nombre as asignado_nombre FROM oficios o LEFT JOIN usuarios u ON o.asignado_a=u.id ORDER BY o.updated_at DESC LIMIT 8`);
  const porEtapa = await query(`SELECT etapa, COUNT(*) as total FROM oficios GROUP BY etapa ORDER BY etapa`);
  res.json({
    pendientes: parseInt(pendientes.rows[0].c),
    enProceso: parseInt(enProceso.rows[0].c),
    terminados: parseInt(terminados.rows[0].c),
    archivados: parseInt(archivados.rows[0].c),
    instruccionesPendientes: parseInt(instrPend.rows[0].c),
    sinRespuesta: parseInt(sinResp.rows[0].c),
    recientes: recientes.rows,
    porEtapa: porEtapa.rows
  });
});

// ── OFICIOS ──
router.get('/oficios', auth, async (req, res) => {
  const { estado, etapa, busqueda, asignado, prioridad } = req.query;
  let q = `SELECT o.*, u.nombre as asignado_nombre, c.nombre as creador_nombre FROM oficios o LEFT JOIN usuarios u ON o.asignado_a=u.id LEFT JOIN usuarios c ON o.creado_por=c.id WHERE 1=1`;
  const params = [];
  if (estado) { q += ` AND o.estado=$${params.length+1}`; params.push(estado); }
  if (etapa) { q += ` AND o.etapa=$${params.length+1}`; params.push(etapa); }
  if (prioridad) { q += ` AND o.prioridad=$${params.length+1}`; params.push(prioridad); }
  if (asignado) { q += ` AND o.asignado_a=$${params.length+1}`; params.push(asignado); }
  if (busqueda) { q += ` AND (o.numero ILIKE $${params.length+1} OR o.tema ILIKE $${params.length+1} OR o.descripcion ILIKE $${params.length+1})`; params.push(`%${busqueda}%`); }
  q += ' ORDER BY o.created_at DESC';
  const r = await query(q, params);
  res.json(r.rows);
});

router.get('/oficios/:id', auth, async (req, res) => {
  const r = await query(`SELECT o.*, u.nombre as asignado_nombre FROM oficios o LEFT JOIN usuarios u ON o.asignado_a=u.id WHERE o.id=$1`, [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: 'No encontrado' });
  const movs = await query(`SELECT m.*, u.nombre as usuario_nombre FROM movimientos m LEFT JOIN usuarios u ON m.usuario_id=u.id WHERE m.oficio_id=$1 ORDER BY m.fecha DESC`, [req.params.id]);
  res.json({ ...r.rows[0], movimientos: movs.rows });
});

router.post('/oficios', auth, async (req, res) => {
  const { numero, tema, descripcion, fecha_inicio, fecha_despacho, asignado_a, prioridad, departamento, observaciones, requiere_respuesta } = req.body;
  if (!numero || !tema) return res.status(400).json({ error: 'Número y tema son requeridos' });
  const r = await query(
    `INSERT INTO oficios (numero,tema,descripcion,fecha_inicio,fecha_despacho,asignado_a,prioridad,departamento,observaciones,requiere_respuesta,creado_por) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [numero, tema, descripcion||'', fecha_inicio||null, fecha_despacho||null, asignado_a||null, prioridad||'normal', departamento||'', observaciones||'', requiere_respuesta||false, req.session.userId]
  );
  await query('INSERT INTO movimientos (oficio_id,etapa_anterior,etapa_nueva,comentario,usuario_id) VALUES ($1,$2,$3,$4,$5)',
    [r.rows[0].id, null, 'recibido', 'Oficio registrado', req.session.userId]);
  await log(req.session.userId, 'Oficio registrado', `No. ${numero} — ${tema}`, 'oficios', r.rows[0].id);
  res.json({ ok: true, id: r.rows[0].id });
});

router.put('/oficios/:id', auth, async (req, res) => {
  const { numero, tema, descripcion, fecha_inicio, fecha_despacho, fecha_respuesta, fecha_terminacion, asignado_a, prioridad, departamento, observaciones, requiere_respuesta } = req.body;
  await query(`UPDATE oficios SET numero=$1,tema=$2,descripcion=$3,fecha_inicio=$4,fecha_despacho=$5,fecha_respuesta=$6,fecha_terminacion=$7,asignado_a=$8,prioridad=$9,departamento=$10,observaciones=$11,requiere_respuesta=$12,updated_at=NOW() WHERE id=$13`,
    [numero, tema, descripcion, fecha_inicio||null, fecha_despacho||null, fecha_respuesta||null, fecha_terminacion||null, asignado_a||null, prioridad, departamento, observaciones, requiere_respuesta||false, req.params.id]);
  await log(req.session.userId, 'Oficio editado', `ID ${req.params.id}`, 'oficios', req.params.id);
  res.json({ ok: true });
});

router.put('/oficios/:id/etapa', auth, async (req, res) => {
  const { etapa, comentario } = req.body;
  if (!ETAPAS.includes(etapa)) return res.status(400).json({ error: 'Etapa inválida' });
  const ofR = await query('SELECT * FROM oficios WHERE id=$1', [req.params.id]);
  const of = ofR.rows[0];
  if (!of) return res.status(404).json({ error: 'No encontrado' });
  const estado = ['terminado','archivado'].includes(etapa) ? 'realizado' : 'pendiente';
  await query('UPDATE oficios SET etapa=$1, estado=$2, updated_at=NOW() WHERE id=$3', [etapa, estado, req.params.id]);
  await query('INSERT INTO movimientos (oficio_id,etapa_anterior,etapa_nueva,comentario,usuario_id) VALUES ($1,$2,$3,$4,$5)',
    [req.params.id, of.etapa, etapa, comentario||'', req.session.userId]);
  await log(req.session.userId, `Etapa: ${of.etapa} → ${etapa}`, comentario||'', 'oficios', req.params.id);
  res.json({ ok: true });
});

router.delete('/oficios/:id', auth, adminOnly, async (req, res) => {
  await query('DELETE FROM movimientos WHERE oficio_id=$1', [req.params.id]);
  await query('DELETE FROM oficios WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ── INSTRUCCIONES ──
router.get('/instrucciones', auth, async (req, res) => {
  const { estado, busqueda } = req.query;
  let q = `SELECT i.*, u.nombre as asignado_nombre FROM instrucciones i LEFT JOIN usuarios u ON i.asignado_a=u.id WHERE 1=1`;
  const params = [];
  if (estado) { q += ` AND i.estado=$${params.length+1}`; params.push(estado); }
  if (busqueda) { q += ` AND (i.folio ILIKE $${params.length+1} OR i.instruccion ILIKE $${params.length+1})`; params.push(`%${busqueda}%`); }
  q += ' ORDER BY i.created_at DESC';
  const r = await query(q, params);
  res.json(r.rows);
});

router.post('/instrucciones', auth, async (req, res) => {
  const { folio, instruccion, fecha, asignado_a, prioridad, observaciones } = req.body;
  if (!folio || !instruccion) return res.status(400).json({ error: 'Folio e instrucción son requeridos' });
  const r = await query('INSERT INTO instrucciones (folio,instruccion,fecha,asignado_a,prioridad,observaciones,creado_por) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
    [folio, instruccion, fecha||null, asignado_a||null, prioridad||'normal', observaciones||'', req.session.userId]);
  await log(req.session.userId, 'Instrucción registrada', `Folio: ${folio}`, 'instrucciones', r.rows[0].id);
  res.json({ ok: true, id: r.rows[0].id });
});

router.put('/instrucciones/:id', auth, async (req, res) => {
  const { instruccion, fecha, asignado_a, prioridad, estado, observaciones } = req.body;
  await query('UPDATE instrucciones SET instruccion=$1,fecha=$2,asignado_a=$3,prioridad=$4,estado=$5,observaciones=$6,updated_at=NOW() WHERE id=$7',
    [instruccion, fecha||null, asignado_a||null, prioridad, estado, observaciones||'', req.params.id]);
  res.json({ ok: true });
});

router.post('/instrucciones/:id/convertir', auth, async (req, res) => {
  const instrR = await query('SELECT * FROM instrucciones WHERE id=$1', [req.params.id]);
  const instr = instrR.rows[0];
  if (!instr) return res.status(404).json({ error: 'No encontrada' });
  const numero = `OF-${Date.now().toString().slice(-6)}`;
  const r = await query('INSERT INTO oficios (numero,tema,descripcion,asignado_a,prioridad,creado_por) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [numero, instr.instruccion, `Generado desde instrucción ${instr.folio}`, instr.asignado_a, instr.prioridad, req.session.userId]);
  await query('UPDATE instrucciones SET convertido_oficio=$1, estado=$2 WHERE id=$3', [r.rows[0].id, 'convertida', req.params.id]);
  await query('INSERT INTO movimientos (oficio_id,etapa_anterior,etapa_nueva,comentario,usuario_id) VALUES ($1,$2,$3,$4,$5)',
    [r.rows[0].id, null, 'recibido', `Convertido desde instrucción ${instr.folio}`, req.session.userId]);
  await log(req.session.userId, 'Instrucción convertida a oficio', `Instrucción ${instr.folio} → Oficio ${numero}`, 'instrucciones', instr.id);
  res.json({ ok: true, oficio_id: r.rows[0].id, numero });
});

router.delete('/instrucciones/:id', auth, adminOnly, async (req, res) => {
  await query('DELETE FROM instrucciones WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ── PLANTILLAS ──
router.get('/plantillas', auth, async (req, res) => {
  const r = await query('SELECT * FROM plantillas ORDER BY created_at DESC');
  res.json(r.rows);
});

router.put('/plantillas/:id', auth, adminOnly, async (req, res) => {
  const { nombre, contenido } = req.body;
  await query('UPDATE plantillas SET nombre=$1, contenido=$2 WHERE id=$3', [nombre, JSON.stringify(contenido), req.params.id]);
  res.json({ ok: true });
});

// ── HISTORIAL ──
router.get('/historial', auth, async (req, res) => {
  const r = await query(`SELECT h.*, u.nombre as usuario_nombre FROM historial h LEFT JOIN usuarios u ON h.usuario_id=u.id ORDER BY h.fecha DESC LIMIT 100`);
  res.json(r.rows);
});

// ── EXPORTAR PDF ──
router.get('/exportar/pdf/:id', auth, async (req, res) => {
  const PDFDocument = require('pdfkit');
  const ofR = await query(`SELECT o.*, u.nombre as asignado_nombre FROM oficios o LEFT JOIN usuarios u ON o.asignado_a=u.id WHERE o.id=$1`, [req.params.id]);
  const of = ofR.rows[0];
  if (!of) return res.status(404).json({ error: 'No encontrado' });
  const movs = await query(`SELECT m.*, u.nombre as usuario_nombre FROM movimientos m LEFT JOIN usuarios u ON m.usuario_id=u.id WHERE m.oficio_id=$1 ORDER BY m.fecha ASC`, [req.params.id]);

  const plantR = await query('SELECT * FROM plantillas WHERE activa=true LIMIT 1');
  const plantilla = plantR.rows[0] ? JSON.parse(plantR.rows[0].contenido) : {};

  const doc = new PDFDocument({ margin: 60, size: 'LETTER' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=oficio-${of.numero}.pdf`);
  doc.pipe(res);

  // Header
  doc.rect(0, 0, 612, 80).fill('#6B1A2A');
  doc.fontSize(13).fillColor('#C9A227').font('Helvetica-Bold')
    .text(plantilla.encabezado || 'H. AYUNTAMIENTO DE TIJUANA XXV — SITT', 60, 20, { align: 'center', width: 492 });
  doc.fontSize(10).fillColor('#fff').font('Helvetica')
    .text('REPORTE DE OFICIO', 60, 45, { align: 'center', width: 492 });
  doc.fillColor('#000').font('Helvetica');

  let y = 100;
  // Línea decorativa
  doc.rect(60, y, 492, 2).fill('#6B1A2A'); y += 12;

  const campo = (label, val) => {
    if (!val) return;
    doc.fontSize(9).fillColor('#6B1A2A').font('Helvetica-Bold').text(label, 60, y, { width: 150 });
    doc.fontSize(9).fillColor('#000').font('Helvetica').text(val || '—', 220, y, { width: 332 });
    y += 18;
  };

  campo('Número de Oficio:', of.numero);
  campo('Tema:', of.tema);
  campo('Descripción:', of.descripcion);
  campo('Departamento:', of.departamento);
  campo('Asignado a:', of.asignado_nombre);
  campo('Prioridad:', of.prioridad?.toUpperCase());
  campo('Fecha de inicio:', of.fecha_inicio);
  campo('Fecha de despacho:', of.fecha_despacho);
  campo('Fecha de respuesta:', of.fecha_respuesta);
  campo('Fecha de terminación:', of.fecha_terminacion);
  campo('Requiere respuesta:', of.requiere_respuesta ? 'Sí' : 'No');
  campo('Etapa actual:', of.etapa?.replace(/_/g,' ').toUpperCase());
  campo('Estado:', of.estado?.toUpperCase());
  campo('Observaciones:', of.observaciones);

  y += 10;
  doc.rect(60, y, 492, 2).fill('#6B1A2A'); y += 14;
  doc.fontSize(11).fillColor('#6B1A2A').font('Helvetica-Bold').text('HISTORIAL DE MOVIMIENTOS', 60, y); y += 18;

  movs.rows.forEach(m => {
    if (y > 680) { doc.addPage(); y = 60; }
    doc.fontSize(8).fillColor('#000').font('Helvetica')
      .text(`• ${new Date(m.fecha).toLocaleString('es-MX')} — ${m.usuario_nombre||'Sistema'}: ${m.etapa_anterior||'inicio'} → ${m.etapa_nueva}${m.comentario ? ' | '+m.comentario : ''}`, 60, y, { width: 492 });
    y += 14;
  });

  y += 20;
  doc.rect(60, y, 492, 1).fill('#ddd'); y += 14;
  doc.fontSize(8).fillColor('#888').text(plantilla.pie || 'Sistema de Transporte Masivo Urbano de Pasajeros de Tijuana', 60, y, { align: 'center', width: 492 });
  doc.fontSize(8).text(`Generado el ${new Date().toLocaleString('es-MX')}`, 60, y+12, { align: 'center', width: 492 });

  doc.end();
});

// ── EXPORTAR EXCEL ──
router.get('/exportar/excel', auth, async (req, res) => {
  const { tipo } = req.query;
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SITT Tijuana';
  const ws = wb.addWorksheet(tipo === 'instrucciones' ? 'Instrucciones' : 'Oficios');

  ws.mergeCells('A1:J1');
  ws.getCell('A1').value = 'H. AYUNTAMIENTO DE TIJUANA — SITT · Reporte de ' + (tipo === 'instrucciones' ? 'Instrucciones' : 'Oficios');
  ws.getCell('A1').font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B1A2A' } };
  ws.getCell('A1').alignment = { horizontal: 'center' };
  ws.addRow([]);

  if (tipo === 'instrucciones') {
    const h = ws.addRow(['Folio','Instrucción','Fecha','Asignado a','Prioridad','Estado','Observaciones']);
    h.eachCell(c => { c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF6B1A2A'}}; c.font={bold:true,color:{argb:'FFFFFFFF'}}; });
    const r = await query(`SELECT i.*, u.nombre as asignado_nombre FROM instrucciones i LEFT JOIN usuarios u ON i.asignado_a=u.id ORDER BY i.created_at DESC`);
    r.rows.forEach(i => ws.addRow([i.folio, i.instruccion, i.fecha||'', i.asignado_nombre||'—', i.prioridad, i.estado, i.observaciones||'']));
    ws.columns = [{width:14},{width:40},{width:14},{width:20},{width:12},{width:14},{width:30}];
  } else {
    const h = ws.addRow(['No. Oficio','Tema','Departamento','Asignado a','Prioridad','Etapa','Estado','F. Inicio','F. Despacho','Observaciones']);
    h.eachCell(c => { c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF6B1A2A'}}; c.font={bold:true,color:{argb:'FFFFFFFF'}}; });
    const r = await query(`SELECT o.*, u.nombre as asignado_nombre FROM oficios o LEFT JOIN usuarios u ON o.asignado_a=u.id ORDER BY o.created_at DESC`);
    r.rows.forEach(o => {
      const color = o.etapa==='archivado'?'FFEAF3DE':o.etapa==='sin_respuesta'?'FFFCEBEB':o.etapa==='terminado'?'FFE8F5EF':'FFFFFFFF';
      const row = ws.addRow([o.numero,o.tema,o.departamento||'',o.asignado_nombre||'—',o.prioridad,o.etapa?.replace(/_/g,' '),o.estado,o.fecha_inicio||'',o.fecha_despacho||'',o.observaciones||'']);
      row.eachCell(c => { c.fill={type:'pattern',pattern:'solid',fgColor:{argb:color}}; });
    });
    ws.columns = [{width:16},{width:35},{width:18},{width:20},{width:12},{width:18},{width:12},{width:14},{width:14},{width:30}];
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=reporte-${tipo||'oficios'}-${Date.now()}.xlsx`);
  await wb.xlsx.write(res);
  res.end();
});

module.exports = router;
