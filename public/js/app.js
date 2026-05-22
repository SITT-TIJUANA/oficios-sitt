// ══ ESTADO GLOBAL ══
let ROL = '';
let USUARIOS = [];
let CHART = null;
let INSTRFILTRO = 'pendiente';

// ══ API ══
async function api(method, path, body) {
  try {
    const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include' };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch('/api' + path, opts);
    if (r.status === 401) { mostrarLogin(); return null; }
    return await r.json();
  } catch (e) { return null; }
}

function toast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  t.style.background = type === 'error' ? '#A32D2D' : '#0F1226';
  setTimeout(() => { t.style.display = 'none'; }, 3500);
}

function fmt(d) { return d ? String(d).substring(0, 10) : '—'; }

// ══ CANVAS ANIMADO ══
function startCanvas(id) {
  const c = document.getElementById(id);
  if (!c) return;
  const ctx = c.getContext('2d');
  let w = 0, h = 0;
  const pts = [];

  function resize() {
    w = c.width = c.offsetWidth;
    h = c.height = c.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  for (let i = 0; i < 100; i++) {
    pts.push({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
      r: Math.random() * 1.4 + .3,
      col: Math.random() > .65 ? '#C9A227' : '#6B1A2A'
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w * .3, h * .4, 0, w * .3, h * .4, w * .9);
    g.addColorStop(0, 'rgba(107,26,42,0.12)');
    g.addColorStop(1, 'rgba(8,8,15,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      for (let j = i + 1; j < pts.length; j++) {
        const b = pts[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 100) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(201,162,39,${.05 * (1 - d / 100)})`;
          ctx.lineWidth = .5;
          ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fillStyle = a.col === '#C9A227' ? 'rgba(201,162,39,0.35)' : 'rgba(107,26,42,0.4)';
      ctx.fill();
      a.x += a.vx; a.y += a.vy;
      if (a.x < 0 || a.x > w) a.vx *= -1;
      if (a.y < 0 || a.y > h) a.vy *= -1;
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// ══ AUTH ══
function mostrarLogin() {
  document.getElementById('app').style.display = 'none';
  document.getElementById('home-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}

async function doLogin() {
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-pass').value;
  document.getElementById('login-error').textContent = '';
  const r = await api('POST', '/login', { email, password: pass });
  if (!r || !r.ok) {
    document.getElementById('login-error').textContent = r?.error || 'Credenciales incorrectas';
    return;
  }
  await cargarUsuarios();
  mostrarHome(r.nombre, r.rol);
}

document.getElementById('login-pass').addEventListener('keypress', e => {
  if (e.key === 'Enter') doLogin();
});

async function doLogout() {
  await api('POST', '/logout');
  mostrarLogin();
}

function goHome() {
  if (typeof stopFlujoAnim === 'function') stopFlujoAnim();
  document.getElementById('app').style.display = 'none';
  document.getElementById('home-screen').style.display = 'flex';
}

// ══ HOME ══
async function mostrarHome(nombre, rol) {
  ROL = rol;
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'none';
  document.getElementById('home-screen').style.display = 'flex';
  document.getElementById('home-username').textContent = nombre;
  document.getElementById('app-user-chip').textContent = nombre;

  const hr = new Date().getHours();
  const saludo = hr < 12 ? 'Buenos días,' : hr < 18 ? 'Buenas tardes,' : 'Buenas noches,';
  document.getElementById('home-greeting').textContent = saludo;
  document.getElementById('home-fullname').textContent = nombre.split(' ')[0];

  if (rol === 'admin') {
    document.getElementById('home-ajustes-wrap').style.display = 'block';
  }

  setInterval(() => {
    const n = new Date();
    const el = document.getElementById('home-clock');
    if (el) el.textContent = n.toLocaleTimeString('es-MX');
  }, 1000);

  startCanvas('home-canvas');

  const d = await api('GET', '/dashboard');
  if (d) {
    const tot = (d.pendientes || 0) + (d.terminados || 0) + (d.archivados || 0);
    document.getElementById('hc-oficios').textContent = tot;
    document.getElementById('hc-pendientes').textContent = d.instruccionesPendientes || 0;
  }
}

// ══ ENTRAR A APP ══
function enterApp(seccion) {
  document.getElementById('home-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  const titulos = { oficios: 'Oficios', pendientes: 'Pendientes', otros: 'Otros', ajustes: 'Ajustes' };
  document.getElementById('app-title').textContent = titulos[seccion] + ' — Dirección de Operaciones';

  const navItems = {
    oficios: [
      { id: 'dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
      { id: 'todos', icon: 'ti-files', label: 'Todos los oficios' },
      { id: 'pendientes-of', icon: 'ti-clock', label: 'Oficios pendientes' },
      { id: 'alertas', icon: 'ti-alert-triangle', label: 'Alertas' },
      { id: 'flujo', icon: 'ti-git-branch', label: 'Flujo visual' },
      { id: 'reportes', icon: 'ti-report-analytics', label: 'Reportes' },
      { id: 'editor', icon: 'ti-template', label: 'Editor de plantillas' },
    ],
    pendientes: [
      { id: 'pend-lista', icon: 'ti-list-check', label: 'Todos los pendientes' },
      { id: 'pend-urgentes', icon: 'ti-flame', label: 'Urgentes' },
      { id: 'pend-completados', icon: 'ti-circle-check', label: 'Completados' },
    ],
    otros: [
      { id: 'comunicados', icon: 'ti-speakerphone', label: 'Comunicados' },
      { id: 'estadisticas', icon: 'ti-chart-bar', label: 'Estadísticas' },
      { id: 'archivo', icon: 'ti-archive', label: 'Archivo general' },
    ],
    ajustes: [
      { id: 'usuarios', icon: 'ti-users', label: 'Usuarios' },
      { id: 'historial', icon: 'ti-history', label: 'Historial' },
      { id: 'perfil', icon: 'ti-user-circle', label: 'Mi perfil' },
    ]
  };

  const items = navItems[seccion] || [];

  // Construir sidenav
  const nav = document.getElementById('sidenav');
  nav.innerHTML = `<div class="nav-group-title">${titulos[seccion]}</div>` +
    items.map(it =>
      `<button class="nav-item" id="nav-${it.id}" onclick="activarSeccion('${it.id}')">` +
      `<i class="ti ${it.icon}"></i> ${it.label}</button>`
    ).join('');

  // Construir secciones en main
  const main = document.getElementById('main-content');
  main.innerHTML = items.map(it =>
    `<div class="section" id="sec-${it.id}"></div>`
  ).join('');

  // Activar primera
  if (items.length > 0) {
    activarSeccion(items[0].id);
  }
}

function activarSeccion(id) {
  // Nav
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('nav-' + id);
  if (btn) btn.classList.add('active');

  // Sección
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById('sec-' + id);
  if (sec) {
    sec.classList.add('active');
    cargarSeccion(id, sec);
  }
}

// ══ CARGAR SECCIÓN ══
function cargarSeccion(id, el) {
  const fn = {
    dashboard: cargarDashboard,
    todos: cargarTodos,
    'pendientes-of': cargarPendientesOf,
    alertas: cargarAlertas,
    flujo: cargarFlujo,
    reportes: cargarReportes,
    editor: cargarEditor,
    'pend-lista': cargarPendLista,
    'pend-urgentes': cargarPendUrgentes,
    'pend-completados': cargarPendCompletados,
    comunicados: () => { el.innerHTML = html_empty('Comunicados', 'ti-speakerphone', 'Módulo en desarrollo. Próximamente podrás publicar y consultar comunicados internos.'); },
    estadisticas: cargarEstadisticas,
    archivo: cargarArchivo,
    usuarios: cargarUsuarios,
    historial: cargarHistorial,
    perfil: cargarPerfil,
  };
  if (fn[id]) fn[id](el);
}

function html_empty(titulo, icon, msg) {
  return `<div class="page-header"><div><div class="page-eyebrow">SECCIÓN</div><h1 class="page-title">${titulo}</h1></div></div>
  <div class="card"><div class="empty"><i class="ti ${icon}"></i>${msg}</div></div>`;
}

// ══ BADGES ══
function badgePrio(p) {
  if (p === 'alta') return `<span class="badge b-alta">ALTA</span>`;
  return `<span class="badge b-norm">${(p || 'normal').toUpperCase()}</span>`;
}

function badgeEtapa(e) {
  const cls = { recibido: 'b-proc', en_proceso: 'b-proc', firmado: 'b-proc', requiere_respuesta: 'b-pend', sin_respuesta: 'b-sin', reiterar: 'b-sin', respondido: 'b-term', terminado: 'b-term', archivado: 'b-arch' };
  const lbl = { recibido: 'Recibido', en_proceso: 'En proceso', firmado: 'Firmado', requiere_respuesta: 'Req. resp.', sin_respuesta: 'Sin respuesta', reiterar: 'Reiterar', respondido: 'Respondido', terminado: 'Terminado', archivado: 'Archivado' };
  return `<span class="badge ${cls[e] || 'b-norm'}">${lbl[e] || e}</span>`;
}

function colorEtapa(e) {
  if (['terminado', 'archivado', 'respondido'].includes(e)) return '#0F6E56';
  if (['sin_respuesta', 'reiterar'].includes(e)) return '#A32D2D';
  if (e === 'requiere_respuesta') return '#854F0B';
  return '#185FA5';
}

// ══ DASHBOARD ══
async function cargarDashboard(el) {
  el.innerHTML = `<div class="page-header"><div><div class="page-eyebrow">PANEL PRINCIPAL</div><h1 class="page-title">Dashboard</h1></div>
    <div class="header-actions"><button class="btn-primary" onclick="abrirModalOficio()"><i class="ti ti-plus"></i> Nuevo oficio</button></div></div>
    <div class="metrics-grid" id="d-metrics"></div>
    <div class="row2">
      <div class="card"><div class="card-title"><i class="ti ti-chart-donut"></i> Oficios por etapa</div><div style="position:relative;height:200px"><canvas id="d-chart"></canvas></div></div>
      <div class="card"><div class="card-title"><i class="ti ti-activity"></i> Actividad reciente</div><div id="d-activity"></div></div>
    </div>`;

  const d = await api('GET', '/dashboard');
  if (!d) return;
  const tot = (d.pendientes || 0) + (d.terminados || 0) + (d.archivados || 0);

  document.getElementById('d-metrics').innerHTML = `
    <div class="metric-card"><div class="metric-icon g"><i class="ti ti-files"></i></div><div><div class="metric-label">Total</div><div class="metric-val">${tot}</div></div></div>
    <div class="metric-card"><div class="metric-icon go"><i class="ti ti-clock"></i></div><div><div class="metric-label">Pendientes</div><div class="metric-val">${d.pendientes || 0}</div></div></div>
    <div class="metric-card"><div class="metric-icon re"><i class="ti ti-alert-triangle"></i></div><div><div class="metric-label">Sin respuesta</div><div class="metric-val">${d.sinRespuesta || 0}</div></div></div>
    <div class="metric-card"><div class="metric-icon gr"><i class="ti ti-circle-check"></i></div><div><div class="metric-label">Terminados</div><div class="metric-val">${d.terminados || 0}</div></div></div>
    <div class="metric-card"><div class="metric-icon bl"><i class="ti ti-list-check"></i></div><div><div class="metric-label">Pendientes/Instr.</div><div class="metric-val">${d.instruccionesPendientes || 0}</div></div></div>`;

  if (CHART) CHART.destroy();
  const cv = document.getElementById('d-chart');
  if (cv && d.porEtapa && d.porEtapa.length) {
    const ELBL = { recibido: 'Recibido', en_proceso: 'En proceso', firmado: 'Firmado', requiere_respuesta: 'Req.resp', sin_respuesta: 'Sin resp', reiterar: 'Reiterar', respondido: 'Respondido', terminado: 'Terminado', archivado: 'Archivado' };
    CHART = new Chart(cv, {
      type: 'doughnut',
      data: {
        labels: d.porEtapa.map(e => ELBL[e.etapa] || e.etapa),
        datasets: [{ data: d.porEtapa.map(e => parseInt(e.total)), backgroundColor: ['#185FA5', '#534AB7', '#C9A227', '#854F0B', '#A32D2D', '#E24B4A', '#0F6E56', '#6B1A2A', '#888'], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 10 } } } }
    });
  }

  const al = document.getElementById('d-activity');
  if (al && d.recientes) {
    al.innerHTML = d.recientes.length
      ? d.recientes.map(o => `<div class="activity-item"><span class="activity-dot" style="background:${colorEtapa(o.etapa)}"></span><div style="flex:1"><strong>${o.numero}</strong> — ${o.tema}<br><span style="font-size:11px;color:var(--muted)">${(o.etapa || '').replace(/_/g, ' ')} · ${o.asignado_nombre || 'Sin asignar'}</span></div></div>`).join('')
      : '<div class="empty"><i class="ti ti-files"></i>Sin oficios registrados</div>';
  }
}

// ══ TABLA DE OFICIOS ══
async function cargarTodos(el) {
  el.innerHTML = `<div class="page-header"><div><div class="page-eyebrow">GESTIÓN</div><h1 class="page-title">Todos los Oficios</h1></div>
    <div class="header-actions">
      <button class="btn-outline" onclick="exportarExcel('oficios')"><i class="ti ti-file-spreadsheet"></i> Excel</button>
      <button class="btn-primary" onclick="abrirModalOficio()"><i class="ti ti-plus"></i> Nuevo oficio</button>
    </div></div>
    <div class="card">
      <div class="search-row">
        <input type="text" id="s-todos" placeholder="🔍 Buscar número, tema..." oninput="recargarTodos()">
        <select id="f-etapa" onchange="recargarTodos()">
          <option value="">Todas las etapas</option>
          <option value="recibido">Recibido</option><option value="en_proceso">En proceso</option>
          <option value="firmado">Firmado</option><option value="requiere_respuesta">Req. respuesta</option>
          <option value="sin_respuesta">Sin respuesta</option><option value="reiterar">Reiterar</option>
          <option value="respondido">Respondido</option><option value="terminado">Terminado</option><option value="archivado">Archivado</option>
        </select>
        <select id="f-prio" onchange="recargarTodos()">
          <option value="">Todas prioridades</option><option value="alta">Alta</option><option value="normal">Normal</option>
        </select>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>No. Oficio</th><th>Tema</th><th>Dpto.</th><th>Asignado</th><th>Prioridad</th><th>Etapa</th><th>F. Inicio</th><th>Acciones</th></tr></thead>
        <tbody id="tbody-todos"></tbody>
      </table></div>
    </div>`;
  await recargarTodos();
}

async function recargarTodos() {
  let url = '/oficios?';
  const b = document.getElementById('s-todos')?.value || '';
  const e = document.getElementById('f-etapa')?.value || '';
  const p = document.getElementById('f-prio')?.value || '';
  if (b) url += `busqueda=${encodeURIComponent(b)}&`;
  if (e) url += `etapa=${e}&`;
  if (p) url += `prioridad=${p}&`;
  const data = await api('GET', url);
  const tbody = document.getElementById('tbody-todos');
  if (!tbody) return;
  if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="8"><div class="empty"><i class="ti ti-file-off"></i>Sin oficios</div></td></tr>'; return; }
  tbody.innerHTML = data.map(o => `<tr>
    <td><strong>${o.numero}</strong></td><td>${o.tema}</td><td>${o.departamento || '—'}</td>
    <td>${o.asignado_nombre || '—'}</td><td>${badgePrio(o.prioridad)}</td>
    <td>${badgeEtapa(o.etapa)}</td><td>${fmt(o.fecha_inicio)}</td>
    <td style="display:flex;gap:4px;flex-wrap:wrap">
      ${ROL !== 'lector' ? `<button class="btn-sm edit" onclick='editarOficio(${JSON.stringify(o)})'><i class="ti ti-edit"></i></button>` : ''}
      <button class="btn-sm ok" onclick="abrirModalEtapa(${o.id},'${o.numero}','${o.etapa}')"><i class="ti ti-git-branch"></i></button>
      <button class="btn-sm warn" onclick="generarPDF(${o.id},'${o.numero}')"><i class="ti ti-file-text"></i></button>
      ${ROL === 'admin' ? `<button class="btn-sm del" onclick="eliminarOficio(${o.id})"><i class="ti ti-trash"></i></button>` : ''}
    </td></tr>`).join('');
}

async function cargarPendientesOf(el) {
  el.innerHTML = `<div class="page-header"><div><div class="page-eyebrow">SEGUIMIENTO</div><h1 class="page-title">Oficios Pendientes</h1></div>
    <div class="header-actions"><button class="btn-primary" onclick="abrirModalOficio()"><i class="ti ti-plus"></i> Nuevo oficio</button></div></div>
    <div class="card">
      <div class="search-row"><input type="text" id="s-pend-of" placeholder="🔍 Buscar..." oninput="recargarPendOf()"></div>
      <div class="table-wrap"><table>
        <thead><tr><th>No. Oficio</th><th>Tema</th><th>Asignado</th><th>Prioridad</th><th>Etapa</th><th>Días</th><th>Acciones</th></tr></thead>
        <tbody id="tbody-pend-of"></tbody>
      </table></div>
    </div>`;
  await recargarPendOf();
}

async function recargarPendOf() {
  const b = document.getElementById('s-pend-of')?.value || '';
  const data = await api('GET', `/oficios?estado=pendiente${b ? '&busqueda=' + encodeURIComponent(b) : ''}`);
  const tbody = document.getElementById('tbody-pend-of');
  if (!tbody) return;
  if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="7"><div class="empty"><i class="ti ti-circle-check"></i>Sin pendientes</div></td></tr>'; return; }
  tbody.innerHTML = data.map(o => {
    const dias = o.fecha_inicio ? Math.floor((Date.now() - new Date(o.fecha_inicio)) / 86400000) : '—';
    return `<tr>
      <td><strong>${o.numero}</strong></td><td>${o.tema}</td><td>${o.asignado_nombre || '—'}</td>
      <td>${badgePrio(o.prioridad)}</td><td>${badgeEtapa(o.etapa)}</td>
      <td>${typeof dias === 'number' ? `<span class="badge ${dias > 7 ? 'b-sin' : 'b-pend'}">${dias}d</span>` : '—'}</td>
      <td style="display:flex;gap:4px">
        <button class="btn-sm ok" onclick="abrirModalEtapa(${o.id},'${o.numero}','${o.etapa}')"><i class="ti ti-git-branch"></i> Mover</button>
        <button class="btn-sm warn" onclick="generarPDF(${o.id},'${o.numero}')"><i class="ti ti-file-text"></i></button>
      </td></tr>`;
  }).join('');
}

async function cargarAlertas(el) {
  el.innerHTML = `<div class="page-header"><div><div class="page-eyebrow">ALERTAS</div><h1 class="page-title">Alertas de Oficios</h1></div></div>
    <div class="card">
      <div class="card-title" style="color:var(--red)"><i class="ti ti-alert-triangle"></i> Sin respuesta</div>
      <div class="table-wrap"><table><thead><tr><th>No. Oficio</th><th>Tema</th><th>Asignado</th><th>Días</th><th>Acción</th></tr></thead><tbody id="tbody-sinresp"></tbody></table></div>
    </div>
    <div class="card">
      <div class="card-title" style="color:var(--amber)"><i class="ti ti-refresh"></i> A reiterar</div>
      <div class="table-wrap"><table><thead><tr><th>No. Oficio</th><th>Tema</th><th>Asignado</th><th>Acción</th></tr></thead><tbody id="tbody-reiterar"></tbody></table></div>
    </div>`;

  const [sr, rt] = await Promise.all([api('GET', '/oficios?etapa=sin_respuesta'), api('GET', '/oficios?etapa=reiterar')]);

  const ts = document.getElementById('tbody-sinresp');
  if (ts) ts.innerHTML = sr && sr.length ? sr.map(o => `<tr><td><strong>${o.numero}</strong></td><td>${o.tema}</td><td>${o.asignado_nombre || '—'}</td><td><span class="badge b-sin">${o.fecha_inicio ? Math.floor((Date.now() - new Date(o.fecha_inicio)) / 86400000) + 'd' : '—'}</span></td><td><button class="btn-sm ok" onclick="abrirModalEtapa(${o.id},'${o.numero}','${o.etapa}')"><i class="ti ti-git-branch"></i> Mover</button></td></tr>`).join('') : '<tr><td colspan="5"><div class="empty">Sin oficios sin respuesta</div></td></tr>';

  const tr2 = document.getElementById('tbody-reiterar');
  if (tr2) tr2.innerHTML = rt && rt.length ? rt.map(o => `<tr><td><strong>${o.numero}</strong></td><td>${o.tema}</td><td>${o.asignado_nombre || '—'}</td><td><button class="btn-sm ok" onclick="abrirModalEtapa(${o.id},'${o.numero}','${o.etapa}')"><i class="ti ti-git-branch"></i> Mover</button></td></tr>`).join('') : '<tr><td colspan="4"><div class="empty">Sin oficios a reiterar</div></td></tr>';
}

// ══ FLUJO VISUAL ══
async function cargarFlujo(el) {
  el.innerHTML = `<div class="page-header"><div><div class="page-eyebrow">FLUJO VISUAL</div><h1 class="page-title">Seguimiento de Oficios</h1></div>
    <div class="header-actions"><button class="btn-outline" onclick="recargarFlujoGlobal()"><i class="ti ti-refresh"></i> Actualizar</button></div></div>
    <div class="card" style="margin-bottom:12px">
      <div class="card-title"><i class="ti ti-search"></i> Buscar oficio</div>
      <input type="text" id="s-flujo" placeholder="Escribe número o tema del oficio..." oninput="buscarFlujo()" class="main-content input" style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;outline:none">
      <div id="flujo-resultados" style="margin-top:10px"></div>
    </div>
    <div id="flujo-detalle-wrap" style="display:none"></div>
    <div id="flujo-global-wrap"><div class="card" style="padding:0"><div id="flujo-visual-container"></div></div></div>`;

  await recargarFlujoGlobal();
}

async function recargarFlujoGlobal() {
  const data = await api('GET', '/oficios');
  if (data && typeof initFlujoVisual === 'function') initFlujoVisual(data);
}

async function buscarFlujo() {
  const q = document.getElementById('s-flujo')?.value || '';
  const el = document.getElementById('flujo-resultados');
  if (!el) return;
  if (!q.trim()) { el.innerHTML = ''; return; }
  const data = await api('GET', `/oficios?busqueda=${encodeURIComponent(q)}`);
  if (!data || !data.length) { el.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:8px">Sin resultados</div>'; return; }
  el.innerHTML = data.slice(0, 6).map(o =>
    `<div class="flujo-result-item" onclick="verDetalleOficio(${o.id})">
      <span class="fri-dot" style="background:${colorEtapa(o.etapa)}"></span>
      <span class="fri-num">${o.numero}</span>
      <span style="flex:1;font-size:13px;color:var(--muted)">${o.tema}</span>
      ${badgeEtapa(o.etapa)}
      <i class="ti ti-chevron-right" style="color:var(--muted);font-size:18px"></i>
    </div>`
  ).join('');
}

async function verDetalleOficio(id) {
  const o = await api('GET', `/oficios/${id}`);
  if (!o) return;

  document.getElementById('flujo-global-wrap').style.display = 'none';
  document.getElementById('flujo-resultados').innerHTML = '';
  const si = document.getElementById('s-flujo');
  if (si) si.value = '';

  const ORDEN = ['recibido', 'en_proceso', 'firmado', 'requiere_respuesta', 'sin_respuesta', 'reiterar', 'respondido', 'terminado', 'archivado'];
  const ICONS = { recibido: '📥', en_proceso: '⚙️', firmado: '✍️', requiere_respuesta: '❓', sin_respuesta: '⚠️', reiterar: '🔁', respondido: '✅', terminado: '🏁', archivado: '📁' };
  const LABELS = { recibido: 'Recibido', en_proceso: 'En proceso', firmado: 'Firmado', requiere_respuesta: 'Req. resp.', sin_respuesta: 'Sin resp.', reiterar: 'Reiterar', respondido: 'Respondido', terminado: 'Terminado', archivado: 'Archivado' };
  const idx = ORDEN.indexOf(o.etapa);

  const pasos = ORDEN.map((et, i) => {
    const hecho = i < idx;
    const activo = i === idx;
    const critico = ['sin_respuesta', 'reiterar'].includes(et);
    const cls = hecho ? 'done' : activo ? (critico ? 'warn' : 'active') : '';
    return `<div class="step">
      <div class="step-dot ${cls}">${ICONS[et]}</div>
      <div class="step-label ${hecho ? 'done' : activo ? 'active' : ''}">${LABELS[et]}</div>
    </div>` + (i < ORDEN.length - 1 ? `<div style="flex:1;height:2px;margin-top:17px;background:${hecho ? '#0F6E56' : activo ? '#6B1A2A' : 'var(--border)'}"></div>` : '');
  }).join('');

  const movs = o.movimientos || [];

  const det = document.getElementById('flujo-detalle-wrap');
  det.style.display = 'block';
  det.innerHTML = `
    <button class="btn-back-of" onclick="regresarFlujo()"><i class="ti ti-arrow-left"></i> Regresar al flujo general</button>
    <div class="of-detail">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-bottom:16px">
        <div>
          <div class="of-detail-num">${o.numero}</div>
          <div class="of-detail-tema">${o.tema}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:4px">
          ${badgeEtapa(o.etapa)}
          <button class="btn-primary" onclick="abrirModalEtapa(${o.id},'${o.numero}','${o.etapa}')"><i class="ti ti-git-branch"></i> Mover etapa</button>
          ${ROL !== 'lector' ? `<button class="btn-outline" onclick='editarOficio(${JSON.stringify(o)})'><i class="ti ti-edit"></i> Editar</button>` : ''}
          <button class="btn-gold" onclick="generarPDF(${o.id},'${o.numero}')"><i class="ti ti-file-text"></i> PDF</button>
        </div>
      </div>
      <div class="of-detail-grid">
        <div class="of-campo"><div class="of-campo-label">Departamento</div><div class="of-campo-val">${o.departamento || '—'}</div></div>
        <div class="of-campo"><div class="of-campo-label">Asignado a</div><div class="of-campo-val">${o.asignado_nombre || '—'}</div></div>
        <div class="of-campo"><div class="of-campo-label">Prioridad</div><div class="of-campo-val">${(o.prioridad || 'normal').toUpperCase()}</div></div>
        <div class="of-campo"><div class="of-campo-label">Fecha inicio</div><div class="of-campo-val">${fmt(o.fecha_inicio)}</div></div>
        <div class="of-campo"><div class="of-campo-label">Fecha despacho</div><div class="of-campo-val">${fmt(o.fecha_despacho)}</div></div>
        <div class="of-campo"><div class="of-campo-label">Fecha respuesta</div><div class="of-campo-val">${fmt(o.fecha_respuesta)}</div></div>
      </div>
      ${o.observaciones ? `<div style="background:var(--bg);border-radius:8px;padding:12px 14px;font-size:13px;margin-bottom:16px"><strong>Observaciones:</strong> ${o.observaciones}</div>` : ''}
      <div style="background:var(--bg);border-radius:12px;padding:16px">
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;display:flex;align-items:center;gap:6px"><i class="ti ti-git-branch" style="color:var(--guinda)"></i> Flujo de etapas</div>
        <div class="flujo-track">${pasos}</div>
      </div>
      ${movs.length ? `
      <div style="margin-top:14px">
        <div class="card-title" style="margin-bottom:10px"><i class="ti ti-history"></i> Historial de movimientos</div>
        ${movs.map(m => `<div class="activity-item"><span class="activity-dot" style="background:var(--guinda)"></span><div style="flex:1"><strong>${m.usuario_nombre || 'Sistema'}</strong>: ${m.etapa_anterior || 'inicio'} → <strong>${(m.etapa_nueva || '').replace(/_/g, ' ')}</strong>${m.comentario ? `<br><span style="font-size:11px;color:var(--muted)">${m.comentario}</span>` : ''}</div><span style="font-size:11px;color:var(--muted);white-space:nowrap">${new Date(m.fecha).toLocaleString('es-MX')}</span></div>`).join('')}
      </div>` : ''}
    </div>`;
}

function regresarFlujo() {
  document.getElementById('flujo-detalle-wrap').style.display = 'none';
  document.getElementById('flujo-global-wrap').style.display = 'block';
}

// ══ REPORTES ══
async function cargarReportes(el) {
  el.innerHTML = `<div class="page-header"><div><div class="page-eyebrow">REPORTES</div><h1 class="page-title">Generar Reportes</h1></div></div>
    <div class="row2">
      <div class="card">
        <div class="card-title"><i class="ti ti-file-spreadsheet"></i> Exportar Excel</div>
        <p style="font-size:13px;color:var(--muted);margin-bottom:14px">Exporta listas completas en formato Excel.</p>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="btn-outline" onclick="exportarExcel('oficios')" style="justify-content:flex-start"><i class="ti ti-file-spreadsheet"></i> Todos los oficios</button>
          <button class="btn-outline" onclick="exportarExcel('instrucciones')" style="justify-content:flex-start"><i class="ti ti-file-spreadsheet"></i> Pendientes / Instrucciones</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><i class="ti ti-file-text"></i> PDF por oficio</div>
        <p style="font-size:13px;color:var(--muted);margin-bottom:12px">Busca un oficio y genera su reporte en PDF con historial completo.</p>
        <input type="text" id="s-reporte" placeholder="Buscar oficio..." oninput="buscarReporte()" style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;outline:none;margin-bottom:10px">
        <div id="reporte-lista"></div>
      </div>
    </div>`;
}

async function buscarReporte() {
  const q = document.getElementById('s-reporte')?.value || '';
  const data = await api('GET', `/oficios?busqueda=${encodeURIComponent(q)}`);
  const el = document.getElementById('reporte-lista');
  if (!el) return;
  if (!data || !data.length) { el.innerHTML = '<div style="font-size:12px;color:var(--muted)">Escribe para buscar...</div>'; return; }
  el.innerHTML = data.slice(0, 6).map(o =>
    `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px">
      <span><strong>${o.numero}</strong> — ${o.tema}</span>
      <button class="btn-sm warn" onclick="generarPDF(${o.id},'${o.numero}')"><i class="ti ti-file-text"></i> PDF</button>
    </div>`
  ).join('');
}

function generarPDF(id, num) { window.open(`/api/exportar/pdf/${id}`, '_blank'); toast(`Generando PDF: ${num}`); }
function exportarExcel(tipo) { window.open(`/api/exportar/excel?tipo=${tipo}`, '_blank'); toast('Descargando Excel...'); }

// ══ EDITOR ══
async function cargarEditor(el) {
  el.innerHTML = `<div class="page-header"><div><div class="page-eyebrow">EDITOR</div><h1 class="page-title">Editor de Plantillas</h1></div>
    <div class="header-actions">
      <label class="btn-outline" style="cursor:pointer"><i class="ti ti-upload"></i> Cargar .docx <input type="file" accept=".docx" style="display:none" onchange="toast('Funcionalidad .docx en desarrollo')"></label>
      <button class="btn-outline" onclick="guardarEditor()"><i class="ti ti-device-floppy"></i> Guardar</button>
      <button class="btn-primary" onclick="generarDesdeEditor()"><i class="ti ti-file-text"></i> Generar PDF</button>
    </div></div>
    <div class="card" style="margin-bottom:10px">
      <div class="card-title"><i class="ti ti-code"></i> Variables — clic para insertar</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${['{{numero}}','{{tema}}','{{descripcion}}','{{departamento}}','{{asignado}}','{{fecha_inicio}}','{{fecha_despacho}}','{{fecha_respuesta}}','{{estado}}','{{observaciones}}'].map(v => `<span onclick="insertarVar('${v}')" style="background:var(--guinda-light);color:var(--guinda);padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">${v}</span>`).join('')}
      </div>
    </div>
    <div class="editor-toolbar">
      <button onclick="docCmd('bold')"><strong>N</strong></button>
      <button onclick="docCmd('italic')"><em>K</em></button>
      <button onclick="docCmd('underline')"><u>S</u></button>
      <div class="editor-sep"></div>
      <button onclick="docCmd('justifyLeft')"><i class="ti ti-align-left"></i></button>
      <button onclick="docCmd('justifyCenter')"><i class="ti ti-align-center"></i></button>
      <button onclick="docCmd('justifyRight')"><i class="ti ti-align-right"></i></button>
      <div class="editor-sep"></div>
      <button onclick="docCmd('insertUnorderedList')"><i class="ti ti-list"></i></button>
      <button onclick="docCmd('insertHorizontalRule')"><i class="ti ti-minus"></i></button>
      <button onclick="docCmd('removeFormat')"><i class="ti ti-clear-formatting"></i></button>
      <div class="editor-sep"></div>
      <select onchange="docCmd('fontSize',this.value);this.value=''" style="padding:4px 8px;font-size:12px;border:1px solid var(--border);border-radius:5px;font-family:inherit">
        <option value="">Tamaño</option><option value="1">Pequeño</option><option value="3">Normal</option><option value="5">Grande</option><option value="7">Muy grande</option>
      </select>
      <select onchange="docCmd('foreColor',this.value);this.value=''" style="padding:4px 8px;font-size:12px;border:1px solid var(--border);border-radius:5px;font-family:inherit">
        <option value="">Color</option><option value="#000">Negro</option><option value="#6B1A2A">Guinda</option><option value="#C9A227">Dorado</option><option value="#185FA5">Azul</option>
      </select>
    </div>
    <div class="editor-area" id="editor-area" contenteditable="true">
      <p style="text-align:center"><strong>H. XXV AYUNTAMIENTO DE TIJUANA</strong></p>
      <p style="text-align:center"><strong>DIRECCIÓN DE OPERACIONES · SITT</strong></p>
      <hr>
      <p>&nbsp;</p>
      <p><strong>Número de oficio:</strong> {{numero}}</p>
      <p><strong>Tema:</strong> {{tema}}</p>
      <p><strong>Descripción:</strong> {{descripcion}}</p>
      <p><strong>Departamento:</strong> {{departamento}}</p>
      <p><strong>Asignado a:</strong> {{asignado}}</p>
      <p><strong>Fecha de inicio:</strong> {{fecha_inicio}}</p>
      <p><strong>Fecha de despacho:</strong> {{fecha_despacho}}</p>
      <p><strong>Fecha de respuesta:</strong> {{fecha_respuesta}}</p>
      <p><strong>Estado:</strong> {{estado}}</p>
      <p><strong>Observaciones:</strong> {{observaciones}}</p>
      <p>&nbsp;</p>
      <hr>
      <p style="text-align:center;font-size:12px">Sistema de Transporte Masivo Urbano de Pasajeros de Tijuana · 2024–2027</p>
    </div>`;

  const d = await api('GET', '/plantillas');
  if (d && d.length) {
    try { const c = JSON.parse(d[0].contenido); if (c.html) document.getElementById('editor-area').innerHTML = c.html; } catch (e) {}
  }
}

function docCmd(c, v) { document.execCommand(c, false, v || null); document.getElementById('editor-area')?.focus(); }
function insertarVar(v) { document.getElementById('editor-area')?.focus(); document.execCommand('insertText', false, v); }

async function guardarEditor() {
  const el = document.getElementById('editor-area'); if (!el) return;
  const d = await api('GET', '/plantillas'); if (!d || !d.length) return;
  const r = await api('PUT', `/plantillas/${d[0].id}`, { nombre: 'Reporte Oficial SITT', contenido: { html: el.innerHTML } });
  if (r?.ok) toast('Plantilla guardada'); else toast('Error al guardar', 'error');
}

async function generarDesdeEditor() {
  const data = await api('GET', '/oficios');
  if (!data || !data.length) { toast('No hay oficios', 'error'); return; }
  const num = prompt('Número de oficio:\n' + data.slice(0, 5).map(o => o.numero).join('\n'));
  if (!num) return;
  const o = data.find(x => x.numero.toLowerCase().includes(num.toLowerCase()));
  if (!o) { toast('No encontrado', 'error'); return; }
  const el = document.getElementById('editor-area'); if (!el) return;
  let html = el.innerHTML;
  html = html
    .replace(/\{\{numero\}\}/g, o.numero || '')
    .replace(/\{\{tema\}\}/g, o.tema || '')
    .replace(/\{\{descripcion\}\}/g, o.descripcion || '')
    .replace(/\{\{departamento\}\}/g, o.departamento || '')
    .replace(/\{\{asignado\}\}/g, o.asignado_nombre || '')
    .replace(/\{\{fecha_inicio\}\}/g, o.fecha_inicio || '')
    .replace(/\{\{fecha_despacho\}\}/g, o.fecha_despacho || '')
    .replace(/\{\{fecha_respuesta\}\}/g, o.fecha_respuesta || '')
    .replace(/\{\{estado\}\}/g, o.estado || '')
    .replace(/\{\{observaciones\}\}/g, o.observaciones || '');
  el.innerHTML = html;
  toast(`Vista previa: ${o.numero}. Guarda y luego genera PDF desde Reportes.`);
}

// ══ PENDIENTES ══
async function cargarPendLista(el) {
  el.innerHTML = `<div class="page-header"><div><div class="page-eyebrow">PENDIENTES</div><h1 class="page-title">Pendientes e Instrucciones</h1></div>
    <div class="header-actions"><button class="btn-primary" onclick="abrirModalPend()"><i class="ti ti-plus"></i> Nuevo pendiente</button></div></div>
    <div class="tab-row">
      <button class="tab-pill active" id="tab-pend" onclick="filtrarPend('pendiente','tab-pend')">Pendientes</button>
      <button class="tab-pill" id="tab-proc" onclick="filtrarPend('en_proceso','tab-proc')">En proceso</button>
      <button class="tab-pill" id="tab-comp" onclick="filtrarPend('completada','tab-comp')">Completados</button>
      <button class="tab-pill" id="tab-todo" onclick="filtrarPend('','tab-todo')">Todos</button>
    </div>
    <input type="text" id="s-pend" placeholder="🔍 Buscar pendiente..." oninput="recargarPend()" style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-family:inherit;outline:none;margin-bottom:12px;background:#fff">
    <div id="pend-lista-container"></div>`;
  INSTRFILTRO = 'pendiente';
  await recargarPend();
}

function filtrarPend(estado, tabId) {
  INSTRFILTRO = estado;
  document.querySelectorAll('.tab-pill').forEach(b => b.classList.remove('active'));
  const t = document.getElementById(tabId); if (t) t.classList.add('active');
  recargarPend();
}

async function recargarPend() {
  const b = document.getElementById('s-pend')?.value || '';
  let url = '/instrucciones?';
  if (INSTRFILTRO) url += `estado=${INSTRFILTRO}&`;
  if (b) url += `busqueda=${encodeURIComponent(b)}`;
  const data = await api('GET', url);
  const el = document.getElementById('pend-lista-container');
  if (!el) return;
  if (!data || !data.length) { el.innerHTML = '<div class="empty"><i class="ti ti-list-check"></i>Sin pendientes en esta categoría</div>'; return; }
  el.innerHTML = data.map(i => `
    <div class="pend-item">
      <div class="pend-item-icon"><i class="ti ti-clock"></i></div>
      <div style="flex:1">
        <div class="pend-item-folio">${i.folio} · ${fmt(i.fecha)} · ${i.asignado_nombre || 'Sin asignar'} · ${badgePrio(i.prioridad)}</div>
        <div class="pend-item-desc">${i.instruccion || ''}</div>
        <div class="pend-item-actions">
          ${ROL !== 'lector' ? `<button class="btn-sm edit" onclick='editarPend(${JSON.stringify(i)})'><i class="ti ti-edit"></i> Editar</button>` : ''}
          ${!i.convertido_oficio && ROL !== 'lector' ? `<button class="btn-sm warn" onclick="convertirPend(${i.id},'${i.folio}')"><i class="ti ti-file-plus"></i> Generar oficio</button>` : ''}
          ${i.convertido_oficio ? '<span class="badge b-term">✅ Oficio generado</span>' : ''}
          ${ROL === 'admin' ? `<button class="btn-sm del" onclick="eliminarPend(${i.id})"><i class="ti ti-trash"></i></button>` : ''}
        </div>
      </div>
      <span class="badge ${i.estado === 'completada' ? 'b-term' : i.estado === 'en_proceso' ? 'b-proc' : 'b-pend'}">${i.estado}</span>
    </div>`).join('');
}

async function cargarPendUrgentes(el) {
  el.innerHTML = `<div class="page-header"><div><div class="page-eyebrow">URGENTE</div><h1 class="page-title">Pendientes Urgentes</h1></div></div><div id="pend-urg-list"></div>`;
  const data = await api('GET', '/instrucciones?estado=pendiente');
  const urgentes = (data || []).filter(i => i.prioridad === 'alta');
  const el2 = document.getElementById('pend-urg-list');
  if (!el2) return;
  if (!urgentes.length) { el2.innerHTML = '<div class="empty"><i class="ti ti-flame"></i>Sin pendientes urgentes</div>'; return; }
  el2.innerHTML = urgentes.map(i => `
    <div class="pend-item">
      <div class="pend-item-icon" style="background:var(--red-light);color:var(--red)"><i class="ti ti-flame"></i></div>
      <div style="flex:1">
        <div class="pend-item-folio">${i.folio} · ${fmt(i.fecha)} · ${i.asignado_nombre || 'Sin asignar'}</div>
        <div class="pend-item-desc">${i.instruccion || ''}</div>
        <div class="pend-item-actions">
          ${!i.convertido_oficio ? `<button class="btn-sm warn" onclick="convertirPend(${i.id},'${i.folio}')"><i class="ti ti-file-plus"></i> Generar oficio</button>` : '<span class="badge b-term">✅ Convertido</span>'}
        </div>
      </div>
    </div>`).join('');
}

async function cargarPendCompletados(el) {
  el.innerHTML = `<div class="page-header"><div><div class="page-eyebrow">COMPLETADOS</div><h1 class="page-title">Pendientes Completados</h1></div></div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>Folio</th><th>Descripción</th><th>Asignado</th><th>Fecha</th></tr></thead><tbody id="tbody-comp"></tbody></table></div></div>`;
  const data = await api('GET', '/instrucciones?estado=completada');
  const tbody = document.getElementById('tbody-comp');
  if (!tbody) return;
  if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="4"><div class="empty">Sin completados</div></td></tr>'; return; }
  tbody.innerHTML = data.map(i => `<tr><td><strong>${i.folio}</strong></td><td>${(i.instruccion || '').substring(0, 60)}</td><td>${i.asignado_nombre || '—'}</td><td>${fmt(i.fecha)}</td></tr>`).join('');
}

// ══ OTROS ══
async function cargarEstadisticas(el) {
  el.innerHTML = `<div class="page-header"><div><div class="page-eyebrow">ANÁLISIS</div><h1 class="page-title">Estadísticas</h1></div></div>
    <div class="metrics-grid" id="stats-mg"></div>
    <div class="card"><div class="card-title"><i class="ti ti-chart-bar"></i> Oficios por etapa</div><div style="position:relative;height:260px"><canvas id="stats-chart"></canvas></div></div>`;
  const d = await api('GET', '/dashboard'); if (!d) return;
  const tot = (d.pendientes || 0) + (d.terminados || 0) + (d.archivados || 0);
  const mg = document.getElementById('stats-mg');
  if (mg) mg.innerHTML = `
    <div class="metric-card"><div class="metric-icon g"><i class="ti ti-files"></i></div><div><div class="metric-label">Total</div><div class="metric-val">${tot}</div></div></div>
    <div class="metric-card"><div class="metric-icon go"><i class="ti ti-clock"></i></div><div><div class="metric-label">Pendientes</div><div class="metric-val">${d.pendientes || 0}</div></div></div>
    <div class="metric-card"><div class="metric-icon re"><i class="ti ti-alert-triangle"></i></div><div><div class="metric-label">Sin respuesta</div><div class="metric-val">${d.sinRespuesta || 0}</div></div></div>
    <div class="metric-card"><div class="metric-icon gr"><i class="ti ti-circle-check"></i></div><div><div class="metric-label">Terminados</div><div class="metric-val">${d.terminados || 0}</div></div></div>`;
  const cv = document.getElementById('stats-chart');
  if (cv && d.porEtapa && d.porEtapa.length) {
    const ELBL = { recibido: 'Recibido', en_proceso: 'En proceso', firmado: 'Firmado', requiere_respuesta: 'Req.resp', sin_respuesta: 'Sin resp', reiterar: 'Reiterar', respondido: 'Respondido', terminado: 'Terminado', archivado: 'Archivado' };
    if (window._statsChart) window._statsChart.destroy();
    window._statsChart = new Chart(cv, { type: 'bar', data: { labels: d.porEtapa.map(e => ELBL[e.etapa] || e.etapa), datasets: [{ label: 'Oficios', data: d.porEtapa.map(e => parseInt(e.total)), backgroundColor: '#6B1A2A', borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
  }
}

async function cargarArchivo(el) {
  el.innerHTML = `<div class="page-header"><div><div class="page-eyebrow">ARCHIVO</div><h1 class="page-title">Archivo General</h1></div></div>
    <div class="card"><div class="table-wrap"><table><thead><tr><th>No. Oficio</th><th>Tema</th><th>Departamento</th><th>Fecha terminación</th><th>Acciones</th></tr></thead><tbody id="tbody-archivo"></tbody></table></div></div>`;
  const data = await api('GET', '/oficios?etapa=archivado');
  const tbody = document.getElementById('tbody-archivo');
  if (!tbody) return;
  if (!data || !data.length) { tbody.innerHTML = '<tr><td colspan="5"><div class="empty">Sin oficios archivados</div></td></tr>'; return; }
  tbody.innerHTML = data.map(o => `<tr><td><strong>${o.numero}</strong></td><td>${o.tema}</td><td>${o.departamento || '—'}</td><td>${fmt(o.fecha_terminacion)}</td><td><button class="btn-sm warn" onclick="generarPDF(${o.id},'${o.numero}')"><i class="ti ti-file-text"></i> PDF</button></td></tr>`).join('');
}

// ══ AJUSTES ══
async function cargarUsuarios(el) {
  if (!el) el = document.getElementById('sec-usuarios');
  if (!el) return;
  el.innerHTML = `<div class="page-header"><div><div class="page-eyebrow">ADMINISTRACIÓN</div><h1 class="page-title">Usuarios</h1></div></div>
    <div class="tab-row">
      <button class="tab-pill active" id="tu-lista" onclick="swUTab('lista')">Lista de usuarios</button>
      <button class="tab-pill" id="tu-nuevo" onclick="swUTab('nuevo')">Nuevo usuario</button>
    </div>
    <div id="uc-lista" class="tab-content active">
      <div class="card"><div id="usuarios-content"></div></div>
    </div>
    <div id="uc-nuevo" class="tab-content">
      <div class="card" style="max-width:480px">
        <div class="card-title"><i class="ti ti-user-plus"></i> Nuevo usuario</div>
        <div class="form-group"><label>Nombre completo</label><input type="text" id="nu-nombre" placeholder="Nombre completo"></div>
        <div class="form-group"><label>Correo electrónico</label><input type="email" id="nu-email" placeholder="correo@sitt.gob.mx"></div>
        <div class="form-group"><label>Contraseña inicial</label><input type="password" id="nu-pass" placeholder="Mínimo 6 caracteres"></div>
        <div class="form-group"><label>Departamento</label><input type="text" id="nu-dep" placeholder="Dirección de Operaciones"></div>
        <div class="form-group"><label>Rol</label>
          <select id="nu-rol">
            <option value="admin">Administrador — acceso total</option>
            <option value="usuario" selected>Usuario — registra y edita</option>
            <option value="lector">Lector — solo visualiza</option>
          </select>
        </div>
        <p id="nu-error" style="color:var(--red);font-size:12px;margin-bottom:8px"></p>
        <button class="btn-primary" onclick="crearUsuario()"><i class="ti ti-user-plus"></i> Crear usuario</button>
      </div>
    </div>`;
  await recargarUsuarios();
}

function swUTab(tab) {
  document.querySelectorAll('#uc-lista,#uc-nuevo').forEach(e => e.classList.remove('active'));
  document.getElementById('uc-' + tab).classList.add('active');
  document.querySelectorAll('#tu-lista,#tu-nuevo').forEach(b => b.classList.remove('active'));
  document.getElementById('tu-' + tab).classList.add('active');
  if (tab === 'lista') recargarUsuarios();
}

async function recargarUsuarios() {
  const data = await api('GET', '/usuarios');
  if (!data) return;
  USUARIOS = data;
  const el = document.getElementById('usuarios-content');
  if (!el) return;
  el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Correo</th><th>Departamento</th><th>Rol</th><th>Estado</th><th>Acción</th></tr></thead><tbody>
    ${data.map(u => `<tr>
      <td><strong>${u.nombre}</strong></td><td style="font-size:12px;color:#888">${u.email}</td>
      <td>${u.departamento || '—'}</td>
      <td><span class="badge ${u.rol === 'admin' ? 'b-sin' : u.rol === 'lector' ? 'b-arch' : 'b-proc'}">${u.rol}</span></td>
      <td>${u.activo ? '<span class="badge b-term">Activo</span>' : '<span class="badge b-arch">Inactivo</span>'}</td>
      <td>${u.activo ? `<button class="btn-sm del" onclick="toggleUser(${u.id},0,'${u.nombre}')"><i class="ti ti-user-off"></i> Baja</button>` : `<button class="btn-sm ok" onclick="toggleUser(${u.id},1,'${u.nombre}')"><i class="ti ti-user-check"></i> Reactivar</button>`}</td>
    </tr>`).join('')}
  </tbody></table></div>`;
}

async function cargarUsuariosGlobal() { const data = await api('GET', '/usuarios'); if (data) USUARIOS = data; }

async function toggleUser(id, activo, nombre) {
  if (!confirm(`¿${activo ? 'Reactivar' : 'Dar de baja'} a "${nombre}"?`)) return;
  await api('PUT', `/usuarios/${id}`, { activo });
  toast(`Usuario ${activo ? 'reactivado' : 'dado de baja'}`);
  recargarUsuarios();
}

async function crearUsuario() {
  const body = { nombre: document.getElementById('nu-nombre')?.value, email: document.getElementById('nu-email')?.value, password: document.getElementById('nu-pass')?.value, departamento: document.getElementById('nu-dep')?.value, rol: document.getElementById('nu-rol')?.value };
  const err = document.getElementById('nu-error'); if (err) err.textContent = '';
  if (!body.nombre || !body.email || !body.password) { if (err) err.textContent = 'Completa todos los campos'; return; }
  const r = await api('POST', '/usuarios', body);
  if (r?.ok) { toast('Usuario creado'); ['nu-nombre', 'nu-email', 'nu-pass', 'nu-dep'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; }); swUTab('lista'); }
  else if (err) err.textContent = r?.error || 'Error';
}

async function cargarHistorial(el) {
  if (!el) return;
  el.innerHTML = `<div class="page-header"><div><div class="page-eyebrow">AUDITORÍA</div><h1 class="page-title">Historial de Cambios</h1></div></div><div class="card"><div id="hist-content"></div></div>`;
  const data = await api('GET', '/historial');
  const hc = document.getElementById('hist-content');
  if (!hc) return;
  if (!data || !data.length) { hc.innerHTML = '<div class="empty">Sin registros</div>'; return; }
  hc.innerHTML = data.map(h => `<div class="activity-item"><span class="activity-dot" style="background:var(--guinda)"></span><div style="flex:1"><strong>${h.usuario_nombre || 'Sistema'}</strong> — ${h.accion}<br><span style="font-size:11px;color:var(--muted)">${h.detalle || ''}</span></div><span style="font-size:11px;color:var(--muted);white-space:nowrap">${new Date(h.fecha).toLocaleString('es-MX')}</span></div>`).join('');
}

async function cargarPerfil(el) {
  if (!el) return;
  el.innerHTML = `<div class="page-header"><div><div class="page-eyebrow">CUENTA</div><h1 class="page-title">Mi Perfil</h1></div></div>
    <div class="card" style="max-width:440px">
      <div class="card-title"><i class="ti ti-lock"></i> Cambiar contraseña</div>
      <div class="form-group"><label>Contraseña actual</label><input type="password" id="p-actual" placeholder="••••••••"></div>
      <div class="form-group"><label>Nueva contraseña</label><input type="password" id="p-nueva" placeholder="Mínimo 6 caracteres"></div>
      <div class="form-group"><label>Confirmar nueva</label><input type="password" id="p-conf" placeholder="Repite la nueva"></div>
      <p id="p-error" style="color:var(--red);font-size:12px;margin-bottom:8px"></p>
      <button class="btn-primary" onclick="cambiarPass()"><i class="ti ti-check"></i> Actualizar contraseña</button>
    </div>`;
}

async function cambiarPass() {
  const a = document.getElementById('p-actual')?.value;
  const n = document.getElementById('p-nueva')?.value;
  const c = document.getElementById('p-conf')?.value;
  const err = document.getElementById('p-error'); if (err) err.textContent = '';
  if (!a || !n) { if (err) err.textContent = 'Completa todos los campos'; return; }
  if (n !== c) { if (err) err.textContent = 'Las contraseñas no coinciden'; return; }
  if (n.length < 6) { if (err) err.textContent = 'Mínimo 6 caracteres'; return; }
  const r = await api('POST', '/cambiar-password', { actual: a, nueva: n });
  if (r?.ok) { toast('Contraseña actualizada'); ['p-actual', 'p-nueva', 'p-conf'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; }); }
  else if (err) err.textContent = r?.error || 'Error';
}

// ══ MODAL OFICIO ══
function abrirModalOficio() {
  document.getElementById('modal-oficio-title').textContent = 'Nuevo Oficio';
  document.getElementById('of-id').value = '';
  ['of-num', 'of-tema', 'of-desc', 'of-dpto', 'of-obs'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('of-prio').value = 'normal';
  document.getElementById('of-req').checked = false;
  ['of-fi', 'of-fd', 'of-fr', 'of-ft'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const fi = document.getElementById('of-fi'); if (fi) fi.value = new Date().toISOString().substring(0, 10);
  fillSelect('of-asig', null);
  openModal('modal-oficio');
}

function editarOficio(o) {
  if (typeof o === 'string') o = JSON.parse(o);
  document.getElementById('modal-oficio-title').textContent = 'Editar Oficio';
  document.getElementById('of-id').value = o.id;
  document.getElementById('of-num').value = o.numero || '';
  document.getElementById('of-tema').value = o.tema || '';
  document.getElementById('of-desc').value = o.descripcion || '';
  document.getElementById('of-dpto').value = o.departamento || '';
  document.getElementById('of-prio').value = o.prioridad || 'normal';
  document.getElementById('of-fi').value = o.fecha_inicio || '';
  document.getElementById('of-fd').value = o.fecha_despacho || '';
  document.getElementById('of-fr').value = o.fecha_respuesta || '';
  document.getElementById('of-ft').value = o.fecha_terminacion || '';
  document.getElementById('of-req').checked = o.requiere_respuesta || false;
  document.getElementById('of-obs').value = o.observaciones || '';
  fillSelect('of-asig', o.asignado_a);
  openModal('modal-oficio');
}

async function guardarOficio() {
  const id = document.getElementById('of-id').value;
  const body = {
    numero: document.getElementById('of-num').value,
    tema: document.getElementById('of-tema').value,
    descripcion: document.getElementById('of-desc').value,
    departamento: document.getElementById('of-dpto').value,
    asignado_a: document.getElementById('of-asig').value || null,
    prioridad: document.getElementById('of-prio').value,
    fecha_inicio: document.getElementById('of-fi').value || null,
    fecha_despacho: document.getElementById('of-fd').value || null,
    fecha_respuesta: document.getElementById('of-fr').value || null,
    fecha_terminacion: document.getElementById('of-ft').value || null,
    requiere_respuesta: document.getElementById('of-req').checked,
    observaciones: document.getElementById('of-obs').value
  };
  if (!body.numero || !body.tema) { toast('Número y tema son requeridos', 'error'); return; }
  const r = id ? await api('PUT', `/oficios/${id}`, body) : await api('POST', '/oficios', body);
  if (r?.ok) {
    toast(id ? 'Oficio actualizado' : 'Oficio registrado');
    closeModal('modal-oficio');
    recargarTodos();
  } else toast(r?.error || 'Error', 'error');
}

async function eliminarOficio(id) {
  if (!confirm('¿Eliminar este oficio?')) return;
  const r = await api('DELETE', `/oficios/${id}`);
  if (r?.ok) { toast('Eliminado'); recargarTodos(); }
  else toast('Error', 'error');
}

// ══ MODAL ETAPA ══
function abrirModalEtapa(id, numero, etapaActual) {
  document.getElementById('etapa-oficio-id').value = id;
  document.getElementById('etapa-num-txt').textContent = numero;
  document.getElementById('etapa-select').value = etapaActual;
  document.getElementById('etapa-comentario').value = '';
  openModal('modal-etapa');
}

async function guardarEtapa() {
  const id = document.getElementById('etapa-oficio-id').value;
  const etapa = document.getElementById('etapa-select').value;
  const comentario = document.getElementById('etapa-comentario').value;
  const r = await api('PUT', `/oficios/${id}/etapa`, { etapa, comentario });
  if (r?.ok) {
    toast('Etapa actualizada');
    closeModal('modal-etapa');
    recargarFlujoGlobal();
    recargarTodos();
    recargarPendOf();
  } else toast('Error', 'error');
}

// ══ MODAL PENDIENTE ══
function abrirModalPend() {
  document.getElementById('modal-pend-title').textContent = 'Nuevo Pendiente';
  document.getElementById('pend-id').value = '';
  ['pend-folio', 'pend-obs'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const d = document.getElementById('pend-desc'); if (d) d.value = '';
  const f = document.getElementById('pend-fecha'); if (f) f.value = new Date().toISOString().substring(0, 10);
  document.getElementById('pend-prio').value = 'normal';
  document.getElementById('pend-estado').value = 'pendiente';
  fillSelect('pend-asig', null);
  openModal('modal-pend');
}

function editarPend(i) {
  if (typeof i === 'string') i = JSON.parse(i);
  document.getElementById('modal-pend-title').textContent = 'Editar Pendiente';
  document.getElementById('pend-id').value = i.id;
  document.getElementById('pend-folio').value = i.folio || '';
  document.getElementById('pend-desc').value = i.instruccion || '';
  document.getElementById('pend-fecha').value = i.fecha || '';
  document.getElementById('pend-prio').value = i.prioridad || 'normal';
  document.getElementById('pend-estado').value = i.estado || 'pendiente';
  document.getElementById('pend-obs').value = i.observaciones || '';
  fillSelect('pend-asig', i.asignado_a);
  openModal('modal-pend');
}

async function guardarPendiente() {
  const id = document.getElementById('pend-id').value;
  const body = {
    folio: document.getElementById('pend-folio').value,
    instruccion: document.getElementById('pend-desc').value,
    fecha: document.getElementById('pend-fecha').value || null,
    asignado_a: document.getElementById('pend-asig').value || null,
    prioridad: document.getElementById('pend-prio').value,
    estado: document.getElementById('pend-estado').value,
    observaciones: document.getElementById('pend-obs').value
  };
  if (!body.folio || !body.instruccion) { toast('Folio y descripción son requeridos', 'error'); return; }
  const r = id ? await api('PUT', `/instrucciones/${id}`, body) : await api('POST', '/instrucciones', body);
  if (r?.ok) { toast('Pendiente guardado'); closeModal('modal-pend'); recargarPend(); }
  else toast('Error', 'error');
}

async function convertirPend(id, folio) {
  if (!confirm(`¿Generar oficio desde el pendiente "${folio}"?`)) return;
  const r = await api('POST', `/instrucciones/${id}/convertir`);
  if (r?.ok) { toast(`Oficio generado: ${r.numero}`); recargarPend(); }
  else toast('Error', 'error');
}

async function eliminarPend(id) {
  if (!confirm('¿Eliminar pendiente?')) return;
  const r = await api('DELETE', `/instrucciones/${id}`);
  if (r?.ok) { toast('Eliminado'); recargarPend(); }
}

// ══ HELPERS ══
function fillSelect(selId, currentVal) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  sel.innerHTML = '<option value="">Sin asignar</option>' +
    USUARIOS.map(u => `<option value="${u.id}" ${u.id == currentVal ? 'selected' : ''}>${u.nombre}</option>`).join('');
}

function openModal(id) { const el = document.getElementById(id); if (el) el.style.display = 'flex'; }
function closeModal(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }

document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); });
});

async function cargarUsuariosInicio() {
  const data = await api('GET', '/usuarios');
  if (data) USUARIOS = data;
}

// ══ INIT ══
startCanvas('bg-canvas');

(async () => {
  const me = await api('GET', '/me');
  if (me && me.nombre) {
    await cargarUsuariosInicio();
    mostrarHome(me.nombre, me.rol);
  }
})();
