let userRol = '';
let usuariosList = [];
let currentAppSection = 'oficios';
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

// ══ PARTÍCULAS LOGIN ══
function initParticles() {
  const el = document.getElementById('particles');
  if (!el) return;
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const s = 20 + Math.random() * 60;
    p.style.cssText = `width:${s}px;height:${s}px;left:${Math.random()*100}%;background:${Math.random()>0.5?'#C9A227':'#fff'};animation-duration:${8+Math.random()*12}s;animation-delay:${Math.random()*8}s`;
    el.appendChild(p);
  }
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

function showHomeMenu(nombre, rol) {
  userRol = rol;
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'none';
  document.getElementById('home-screen').style.display = 'flex';
  document.getElementById('home-user-name').textContent = nombre;
  document.getElementById('home-welcome-name').textContent = nombre.split(' ')[0];
  if (rol === 'admin') document.getElementById('home-ajustes').style.display = 'block';
  else document.getElementById('home-ajustes').style.display = 'none';
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
  currentAppSection = seccion;
  document.getElementById('home-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('app').style.flexDirection = 'column';
  const me = { nombre: document.getElementById('home-user-name').textContent, rol: userRol };
  document.getElementById('user-name').textContent = me.nombre;
  buildSidenavAndContent(seccion);
}

function buildSidenavAndContent(seccion) {
  const sidenav = document.getElementById('sidenav');
  const main = document.getElementById('main-content');

  const navs = {
    oficios: [
      {sec:'dashboard', icon:'ti-layout-dashboard', label:'Dashboard'},
      {sec:'todos-oficios', icon:'ti-files', label:'Todos los oficios'},
      {sec:'flujo', icon:'ti-git-branch', label:'Flujo visual'},
      {sec:'instrucciones', icon:'ti-list-check', label:'Instrucciones'},
      {sec:'reportes', icon:'ti-report-analytics', label:'Reportes'},
      {sec:'plantillas', icon:'ti-template', label:'Editor de plantillas'},
    ],
    pendientes: [
      {sec:'pend-oficios', icon:'ti-clock', label:'Oficios pendientes'},
      {sec:'pend-sinresp', icon:'ti-alert-triangle', label:'Sin respuesta'},
      {sec:'pend-reiterar', icon:'ti-refresh', label:'A reiterar'},
      {sec:'pend-instrucciones', icon:'ti-list-check', label:'Instrucciones pend.'},
    ],
    otros: [
      {sec:'comunicados', icon:'ti-speakerphone', label:'Comunicados'},
      {sec:'estadisticas', icon:'ti-chart-bar', label:'Estadísticas'},
      {sec:'archivo', icon:'ti-archive', label:'Archivo general'},
    ],
    ajustes: [
      {sec:'usuarios', icon:'ti-users', label:'Usuarios'},
      {sec:'historial', icon:'ti-history', label:'Historial'},
      {sec:'perfil', icon:'ti-user-circle', label:'Mi perfil'},
    ]
  };

  const titulos = {oficios:'Oficios',pendientes:'Pendientes',otros:'Otros',ajustes:'Ajustes'};
  document.getElementById('app-section-title').textContent = `${titulos[seccion]} — SITT`;

  const items = navs[seccion] || [];
  sidenav.innerHTML = `<div class="nav-group-title">${titulos[seccion]}</div>` +
    items.map(n => `<button class="nav-item" data-sec="${n.sec}" onclick="goInnerSection('${n.sec}',this)"><i class="ti ${n.icon}"></i> ${n.label}</button>`).join('');

  buildSections(seccion, main);

  // Activar primera sección
  if (items.length) {
    setTimeout(() => {
      const first = sidenav.querySelector('.nav-item');
      if (first) { first.classList.add('active'); goInnerSection(items[0].sec, first); }
    }, 50);
  }
}

function goInnerSection(sec, el) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  document.querySelectorAll('.inner-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('inner-' + sec);
  if (target) target.classList.add('active');
  loadInnerSection(sec);
}

function buildSections(seccion, main) {
  const secciones = {
    oficios: ['dashboard','todos-oficios','flujo','instrucciones','reportes','plantillas'],
    pendientes: ['pend-oficios','pend-sinresp','pend-reiterar','pend-instrucciones'],
    otros: ['comunicados','estadisticas','archivo'],
    ajustes: ['usuarios','historial','perfil']
  };

  const contenidos = {
    // ─── OFICIOS ───
    dashboard: `
      <div class="page-header"><div><div class="page-eyebrow">PANEL</div><h1 class="page-title">Dashboard</h1></div>
        <div class="header-actions">
          <button class="btn-primary" onclick="openModal('oficio-modal')"><i class="ti ti-plus"></i> Nuevo oficio</button>
        </div>
      </div>
      <div class="metrics-grid" id="dash-metrics"></div>
      <div class="row2">
        <div class="card"><div class="card-title"><i class="ti ti-chart-donut"></i> Por etapa</div><div style="position:relative;height:200px"><canvas id="chartEtapas"></canvas></div></div>
        <div class="card"><div class="card-title"><i class="ti ti-activity"></i> Actividad reciente</div><div id="dash-activity"></div></div>
      </div>`,

    'todos-oficios': `
      <div class="page-header"><div><div class="page-eyebrow">GESTIÓN</div><h1 class="page-title">Todos los Oficios</h1></div>
        <div class="header-actions">
          <button class="btn-outline" onclick="exportarExcel('oficios')"><i class="ti ti-file-spreadsheet"></i> Excel</button>
          <button class="btn-primary" onclick="openModal('oficio-modal')"><i class="ti ti-plus"></i> Nuevo</button>
        </div>
      </div>
      <div class="card">
        <div class="search-row">
          <input type="text" id="search-todos" placeholder="🔍 Buscar número, tema..." oninput="loadOficiosSec('todos')">
          <select id="filter-etapa-todos" onchange="loadOficiosSec('todos')">
            <option value="">Todas las etapas</option>
            <option value="recibido">Recibido</option><option value="en_proceso">En proceso</option>
            <option value="firmado">Firmado</option><option value="requiere_respuesta">Req. respuesta</option>
            <option value="sin_respuesta">Sin respuesta</option><option value="reiterar">Reiterar</option>
            <option value="respondido">Respondido</option><option value="terminado">Terminado</option><option value="archivado">Archivado</option>
          </select>
          <select id="filter-prio-todos" onchange="loadOficiosSec('todos')">
            <option value="">Todas prioridades</option><option value="alta">Alta</option><option value="normal">Normal</option>
          </select>
        </div>
        <div class="table-wrap"><table><thead><tr><th>No. Oficio</th><th>Tema</th><th>Dpto.</th><th>Asignado</th><th>Prioridad</th><th>Etapa</th><th>F. Inicio</th><th>Acciones</th></tr></thead><tbody id="tbody-todos"></tbody></table></div>
      </div>`,

    flujo: `
      <div class="page-header"><div><div class="page-eyebrow">SEGUIMIENTO VISUAL</div><h1 class="page-title">Flujo Visual</h1></div>
        <div class="header-actions"><button class="btn-outline" onclick="recargarFlujo()"><i class="ti ti-refresh"></i> Actualizar</button></div>
      </div>
      <div class="search-row">
        <input type="text" id="search-flujo" placeholder="🔍 Buscar oficio por número o tema..." oninput="searchFlujo()">
      </div>
      <div id="oficio-seleccionado-grande" style="display:none"></div>
      <div id="flujo-lista"></div>
      <div class="card" style="padding:0"><div id="flujo-visual-container"></div></div>`,

    instrucciones: `
      <div class="page-header"><div><div class="page-eyebrow">INSTRUCCIONES</div><h1 class="page-title">Instrucciones Internas</h1></div>
        <div class="header-actions">
          <button class="btn-outline" onclick="exportarExcel('instrucciones')"><i class="ti ti-file-spreadsheet"></i> Excel</button>
          <button class="btn-primary" onclick="openModal('instr-modal')"><i class="ti ti-plus"></i> Nueva</button>
        </div>
      </div>
      <div class="tab-row">
        <button class="tab-pill active" onclick="filterInstr('pendiente',this)">Pendientes</button>
        <button class="tab-pill" onclick="filterInstr('en_proceso',this)">En proceso</button>
        <button class="tab-pill" onclick="filterInstr('completada',this)">Completadas</button>
        <button class="tab-pill" onclick="filterInstr('',this)">Todas</button>
      </div>
      <div class="card">
        <div class="search-row"><input type="text" id="search-instr" placeholder="🔍 Buscar..." oninput="loadInstrucciones()"></div>
        <div class="table-wrap"><table><thead><tr><th>Folio</th><th>Instrucción</th><th>Fecha</th><th>Asignado</th><th>Prioridad</th><th>Estado</th><th>Acciones</th></tr></thead><tbody id="tbody-instrucciones"></tbody></table></div>
      </div>`,

    reportes: `
      <div class="page-header"><div><div class="page-eyebrow">REPORTES</div><h1 class="page-title">Generar Reportes</h1></div></div>
      <div class="row2">
        <div class="card">
          <div class="card-title"><i class="ti ti-file-spreadsheet"></i> Exportar Excel</div>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:14px">Exporta listas completas en formato Excel.</p>
          <div style="display:flex;flex-direction:column;gap:8px">
            <button class="btn-outline" onclick="exportarExcel('oficios')" style="justify-content:flex-start"><i class="ti ti-file-spreadsheet"></i> Todos los oficios</button>
            <button class="btn-outline" onclick="exportarExcel('instrucciones')" style="justify-content:flex-start"><i class="ti ti-file-spreadsheet"></i> Instrucciones</button>
          </div>
        </div>
        <div class="card">
          <div class="card-title"><i class="ti ti-file-text"></i> PDF por oficio</div>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">Selecciona un oficio para generar su reporte en PDF.</p>
          <div class="form-group"><input type="text" id="search-reporte" placeholder="Buscar oficio..." oninput="searchReporte()"></div>
          <div id="reporte-lista"></div>
        </div>
      </div>`,

    plantillas: `
      <div class="page-header"><div><div class="page-eyebrow">EDITOR</div><h1 class="page-title">Editor de Plantillas</h1></div>
        <div class="header-actions">
          <label class="btn-outline" style="cursor:pointer"><i class="ti ti-upload"></i> Cargar .docx <input type="file" accept=".docx" style="display:none" onchange="cargarDocx(this)"></label>
          <button class="btn-primary" onclick="guardarPlantillaEditor()"><i class="ti ti-device-floppy"></i> Guardar plantilla</button>
          <button class="btn-gold" onclick="generarPDFDesdeEditor()"><i class="ti ti-file-text"></i> Generar PDF</button>
        </div>
      </div>
      <div class="card" style="margin-bottom:10px">
        <div class="card-title"><i class="ti ti-info-circle"></i> Variables disponibles</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:12px">
          ${['{{numero}}','{{tema}}','{{descripcion}}','{{departamento}}','{{asignado}}','{{fecha_inicio}}','{{fecha_despacho}}','{{fecha_respuesta}}','{{estado}}','{{observaciones}}'].map(v => `<span onclick="insertarVariable('${v}')" style="background:var(--guinda-light);color:var(--guinda);padding:4px 10px;border-radius:6px;cursor:pointer;font-weight:600">${v}</span>`).join('')}
        </div>
        <p style="font-size:11px;color:var(--text-muted);margin-top:8px">Haz clic en una variable para insertarla en el editor. Se reemplaza automáticamente con los datos del oficio al generar.</p>
      </div>
      <div style="margin-bottom:10px">
        <div class="form-group"><label>Seleccionar oficio para previsualizar</label>
          <select id="editor-oficio-select" onchange="previewPlantilla()"><option value="">Sin oficio seleccionado</option></select>
        </div>
      </div>
      <div class="editor-toolbar">
        <button onclick="execCmd('bold')" title="Negrita"><strong>N</strong></button>
        <button onclick="execCmd('italic')" title="Cursiva"><em>K</em></button>
        <button onclick="execCmd('underline')" title="Subrayado"><u>S</u></button>
        <div class="sep"></div>
        <button onclick="execCmd('justifyLeft')" title="Izquierda"><i class="ti ti-align-left"></i></button>
        <button onclick="execCmd('justifyCenter')" title="Centro"><i class="ti ti-align-center"></i></button>
        <button onclick="execCmd('justifyRight')" title="Derecha"><i class="ti ti-align-right"></i></button>
        <div class="sep"></div>
        <button onclick="execCmd('insertUnorderedList')" title="Lista"><i class="ti ti-list"></i></button>
        <button onclick="insertarLinea()" title="Línea horizontal"><i class="ti ti-minus"></i></button>
        <button onclick="execCmd('removeFormat')" title="Limpiar formato"><i class="ti ti-clear-formatting"></i></button>
        <div class="sep"></div>
        <select onchange="execCmd('fontSize',this.value);this.value=''" style="width:auto;padding:4px 8px;font-size:12px">
          <option value="">Tamaño</option>
          <option value="1">Pequeño</option><option value="3">Normal</option><option value="5">Grande</option><option value="7">Muy grande</option>
        </select>
      </div>
      <div class="editor-area" id="editor-area" contenteditable="true">
        <p style="text-align:center"><strong>H. XXVI AYUNTAMIENTO DE TIJUANA · SITT</strong></p>
        <p style="text-align:center">Dirección de Operaciones</p>
        <hr>
        <p><strong>Número de oficio:</strong> {{numero}}</p>
        <p><strong>Tema:</strong> {{tema}}</p>
        <p><strong>Descripción:</strong> {{descripcion}}</p>
        <p><strong>Departamento:</strong> {{departamento}}</p>
        <p><strong>Asignado a:</strong> {{asignado}}</p>
        <p><strong>Fecha de inicio:</strong> {{fecha_inicio}}</p>
        <p><strong>Fecha de despacho:</strong> {{fecha_despacho}}</p>
        <p><strong>Estado:</strong> {{estado}}</p>
        <p><strong>Observaciones:</strong> {{observaciones}}</p>
        <hr>
        <p style="text-align:center;font-size:12px">Sistema de Transporte Masivo Urbano de Pasajeros de Tijuana</p>
      </div>`,

    // ─── PENDIENTES ───
    'pend-oficios': `
      <div class="page-header"><div><div class="page-eyebrow">PENDIENTES</div><h1 class="page-title">Oficios Pendientes</h1></div>
        <div class="header-actions"><button class="btn-primary" onclick="openModal('oficio-modal')"><i class="ti ti-plus"></i> Nuevo</button></div>
      </div>
      <div class="card">
        <div class="search-row"><input type="text" id="search-pend" placeholder="🔍 Buscar..." oninput="loadPendientes()"></div>
        <div class="table-wrap"><table><thead><tr><th>No. Oficio</th><th>Tema</th><th>Asignado</th><th>Prioridad</th><th>Etapa</th><th>Días</th><th>Acciones</th></tr></thead><tbody id="tbody-pendientes"></tbody></table></div>
      </div>`,

    'pend-sinresp': `
      <div class="page-header"><div><div class="page-eyebrow">ALERTA</div><h1 class="page-title">Sin Respuesta</h1></div></div>
      <div class="card"><div class="table-wrap"><table><thead><tr><th>No. Oficio</th><th>Tema</th><th>Asignado</th><th>Días sin resp.</th><th>Acciones</th></tr></thead><tbody id="tbody-sinresp"></tbody></table></div></div>`,

    'pend-reiterar': `
      <div class="page-header"><div><div class="page-eyebrow">RECORDATORIO</div><h1 class="page-title">A Reiterar</h1></div></div>
      <div class="card"><div class="table-wrap"><table><thead><tr><th>No. Oficio</th><th>Tema</th><th>Asignado</th><th>Etapa</th><th>Acciones</th></tr></thead><tbody id="tbody-reiterar"></tbody></table></div></div>`,

    'pend-instrucciones': `
      <div class="page-header"><div><div class="page-eyebrow">INSTRUCCIONES</div><h1 class="page-title">Instrucciones Pendientes</h1></div>
        <div class="header-actions"><button class="btn-primary" onclick="openModal('instr-modal')"><i class="ti ti-plus"></i> Nueva</button></div>
      </div>
      <div class="card"><div class="table-wrap"><table><thead><tr><th>Folio</th><th>Instrucción</th><th>Asignado</th><th>Prioridad</th><th>Acciones</th></tr></thead><tbody id="tbody-pend-instr"></tbody></table></div></div>`,

    // ─── OTROS ───
    comunicados: `
      <div class="page-header"><div><div class="page-eyebrow">COMUNICADOS</div><h1 class="page-title">Comunicados Internos</h1></div></div>
      <div class="card"><div class="empty"><i class="ti ti-speakerphone"></i>Módulo en desarrollo. Próximamente podrás publicar y consultar comunicados internos del SITT.</div></div>`,

    estadisticas: `
      <div class="page-header"><div><div class="page-eyebrow">ANÁLISIS</div><h1 class="page-title">Estadísticas</h1></div></div>
      <div class="metrics-grid" id="stats-metrics"></div>
      <div class="card"><div class="card-title"><i class="ti ti-chart-bar"></i> Oficios por etapa</div><div style="position:relative;height:250px"><canvas id="chartStats"></canvas></div></div>`,

    archivo: `
      <div class="page-header"><div><div class="page-eyebrow">ARCHIVO</div><h1 class="page-title">Archivo General</h1></div></div>
      <div class="card"><div class="table-wrap"><table><thead><tr><th>No. Oficio</th><th>Tema</th><th>Departamento</th><th>Fecha terminación</th><th>Acciones</th></tr></thead><tbody id="tbody-archivo"></tbody></table></div></div>`,

    // ─── AJUSTES ───
    usuarios: `
      <div class="page-header"><div><div class="page-eyebrow">ADMINISTRACIÓN</div><h1 class="page-title">Usuarios</h1></div></div>
      <div class="tab-row">
        <button class="tab-pill active" onclick="switchUTab('lista',this)">Lista de usuarios</button>
        <button class="tab-pill" onclick="switchUTab('nuevo',this)">Nuevo usuario</button>
      </div>
      <div id="utab-lista" class="utab-content active"><div class="card"><div id="usuarios-content"></div></div></div>
      <div id="utab-nuevo" class="utab-content">
        <div class="card" style="max-width:480px">
          <div class="card-title"><i class="ti ti-user-plus"></i> Nuevo usuario</div>
          <div class="form-group"><label>Nombre completo</label><input type="text" id="nu-nombre" placeholder="Nombre completo"></div>
          <div class="form-group"><label>Correo electrónico</label><input type="email" id="nu-email" placeholder="correo@sitt.gob.mx"></div>
          <div class="form-group"><label>Contraseña inicial</label><input type="password" id="nu-pass" placeholder="Mínimo 6 caracteres"></div>
          <div class="form-group"><label>Departamento</label><input type="text" id="nu-dep" placeholder="Ej: Dirección de Operaciones"></div>
          <div class="form-group"><label>Rol</label>
            <select id="nu-rol">
              <option value="admin">Administrador — acceso total y ajustes</option>
              <option value="usuario" selected>Usuario — registra y edita</option>
              <option value="lector">Lector — solo visualiza</option>
            </select>
          </div>
          <p id="nu-error" style="color:var(--red);font-size:12px;margin-bottom:8px"></p>
          <button class="btn-primary" onclick="guardarUsuario()"><i class="ti ti-user-plus"></i> Crear usuario</button>
        </div>
      </div>`,

    historial: `
      <div class="page-header"><div><div class="page-eyebrow">AUDITORÍA</div><h1 class="page-title">Historial de Cambios</h1></div></div>
      <div class="card"><div id="historial-content"></div></div>`,

    perfil: `
      <div class="page-header"><div><div class="page-eyebrow">CUENTA</div><h1 class="page-title">Mi Perfil</h1></div></div>
      <div class="card" style="max-width:440px">
        <div class="card-title"><i class="ti ti-lock"></i> Cambiar contraseña</div>
        <div class="form-group"><label>Contraseña actual</label><input type="password" id="pass-actual" placeholder="••••••••"></div>
        <div class="form-group"><label>Nueva contraseña</label><input type="password" id="pass-nueva" placeholder="Mínimo 6 caracteres"></div>
        <div class="form-group"><label>Confirmar nueva contraseña</label><input type="password" id="pass-confirma" placeholder="Repite la nueva"></div>
        <p id="pass-error" style="color:var(--red);font-size:12px;margin-bottom:8px"></p>
        <button class="btn-primary" onclick="cambiarPassword()"><i class="ti ti-check"></i> Actualizar contraseña</button>
      </div>`
  };

  const secs = secciones[seccion] || [];
  main.innerHTML = secs.map(s => `<section id="inner-${s}" class="inner-section section">${contenidos[s]||`<div class="page-header"><h1 class="page-title">${s}</h1></div><div class="card"><div class="empty"><i class="ti ti-tools"></i>En construcción</div></div>`}</section>`).join('');
}

function loadInnerSection(sec) {
  const map = {
    dashboard: loadDashboard,
    'todos-oficios': () => loadOficiosSec('todos'),
    flujo: recargarFlujo,
    instrucciones: loadInstrucciones,
    reportes: loadReportes,
    plantillas: loadPlantillas,
    'pend-oficios': loadPendientes,
    'pend-sinresp': loadSinResp,
    'pend-reiterar': loadReiterar,
    'pend-instrucciones': loadPendInstrucciones,
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
    <div class="metric-card"><div class="metric-icon bl"><i class="ti ti-list-check"></i></div><div><div class="metric-label">Instrucciones pend.</div><div class="metric-val">${d.instruccionesPendientes}</div></div></div>`;

  if (chartEtapas) chartEtapas.destroy();
  const cv = document.getElementById('chartEtapas');
  if (cv && d.porEtapa?.length) {
    const ETAPA_LABELS = {recibido:'Recibido',en_proceso:'En proceso',firmado:'Firmado',requiere_respuesta:'Req.resp',sin_respuesta:'Sin resp',reiterar:'Reiterar',respondido:'Respondido',terminado:'Terminado',archivado:'Archivado'};
    chartEtapas = new Chart(cv, {
      type:'doughnut',
      data:{labels:d.porEtapa.map(e=>ETAPA_LABELS[e.etapa]||e.etapa),datasets:[{data:d.porEtapa.map(e=>parseInt(e.total)),backgroundColor:['#185FA5','#534AB7','#C9A227','#854F0B','#A32D2D','#E24B4A','#0F6E56','#6B1A2A','#888'],borderWidth:0}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{size:11},boxWidth:10}}}}
    });
  }

  const al = document.getElementById('dash-activity');
  if (al) al.innerHTML = d.recientes?.length ? d.recientes.map(o=>`
    <div class="activity-item">
      <span class="act-dot" style="background:${['terminado','archivado'].includes(o.etapa)?'#0F6E56':o.etapa==='sin_respuesta'?'#A32D2D':'#6B1A2A'}"></span>
      <div style="flex:1"><strong>${o.numero}</strong> — ${o.tema}<br><span style="font-size:11px;color:var(--text-muted)">${(o.etapa||'').replace(/_/g,' ')} · ${o.asignado_nombre||'Sin asignar'}</span></div>
    </div>`).join('') : '<div class="empty"><i class="ti ti-files"></i>Sin oficios</div>';
}

// ══ OFICIOS ══
function prioBadge(p) {
  if(p==='alta') return '<span class="badge badge-alta">ALTA</span>';
  return '<span class="badge badge-normal">'+(p||'normal').toUpperCase()+'</span>';
}
function etapaBadge(e) {
  const m={recibido:'badge-proc',en_proceso:'badge-proc',firmado:'badge-proc',requiere_respuesta:'badge-pend',sin_respuesta:'badge-sin',reiterar:'badge-sin',respondido:'badge-term',terminado:'badge-term',archivado:'badge-arch'};
  const lbl={recibido:'Recibido',en_proceso:'En proceso',firmado:'Firmado',requiere_respuesta:'Req. resp.',sin_respuesta:'Sin resp.',reiterar:'Reiterar',respondido:'Respondido',terminado:'Terminado',archivado:'Archivado'};
  return `<span class="badge ${m[e]||'badge-normal'}">${lbl[e]||e}</span>`;
}

async function loadOficiosSec(tipo) {
  const busq = document.getElementById('search-todos')?.value||'';
  const etapa = document.getElementById('filter-etapa-todos')?.value||'';
  const prio = document.getElementById('filter-prio-todos')?.value||'';
  let url = '/oficios?';
  if(busq) url+=`busqueda=${encodeURIComponent(busq)}&`;
  if(etapa) url+=`etapa=${etapa}&`;
  if(prio) url+=`prioridad=${prio}&`;
  const data = await api('GET', url);
  const tbody = document.getElementById('tbody-todos');
  if(!tbody) return;
  if(!data?.length){tbody.innerHTML='<tr><td colspan="8"><div class="empty"><i class="ti ti-file-off"></i>Sin oficios</div></td></tr>';return;}
  tbody.innerHTML = data.map(o=>`<tr>
    <td><strong>${o.numero}</strong></td><td>${o.tema}</td><td>${o.departamento||'—'}</td>
    <td>${o.asignado_nombre||'—'}</td><td>${prioBadge(o.prioridad)}</td>
    <td>${etapaBadge(o.etapa)}</td><td>${fmt(o.fecha_inicio)}</td>
    <td style="display:flex;gap:4px;flex-wrap:wrap">
      ${userRol!=='lector'?`<button class="btn-sm btn-edit" onclick='openEditOficio(${JSON.stringify(o)})'><i class="ti ti-edit"></i></button>`:''}
      <button class="btn-sm btn-success" onclick="openEtapaModal(${o.id},'${o.numero}','${o.etapa}')"><i class="ti ti-git-branch"></i></button>
      <button class="btn-sm btn-warn" onclick="generarPDF(${o.id},'${o.numero}')"><i class="ti ti-file-text"></i></button>
      ${userRol==='admin'?`<button class="btn-sm btn-danger" onclick="eliminarOficio(${o.id})"><i class="ti ti-trash"></i></button>`:''}
    </td>
  </tr>`).join('');
}

async function loadPendientes() {
  const busq = document.getElementById('search-pend')?.value||'';
  const data = await api('GET', `/oficios?estado=pendiente${busq?'&busqueda='+encodeURIComponent(busq):''}`);
  const tbody = document.getElementById('tbody-pendientes');
  if(!tbody) return;
  if(!data?.length){tbody.innerHTML='<tr><td colspan="7"><div class="empty"><i class="ti ti-circle-check"></i>Sin pendientes</div></td></tr>';return;}
  tbody.innerHTML = data.map(o=>{
    const dias = o.fecha_inicio ? Math.floor((Date.now()-new Date(o.fecha_inicio))/86400000) : '—';
    return `<tr>
      <td><strong>${o.numero}</strong></td><td>${o.tema}</td><td>${o.asignado_nombre||'—'}</td>
      <td>${prioBadge(o.prioridad)}</td><td>${etapaBadge(o.etapa)}</td>
      <td>${typeof dias==='number'?`<span class="badge ${dias>7?'badge-sin':'badge-pend'}">${dias}d</span>`:'—'}</td>
      <td style="display:flex;gap:4px">
        <button class="btn-sm btn-edit" onclick="openEtapaModal(${o.id},'${o.numero}','${o.etapa}')"><i class="ti ti-git-branch"></i> Mover</button>
        <button class="btn-sm btn-warn" onclick="generarPDF(${o.id},'${o.numero}')"><i class="ti ti-file-text"></i></button>
      </td>
    </tr>`;
  }).join('');
}

async function loadSinResp() {
  const data = await api('GET', '/oficios?etapa=sin_respuesta');
  const tbody = document.getElementById('tbody-sinresp');
  if(!tbody) return;
  if(!data?.length){tbody.innerHTML='<tr><td colspan="5"><div class="empty"><i class="ti ti-check"></i>Sin oficios sin respuesta</div></td></tr>';return;}
  tbody.innerHTML = data.map(o=>`<tr>
    <td><strong>${o.numero}</strong></td><td>${o.tema}</td><td>${o.asignado_nombre||'—'}</td>
    <td><span class="badge badge-sin">${o.fecha_inicio?Math.floor((Date.now()-new Date(o.fecha_inicio))/86400000)+' días':'—'}</span></td>
    <td><button class="btn-sm btn-edit" onclick="openEtapaModal(${o.id},'${o.numero}','${o.etapa}')"><i class="ti ti-git-branch"></i> Mover</button></td>
  </tr>`).join('');
}

async function loadReiterar() {
  const data = await api('GET', '/oficios?etapa=reiterar');
  const tbody = document.getElementById('tbody-reiterar');
  if(!tbody) return;
  if(!data?.length){tbody.innerHTML='<tr><td colspan="5"><div class="empty">Sin oficios a reiterar</div></td></tr>';return;}
  tbody.innerHTML = data.map(o=>`<tr>
    <td><strong>${o.numero}</strong></td><td>${o.tema}</td><td>${o.asignado_nombre||'—'}</td>
    <td>${etapaBadge(o.etapa)}</td>
    <td><button class="btn-sm btn-edit" onclick="openEtapaModal(${o.id},'${o.numero}','${o.etapa}')"><i class="ti ti-git-branch"></i> Mover</button></td>
  </tr>`).join('');
}

async function loadPendInstrucciones() {
  const data = await api('GET', '/instrucciones?estado=pendiente');
  const tbody = document.getElementById('tbody-pend-instr');
  if(!tbody) return;
  if(!data?.length){tbody.innerHTML='<tr><td colspan="5"><div class="empty">Sin instrucciones pendientes</div></td></tr>';return;}
  tbody.innerHTML = data.map(i=>`<tr>
    <td><strong>${i.folio}</strong></td>
    <td>${(i.instruccion||'').substring(0,60)}${i.instruccion?.length>60?'...':''}</td>
    <td>${i.asignado_nombre||'—'}</td><td>${prioBadge(i.prioridad)}</td>
    <td style="display:flex;gap:4px">
      <button class="btn-sm btn-edit" onclick='openEditInstr(${JSON.stringify(i)})'><i class="ti ti-edit"></i></button>
      ${!i.convertido_oficio?`<button class="btn-sm btn-warn" onclick="convertirInstr(${i.id},'${i.folio}')"><i class="ti ti-file-plus"></i> → Oficio</button>`:'<span class="badge badge-term">Convertida</span>'}
    </td>
  </tr>`).join('');
}

async function loadArchivo() {
  const data = await api('GET', '/oficios?etapa=archivado');
  const tbody = document.getElementById('tbody-archivo');
  if(!tbody) return;
  if(!data?.length){tbody.innerHTML='<tr><td colspan="5"><div class="empty">Sin oficios archivados</div></td></tr>';return;}
  tbody.innerHTML = data.map(o=>`<tr>
    <td><strong>${o.numero}</strong></td><td>${o.tema}</td>
    <td>${o.departamento||'—'}</td><td>${fmt(o.fecha_terminacion)}</td>
    <td><button class="btn-sm btn-warn" onclick="generarPDF(${o.id},'${o.numero}')"><i class="ti ti-file-text"></i> PDF</button></td>
  </tr>`).join('');
}

async function loadEstadisticas() {
  const d = await api('GET', '/dashboard');
  if(!d) return;
  const el = document.getElementById('stats-metrics');
  if(el) el.innerHTML = `
    <div class="metric-card"><div class="metric-icon g"><i class="ti ti-files"></i></div><div><div class="metric-label">Total oficios</div><div class="metric-val">${d.pendientes+d.terminados+d.archivados}</div></div></div>
    <div class="metric-card"><div class="metric-icon go"><i class="ti ti-clock"></i></div><div><div class="metric-label">Pendientes</div><div class="metric-val">${d.pendientes}</div></div></div>
    <div class="metric-card"><div class="metric-icon re"><i class="ti ti-alert-triangle"></i></div><div><div class="metric-label">Sin respuesta</div><div class="metric-val">${d.sinRespuesta}</div></div></div>
    <div class="metric-card"><div class="metric-icon gr"><i class="ti ti-circle-check"></i></div><div><div class="metric-label">Terminados</div><div class="metric-val">${d.terminados}</div></div></div>`;
  const cv = document.getElementById('chartStats');
  if(cv && d.porEtapa?.length) {
    if(window._chartStats) window._chartStats.destroy();
    const ETAPA_LABELS = {recibido:'Recibido',en_proceso:'En proceso',firmado:'Firmado',requiere_respuesta:'Req.resp',sin_respuesta:'Sin resp',reiterar:'Reiterar',respondido:'Respondido',terminado:'Terminado',archivado:'Archivado'};
    window._chartStats = new Chart(cv,{type:'bar',data:{labels:d.porEtapa.map(e=>ETAPA_LABELS[e.etapa]||e.etapa),datasets:[{label:'Oficios',data:d.porEtapa.map(e=>parseInt(e.total)),backgroundColor:'#6B1A2A',borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});
  }
}

// ══ FLUJO ══
async function recargarFlujo() {
  const data = await api('GET', '/oficios');
  if(data) initFlujoVisual(data);
}

async function searchFlujo() {
  const q = document.getElementById('search-flujo')?.value||'';
  const data = await api('GET', `/oficios?busqueda=${encodeURIComponent(q)}`);
  const el = document.getElementById('flujo-lista');
  if(!el) return;
  if(!data?.length){el.innerHTML='';return;}
  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px">`+data.slice(0,5).map(o=>`
    <div onclick='mostrarOficioGrande(${JSON.stringify(o)})' style="padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:12px;background:#fff;transition:all .15s" onmouseover="this.style.borderColor='var(--guinda)'" onmouseout="this.style.borderColor='var(--border)'">
      <div style="flex:1"><strong>${o.numero}</strong> — ${o.tema}<br><span style="font-size:11px;color:var(--text-muted)">${o.departamento||''} · ${o.asignado_nombre||'Sin asignar'}</span></div>
      ${etapaBadge(o.etapa)}
      <i class="ti ti-chevron-right" style="color:var(--text-muted)"></i>
    </div>`).join('')+'</div>';
}

// ══ INSTRUCCIONES ══
function filterInstr(estado, el) {
  instrEstadoFiltro = estado;
  document.querySelectorAll('#inner-instrucciones .tab-pill').forEach(b=>b.classList.remove('active'));
  if(el) el.classList.add('active');
  loadInstrucciones();
}

async function loadInstrucciones() {
  const busq = document.getElementById('search-instr')?.value||'';
  let url = '/instrucciones?';
  if(instrEstadoFiltro) url+=`estado=${instrEstadoFiltro}&`;
  if(busq) url+=`busqueda=${encodeURIComponent(busq)}`;
  const data = await api('GET', url);
  const tbody = document.getElementById('tbody-instrucciones');
  if(!tbody) return;
  if(!data?.length){tbody.innerHTML='<tr><td colspan="7"><div class="empty"><i class="ti ti-list-check"></i>Sin instrucciones</div></td></tr>';return;}
  tbody.innerHTML = data.map(i=>`<tr>
    <td><strong>${i.folio}</strong></td>
    <td>${(i.instruccion||'').substring(0,60)}${i.instruccion?.length>60?'...':''}</td>
    <td>${fmt(i.fecha)}</td><td>${i.asignado_nombre||'—'}</td>
    <td>${prioBadge(i.prioridad)}</td>
    <td><span class="badge ${i.estado==='completada'?'badge-term':i.estado==='en_proceso'?'badge-proc':'badge-pend'}">${i.estado}</span></td>
    <td style="display:flex;gap:4px;flex-wrap:wrap">
      ${userRol!=='lector'?`<button class="btn-sm btn-edit" onclick='openEditInstr(${JSON.stringify(i)})'><i class="ti ti-edit"></i></button>`:''}
      ${!i.convertido_oficio&&userRol!=='lector'?`<button class="btn-sm btn-warn" onclick="convertirInstr(${i.id},'${i.folio}')"><i class="ti ti-file-plus"></i> Oficio</button>`:''}
      ${userRol==='admin'?`<button class="btn-sm btn-danger" onclick="eliminarInstr(${i.id})"><i class="ti ti-trash"></i></button>`:''}
    </td>
  </tr>`).join('');
}

async function guardarInstruccion() {
  const id = document.getElementById('instr-id').value;
  const body = {folio:document.getElementById('instr-folio').value,instruccion:document.getElementById('instr-texto').value,fecha:document.getElementById('instr-fecha').value||null,asignado_a:document.getElementById('instr-asignado').value||null,prioridad:document.getElementById('instr-prioridad').value,estado:document.getElementById('instr-estado').value,observaciones:document.getElementById('instr-obs').value};
  if(!body.folio||!body.instruccion){toast('Folio e instrucción son requeridos','error');return;}
  const r = id ? await api('PUT',`/instrucciones/${id}`,body) : await api('POST','/instrucciones',body);
  if(r?.ok){toast('Instrucción guardada');closeModal('instr-modal');loadInstrucciones();}
  else toast('Error','error');
}

function openEditInstr(i) {
  if(typeof i==='string') i=JSON.parse(i);
  document.getElementById('instr-modal-title').textContent='Editar Instrucción';
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

async function convertirInstr(id, folio) {
  if(!confirm(`¿Convertir instrucción "${folio}" en un oficio?`)) return;
  const r = await api('POST',`/instrucciones/${id}/convertir`);
  if(r?.ok){toast(`Oficio creado: ${r.numero}`);loadInstrucciones();recargarFlujo();}
  else toast('Error','error');
}

async function eliminarInstr(id) {
  if(!confirm('¿Eliminar instrucción?')) return;
  const r = await api('DELETE',`/instrucciones/${id}`);
  if(r?.ok){toast('Eliminada');loadInstrucciones();}
}

// ══ REPORTES ══
async function loadReportes() { searchReporte(); await populateEditorSelect(); }

async function searchReporte() {
  const q = document.getElementById('search-reporte')?.value||'';
  const data = await api('GET',`/oficios?busqueda=${encodeURIComponent(q)}`);
  const el = document.getElementById('reporte-lista');
  if(!el) return;
  if(!data?.length){el.innerHTML='<div style="font-size:12px;color:var(--text-muted);padding:8px">Escribe para buscar...</div>';return;}
  el.innerHTML = data.slice(0,6).map(o=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:12px">
      <span><strong>${o.numero}</strong> — ${o.tema}</span>
      <button class="btn-sm" style="background:var(--guinda-light);color:var(--guinda)" onclick="generarPDF(${o.id},'${o.numero}')"><i class="ti ti-file-text"></i> PDF</button>
    </div>`).join('');
}

function generarPDF(id, numero) {
  window.open(`/api/exportar/pdf/${id}`,'_blank');
  toast(`Generando PDF de ${numero}...`);
}

function exportarExcel(tipo) {
  window.open(`/api/exportar/excel?tipo=${tipo}`,'_blank');
  toast(`Descargando Excel de ${tipo}...`);
}

// ══ EDITOR DE PLANTILLAS ══
async function loadPlantillas() {
  await populateEditorSelect();
  const data = await api('GET','/plantillas');
  if(data?.length) {
    const p = data[0];
    try {
      const c = typeof p.contenido==='string' ? JSON.parse(p.contenido) : p.contenido;
      if(c?.html) document.getElementById('editor-area').innerHTML = c.html;
    } catch(e){}
  }
}

async function populateEditorSelect() {
  const sel = document.getElementById('editor-oficio-select');
  if(!sel) return;
  const data = await api('GET','/oficios');
  if(!data) return;
  sel.innerHTML = '<option value="">Sin oficio seleccionado</option>' + data.map(o=>`<option value="${o.id}" data-of='${JSON.stringify(o).replace(/'/g,"&#39;")}'>${o.numero} — ${o.tema}</option>`).join('');
}

function execCmd(cmd, val) {
  document.execCommand(cmd, false, val);
  document.getElementById('editor-area')?.focus();
}

function insertarLinea() {
  document.execCommand('insertHTML', false, '<hr>');
}

function insertarVariable(v) {
  const el = document.getElementById('editor-area');
  if(!el) return;
  el.focus();
  document.execCommand('insertText', false, v);
}

function previewPlantilla() {
  const sel = document.getElementById('editor-oficio-select');
  if(!sel?.value) return;
  const opt = sel.selectedOptions[0];
  if(!opt) return;
  try {
    const of = JSON.parse(opt.getAttribute('data-of').replace(/&#39;/g,"'"));
    const el = document.getElementById('editor-area');
    if(!el) return;
    let html = el.innerHTML;
    html = html.replace(/\{\{numero\}\}/g, of.numero||'').replace(/\{\{tema\}\}/g, of.tema||'').replace(/\{\{descripcion\}\}/g, of.descripcion||'').replace(/\{\{departamento\}\}/g, of.departamento||'').replace(/\{\{asignado\}\}/g, of.asignado_nombre||'').replace(/\{\{fecha_inicio\}\}/g, of.fecha_inicio||'').replace(/\{\{fecha_despacho\}\}/g, of.fecha_despacho||'').replace(/\{\{fecha_respuesta\}\}/g, of.fecha_respuesta||'').replace(/\{\{estado\}\}/g, of.estado||'').replace(/\{\{observaciones\}\}/g, of.observaciones||'');
    el.innerHTML = html;
    toast('Vista previa aplicada');
  } catch(e){}
}

async function guardarPlantillaEditor() {
  const el = document.getElementById('editor-area');
  if(!el) return;
  const data = await api('GET','/plantillas');
  if(!data?.length) return;
  const r = await api('PUT',`/plantillas/${data[0].id}`,{nombre:'Reporte Oficial SITT',contenido:{html:el.innerHTML,encabezado:'H. XXV Ayuntamiento de Tijuana — SITT · Dirección de Operaciones',pie:'Sistema de Transporte Masivo Urbano de Pasajeros de Tijuana'}});
  if(r?.ok) toast('Plantilla guardada');
  else toast('Error al guardar','error');
}

function generarPDFDesdeEditor() {
  const sel = document.getElementById('editor-oficio-select');
  if(sel?.value) { generarPDF(sel.value, sel.selectedOptions[0]?.text||''); }
  else toast('Selecciona un oficio primero','error');
}

function cargarDocx(input) {
  toast('Funcionalidad .docx próximamente disponible. Por ahora usa el editor de texto.');
}

// ══ OFICIO CRUD ══
async function guardarOficio() {
  const id = document.getElementById('oficio-id').value;
  const body = {numero:document.getElementById('of-numero').value,tema:document.getElementById('of-tema').value,descripcion:document.getElementById('of-descripcion').value,departamento:document.getElementById('of-departamento').value,asignado_a:document.getElementById('of-asignado').value||null,prioridad:document.getElementById('of-prioridad').value,fecha_inicio:document.getElementById('of-fecha-inicio').value||null,fecha_despacho:document.getElementById('of-fecha-despacho').value||null,fecha_respuesta:document.getElementById('of-fecha-respuesta').value||null,fecha_terminacion:document.getElementById('of-fecha-terminacion').value||null,requiere_respuesta:document.getElementById('of-requiere-resp').checked,observaciones:document.getElementById('of-observaciones').value};
  if(!body.numero||!body.tema){toast('Número y tema son requeridos','error');return;}
  const r = id ? await api('PUT',`/oficios/${id}`,body) : await api('POST','/oficios',body);
  if(r?.ok){toast(id?'Oficio actualizado':'Oficio registrado');closeModal('oficio-modal');loadDashboard();loadOficiosSec('todos');}
  else toast(r?.error||'Error','error');
}

function openEditOficio(o) {
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

async function eliminarOficio(id) {
  if(!confirm('¿Eliminar este oficio?')) return;
  const r = await api('DELETE',`/oficios/${id}`);
  if(r?.ok){toast('Oficio eliminado');loadOficiosSec('todos');recargarFlujo();}
  else toast('Error','error');
}

// ══ ETAPA ══
function openEtapaModal(id, numero, etapaActual) {
  document.getElementById('etapa-oficio-id').value=id;
  document.getElementById('etapa-oficio-num').textContent=numero;
  document.getElementById('etapa-nueva').value=etapaActual;
  document.getElementById('etapa-comentario').value='';
  openModal('etapa-modal');
}

async function guardarEtapa() {
  const id=document.getElementById('etapa-oficio-id').value;
  const etapa=document.getElementById('etapa-nueva').value;
  const comentario=document.getElementById('etapa-comentario').value;
  const r = await api('PUT',`/oficios/${id}/etapa`,{etapa,comentario});
  if(r?.ok){toast('Etapa actualizada');closeModal('etapa-modal');recargarFlujo();loadDashboard();loadPendientes();}
  else toast('Error','error');
}

// ══ USUARIOS ══
function switchUTab(tab, el) {
  document.querySelectorAll('#inner-usuarios .tab-pill').forEach(b=>b.classList.remove('active'));
  if(el) el.classList.add('active');
  document.querySelectorAll('.utab-content').forEach(t=>t.classList.remove('active'));
  document.getElementById('utab-'+tab)?.classList.add('active');
  if(tab==='lista') loadUsuarios();
}

async function loadUsuarios() {
  const data = await api('GET','/usuarios');
  if(!data) return;
  usuariosList = data;
  const el = document.getElementById('usuarios-content');
  if(!el) return;
  el.innerHTML=`<div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Correo</th><th>Departamento</th><th>Rol</th><th>Estado</th><th>Acción</th></tr></thead><tbody>
    ${data.map(u=>`<tr>
      <td><strong>${u.nombre}</strong></td><td style="font-size:12px;color:#888">${u.email}</td>
      <td>${u.departamento||'—'}</td>
      <td><span class="badge ${u.rol==='admin'?'badge-sin':u.rol==='lector'?'badge-arch':'badge-proc'}">${u.rol}</span></td>
      <td>${u.activo?'<span class="badge badge-term">Activo</span>':'<span class="badge badge-arch">Inactivo</span>'}</td>
      <td>${u.activo?`<button class="btn-sm btn-danger" onclick="toggleUsu(${u.id},0,'${u.nombre}')"><i class="ti ti-user-off"></i> Baja</button>`:`<button class="btn-sm btn-success" onclick="toggleUsu(${u.id},1,'${u.nombre}')"><i class="ti ti-user-check"></i> Reactivar</button>`}</td>
    </tr>`).join('')}
  </tbody></table></div>`;
}

async function toggleUsu(id, activo, nombre) {
  if(!confirm(`¿${activo?'Reactivar':'Dar de baja'} a "${nombre}"?`)) return;
  await api('PUT',`/usuarios/${id}`,{activo});
  toast(`Usuario ${activo?'reactivado':'dado de baja'}`);
  loadUsuarios();
}

async function guardarUsuario() {
  const body={nombre:document.getElementById('nu-nombre').value,email:document.getElementById('nu-email').value,password:document.getElementById('nu-pass').value,departamento:document.getElementById('nu-dep').value,rol:document.getElementById('nu-rol').value};
  const err=document.getElementById('nu-error');
  err.textContent='';
  if(!body.nombre||!body.email||!body.password){err.textContent='Completa todos los campos';return;}
  const r = await api('POST','/usuarios',body);
  if(r?.ok){toast('Usuario creado');['nu-nombre','nu-email','nu-pass','nu-dep'].forEach(id=>document.getElementById(id).value='');loadUsuarios();switchUTab('lista',document.querySelector('#inner-usuarios .tab-pill'));}
  else err.textContent=r?.error||'Error';
}

async function cambiarPassword() {
  const actual=document.getElementById('pass-actual').value;
  const nueva=document.getElementById('pass-nueva').value;
  const confirma=document.getElementById('pass-confirma').value;
  const err=document.getElementById('pass-error');
  err.textContent='';
  if(!actual||!nueva){err.textContent='Completa todos los campos';return;}
  if(nueva!==confirma){err.textContent='Las contraseñas no coinciden';return;}
  if(nueva.length<6){err.textContent='Mínimo 6 caracteres';return;}
  const r=await api('POST','/cambiar-password',{actual,nueva});
  if(r?.ok){toast('Contraseña actualizada');['pass-actual','pass-nueva','pass-confirma'].forEach(id=>document.getElementById(id).value='');}
  else err.textContent=r?.error||'Error';
}

// ══ HISTORIAL ══
async function loadHistorial() {
  const data=await api('GET','/historial');
  const el=document.getElementById('historial-content');
  if(!el) return;
  if(!data?.length){el.innerHTML='<div class="empty">Sin registros</div>';return;}
  el.innerHTML=data.map(h=>`<div class="activity-item"><span class="act-dot" style="background:var(--guinda)"></span><div style="flex:1"><strong>${h.usuario_nombre||'Sistema'}</strong> — ${h.accion}<br><span style="font-size:11px;color:var(--text-muted)">${h.detalle||''}</span></div><span style="font-size:11px;color:var(--text-muted);white-space:nowrap">${new Date(h.fecha).toLocaleString('es-MX')}</span></div>`).join('');
}

// ══ HELPERS ══
function populateAsignado(selId, currentVal) {
  const sel=document.getElementById(selId);
  if(!sel) return;
  sel.innerHTML='<option value="">Sin asignar</option>'+usuariosList.map(u=>`<option value="${u.id}" ${u.id==currentVal?'selected':''}>${u.nombre}</option>`).join('');
}

function openModal(id) {
  if(id==='oficio-modal'){document.getElementById('oficio-modal-title').textContent='Nuevo Oficio';document.getElementById('oficio-id').value='';['of-numero','of-tema','of-descripcion','of-departamento','of-observaciones'].forEach(f=>document.getElementById(f).value='');document.getElementById('of-prioridad').value='normal';document.getElementById('of-requiere-resp').checked=false;['of-fecha-inicio','of-fecha-despacho','of-fecha-respuesta','of-fecha-terminacion'].forEach(f=>document.getElementById(f).value='');document.getElementById('of-fecha-inicio').value=new Date().toISOString().substring(0,10);populateAsignado('of-asignado',null);}
  if(id==='instr-modal'){document.getElementById('instr-modal-title').textContent='Nueva Instrucción';document.getElementById('instr-id').value='';['instr-folio','instr-obs'].forEach(f=>document.getElementById(f).value='');document.getElementById('instr-texto').value='';document.getElementById('instr-fecha').value=new Date().toISOString().substring(0,10);document.getElementById('instr-prioridad').value='normal';document.getElementById('instr-estado').value='pendiente';populateAsignado('instr-asignado',null);}
  document.getElementById(id).style.display='flex';
}

function closeModal(id){document.getElementById(id).style.display='none';}
document.querySelectorAll('.modal-overlay').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id);}));

// ══ INIT ══
initParticles();

(async()=>{
  const me=await api('GET','/me');
  if(me?.nombre){
    await loadUsuarios();
    showHomeMenu(me.nombre,me.rol);
  }
})();
