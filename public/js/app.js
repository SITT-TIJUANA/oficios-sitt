let userRol = '';
let usuariosList = [];
let chartEtapas = null;
let instrEstadoFiltro = 'pendiente';

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
  t.style.background = type==='error' ? '#A32D2D' : '#0F1226';
  setTimeout(() => t.style.display = 'none', 3500);
}

function fmt(d) { return d ? String(d).substring(0,10) : '—'; }

// ══ CANVAS ANIMADO ══
function initCanvas(id) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, particles = [];

  function resize() {
    w = canvas.width = canvas.offsetWidth;
    h = canvas.height = canvas.offsetHeight;
  }

  function createParticle() {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.7 ? '#C9A227' : Math.random() > 0.5 ? '#6B1A2A' : '#fff'
    };
  }

  resize();
  window.addEventListener('resize', resize);
  for (let i = 0; i < 120; i++) particles.push(createParticle());

  // Lines between close particles
  function drawLines() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i+1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 100) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(201,162,39,${0.06 * (1 - dist/100)})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    // Deep dark gradient
    const grd = ctx.createRadialGradient(w*0.3, h*0.4, 0, w*0.3, h*0.4, w*0.8);
    grd.addColorStop(0, 'rgba(107,26,42,0.15)');
    grd.addColorStop(0.5, 'rgba(8,8,15,0)');
    grd.addColorStop(1, 'rgba(8,8,15,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0,0,w,h);

    drawLines();
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = p.color === '#C9A227' ? `rgba(201,162,39,${p.alpha})` : p.color === '#6B1A2A' ? `rgba(107,26,42,${p.alpha})` : `rgba(255,255,255,${p.alpha*0.3})`;
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// ══ RELOJ ══
function updateClock() {
  const el = document.getElementById('home-time');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString('es-MX', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
}

// ══ AUTH ══
async function doLogin() {
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-pass').value;
  const r = await api('POST', '/login', { email, password: pass });
  if (!r?.ok) { document.getElementById('login-error').textContent = r?.error || 'Credenciales incorrectas'; return; }
  await loadUsuarios();
  showHomeMenu(r.nombre, r.rol);
}
document.getElementById('login-pass').addEventListener('keypress', e => { if(e.key==='Enter') doLogin(); });

function showLogin() {
  document.getElementById('app').style.display = 'none';
  document.getElementById('home-screen').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
}

async function showHomeMenu(nombre, rol) {
  userRol = rol;
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'none';
  document.getElementById('home-screen').style.display = 'flex';
  document.getElementById('home-user-name').textContent = nombre;
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
  document.getElementById('home-greeting').textContent = saludo + ',';
  document.getElementById('home-welcome-name').textContent = nombre.split(' ')[0];
  if (rol === 'admin') document.getElementById('home-ajustes').style.display = 'block';
  // Cargar contadores
  const d = await api('GET', '/dashboard');
  if (d) {
    const tot = d.pendientes + d.terminados + d.archivados;
    document.getElementById('hc-oficios').textContent = tot;
    document.getElementById('hc-pendientes').textContent = d.instruccionesPendientes;
  }
  initCanvas('home-canvas');
  setInterval(updateClock, 1000);
  updateClock();
}

function goHome() {
  stopFlujoAnim();
  document.getElementById('app').style.display = 'none';
  document.getElementById('home-screen').style.display = 'flex';
}

async function doLogout() {
  await api('POST', '/logout');
  showLogin();
}

// ══ ENTRAR A SECCIÓN ══
function enterApp(seccion) {
  document.getElementById('home-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('app').style.flexDirection = 'column';
  document.getElementById('user-name').textContent = document.getElementById('home-user-name').textContent;
  buildApp(seccion);
}

function buildApp(seccion) {
  const titles = {oficios:'Oficios',pendientes:'Pendientes',otros:'Otros',ajustes:'Ajustes'};
  document.getElementById('app-section-title').textContent = `${titles[seccion]} — Dirección de Operaciones`;

  const navConfig = {
    oficios:[
      {sec:'dashboard',icon:'ti-layout-dashboard',label:'Dashboard'},
      {sec:'total-oficios',icon:'ti-files',label:'Todos los oficios'},
      {sec:'oficios-pendientes',icon:'ti-clock',label:'Oficios pendientes'},
      {sec:'alertas-oficios',icon:'ti-alert-triangle',label:'Alertas'},
      {sec:'flujo',icon:'ti-git-branch',label:'Flujo visual'},
      {sec:'reportes',icon:'ti-report-analytics',label:'Reportes'},
      {sec:'editor-plantillas',icon:'ti-template',label:'Editor de plantillas'},
    ],
    pendientes:[
      {sec:'pend-lista',icon:'ti-list-check',label:'Pendientes / Instrucciones'},
      {sec:'pend-urgentes',icon:'ti-flame',label:'Urgentes'},
      {sec:'pend-completados',icon:'ti-circle-check',label:'Completados'},
    ],
    otros:[
      {sec:'comunicados',icon:'ti-speakerphone',label:'Comunicados'},
      {sec:'estadisticas',icon:'ti-chart-bar',label:'Estadísticas'},
      {sec:'archivo',icon:'ti-archive',label:'Archivo general'},
    ],
    ajustes:[
      {sec:'usuarios',icon:'ti-users',label:'Usuarios'},
      {sec:'historial',icon:'ti-history',label:'Historial'},
      {sec:'perfil',icon:'ti-user-circle',label:'Mi perfil'},
    ]
  };

  const items = navConfig[seccion] || [];
  document.getElementById('sidenav').innerHTML =
    `<div class="nav-group-title">${titles[seccion]}</div>` +
    items.map(n => `<button class="nav-item" data-sec="${n.sec}" onclick="goInner('${n.sec}',this)"><i class="ti ${n.icon}"></i> ${n.label}</button>`).join('');

  // Build content
  document.getElementById('main-content').innerHTML =
    items.map(n => `<section id="inner-${n.sec}" class="inner-section">${getSectionHTML(n.sec)}</section>`).join('');

  // Activate first
  setTimeout(() => {
    const first = document.querySelector('.nav-item');
    if (first) { first.classList.add('active'); goInner(items[0].sec, first); }
  }, 50);
}

function goInner(sec, el) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  document.querySelectorAll('.inner-section').forEach(s => s.classList.remove('active'));
  const t = document.getElementById('inner-'+sec);
  if (t) t.classList.add('active');
  loadSection(sec);
}

function getSectionHTML(sec) {
  const s = {
    // ── OFICIOS ──
    dashboard:`<div class="page-header"><div><div class="page-eyebrow">PANEL</div><h1 class="page-title">Dashboard</h1></div><div class="header-actions"><button class="btn-primary" onclick="openModal('oficio-modal')"><i class="ti ti-plus"></i> Nuevo oficio</button></div></div><div class="metrics-grid" id="dash-metrics"></div><div class="row2"><div class="card"><div class="card-title"><i class="ti ti-chart-donut"></i> Por etapa</div><div style="position:relative;height:200px"><canvas id="chartEtapas"></canvas></div></div><div class="card"><div class="card-title"><i class="ti ti-activity"></i> Actividad reciente</div><div id="dash-activity"></div></div></div>`,

    'total-oficios':`<div class="page-header"><div><div class="page-eyebrow">GESTIÓN</div><h1 class="page-title">Todos los Oficios</h1></div><div class="header-actions"><button class="btn-outline" onclick="exportarExcel('oficios')"><i class="ti ti-file-spreadsheet"></i> Excel</button><button class="btn-primary" onclick="openModal('oficio-modal')"><i class="ti ti-plus"></i> Nuevo</button></div></div><div class="card"><div class="search-row"><input type="text" id="s-todos" placeholder="🔍 Buscar número, tema..." oninput="loadTabla('todos')"><select id="f-etapa" onchange="loadTabla('todos')"><option value="">Todas las etapas</option><option value="recibido">Recibido</option><option value="en_proceso">En proceso</option><option value="firmado">Firmado</option><option value="requiere_respuesta">Req. respuesta</option><option value="sin_respuesta">Sin respuesta</option><option value="reiterar">Reiterar</option><option value="respondido">Respondido</option><option value="terminado">Terminado</option><option value="archivado">Archivado</option></select><select id="f-prio" onchange="loadTabla('todos')"><option value="">Todas prioridades</option><option value="alta">Alta</option><option value="normal">Normal</option></select></div><div class="table-wrap"><table><thead><tr><th>No. Oficio</th><th>Tema</th><th>Dpto.</th><th>Asignado</th><th>Prioridad</th><th>Etapa</th><th>F. Inicio</th><th>Acciones</th></tr></thead><tbody id="tbody-todos"></tbody></table></div></div>`,

    'oficios-pendientes':`<div class="page-header"><div><div class="page-eyebrow">SEGUIMIENTO</div><h1 class="page-title">Oficios Pendientes</h1></div><div class="header-actions"><button class="btn-primary" onclick="openModal('oficio-modal')"><i class="ti ti-plus"></i> Nuevo</button></div></div><div class="card"><div class="search-row"><input type="text" id="s-pend-of" placeholder="🔍 Buscar..." oninput="loadTabla('pendientes')"></div><div class="table-wrap"><table><thead><tr><th>No. Oficio</th><th>Tema</th><th>Asignado</th><th>Prioridad</th><th>Etapa</th><th>Días</th><th>Acciones</th></tr></thead><tbody id="tbody-pendientes"></tbody></table></div></div>`,

    'alertas-oficios':`<div class="page-header"><div><div class="page-eyebrow">ALERTAS</div><h1 class="page-title">Alertas de Oficios</h1></div></div><div class="card"><div class="card-title" style="color:var(--red)"><i class="ti ti-alert-triangle"></i> Sin respuesta</div><div class="table-wrap"><table><thead><tr><th>No. Oficio</th><th>Tema</th><th>Asignado</th><th>Días</th><th>Acciones</th></tr></thead><tbody id="tbody-alertas"></tbody></table></div></div><div class="card"><div class="card-title" style="color:var(--amber)"><i class="ti ti-refresh"></i> A reiterar</div><div class="table-wrap"><table><thead><tr><th>No. Oficio</th><th>Tema</th><th>Asignado</th><th>Acciones</th></tr></thead><tbody id="tbody-reiterar"></tbody></table></div></div>`,

    flujo:`<div class="page-header"><div><div class="page-eyebrow">FLUJO VISUAL</div><h1 class="page-title">Seguimiento de Oficios</h1></div><div class="header-actions"><button class="btn-outline" onclick="recargarFlujo()"><i class="ti ti-refresh"></i> Actualizar</button></div></div>
    <div class="card" style="margin-bottom:12px">
      <div class="card-title"><i class="ti ti-search"></i> Buscar oficio</div>
      <input type="text" id="s-flujo" placeholder="Escribe número o tema del oficio..." oninput="buscarFlujoOficio()" style="margin-bottom:10px">
      <div id="flujo-resultados" class="flujo-busqueda-result"></div>
    </div>
    <div id="flujo-detalle-individual" style="display:none"></div>
    <div id="flujo-global-wrap">
      <div class="card" style="padding:0"><div id="flujo-visual-container"></div></div>
    </div>`,

    reportes:`<div class="page-header"><div><div class="page-eyebrow">REPORTES</div><h1 class="page-title">Generar Reportes</h1></div></div><div class="row2"><div class="card"><div class="card-title"><i class="ti ti-file-spreadsheet"></i> Exportar Excel</div><p style="font-size:13px;color:var(--text-muted);margin-bottom:14px">Exporta listas completas en formato Excel.</p><div style="display:flex;flex-direction:column;gap:8px"><button class="btn-outline" onclick="exportarExcel('oficios')" style="justify-content:flex-start"><i class="ti ti-file-spreadsheet"></i> Todos los oficios</button><button class="btn-outline" onclick="exportarExcel('instrucciones')" style="justify-content:flex-start"><i class="ti ti-file-spreadsheet"></i> Pendientes / Instrucciones</button></div></div><div class="card"><div class="card-title"><i class="ti ti-file-text"></i> PDF por oficio</div><p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">Selecciona un oficio para generar su reporte en PDF con historial completo.</p><div class="form-group"><input type="text" id="s-reporte" placeholder="Buscar oficio..." oninput="searchReporte()"></div><div id="reporte-lista"></div></div></div>`,

    'editor-plantillas':`<div class="page-header"><div><div class="page-eyebrow">EDITOR</div><h1 class="page-title">Editor de Plantillas</h1></div><div class="header-actions"><label class="btn-outline" style="cursor:pointer"><i class="ti ti-upload"></i> Cargar .docx <input type="file" accept=".docx" style="display:none" onchange="cargarDocx(this)"></label><button class="btn-outline" onclick="guardarPlantillaEditor()"><i class="ti ti-device-floppy"></i> Guardar</button><button class="btn-primary" onclick="abrirPrevEditorModal()"><i class="ti ti-file-text"></i> Generar reporte</button></div></div>
    <div class="card" style="margin-bottom:10px">
      <div class="card-title"><i class="ti ti-code"></i> Variables automáticas — clic para insertar</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${['{{numero}}','{{tema}}','{{descripcion}}','{{departamento}}','{{asignado}}','{{fecha_inicio}}','{{fecha_despacho}}','{{fecha_respuesta}}','{{estado}}','{{observaciones}}'].map(v=>`<span onclick="insertarVar('${v}')" style="background:var(--guinda-light);color:var(--guinda);padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600">${v}</span>`).join('')}
      </div>
    </div>
    <div class="editor-toolbar">
      <button onclick="cmd('bold')" title="Negrita"><strong>N</strong></button>
      <button onclick="cmd('italic')" title="Cursiva"><em>K</em></button>
      <button onclick="cmd('underline')" title="Subrayado"><u>S</u></button>
      <div class="editor-sep"></div>
      <button onclick="cmd('justifyLeft')"><i class="ti ti-align-left"></i></button>
      <button onclick="cmd('justifyCenter')"><i class="ti ti-align-center"></i></button>
      <button onclick="cmd('justifyRight')"><i class="ti ti-align-right"></i></button>
      <div class="editor-sep"></div>
      <button onclick="cmd('insertUnorderedList')"><i class="ti ti-list"></i></button>
      <button onclick="cmd('insertHorizontalRule')"><i class="ti ti-minus"></i></button>
      <button onclick="cmd('removeFormat')"><i class="ti ti-clear-formatting"></i></button>
      <div class="editor-sep"></div>
      <select onchange="cmd('fontSize',this.value);this.value=''" style="width:auto;padding:4px 8px;font-size:12px;border:1px solid var(--border);border-radius:5px">
        <option value="">Tamaño</option><option value="1">Pequeño</option><option value="3">Normal</option><option value="5">Grande</option><option value="7">Muy grande</option>
      </select>
      <select onchange="cmd('foreColor',this.value);this.value=''" style="width:auto;padding:4px 8px;font-size:12px;border:1px solid var(--border);border-radius:5px">
        <option value="">Color texto</option><option value="#000">Negro</option><option value="#6B1A2A">Guinda</option><option value="#C9A227">Dorado</option><option value="#185FA5">Azul</option><option value="#0F6E56">Verde</option>
      </select>
    </div>
    <div class="editor-area" id="editor-area" contenteditable="true">
      <p style="text-align:center"><strong>H. XXV AYUNTAMIENTO DE TIJUANA</strong></p>
      <p style="text-align:center"><strong>DIRECCIÓN DE OPERACIONES · SITT</strong></p>
      <hr>
      <p>&nbsp;</p>
      <p><strong>Número de oficio:</strong> {{numero}}</p>
      <p><strong>Tema / Asunto:</strong> {{tema}}</p>
      <p><strong>Descripción:</strong> {{descripcion}}</p>
      <p><strong>Departamento:</strong> {{departamento}}</p>
      <p><strong>Asignado a:</strong> {{asignado}}</p>
      <p><strong>Fecha de inicio:</strong> {{fecha_inicio}}</p>
      <p><strong>Fecha de despacho:</strong> {{fecha_despacho}}</p>
      <p><strong>Fecha de respuesta:</strong> {{fecha_respuesta}}</p>
      <p><strong>Estado actual:</strong> {{estado}}</p>
      <p><strong>Observaciones:</strong> {{observaciones}}</p>
      <p>&nbsp;</p>
      <hr>
      <p style="text-align:center;font-size:12px">Sistema de Transporte Masivo Urbano de Pasajeros de Tijuana · 2024–2027</p>
    </div>`,

    // ── PENDIENTES ──
    'pend-lista':`<div class="page-header"><div><div class="page-eyebrow">PENDIENTES</div><h1 class="page-title">Pendientes e Instrucciones</h1></div><div class="header-actions"><button class="btn-primary" onclick="openModal('instr-modal')"><i class="ti ti-plus"></i> Nuevo pendiente</button></div></div>
    <div class="tab-row">
      <button class="tab-pill active" onclick="filtrarPend('pendiente',this)">Pendientes</button>
      <button class="tab-pill" onclick="filtrarPend('en_proceso',this)">En proceso</button>
      <button class="tab-pill" onclick="filtrarPend('completada',this)">Completados</button>
      <button class="tab-pill" onclick="filtrarPend('',this)">Todos</button>
    </div>
    <div class="search-row"><input type="text" id="s-pend" placeholder="🔍 Buscar pendiente..." oninput="loadPendLista()"></div>
    <div id="pend-lista-container"></div>`,

    'pend-urgentes':`<div class="page-header"><div><div class="page-eyebrow">URGENTE</div><h1 class="page-title">Pendientes Urgentes</h1></div></div><div id="pend-urgentes-list"></div>`,

    'pend-completados':`<div class="page-header"><div><div class="page-eyebrow">COMPLETADOS</div><h1 class="page-title">Pendientes Completados</h1></div></div><div class="card"><div class="table-wrap"><table><thead><tr><th>Folio</th><th>Descripción</th><th>Asignado</th><th>Fecha</th></tr></thead><tbody id="tbody-pend-comp"></tbody></table></div></div>`,

    // ── OTROS ──
    comunicados:`<div class="page-header"><div><div class="page-eyebrow">COMUNICADOS</div><h1 class="page-title">Comunicados Internos</h1></div></div><div class="card"><div class="empty"><i class="ti ti-speakerphone"></i>Próximamente: publicación y consulta de comunicados internos del SITT.</div></div>`,

    estadisticas:`<div class="page-header"><div><div class="page-eyebrow">ANÁLISIS</div><h1 class="page-title">Estadísticas</h1></div></div><div class="metrics-grid" id="stats-metrics"></div><div class="card"><div class="card-title"><i class="ti ti-chart-bar"></i> Oficios por etapa</div><div style="position:relative;height:260px"><canvas id="chartStats"></canvas></div></div>`,

    archivo:`<div class="page-header"><div><div class="page-eyebrow">ARCHIVO</div><h1 class="page-title">Archivo General</h1></div></div><div class="card"><div class="table-wrap"><table><thead><tr><th>No. Oficio</th><th>Tema</th><th>Departamento</th><th>Fecha terminación</th><th>Acciones</th></tr></thead><tbody id="tbody-archivo"></tbody></table></div></div>`,

    // ── AJUSTES ──
    usuarios:`<div class="page-header"><div><div class="page-eyebrow">ADMINISTRACIÓN</div><h1 class="page-title">Usuarios</h1></div></div>
    <div class="tab-row"><button class="tab-pill active" onclick="swUTab('lista',this)">Lista</button><button class="tab-pill" onclick="swUTab('nuevo',this)">Nuevo usuario</button></div>
    <div id="utab-lista" class="utab-content active"><div class="card"><div id="usuarios-content"></div></div></div>
    <div id="utab-nuevo" class="utab-content">
      <div class="card" style="max-width:480px">
        <div class="card-title"><i class="ti ti-user-plus"></i> Nuevo usuario</div>
        <div class="form-group"><label>Nombre</label><input type="text" id="nu-nombre" placeholder="Nombre completo"></div>
        <div class="form-group"><label>Correo</label><input type="email" id="nu-email" placeholder="correo@sitt.gob.mx"></div>
        <div class="form-group"><label>Contraseña</label><input type="password" id="nu-pass" placeholder="Mínimo 6 caracteres"></div>
        <div class="form-group"><label>Departamento</label><input type="text" id="nu-dep" placeholder="Dirección de Operaciones"></div>
        <div class="form-group"><label>Rol</label><select id="nu-rol"><option value="admin">Administrador — acceso total</option><option value="usuario" selected>Usuario — registra y edita</option><option value="lector">Lector — solo visualiza</option></select></div>
        <p id="nu-error" style="color:var(--red);font-size:12px;margin-bottom:8px"></p>
        <button class="btn-primary" onclick="guardarUsuario()"><i class="ti ti-user-plus"></i> Crear usuario</button>
      </div>
    </div>`,

    historial:`<div class="page-header"><div><div class="page-eyebrow">AUDITORÍA</div><h1 class="page-title">Historial de Cambios</h1></div></div><div class="card"><div id="historial-content"></div></div>`,

    perfil:`<div class="page-header"><div><div class="page-eyebrow">CUENTA</div><h1 class="page-title">Mi Perfil</h1></div></div>
    <div class="card" style="max-width:440px">
      <div class="card-title"><i class="ti ti-lock"></i> Cambiar contraseña</div>
      <div class="form-group"><label>Contraseña actual</label><input type="password" id="pass-actual" placeholder="••••••••"></div>
      <div class="form-group"><label>Nueva contraseña</label><input type="password" id="pass-nueva" placeholder="Mínimo 6 caracteres"></div>
      <div class="form-group"><label>Confirmar</label><input type="password" id="pass-confirma" placeholder="Repite la nueva"></div>
      <p id="pass-error" style="color:var(--red);font-size:12px;margin-bottom:8px"></p>
      <button class="btn-primary" onclick="cambiarPassword()"><i class="ti ti-check"></i> Actualizar</button>
    </div>`
  };
  return s[sec] || `<div class="page-header"><h1 class="page-title">${sec}</h1></div><div class="card"><div class="empty"><i class="ti ti-tools"></i>En construcción</div></div>`;
}

function loadSection(sec) {
  const map = {
    dashboard: loadDashboard,
    'total-oficios': () => loadTabla('todos'),
    'oficios-pendientes': () => loadTabla('pendientes'),
    'alertas-oficios': loadAlertas,
    flujo: recargarFlujo,
    reportes: loadReportes,
    'editor-plantillas': loadEditor,
    'pend-lista': loadPendLista,
    'pend-urgentes': loadPendUrgentes,
    'pend-completados': loadPendCompletados,
    estadisticas: loadEstadisticas,
    archivo: loadArchivo,
    usuarios: loadUsuarios,
    historial: loadHistorial
  };
  if (map[sec]) map[sec]();
}

// ══ DASHBOARD ══
async function loadDashboard() {
  const d = await api('GET', '/dashboard');
  if (!d) return;
  const total = d.pendientes + d.terminados + d.archivados;
  const el = document.getElementById('dash-metrics');
  if (el) el.innerHTML = `
    <div class="metric-card"><div class="metric-icon g"><i class="ti ti-files"></i></div><div><div class="metric-label">Total</div><div class="metric-val">${total}</div></div></div>
    <div class="metric-card"><div class="metric-icon go"><i class="ti ti-clock"></i></div><div><div class="metric-label">Pendientes</div><div class="metric-val">${d.pendientes}</div></div></div>
    <div class="metric-card"><div class="metric-icon re"><i class="ti ti-alert-triangle"></i></div><div><div class="metric-label">Sin respuesta</div><div class="metric-val">${d.sinRespuesta}</div></div></div>
    <div class="metric-card"><div class="metric-icon gr"><i class="ti ti-circle-check"></i></div><div><div class="metric-label">Terminados</div><div class="metric-val">${d.terminados}</div></div></div>
    <div class="metric-card"><div class="metric-icon bl"><i class="ti ti-list-check"></i></div><div><div class="metric-label">Pendientes/Instr.</div><div class="metric-val">${d.instruccionesPendientes}</div></div></div>`;
  if (chartEtapas) chartEtapas.destroy();
  const cv = document.getElementById('chartEtapas');
  if (cv && d.porEtapa?.length) {
    const LABELS = {recibido:'Recibido',en_proceso:'En proceso',firmado:'Firmado',requiere_respuesta:'Req.resp',sin_respuesta:'Sin resp',reiterar:'Reiterar',respondido:'Respondido',terminado:'Terminado',archivado:'Archivado'};
    chartEtapas = new Chart(cv,{type:'doughnut',data:{labels:d.porEtapa.map(e=>LABELS[e.etapa]||e.etapa),datasets:[{data:d.porEtapa.map(e=>parseInt(e.total)),backgroundColor:['#185FA5','#534AB7','#C9A227','#854F0B','#A32D2D','#E24B4A','#0F6E56','#6B1A2A','#888'],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{size:11},boxWidth:10}}}}});
  }
  const al = document.getElementById('dash-activity');
  if (al) al.innerHTML = d.recientes?.length ? d.recientes.map(o=>`
    <div class="activity-item">
      <span class="act-dot" style="background:${['terminado','archivado'].includes(o.etapa)?'#0F6E56':o.etapa==='sin_respuesta'?'#A32D2D':'#6B1A2A'}"></span>
      <div style="flex:1"><strong>${o.numero}</strong> — ${o.tema}<br><span style="font-size:11px;color:var(--text-muted)">${(o.etapa||'').replace(/_/g,' ')} · ${o.asignado_nombre||'Sin asignar'}</span></div>
    </div>`).join('') : '<div class="empty">Sin oficios registrados</div>';
}

// ══ TABLAS DE OFICIOS ══
function prioBadge(p){return p==='alta'?'<span class="badge badge-alta">ALTA</span>':'<span class="badge badge-normal">'+(p||'normal').toUpperCase()+'</span>';}
function etapaBadge(e){
  const m={recibido:'badge-proc',en_proceso:'badge-proc',firmado:'badge-proc',requiere_respuesta:'badge-pend',sin_respuesta:'badge-sin',reiterar:'badge-sin',respondido:'badge-term',terminado:'badge-term',archivado:'badge-arch'};
  const l={recibido:'Recibido',en_proceso:'En proceso',firmado:'Firmado',requiere_respuesta:'Req. resp.',sin_respuesta:'Sin resp.',reiterar:'Reiterar',respondido:'Respondido',terminado:'Terminado',archivado:'Archivado'};
  return `<span class="badge ${m[e]||'badge-normal'}">${l[e]||e}</span>`;
}

async function loadTabla(tipo) {
  let url = '/oficios?';
  if (tipo==='pendientes') url+='estado=pendiente&';
  const busq = document.getElementById('s-todos')?.value||document.getElementById('s-pend-of')?.value||'';
  const etapa = document.getElementById('f-etapa')?.value||'';
  const prio = document.getElementById('f-prio')?.value||'';
  if(busq) url+=`busqueda=${encodeURIComponent(busq)}&`;
  if(etapa) url+=`etapa=${etapa}&`;
  if(prio) url+=`prioridad=${prio}&`;
  const data = await api('GET', url);
  const tbodyId = tipo==='pendientes'?'tbody-pendientes':'tbody-todos';
  const tbody = document.getElementById(tbodyId);
  if(!tbody) return;
  if(!data?.length){tbody.innerHTML=`<tr><td colspan="8"><div class="empty"><i class="ti ti-file-off"></i>Sin oficios</div></td></tr>`;return;}
  if(tipo==='pendientes'){
    tbody.innerHTML=data.map(o=>{
      const dias=o.fecha_inicio?Math.floor((Date.now()-new Date(o.fecha_inicio))/86400000):'—';
      return`<tr><td><strong>${o.numero}</strong></td><td>${o.tema}</td><td>${o.asignado_nombre||'—'}</td><td>${prioBadge(o.prioridad)}</td><td>${etapaBadge(o.etapa)}</td><td>${typeof dias==='number'?`<span class="badge ${dias>7?'badge-sin':'badge-pend'}">${dias}d</span>`:'—'}</td><td style="display:flex;gap:4px"><button class="btn-sm btn-edit" onclick="openEtapaModal(${o.id},'${o.numero}','${o.etapa}')"><i class="ti ti-git-branch"></i> Mover</button><button class="btn-sm btn-warn" onclick="generarPDF(${o.id},'${o.numero}')"><i class="ti ti-file-text"></i></button></td></tr>`;
    }).join('');
  } else {
    tbody.innerHTML=data.map(o=>`<tr>
      <td><strong>${o.numero}</strong></td><td>${o.tema}</td><td>${o.departamento||'—'}</td>
      <td>${o.asignado_nombre||'—'}</td><td>${prioBadge(o.prioridad)}</td>
      <td>${etapaBadge(o.etapa)}</td><td>${fmt(o.fecha_inicio)}</td>
      <td style="display:flex;gap:4px;flex-wrap:wrap">
        ${userRol!=='lector'?`<button class="btn-sm btn-edit" onclick='openEditOficio(${JSON.stringify(o)})'><i class="ti ti-edit"></i></button>`:''}
        <button class="btn-sm btn-success" onclick="openEtapaModal(${o.id},'${o.numero}','${o.etapa}')"><i class="ti ti-git-branch"></i></button>
        <button class="btn-sm btn-warn" onclick="generarPDF(${o.id},'${o.numero}')"><i class="ti ti-file-text"></i></button>
        ${userRol==='admin'?`<button class="btn-sm btn-danger" onclick="eliminarOficio(${o.id})"><i class="ti ti-trash"></i></button>`:''}
      </td></tr>`).join('');
  }
}

async function loadAlertas() {
  const [sinResp, reiterar] = await Promise.all([api('GET','/oficios?etapa=sin_respuesta'),api('GET','/oficios?etapa=reiterar')]);
  const t1=document.getElementById('tbody-alertas');
  const t2=document.getElementById('tbody-reiterar');
  if(t1){if(!sinResp?.length){t1.innerHTML='<tr><td colspan="5"><div class="empty"><i class="ti ti-check"></i>Sin oficios sin respuesta</div></td></tr>';}else{t1.innerHTML=sinResp.map(o=>`<tr><td><strong>${o.numero}</strong></td><td>${o.tema}</td><td>${o.asignado_nombre||'—'}</td><td><span class="badge badge-sin">${o.fecha_inicio?Math.floor((Date.now()-new Date(o.fecha_inicio))/86400000)+'d':'—'}</span></td><td><button class="btn-sm btn-edit" onclick="openEtapaModal(${o.id},'${o.numero}','${o.etapa}')"><i class="ti ti-git-branch"></i> Mover</button></td></tr>`).join('');}}
  if(t2){if(!reiterar?.length){t2.innerHTML='<tr><td colspan="4"><div class="empty">Sin oficios a reiterar</div></td></tr>';}else{t2.innerHTML=reiterar.map(o=>`<tr><td><strong>${o.numero}</strong></td><td>${o.tema}</td><td>${o.asignado_nombre||'—'}</td><td><button class="btn-sm btn-edit" onclick="openEtapaModal(${o.id},'${o.numero}','${o.etapa}')"><i class="ti ti-git-branch"></i> Mover</button></td></tr>`).join('');}}
}

// ══ FLUJO CON DETALLE INDIVIDUAL ══
async function recargarFlujo() {
  const data = await api('GET', '/oficios');
  if (data) initFlujoVisual(data);
}

async function buscarFlujoOficio() {
  const q = document.getElementById('s-flujo')?.value||'';
  const el = document.getElementById('flujo-resultados');
  if (!el) return;
  if (!q.trim()) { el.innerHTML=''; return; }
  const data = await api('GET', `/oficios?busqueda=${encodeURIComponent(q)}`);
  if (!data?.length) { el.innerHTML='<div style="font-size:12px;color:var(--text-muted);padding:8px">Sin resultados</div>'; return; }
  el.innerHTML = data.slice(0,6).map(o => {
    const colorDot = ['terminado','archivado'].includes(o.etapa)?'#0F6E56':o.etapa==='sin_respuesta'||o.etapa==='reiterar'?'#A32D2D':'#185FA5';
    // Mostrar primeras 8 letras/dígitos del número
    const numCorto = o.numero||'';
    return `<div class="flujo-oficio-item" onclick="verOficioDetalle(${o.id})">
      <span class="foi-dot" style="background:${colorDot}"></span>
      <span class="foi-num">${numCorto}</span>
      <span class="foi-tema">${o.tema}</span>
      ${etapaBadge(o.etapa)}
      <i class="ti ti-chevron-right foi-arrow"></i>
    </div>`;
  }).join('');
}

async function verOficioDetalle(id) {
  const o = await api('GET', `/oficios/${id}`);
  if (!o) return;
  // Ocultar flujo global y resultados
  document.getElementById('flujo-global-wrap').style.display = 'none';
  document.getElementById('flujo-resultados').innerHTML = '';
  document.getElementById('s-flujo').value = '';
  const det = document.getElementById('flujo-detalle-individual');
  det.style.display = 'block';

  const ETAPAS_ORDEN = ['recibido','en_proceso','firmado','requiere_respuesta','sin_respuesta','reiterar','respondido','terminado','archivado'];
  const ETAPAS_INFO = {recibido:{label:'Recibido',icon:'📥'},en_proceso:{label:'En proceso',icon:'⚙️'},firmado:{label:'Firmado',icon:'✍️'},requiere_respuesta:{label:'Req. respuesta',icon:'❓'},sin_respuesta:{label:'Sin respuesta',icon:'⚠️'},reiterar:{label:'Reiterar',icon:'🔁'},respondido:{label:'Respondido',icon:'✅'},terminado:{label:'Terminado',icon:'🏁'},archivado:{label:'Archivado',icon:'📁'}};
  const etapaIdx = ETAPAS_ORDEN.indexOf(o.etapa);

  const flujoSteps = ETAPAS_ORDEN.map((et,i) => {
    const info = ETAPAS_INFO[et];
    const isDone = i < etapaIdx;
    const isActive = i === etapaIdx;
    const isWarn = ['sin_respuesta','reiterar'].includes(et);
    let cls = isDone?'done':isActive?(isWarn?'warn':'active'):'';
    return `<div class="fi-step">
      <div class="fi-dot ${cls}">${info.icon}</div>
      <div class="fi-label ${isDone?'done':isActive?'active':''}">${info.label}</div>
    </div>${i<ETAPAS_ORDEN.length-1?'<div class="fi-step-line" style="background:'+(isDone?'#0F6E56':isActive?'#6B1A2A':'var(--border)')+'"></div>':''}`;
  }).join('');

  // Punto animado en el nodo actual
  const movs = o.movimientos||[];

  det.innerHTML = `
    <button class="oficio-det-back" onclick="regresarFlujGlobal()"><i class="ti ti-arrow-left"></i> Regresar al flujo general</button>
    <div class="oficio-detalle-page">
      <div class="oficio-det-header">
        <div>
          <div class="oficio-det-num">${o.numero}</div>
          <div class="oficio-det-tema">${o.tema}</div>
        </div>
        <div class="oficio-det-acciones">
          ${etapaBadge(o.etapa)}
          <button class="btn-primary" onclick="openEtapaModal(${o.id},'${o.numero}','${o.etapa}')"><i class="ti ti-git-branch"></i> Mover etapa</button>
          ${userRol!=='lector'?`<button class="btn-outline" onclick='openEditOficio(${JSON.stringify(o)})'><i class="ti ti-edit"></i> Editar</button>`:''}
          <button class="btn-gold" onclick="generarPDF(${o.id},'${o.numero}')"><i class="ti ti-file-text"></i> PDF</button>
        </div>
      </div>
      <div class="oficio-det-grid">
        <div class="oficio-campo"><div class="oficio-campo-label">Departamento</div><div class="oficio-campo-val">${o.departamento||'—'}</div></div>
        <div class="oficio-campo"><div class="oficio-campo-label">Asignado a</div><div class="oficio-campo-val">${o.asignado_nombre||'—'}</div></div>
        <div class="oficio-campo"><div class="oficio-campo-label">Prioridad</div><div class="oficio-campo-val">${(o.prioridad||'normal').toUpperCase()}</div></div>
        <div class="oficio-campo"><div class="oficio-campo-label">Fecha inicio</div><div class="oficio-campo-val">${fmt(o.fecha_inicio)}</div></div>
        <div class="oficio-campo"><div class="oficio-campo-label">Fecha despacho</div><div class="oficio-campo-val">${fmt(o.fecha_despacho)}</div></div>
        <div class="oficio-campo"><div class="oficio-campo-label">Fecha respuesta</div><div class="oficio-campo-val">${fmt(o.fecha_respuesta)}</div></div>
      </div>
      ${o.observaciones?`<div style="background:var(--bg);border-radius:8px;padding:12px 14px;font-size:13px;margin-bottom:16px"><strong>Observaciones:</strong> ${o.observaciones}</div>`:''}
      <div class="flujo-individual-wrap">
        <div class="flujo-individual-title"><i class="ti ti-git-branch"></i> Flujo de etapas — posición actual resaltada</div>
        <div class="flujo-individual-track">${flujoSteps}</div>
      </div>
      ${movs.length?`<div class="card" style="margin-top:14px"><div class="card-title"><i class="ti ti-history"></i> Historial de movimientos</div>${movs.map(m=>`<div class="activity-item"><span class="act-dot" style="background:var(--guinda)"></span><div style="flex:1"><strong>${m.usuario_nombre||'Sistema'}</strong>: ${m.etapa_anterior||'inicio'} → <strong>${(m.etapa_nueva||'').replace(/_/g,' ')}</strong>${m.comentario?`<br><span style="font-size:11px;color:var(--text-muted)">${m.comentario}</span>`:''}</div><span style="font-size:11px;color:var(--text-muted);white-space:nowrap">${new Date(m.fecha).toLocaleString('es-MX')}</span></div>`).join('')}</div>`:''}
    </div>`;
}

function regresarFlujGlobal() {
  document.getElementById('flujo-detalle-individual').style.display = 'none';
  document.getElementById('flujo-global-wrap').style.display = 'block';
}

// ══ PENDIENTES ══
function filtrarPend(estado, el) {
  instrEstadoFiltro = estado;
  document.querySelectorAll('.tab-pill').forEach(b=>b.classList.remove('active'));
  if(el) el.classList.add('active');
  loadPendLista();
}

async function loadPendLista() {
  const busq = document.getElementById('s-pend')?.value||'';
  let url = '/instrucciones?';
  if(instrEstadoFiltro) url+=`estado=${instrEstadoFiltro}&`;
  if(busq) url+=`busqueda=${encodeURIComponent(busq)}`;
  const data = await api('GET', url);
  const el = document.getElementById('pend-lista-container');
  if(!el) return;
  if(!data?.length){el.innerHTML='<div class="empty"><i class="ti ti-list-check"></i>Sin pendientes en esta categoría</div>';return;}
  el.innerHTML = data.map(i=>`
    <div class="pend-item">
      <div class="pend-item-icon"><i class="ti ti-clock"></i></div>
      <div class="pend-item-body">
        <div class="pend-item-folio">${i.folio} · ${fmt(i.fecha)} · ${prioBadge(i.prioridad)} · ${i.asignado_nombre||'Sin asignar'}</div>
        <div class="pend-item-desc">${i.instruccion||''}</div>
        <div class="pend-item-actions">
          ${userRol!=='lector'?`<button class="btn-sm btn-edit" onclick='openEditInstr(${JSON.stringify(i)})'><i class="ti ti-edit"></i> Editar</button>`:''}
          ${!i.convertido_oficio&&userRol!=='lector'?`<button class="btn-sm btn-warn" onclick="convertirInstr(${i.id},'${i.folio}')"><i class="ti ti-file-plus"></i> Generar oficio</button>`:''}
          ${i.convertido_oficio?'<span class="badge badge-term">✅ Oficio generado</span>':''}
          ${userRol==='admin'?`<button class="btn-sm btn-danger" onclick="eliminarInstr(${i.id})"><i class="ti ti-trash"></i></button>`:''}
        </div>
      </div>
      <span class="badge ${i.estado==='completada'?'badge-term':i.estado==='en_proceso'?'badge-proc':'badge-pend'}">${i.estado}</span>
    </div>`).join('');
}

async function loadPendUrgentes() {
  const data = await api('GET', '/instrucciones?prioridad=alta&estado=pendiente');
  const el = document.getElementById('pend-urgentes-list');
  if(!el) return;
  if(!data?.length){el.innerHTML='<div class="empty"><i class="ti ti-flame"></i>Sin pendientes urgentes</div>';return;}
  el.innerHTML=data.map(i=>`<div class="pend-item"><div class="pend-item-icon" style="background:var(--red-light);color:var(--red)"><i class="ti ti-flame"></i></div><div class="pend-item-body"><div class="pend-item-folio">${i.folio} · ${fmt(i.fecha)} · ${i.asignado_nombre||'Sin asignar'}</div><div class="pend-item-desc">${i.instruccion||''}</div><div class="pend-item-actions"><button class="btn-sm btn-warn" onclick="convertirInstr(${i.id},'${i.folio}')"><i class="ti ti-file-plus"></i> Generar oficio</button></div></div></div>`).join('');
}

async function loadPendCompletados() {
  const data = await api('GET', '/instrucciones?estado=completada');
  const tbody = document.getElementById('tbody-pend-comp');
  if(!tbody) return;
  if(!data?.length){tbody.innerHTML='<tr><td colspan="4"><div class="empty">Sin completados</div></td></tr>';return;}
  tbody.innerHTML=data.map(i=>`<tr><td><strong>${i.folio}</strong></td><td>${(i.instruccion||'').substring(0,60)}</td><td>${i.asignado_nombre||'—'}</td><td>${fmt(i.fecha)}</td></tr>`).join('');
}

// ══ INSTRUCCIONES CRUD ══
async function guardarInstruccion() {
  const id=document.getElementById('instr-id').value;
  const body={folio:document.getElementById('instr-folio').value,instruccion:document.getElementById('instr-texto').value,fecha:document.getElementById('instr-fecha').value||null,asignado_a:document.getElementById('instr-asignado').value||null,prioridad:document.getElementById('instr-prioridad').value,estado:document.getElementById('instr-estado').value,observaciones:document.getElementById('instr-obs').value};
  if(!body.folio||!body.instruccion){toast('Folio y descripción son requeridos','error');return;}
  const r=id?await api('PUT',`/instrucciones/${id}`,body):await api('POST','/instrucciones',body);
  if(r?.ok){toast('Pendiente guardado');closeModal('instr-modal');loadPendLista();}
  else toast('Error','error');
}

function openEditInstr(i){
  if(typeof i==='string') i=JSON.parse(i);
  document.getElementById('instr-modal-title').textContent='Editar Pendiente';
  document.getElementById('instr-id').value=i.id;
  document.getElementById('instr-folio').value=i.folio;
  document.getElementById('instr-texto').value=i.instruccion;
  document.getElementById('instr-fecha').value=i.fecha||'';
  document.getElementById('instr-prioridad').value=i.prioridad;
  document.getElementById('instr-estado').value=i.estado;
  document.getElementById('instr-obs').value=i.observaciones||'';
  populateAsignado('instr-asignado',i.asignado_a);
  openModal('instr-modal');
}

async function convertirInstr(id,folio){
  if(!confirm(`¿Generar oficio desde el pendiente "${folio}"?`)) return;
  const r=await api('POST',`/instrucciones/${id}/convertir`);
  if(r?.ok){toast(`Oficio generado: ${r.numero}`);loadPendLista();}
  else toast('Error','error');
}

async function eliminarInstr(id){
  if(!confirm('¿Eliminar pendiente?')) return;
  const r=await api('DELETE',`/instrucciones/${id}`);
  if(r?.ok){toast('Eliminado');loadPendLista();}
}

// ══ OFICIOS CRUD ══
async function guardarOficio(){
  const id=document.getElementById('oficio-id').value;
  const body={numero:document.getElementById('of-numero').value,tema:document.getElementById('of-tema').value,descripcion:document.getElementById('of-descripcion').value,departamento:document.getElementById('of-departamento').value,asignado_a:document.getElementById('of-asignado').value||null,prioridad:document.getElementById('of-prioridad').value,fecha_inicio:document.getElementById('of-fecha-inicio').value||null,fecha_despacho:document.getElementById('of-fecha-despacho').value||null,fecha_respuesta:document.getElementById('of-fecha-respuesta').value||null,fecha_terminacion:document.getElementById('of-fecha-terminacion').value||null,requiere_respuesta:document.getElementById('of-requiere-resp').checked,observaciones:document.getElementById('of-observaciones').value};
  if(!body.numero||!body.tema){toast('Número y tema requeridos','error');return;}
  const r=id?await api('PUT',`/oficios/${id}`,body):await api('POST','/oficios',body);
  if(r?.ok){toast(id?'Actualizado':'Oficio registrado');closeModal('oficio-modal');loadDashboard();loadTabla('todos');}
  else toast(r?.error||'Error','error');
}

function openEditOficio(o){
  if(typeof o==='string') o=JSON.parse(o);
  document.getElementById('oficio-modal-title').textContent='Editar Oficio';
  document.getElementById('oficio-id').value=o.id;
  document.getElementById('of-numero').value=o.numero||'';
  document.getElementById('of-tema').value=o.tema||'';
  document.getElementById('of-descripcion').value=o.descripcion||'';
  document.getElementById('of-departamento').value=o.departamento||'';
  document.getElementById('of-prioridad').value=o.prioridad||'normal';
  document.getElementById('of-fecha-inicio').value=o.fecha_inicio||'';
  document.getElementById('of-fecha-despacho').value=o.fecha_despacho||'';
  document.getElementById('of-fecha-respuesta').value=o.fecha_respuesta||'';
  document.getElementById('of-fecha-terminacion').value=o.fecha_terminacion||'';
  document.getElementById('of-requiere-resp').checked=o.requiere_respuesta||false;
  document.getElementById('of-observaciones').value=o.observaciones||'';
  populateAsignado('of-asignado',o.asignado_a);
  openModal('oficio-modal');
}

async function eliminarOficio(id){
  if(!confirm('¿Eliminar este oficio?')) return;
  const r=await api('DELETE',`/oficios/${id}`);
  if(r?.ok){toast('Eliminado');loadTabla('todos');recargarFlujo();}
  else toast('Error','error');
}

// ══ ETAPA ══
function openEtapaModal(id,numero,etapaActual){
  document.getElementById('etapa-oficio-id').value=id;
  document.getElementById('etapa-oficio-num').textContent=numero;
  document.getElementById('etapa-nueva').value=etapaActual;
  document.getElementById('etapa-comentario').value='';
  openModal('etapa-modal');
}

async function guardarEtapa(){
  const id=document.getElementById('etapa-oficio-id').value;
  const etapa=document.getElementById('etapa-nueva').value;
  const comentario=document.getElementById('etapa-comentario').value;
  const r=await api('PUT',`/oficios/${id}/etapa`,{etapa,comentario});
  if(r?.ok){toast('Etapa actualizada');closeModal('etapa-modal');recargarFlujo();loadDashboard();}
  else toast('Error','error');
}

// ══ REPORTES ══
async function loadReportes(){searchReporte();}
async function searchReporte(){
  const q=document.getElementById('s-reporte')?.value||'';
  const data=await api('GET',`/oficios?busqueda=${encodeURIComponent(q)}`);
  const el=document.getElementById('reporte-lista');
  if(!el) return;
  if(!data?.length){el.innerHTML='<div style="font-size:12px;color:var(--text-muted);padding:8px">Escribe para buscar...</div>';return;}
  el.innerHTML=data.slice(0,6).map(o=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px"><span><strong>${o.numero}</strong> — ${o.tema}</span><button class="btn-sm" style="background:var(--guinda-light);color:var(--guinda)" onclick="generarPDF(${o.id},'${o.numero}')"><i class="ti ti-file-text"></i> PDF</button></div>`).join('');
}
function generarPDF(id,numero){window.open(`/api/exportar/pdf/${id}`,'_blank');toast(`Generando PDF: ${numero}...`);}
function exportarExcel(tipo){window.open(`/api/exportar/excel?tipo=${tipo}`,'_blank');toast(`Descargando Excel...`);}

// ══ EDITOR ══
async function loadEditor(){
  const data=await api('GET','/plantillas');
  if(data?.length){
    try{const c=typeof data[0].contenido==='string'?JSON.parse(data[0].contenido):data[0].contenido;if(c?.html){const el=document.getElementById('editor-area');if(el) el.innerHTML=c.html;}}catch(e){}
  }
}
function cmd(c,v){document.execCommand(c,false,v||null);document.getElementById('editor-area')?.focus();}
function insertarVar(v){document.getElementById('editor-area')?.focus();document.execCommand('insertText',false,v);}
async function guardarPlantillaEditor(){
  const el=document.getElementById('editor-area');if(!el) return;
  const data=await api('GET','/plantillas');if(!data?.length) return;
  const r=await api('PUT',`/plantillas/${data[0].id}`,{nombre:'Reporte Oficial SITT',contenido:{html:el.innerHTML,encabezado:'H. XXV Ayuntamiento de Tijuana — SITT',pie:'Sistema de Transporte Masivo Urbano de Pasajeros de Tijuana'}});
  if(r?.ok) toast('Plantilla guardada');else toast('Error','error');
}
async function abrirPrevEditorModal(){
  const data=await api('GET','/oficios');
  if(!data?.length){toast('No hay oficios para generar reporte','error');return;}
  const sel=prompt('Escribe el número de oficio para el reporte:\n'+data.slice(0,5).map(o=>o.numero).join('\n'));
  if(!sel) return;
  const of=data.find(o=>o.numero.toLowerCase().includes(sel.toLowerCase()));
  if(!of){toast('Oficio no encontrado','error');return;}
  const el=document.getElementById('editor-area');if(!el) return;
  let html=el.innerHTML;
  html=html.replace(/\{\{numero\}\}/g,of.numero||'').replace(/\{\{tema\}\}/g,of.tema||'').replace(/\{\{descripcion\}\}/g,of.descripcion||'').replace(/\{\{departamento\}\}/g,of.departamento||'').replace(/\{\{asignado\}\}/g,of.asignado_nombre||'').replace(/\{\{fecha_inicio\}\}/g,of.fecha_inicio||'').replace(/\{\{fecha_despacho\}\}/g,of.fecha_despacho||'').replace(/\{\{fecha_respuesta\}\}/g,of.fecha_respuesta||'').replace(/\{\{estado\}\}/g,of.estado||'').replace(/\{\{observaciones\}\}/g,of.observaciones||'');
  el.innerHTML=html;
  toast(`Vista previa de: ${of.numero}. Guarda y luego genera PDF.`);
}
function cargarDocx(input){toast('Carga de .docx en desarrollo. Por ahora usa el editor de texto.');}

// ══ ESTADÍSTICAS ══
async function loadEstadisticas(){
  const d=await api('GET','/dashboard');if(!d) return;
  const el=document.getElementById('stats-metrics');
  if(el) el.innerHTML=`<div class="metric-card"><div class="metric-icon g"><i class="ti ti-files"></i></div><div><div class="metric-label">Total</div><div class="metric-val">${d.pendientes+d.terminados+d.archivados}</div></div></div><div class="metric-card"><div class="metric-icon go"><i class="ti ti-clock"></i></div><div><div class="metric-label">Pendientes</div><div class="metric-val">${d.pendientes}</div></div></div><div class="metric-card"><div class="metric-icon re"><i class="ti ti-alert-triangle"></i></div><div><div class="metric-label">Sin respuesta</div><div class="metric-val">${d.sinRespuesta}</div></div></div><div class="metric-card"><div class="metric-icon gr"><i class="ti ti-circle-check"></i></div><div><div class="metric-label">Terminados</div><div class="metric-val">${d.terminados}</div></div></div>`;
  const cv=document.getElementById('chartStats');
  if(cv&&d.porEtapa?.length){if(window._cS) window._cS.destroy();const LABELS={recibido:'Recibido',en_proceso:'En proceso',firmado:'Firmado',requiere_respuesta:'Req.resp',sin_respuesta:'Sin resp',reiterar:'Reiterar',respondido:'Respondido',terminado:'Terminado',archivado:'Archivado'};window._cS=new Chart(cv,{type:'bar',data:{labels:d.porEtapa.map(e=>LABELS[e.etapa]||e.etapa),datasets:[{label:'Oficios',data:d.porEtapa.map(e=>parseInt(e.total)),backgroundColor:'#6B1A2A',borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});}
}

async function loadArchivo(){
  const data=await api('GET','/oficios?etapa=archivado');
  const tbody=document.getElementById('tbody-archivo');if(!tbody) return;
  if(!data?.length){tbody.innerHTML='<tr><td colspan="5"><div class="empty">Sin oficios archivados</div></td></tr>';return;}
  tbody.innerHTML=data.map(o=>`<tr><td><strong>${o.numero}</strong></td><td>${o.tema}</td><td>${o.departamento||'—'}</td><td>${fmt(o.fecha_terminacion)}</td><td><button class="btn-sm btn-warn" onclick="generarPDF(${o.id},'${o.numero}')"><i class="ti ti-file-text"></i> PDF</button></td></tr>`).join('');
}

// ══ USUARIOS ══
function swUTab(tab,el){
  document.querySelectorAll('.tab-pill').forEach(b=>b.classList.remove('active'));
  if(el) el.classList.add('active');
  document.querySelectorAll('.utab-content').forEach(t=>t.classList.remove('active'));
  document.getElementById('utab-'+tab)?.classList.add('active');
  if(tab==='lista') loadUsuarios();
}

async function loadUsuarios(){
  const data=await api('GET','/usuarios');if(!data) return;
  usuariosList=data;
  const el=document.getElementById('usuarios-content');if(!el) return;
  el.innerHTML=`<div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Correo</th><th>Departamento</th><th>Rol</th><th>Estado</th><th>Acción</th></tr></thead><tbody>
    ${data.map(u=>`<tr><td><strong>${u.nombre}</strong></td><td style="font-size:12px;color:#888">${u.email}</td><td>${u.departamento||'—'}</td><td><span class="badge ${u.rol==='admin'?'badge-sin':u.rol==='lector'?'badge-arch':'badge-proc'}">${u.rol}</span></td><td>${u.activo?'<span class="badge badge-term">Activo</span>':'<span class="badge badge-arch">Inactivo</span>'}</td><td>${u.activo?`<button class="btn-sm btn-danger" onclick="toggleUsu(${u.id},0,'${u.nombre}')"><i class="ti ti-user-off"></i> Baja</button>`:`<button class="btn-sm btn-success" onclick="toggleUsu(${u.id},1,'${u.nombre}')"><i class="ti ti-user-check"></i> Reactivar</button>`}</td></tr>`).join('')}
  </tbody></table></div>`;
}

async function toggleUsu(id,activo,nombre){
  if(!confirm(`¿${activo?'Reactivar':'Dar de baja'} a "${nombre}"?`)) return;
  await api('PUT',`/usuarios/${id}`,{activo});toast(`Usuario ${activo?'reactivado':'dado de baja'}`);loadUsuarios();
}

async function guardarUsuario(){
  const body={nombre:document.getElementById('nu-nombre').value,email:document.getElementById('nu-email').value,password:document.getElementById('nu-pass').value,departamento:document.getElementById('nu-dep').value,rol:document.getElementById('nu-rol').value};
  const err=document.getElementById('nu-error');err.textContent='';
  if(!body.nombre||!body.email||!body.password){err.textContent='Completa todos los campos';return;}
  const r=await api('POST','/usuarios',body);
  if(r?.ok){toast('Usuario creado');['nu-nombre','nu-email','nu-pass','nu-dep'].forEach(id=>document.getElementById(id)&&(document.getElementById(id).value=''));loadUsuarios();swUTab('lista',document.querySelector('.tab-pill'));}
  else err.textContent=r?.error||'Error';
}

async function cambiarPassword(){
  const actual=document.getElementById('pass-actual').value;
  const nueva=document.getElementById('pass-nueva').value;
  const confirma=document.getElementById('pass-confirma').value;
  const err=document.getElementById('pass-error');err.textContent='';
  if(!actual||!nueva){err.textContent='Completa todos los campos';return;}
  if(nueva!==confirma){err.textContent='Las contraseñas no coinciden';return;}
  if(nueva.length<6){err.textContent='Mínimo 6 caracteres';return;}
  const r=await api('POST','/cambiar-password',{actual,nueva});
  if(r?.ok){toast('Contraseña actualizada');['pass-actual','pass-nueva','pass-confirma'].forEach(id=>document.getElementById(id)&&(document.getElementById(id).value=''));}
  else err.textContent=r?.error||'Error';
}

async function loadHistorial(){
  const data=await api('GET','/historial');
  const el=document.getElementById('historial-content');if(!el) return;
  if(!data?.length){el.innerHTML='<div class="empty">Sin registros</div>';return;}
  el.innerHTML=data.map(h=>`<div class="activity-item"><span class="act-dot" style="background:var(--guinda)"></span><div style="flex:1"><strong>${h.usuario_nombre||'Sistema'}</strong> — ${h.accion}<br><span style="font-size:11px;color:var(--text-muted)">${h.detalle||''}</span></div><span style="font-size:11px;color:var(--text-muted);white-space:nowrap">${new Date(h.fecha).toLocaleString('es-MX')}</span></div>`).join('');
}

// ══ HELPERS ══
function populateAsignado(selId,currentVal){
  const sel=document.getElementById(selId);if(!sel) return;
  sel.innerHTML='<option value="">Sin asignar</option>'+usuariosList.map(u=>`<option value="${u.id}" ${u.id==currentVal?'selected':''}>${u.nombre}</option>`).join('');
}

function openModal(id){
  if(id==='oficio-modal'){document.getElementById('oficio-modal-title').textContent='Nuevo Oficio';document.getElementById('oficio-id').value='';['of-numero','of-tema','of-descripcion','of-departamento','of-observaciones'].forEach(f=>{const el=document.getElementById(f);if(el) el.value='';});document.getElementById('of-prioridad').value='normal';document.getElementById('of-requiere-resp').checked=false;['of-fecha-inicio','of-fecha-despacho','of-fecha-respuesta','of-fecha-terminacion'].forEach(f=>{const el=document.getElementById(f);if(el) el.value='';});const fi=document.getElementById('of-fecha-inicio');if(fi) fi.value=new Date().toISOString().substring(0,10);populateAsignado('of-asignado',null);}
  if(id==='instr-modal'){document.getElementById('instr-modal-title').textContent='Nuevo Pendiente';document.getElementById('instr-id').value='';['instr-folio','instr-obs'].forEach(f=>{const el=document.getElementById(f);if(el) el.value='';});const it=document.getElementById('instr-texto');if(it) it.value='';const ifc=document.getElementById('instr-fecha');if(ifc) ifc.value=new Date().toISOString().substring(0,10);const ip=document.getElementById('instr-prioridad');if(ip) ip.value='normal';const is=document.getElementById('instr-estado');if(is) is.value='pendiente';populateAsignado('instr-asignado',null);}
  document.getElementById(id).style.display='flex';
}
function closeModal(id){document.getElementById(id).style.display='none';}
document.querySelectorAll('.modal-overlay').forEach(m=>m.addEventListener('click',e=>{if(e.target===m) closeModal(m.id);}));

// ══ INIT ══
initCanvas('bg-canvas');

(async()=>{
  const me=await api('GET','/me');
  if(me?.nombre){await loadUsuarios();showHomeMenu(me.nombre,me.rol);}
})();
