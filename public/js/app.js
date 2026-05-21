let userRol = '';
let usuariosList = [];
let currentSection = 'dashboard';
let currentInstrEstado = 'pendiente';
let chartEtapas = null;
let flujoOficioActual = null;

const ETAPAS_INFO = {
  recibido:            { label:'Recibido',          icon:'ti-inbox',         class:'done' },
  en_proceso:          { label:'En proceso',         icon:'ti-loader',        class:'active' },
  firmado:             { label:'Firmado',            icon:'ti-pencil',        class:'gold' },
  requiere_respuesta:  { label:'Req. respuesta',     icon:'ti-help',          class:'warn' },
  sin_respuesta:       { label:'Sin respuesta',      icon:'ti-alert-triangle',class:'warn' },
  reiterar:            { label:'Reiterar',           icon:'ti-refresh',       class:'warn' },
  respondido:          { label:'Respondido',         icon:'ti-mail-check',    class:'done' },
  terminado:           { label:'Terminado',          icon:'ti-check',         class:'done' },
  archivado:           { label:'Archivado',          icon:'ti-archive',       class:'done' }
};
const ETAPAS_ORDEN = ['recibido','en_proceso','firmado','requiere_respuesta','sin_respuesta','reiterar','respondido','terminado','archivado'];

async function api(method, path, body) {
  const opts = { method, headers: {'Content-Type':'application/json'}, credentials:'include' };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch('/api' + path, opts);
  if (r.status === 401) { showLogin(); return null; }
  try { return await r.json(); } catch { return null; }
}

function toast(msg, type='ok') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  t.style.background = type === 'error' ? '#A32D2D' : '#0F1226';
  setTimeout(() => t.style.display = 'none', 3500);
}

function fmt(d) { return d ? d.substring(0,10) : '—'; }

function prioBadge(p) {
  if (p==='alta') return '<span class="badge badge-alta">ALTA</span>';
  if (p==='baja') return '<span class="badge badge-normal">BAJA</span>';
  return '<span class="badge badge-normal">NORMAL</span>';
}

function etapaBadge(e) {
  const m = { recibido:'badge-proc', en_proceso:'badge-proc', firmado:'badge-proc',
    requiere_respuesta:'badge-pend', sin_respuesta:'badge-sin', reiterar:'badge-sin',
    respondido:'badge-term', terminado:'badge-term', archivado:'badge-arch' };
  const label = ETAPAS_INFO[e]?.label || e;
  return `<span class="badge ${m[e]||'badge-normal'}">${label}</span>`;
}

// ── AUTH ──
async function doLogin() {
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-pass').value;
  const r = await api('POST', '/login', { email, password: pass });
  if (!r?.ok) { document.getElementById('login-error').textContent = r?.error || 'Error al iniciar sesión'; return; }
  initApp(r.nombre, r.rol);
}
document.getElementById('login-pass').addEventListener('keypress', e => { if(e.key==='Enter') doLogin(); });

function initApp(nombre, rol) {
  userRol = rol;
  document.getElementById('user-name').textContent = nombre;
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('app').style.flexDirection = 'column';
  if (rol === 'admin') {
    document.getElementById('nav-usuarios').style.display = 'flex';
    document.getElementById('btn-usuarios').style.display = 'flex';
  }
  loadDashboard();
  loadUsuarios();
}

async function doLogout() {
  await api('POST', '/logout');
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}
function showLogin() {
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}

// ── NAVIGATION ──
function goSection(sec, el) {
  currentSection = sec;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('sec-' + sec).classList.add('active');
  const map = {
    dashboard: loadDashboard,
    oficios: () => loadOficiosSec('todos'),
    pendientes: () => loadOficiosSec('pendientes'),
    realizados: () => loadOficiosSec('realizados'),
    flujo: () => searchFlujo(),
    instrucciones: loadInstrucciones,
    reportes: loadReportes,
    plantillas: loadPlantillas,
    historial: loadHistorial,
    usuarios: () => { loadUsuarios(); document.getElementById('utab-lista').style.display='block'; document.getElementById('utab-nuevo').style.display='none'; }
  };
  if (map[sec]) map[sec]();
}

// ── DASHBOARD ──
async function loadDashboard() {
  const d = await api('GET', '/dashboard');
  if (!d) return;
  const total = d.pendientes + d.terminados + d.archivados;
  document.getElementById('m-total').textContent = total;
  document.getElementById('m-pendientes').textContent = d.pendientes;
  document.getElementById('m-proceso').textContent = d.enProceso;
  document.getElementById('m-terminados').textContent = d.terminados;
  document.getElementById('m-sinresp').textContent = d.sinRespuesta;
  document.getElementById('m-instr').textContent = d.instruccionesPendientes;

  if (chartEtapas) chartEtapas.destroy();
  const labels = d.porEtapa.map(e => ETAPAS_INFO[e.etapa]?.label || e.etapa);
  const values = d.porEtapa.map(e => parseInt(e.total));
  const colors = ['#185FA5','#534AB7','#C9A227','#854F0B','#A32D2D','#E24B4A','#0F6E56','#6B1A2A','#888'];
  chartEtapas = new Chart(document.getElementById('chartEtapas'), {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: colors.slice(0, values.length), borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 10 } } } }
  });

  const al = document.getElementById('activity-list');
  al.innerHTML = d.recientes.length ? d.recientes.map(o => `
    <div class="activity-item">
      <span class="activity-dot ${['terminado','archivado'].includes(o.etapa)?'green':o.etapa==='sin_respuesta'?'red':'guinda'}"></span>
      <div style="flex:1">
        <strong>${o.numero}</strong> — ${o.tema}<br>
        <span style="font-size:11px;color:var(--text-muted)">${ETAPAS_INFO[o.etapa]?.label||o.etapa} · ${o.asignado_nombre||'Sin asignar'}</span>
      </div>
    </div>`).join('') : '<div class="empty"><i class="ti ti-files"></i>Sin oficios registrados</div>';
}

// ── OFICIOS ──
async function loadOficiosSec(tipo) {
  let params = '';
  if (tipo === 'pendientes') params = '&estado=pendiente';
  else if (tipo === 'realizados') params = '&estado=realizado';
  const busq = document.getElementById(`search-${tipo}`)?.value || '';
  const prio = document.getElementById('filter-prioridad')?.value || '';
  const etapa = document.getElementById('filter-etapa')?.value || '';
  let url = `/oficios?${params}`;
  if (busq) url += `&busqueda=${encodeURIComponent(busq)}`;
  if (prio) url += `&prioridad=${prio}`;
  if (etapa) url += `&etapa=${etapa}`;
  const data = await api('GET', url);
  const tbodyId = tipo === 'todos' ? 'tbody-oficios' : `tbody-${tipo}`;
  const tbody = document.getElementById(tbodyId);
  if (!data || !data.length) { tbody.innerHTML = `<tr><td colspan="8"><div class="empty"><i class="ti ti-file-off"></i>Sin oficios en esta sección.</div></td></tr>`; return; }

  if (tipo === 'realizados') {
    tbody.innerHTML = data.map(o => `<tr>
      <td><strong>${o.numero}</strong></td><td>${o.tema}</td><td>${o.departamento||'—'}</td>
      <td>${o.asignado_nombre||'—'}</td><td>${etapaBadge(o.etapa)}</td>
      <td>${fmt(o.fecha_terminacion)}</td>
      <td><button class="btn-sm btn-edit" onclick="verFlujo(${JSON.stringify(o).replace(/"/g,'&quot;')})"><i class="ti ti-eye"></i> Ver</button>
          <button class="btn-sm" style="background:#FFF6DC;color:#854F0B" onclick="generarPDF(${o.id},'${o.numero}')"><i class="ti ti-file-text"></i> PDF</button></td>
    </tr>`).join('');
  } else if (tipo === 'pendientes') {
    tbody.innerHTML = data.map(o => {
      const dias = o.fecha_inicio ? Math.floor((Date.now() - new Date(o.fecha_inicio))/86400000) : '—';
      return `<tr>
        <td><strong>${o.numero}</strong></td><td>${o.tema}</td><td>${o.asignado_nombre||'—'}</td>
        <td>${prioBadge(o.prioridad)}</td><td>${etapaBadge(o.etapa)}</td>
        <td>${typeof dias==='number' ? `<span class="badge ${dias>7?'badge-sin':'badge-pend'}">${dias} días</span>` : '—'}</td>
        <td style="display:flex;gap:4px;flex-wrap:wrap">
          <button class="btn-sm btn-edit" onclick="openEtapaModal(${o.id},'${o.numero}','${o.etapa}')"><i class="ti ti-git-branch"></i> Mover</button>
          <button class="btn-sm btn-success" onclick="verFlujo(${JSON.stringify(o).replace(/"/g,'&quot;')})"><i class="ti ti-eye"></i> Flujo</button>
        </td>
      </tr>`;
    }).join('');
  } else {
    tbody.innerHTML = data.map(o => `<tr>
      <td><strong>${o.numero}</strong></td><td>${o.tema}</td><td>${o.departamento||'—'}</td>
      <td>${o.asignado_nombre||'—'}</td><td>${prioBadge(o.prioridad)}</td>
      <td>${etapaBadge(o.etapa)}</td><td>${fmt(o.fecha_inicio)}</td>
      <td style="display:flex;gap:4px;flex-wrap:wrap">
        <button class="btn-sm btn-edit" onclick="openEditOficio(${JSON.stringify(o).replace(/"/g,'&quot;')})"><i class="ti ti-edit"></i></button>
        <button class="btn-sm btn-success" onclick="openEtapaModal(${o.id},'${o.numero}','${o.etapa}')"><i class="ti ti-git-branch"></i></button>
        <button class="btn-sm" style="background:#FFF6DC;color:#854F0B" onclick="generarPDF(${o.id},'${o.numero}')"><i class="ti ti-file-text"></i></button>
        ${userRol==='admin'?`<button class="btn-sm btn-danger" onclick="eliminarOficio(${o.id})"><i class="ti ti-trash"></i></button>`:''}
      </td>
    </tr>`).join('');
  }
}

async function guardarOficio() {
  const id = document.getElementById('oficio-id').value;
  const body = {
    numero: document.getElementById('of-numero').value,
    tema: document.getElementById('of-tema').value,
    descripcion: document.getElementById('of-descripcion').value,
    departamento: document.getElementById('of-departamento').value,
    asignado_a: document.getElementById('of-asignado').value || null,
    prioridad: document.getElementById('of-prioridad').value,
    fecha_inicio: document.getElementById('of-fecha-inicio').value || null,
    fecha_despacho: document.getElementById('of-fecha-despacho').value || null,
    fecha_respuesta: document.getElementById('of-fecha-respuesta').value || null,
    fecha_terminacion: document.getElementById('of-fecha-terminacion').value || null,
    requiere_respuesta: document.getElementById('of-requiere-resp').checked,
    observaciones: document.getElementById('of-observaciones').value
  };
  if (!body.numero || !body.tema) { toast('Número y tema son requeridos', 'error'); return; }
  const r = id ? await api('PUT', `/oficios/${id}`, body) : await api('POST', '/oficios', body);
  if (r?.ok) { toast(id ? 'Oficio actualizado' : 'Oficio registrado'); closeModal('oficio-modal'); loadDashboard(); loadOficiosSec('todos'); }
  else toast(r?.error || 'Error', 'error');
}

function openEditOficio(o) {
  if (typeof o === 'string') o = JSON.parse(o);
  document.getElementById('oficio-modal-title').textContent = 'Editar Oficio';
  document.getElementById('oficio-id').value = o.id;
  document.getElementById('of-numero').value = o.numero || '';
  document.getElementById('of-tema').value = o.tema || '';
  document.getElementById('of-descripcion').value = o.descripcion || '';
  document.getElementById('of-departamento').value = o.departamento || '';
  document.getElementById('of-prioridad').value = o.prioridad || 'normal';
  document.getElementById('of-fecha-inicio').value = o.fecha_inicio || '';
  document.getElementById('of-fecha-despacho').value = o.fecha_despacho || '';
  document.getElementById('of-fecha-respuesta').value = o.fecha_respuesta || '';
  document.getElementById('of-fecha-terminacion').value = o.fecha_terminacion || '';
  document.getElementById('of-requiere-resp').checked = o.requiere_respuesta || false;
  document.getElementById('of-observaciones').value = o.observaciones || '';
  populateAsignado('of-asignado', o.asignado_a);
  openModal('oficio-modal');
}

async function eliminarOficio(id) {
  if (!confirm('¿Eliminar este oficio? Esta acción no se puede deshacer.')) return;
  const r = await api('DELETE', `/oficios/${id}`);
  if (r?.ok) { toast('Oficio eliminado'); loadDashboard(); loadOficiosSec('todos'); }
  else toast('Error', 'error');
}

// ── ETAPA / FLUJO ──
function openEtapaModal(id, numero, etapaActual) {
  document.getElementById('etapa-oficio-id').value = id;
  document.getElementById('etapa-oficio-num').textContent = numero;
  document.getElementById('etapa-nueva').value = etapaActual;
  document.getElementById('etapa-comentario').value = '';
  openModal('etapa-modal');
}

async function guardarEtapa() {
  const id = document.getElementById('etapa-oficio-id').value;
  const etapa = document.getElementById('etapa-nueva').value;
  const comentario = document.getElementById('etapa-comentario').value;
  const r = await api('PUT', `/oficios/${id}/etapa`, { etapa, comentario });
  if (r?.ok) {
    toast('Etapa actualizada');
    closeModal('etapa-modal');
    loadDashboard();
    if (currentSection === 'flujo' && flujoOficioActual) loadFlujoDetalle(flujoOficioActual);
    loadOficiosSec(currentSection === 'pendientes' ? 'pendientes' : 'todos');
  } else toast('Error', 'error');
}

async function searchFlujo() {
  const q = document.getElementById('search-flujo')?.value || '';
  const data = await api('GET', `/oficios?busqueda=${encodeURIComponent(q)}`);
  const el = document.getElementById('flujo-lista');
  if (!data || !data.length) { el.innerHTML = '<div class="empty"><i class="ti ti-search"></i>Escribe para buscar un oficio</div>'; return; }
  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:6px">` + data.slice(0,8).map(o => `
    <div onclick="loadFlujoDetalle(${o.id})" style="padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:12px;background:#fff;transition:all .15s" onmouseover="this.style.borderColor='var(--guinda)'" onmouseout="this.style.borderColor='var(--border)'">
      <div style="flex:1"><strong>${o.numero}</strong> — ${o.tema}<br><span style="font-size:11px;color:var(--text-muted)">${o.departamento||''} · ${o.asignado_nombre||'Sin asignar'}</span></div>
      ${etapaBadge(o.etapa)}
      <i class="ti ti-chevron-right" style="color:var(--text-muted)"></i>
    </div>`).join('') + '</div>';
}

async function verFlujo(o) {
  if (typeof o === 'string') o = JSON.parse(o);
  goSection('flujo', document.querySelector('[data-sec=flujo]'));
  loadFlujoDetalle(o.id);
}

async function loadFlujoDetalle(id) {
  flujoOficioActual = id;
  const d = await api('GET', `/oficios/${id}`);
  if (!d) return;
  document.getElementById('flujo-detalle').style.display = 'block';
  document.getElementById('flujo-numero').textContent = `${d.numero} — ${d.tema}`;

  const track = document.getElementById('flujo-track');
  const etapaIdx = ETAPAS_ORDEN.indexOf(d.etapa);
  track.innerHTML = ETAPAS_ORDEN.map((et, i) => {
    const info = ETAPAS_INFO[et];
    const isDone = i < etapaIdx;
    const isActive = i === etapaIdx;
    const isWarn = ['sin_respuesta','reiterar'].includes(et);
    let cls = isDone ? 'done' : isActive ? (isWarn ? 'warn' : 'active flujo-pulse') : '';
    return `<div class="flujo-step">
      <div class="flujo-dot ${cls}" title="${info.label}" onclick="openEtapaModal(${d.id},'${d.numero}','${d.etapa}')">
        <i class="ti ${info.icon}" style="font-size:16px"></i>
      </div>
      <div class="flujo-label ${isDone?'done':isActive?'active':''}">${info.label}</div>
    </div>`;
  }).join('');

  const acciones = document.getElementById('flujo-acciones');
  acciones.innerHTML = `
    <button class="btn-primary" onclick="openEtapaModal(${d.id},'${d.numero}','${d.etapa}')"><i class="ti ti-git-branch"></i> Mover etapa</button>
    <button class="btn-outline" onclick="openEditOficio(${JSON.stringify(d).replace(/"/g,'&quot;')})"><i class="ti ti-edit"></i> Editar oficio</button>
    <button class="btn-gold" onclick="generarPDF(${d.id},'${d.numero}')"><i class="ti ti-file-text"></i> Generar PDF</button>`;

  const hist = document.getElementById('flujo-historial');
  hist.innerHTML = d.movimientos?.length ? d.movimientos.map(m => `
    <div class="activity-item">
      <span class="activity-dot guinda"></span>
      <div style="flex:1">
        <strong>${m.usuario_nombre||'Sistema'}</strong>: ${m.etapa_anterior||'—'} → <strong>${ETAPAS_INFO[m.etapa_nueva]?.label||m.etapa_nueva}</strong>
        ${m.comentario ? `<br><span style="font-size:11px;color:var(--text-muted)">${m.comentario}</span>` : ''}
      </div>
      <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">${new Date(m.fecha).toLocaleString('es-MX')}</span>
    </div>`).join('') : '<div class="empty">Sin movimientos</div>';
}

// ── INSTRUCCIONES ──
let instrEstadoFiltro = 'pendiente';
function filterInstr(estado, el) {
  instrEstadoFiltro = estado;
  document.querySelectorAll('#sec-instrucciones .tab-pill').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  loadInstrucciones();
}

async function loadInstrucciones() {
  const busq = document.getElementById('search-instr')?.value || '';
  let url = '/instrucciones?';
  if (instrEstadoFiltro) url += `estado=${instrEstadoFiltro}&`;
  if (busq) url += `busqueda=${encodeURIComponent(busq)}`;
  const data = await api('GET', url);
  const tbody = document.getElementById('tbody-instrucciones');
  if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="7"><div class="empty"><i class="ti ti-list-check"></i>Sin instrucciones.</div></td></tr>'; return; }
  tbody.innerHTML = data.map(i => `<tr>
    <td><strong>${i.folio}</strong></td>
    <td style="max-width:250px">${i.instruccion.substring(0,80)}${i.instruccion.length>80?'...':''}</td>
    <td>${fmt(i.fecha)}</td><td>${i.asignado_nombre||'—'}</td>
    <td>${prioBadge(i.prioridad)}</td>
    <td><span class="badge ${i.estado==='completada'?'badge-term':i.estado==='en_proceso'?'badge-proc':'badge-pend'}">${i.estado}</span></td>
    <td style="display:flex;gap:4px;flex-wrap:wrap">
      <button class="btn-sm btn-edit" onclick='openEditInstr(${JSON.stringify(i)})'><i class="ti ti-edit"></i></button>
      ${i.convertido_oficio ? `<span class="badge badge-term" style="padding:4px 8px">Convertida</span>` :
        `<button class="btn-sm btn-gold-sm" onclick="convertirInstr(${i.id},'${i.folio}')"><i class="ti ti-file-plus"></i> → Oficio</button>`}
      ${userRol==='admin'?`<button class="btn-sm btn-danger" onclick="eliminarInstr(${i.id})"><i class="ti ti-trash"></i></button>`:''}
    </td>
  </tr>`).join('');
}

async function guardarInstruccion() {
  const id = document.getElementById('instr-id').value;
  const body = {
    folio: document.getElementById('instr-folio').value,
    instruccion: document.getElementById('instr-texto').value,
    fecha: document.getElementById('instr-fecha').value || null,
    asignado_a: document.getElementById('instr-asignado').value || null,
    prioridad: document.getElementById('instr-prioridad').value,
    estado: document.getElementById('instr-estado').value,
    observaciones: document.getElementById('instr-obs').value
  };
  if (!body.folio || !body.instruccion) { toast('Folio e instrucción son requeridos', 'error'); return; }
  const r = id ? await api('PUT', `/instrucciones/${id}`, body) : await api('POST', '/instrucciones', body);
  if (r?.ok) { toast('Instrucción guardada'); closeModal('instr-modal'); loadInstrucciones(); }
  else toast('Error', 'error');
}

function openEditInstr(i) {
  if (typeof i === 'string') i = JSON.parse(i);
  document.getElementById('instr-modal-title').textContent = 'Editar Instrucción';
  document.getElementById('instr-id').value = i.id;
  document.getElementById('instr-folio').value = i.folio;
  document.getElementById('instr-texto').value = i.instruccion;
  document.getElementById('instr-fecha').value = i.fecha || '';
  document.getElementById('instr-prioridad').value = i.prioridad;
  document.getElementById('instr-estado').value = i.estado;
  document.getElementById('instr-obs').value = i.observaciones || '';
  populateAsignado('instr-asignado', i.asignado_a);
  openModal('instr-modal');
}

async function convertirInstr(id, folio) {
  if (!confirm(`¿Convertir instrucción "${folio}" en un oficio?`)) return;
  const r = await api('POST', `/instrucciones/${id}/convertir`);
  if (r?.ok) { toast(`Oficio creado: ${r.numero}`); loadInstrucciones(); loadDashboard(); }
  else toast('Error', 'error');
}

async function eliminarInstr(id) {
  if (!confirm('¿Eliminar instrucción?')) return;
  const r = await api('DELETE', `/instrucciones/${id}`);
  if (r?.ok) { toast('Eliminada'); loadInstrucciones(); }
}

// ── REPORTES ──
async function loadReportes() {
  searchReporte();
}

async function searchReporte() {
  const q = document.getElementById('search-reporte')?.value || '';
  const data = await api('GET', `/oficios?busqueda=${encodeURIComponent(q)}`);
  const el = document.getElementById('reporte-lista');
  if (!data?.length) { el.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:8px 0">Escribe para buscar...</div>'; return; }
  el.innerHTML = data.slice(0,6).map(o => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px">
      <span><strong>${o.numero}</strong> — ${o.tema}</span>
      <button class="btn-sm" style="background:var(--guinda-light);color:var(--guinda)" onclick="generarPDF(${o.id},'${o.numero}')"><i class="ti ti-file-text"></i> PDF</button>
    </div>`).join('');
}

function generarPDF(id, numero) {
  window.open(`/api/exportar/pdf/${id}`, '_blank');
  toast(`Generando PDF de oficio ${numero}...`);
}

function exportarExcel(tipo) {
  window.open(`/api/exportar/excel?tipo=${tipo}`, '_blank');
  toast(`Descargando Excel de ${tipo}...`);
}

// ── PLANTILLAS ──
async function loadPlantillas() {
  const data = await api('GET', '/plantillas');
  const el = document.getElementById('plantillas-content');
  if (!data?.length) { el.innerHTML = '<div class="empty">Sin plantillas</div>'; return; }
  el.innerHTML = data.map(p => {
    const contenido = typeof p.contenido === 'string' ? JSON.parse(p.contenido) : p.contenido;
    return `<div class="card" style="max-width:600px">
      <div class="card-title"><i class="ti ti-template"></i> ${p.nombre}</div>
      <div class="form-group"><label>Encabezado del reporte</label>
        <input type="text" id="plant-enc-${p.id}" value="${contenido.encabezado||''}" placeholder="Texto del encabezado"></div>
      <div class="form-group"><label>Pie de página</label>
        <input type="text" id="plant-pie-${p.id}" value="${contenido.pie||''}" placeholder="Texto del pie"></div>
      <button class="btn-primary" onclick="guardarPlantilla(${p.id})"><i class="ti ti-device-floppy"></i> Guardar plantilla</button>
    </div>`;
  }).join('');
}

async function guardarPlantilla(id) {
  const encabezado = document.getElementById(`plant-enc-${id}`).value;
  const pie = document.getElementById(`plant-pie-${id}`).value;
  const r = await api('PUT', `/plantillas/${id}`, {
    nombre: 'Reporte Oficial SITT',
    contenido: { encabezado, pie, campos: ['numero','tema','descripcion','fecha_inicio','fecha_despacho','estado','etapa','asignado','departamento','observaciones'] }
  });
  if (r?.ok) toast('Plantilla guardada'); else toast('Error', 'error');
}

// ── HISTORIAL ──
async function loadHistorial() {
  const data = await api('GET', '/historial');
  const el = document.getElementById('historial-content');
  if (!data?.length) { el.innerHTML = '<div class="empty">Sin registros</div>'; return; }
  el.innerHTML = data.map(h => `
    <div class="activity-item">
      <span class="activity-dot guinda"></span>
      <div style="flex:1"><strong>${h.usuario_nombre||'Sistema'}</strong> — ${h.accion}<br>
        <span style="font-size:11px;color:var(--text-muted)">${h.detalle||''}</span></div>
      <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">${new Date(h.fecha).toLocaleString('es-MX')}</span>
    </div>`).join('');
}

// ── USUARIOS ──
function switchUsuTab(tab, el) {
  document.querySelectorAll('#sec-usuarios .tab-pill').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('utab-lista').style.display = tab==='lista'?'block':'none';
  document.getElementById('utab-nuevo').style.display = tab==='nuevo'?'block':'none';
  if (tab==='lista') loadUsuarios();
}

async function loadUsuarios() {
  const data = await api('GET', '/usuarios');
  if (!data) return;
  usuariosList = data;
  const el = document.getElementById('usuarios-content');
  if (!el) return;
  el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Correo</th><th>Departamento</th><th>Rol</th><th>Estado</th><th>Acción</th></tr></thead><tbody>
    ${data.map(u => `<tr>
      <td><strong>${u.nombre}</strong></td><td style="font-size:12px;color:#888">${u.email}</td>
      <td>${u.departamento||'—'}</td>
      <td><span class="badge ${u.rol==='admin'?'badge-alta':'badge-proc'}">${u.rol}</span></td>
      <td>${u.activo?'<span class="badge badge-term">Activo</span>':'<span class="badge badge-arch">Inactivo</span>'}</td>
      <td>${u.activo?`<button class="btn-sm btn-danger" onclick="toggleUsu(${u.id},0,'${u.nombre}')"><i class="ti ti-user-off"></i> Baja</button>`:`<button class="btn-sm btn-success" onclick="toggleUsu(${u.id},1,'${u.nombre}')"><i class="ti ti-user-check"></i> Reactivar</button>`}</td>
    </tr>`).join('')}
  </tbody></table></div>`;
}

async function toggleUsu(id, activo, nombre) {
  if (!confirm(`¿${activo?'Reactivar':'Dar de baja'} a "${nombre}"?`)) return;
  await api('PUT', `/usuarios/${id}`, { activo });
  toast(`Usuario ${activo?'reactivado':'dado de baja'}`);
  loadUsuarios();
}

async function guardarUsuario() {
  const body = {
    nombre: document.getElementById('nu-nombre').value,
    email: document.getElementById('nu-email').value,
    password: document.getElementById('nu-pass').value,
    departamento: document.getElementById('nu-dep').value,
    rol: document.getElementById('nu-rol').value
  };
  const err = document.getElementById('nu-error');
  err.textContent = '';
  if (!body.nombre || !body.email || !body.password) { err.textContent = 'Completa todos los campos'; return; }
  const r = await api('POST', '/usuarios', body);
  if (r?.ok) { toast('Usuario creado'); ['nu-nombre','nu-email','nu-pass','nu-dep'].forEach(id => document.getElementById(id).value=''); loadUsuarios(); switchUsuTab('lista', document.querySelector('#sec-usuarios .tab-pill')); }
  else err.textContent = r?.error || 'Error';
}

async function cambiarPassword() {
  const actual = document.getElementById('pass-actual').value;
  const nueva = document.getElementById('pass-nueva').value;
  const confirma = document.getElementById('pass-confirma').value;
  const err = document.getElementById('pass-error');
  err.textContent = '';
  if (!actual || !nueva) { err.textContent = 'Completa todos los campos'; return; }
  if (nueva !== confirma) { err.textContent = 'Las contraseñas no coinciden'; return; }
  if (nueva.length < 6) { err.textContent = 'Mínimo 6 caracteres'; return; }
  const r = await api('POST', '/cambiar-password', { actual, nueva });
  if (r?.ok) { toast('Contraseña actualizada'); ['pass-actual','pass-nueva','pass-confirma'].forEach(id => document.getElementById(id).value=''); }
  else err.textContent = r?.error || 'Error';
}

// ── HELPERS ──
function populateAsignado(selectId, currentVal) {
  const sel = document.getElementById(selectId);
  sel.innerHTML = '<option value="">Sin asignar</option>' + usuariosList.map(u => `<option value="${u.id}" ${u.id==currentVal?'selected':''}>${u.nombre}</option>`).join('');
}

function openModal(id) {
  if (id === 'oficio-modal') {
    document.getElementById('oficio-modal-title').textContent = 'Nuevo Oficio';
    document.getElementById('oficio-id').value = '';
    ['of-numero','of-tema','of-descripcion','of-departamento','of-observaciones'].forEach(f => document.getElementById(f).value = '');
    document.getElementById('of-prioridad').value = 'normal';
    document.getElementById('of-requiere-resp').checked = false;
    ['of-fecha-inicio','of-fecha-despacho','of-fecha-respuesta','of-fecha-terminacion'].forEach(f => document.getElementById(f).value = '');
    document.getElementById('of-fecha-inicio').value = new Date().toISOString().substring(0,10);
    populateAsignado('of-asignado', null);
  }
  if (id === 'instr-modal') {
    document.getElementById('instr-modal-title').textContent = 'Nueva Instrucción';
    document.getElementById('instr-id').value = '';
    ['instr-folio','instr-obs'].forEach(f => document.getElementById(f).value = '');
    document.getElementById('instr-texto').value = '';
    document.getElementById('instr-fecha').value = new Date().toISOString().substring(0,10);
    document.getElementById('instr-prioridad').value = 'normal';
    document.getElementById('instr-estado').value = 'pendiente';
    populateAsignado('instr-asignado', null);
  }
  document.getElementById(id).style.display = 'flex';
}

function closeModal(id) { document.getElementById(id).style.display = 'none'; }
document.querySelectorAll('.modal-overlay').forEach(m => m.addEventListener('click', e => { if(e.target===m) closeModal(m.id); }));

// ── INIT ──
(async () => {
  const me = await api('GET', '/me');
  if (me?.nombre) initApp(me.nombre, me.rol);
})();
