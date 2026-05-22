// ══ FLUJO VISUAL DINÁMICO ══
const NODOS = {
  // FLUJO CON RESPUESTA
  req: {
    recibido:   {x:60,  y:185, label:'Recibido',       color:'#185FA5', icon:'📥'},
    proceso:    {x:185, y:185, label:'En proceso',      color:'#185FA5', icon:'⚙️'},
    firmado:    {x:310, y:185, label:'Firmado',         color:'#C9A227', icon:'✍️'},
    sinresp:    {x:460, y:110, label:'Sin respuesta',   color:'#A32D2D', icon:'⚠️'},
    reiterar:   {x:460, y:170, label:'Reiterar',        color:'#A32D2D', icon:'🔁'},
    respondido: {x:460, y:240, label:'Respondido',      color:'#0F6E56', icon:'✅'},
    terminado:  {x:460, y:305, label:'Terminado',       color:'#0F6E56', icon:'🏁'},
    archivado:  {x:310, y:320, label:'Archivado',       color:'#666',    icon:'📁'}
  },
  // FLUJO SIN RESPUESTA
  noreq: {
    recibido:   {x:80,  y:185, label:'Recibido',       color:'#185FA5', icon:'📥'},
    proceso:    {x:220, y:185, label:'En proceso',      color:'#185FA5', icon:'⚙️'},
    firmado:    {x:360, y:185, label:'Firmado',         color:'#C9A227', icon:'✍️'},
    archivado:  {x:500, y:185, label:'Archivado',       color:'#666',    icon:'📁'},
    terminado:  {x:500, y:290, label:'Terminado',       color:'#0F6E56', icon:'🏁'}
  }
};

let flujoModo = 'req';
let flujoOficiosData = [];
let flujoAnimId = null;
let flujoOficioSeleccionado = null;

function initFlujoVisual(oficios) {
  flujoOficiosData = oficios || [];
  renderFlujoCompleto();
}

function renderFlujoCompleto() {
  const container = document.getElementById('flujo-visual-container');
  if (!container) return;

  const nodos = NODOS[flujoModo];
  const svgContent = buildFlujSVG(nodos);
  const instrs = flujoOficiosData.filter ? [] : [];

  container.innerHTML = `
    <div style="padding:16px">
      <div class="flujo-mode-btns">
        <button class="flujo-mode-btn ${flujoModo==='req'?'active-mode':''}" onclick="setFlujoModo('req')">
          <i class="ti ti-help-circle"></i> Se requiere respuesta
        </button>
        <button class="flujo-mode-btn ${flujoModo==='noreq'?'active-mode':''}" onclick="setFlujoModo('noreq')">
          <i class="ti ti-check"></i> No se requiere respuesta
        </button>
      </div>
      <div class="flujo-svg-wrap">
        <svg id="flujo-svg-real" width="100%" viewBox="0 0 580 400" style="min-width:520px;display:block">
          ${svgContent}
          <g id="oficios-puntos"></g>
        </svg>
      </div>
      <div class="flujo-stats" id="flujo-stats-bar"></div>
      <div class="instr-flujo-wrap" id="instrucciones-flujo">
        <div class="instr-flujo-title"><i class="ti ti-list-check"></i> Instrucciones activas</div>
        <div id="instr-flujo-list"><div style="font-size:12px;color:#888">Cargando...</div></div>
      </div>
    </div>`;

  startFlujoAnim();
  loadInstruccionesFlujo();
}

function buildFlujSVG(nodos) {
  const flechas = flujoModo === 'req' ? `
    <defs><marker id="fa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round"/></marker></defs>
    <rect width="580" height="400" rx="14" fill="#FAFBFD"/>
    <!-- Flechas principales -->
    <line x1="100" y1="199" x2="148" y2="199" stroke="#888" stroke-width="1" marker-end="url(#fa)" fill="none"/>
    <line x1="225" y1="199" x2="273" y2="199" stroke="#888" stroke-width="1" marker-end="url(#fa)" fill="none"/>
    <line x1="350" y1="199" x2="395" y2="175" stroke="#C9A227" stroke-width="1" marker-end="url(#fa)" fill="none"/>
    <text x="370" y="175" font-size="8" fill="#854F0B" text-anchor="middle">Sí</text>
    <!-- Sin resp → Reiterar -->
    <line x1="460" y1="132" x2="460" y2="150" stroke="#A32D2D" stroke-width="1" marker-end="url(#fa)" fill="none"/>
    <!-- Reiterar → regresa a Recibido (arco superior) -->
    <path d="M420 170 L60 170 L60 165" fill="none" stroke="#A32D2D" stroke-width="1" stroke-dasharray="5,3" marker-end="url(#fa)"/>
    <text x="240" y="162" font-size="8" fill="#A32D2D" text-anchor="middle">Se reitera petición</text>
    <!-- Decision → respondido -->
    <line x1="395" y1="210" x2="420" y2="245" stroke="#0F6E56" stroke-width="1" stroke-dasharray="3,2" marker-end="url(#fa)" fill="none"/>
    <!-- Respondido → terminado -->
    <line x1="460" y1="262" x2="460" y2="285" stroke="#0F6E56" stroke-width="1" marker-end="url(#fa)" fill="none"/>
    <!-- Terminado → archivado -->
    <path d="M420 305 L350 330" fill="none" stroke="#0F6E56" stroke-width="1" marker-end="url(#fa)"/>
    <!-- No requiere respuesta → archivado -->
    <path d="M350 210 L350 250 L290 330" fill="none" stroke="#888" stroke-width="1" stroke-dasharray="3,2" marker-end="url(#fa)"/>
    <text x="320" y="270" font-size="8" fill="#888" text-anchor="middle">No</text>
    <!-- Diamante decisión -->
    <polygon points="373,199 395,186 417,199 395,212" fill="white" stroke="#854F0B" stroke-width="1.5"/>
    <text x="395" y="196" font-size="7" font-weight="600" fill="#854F0B" text-anchor="middle">¿Req.</text>
    <text x="395" y="205" font-size="7" font-weight="600" fill="#854F0B" text-anchor="middle">resp?</text>
  ` : `
    <defs><marker id="fa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round"/></marker></defs>
    <rect width="580" height="400" rx="14" fill="#FAFBFD"/>
    <line x1="120" y1="199" x2="182" y2="199" stroke="#888" stroke-width="1" marker-end="url(#fa)" fill="none"/>
    <line x1="262" y1="199" x2="322" y2="199" stroke="#888" stroke-width="1" marker-end="url(#fa)" fill="none"/>
    <line x1="402" y1="199" x2="462" y2="199" stroke="#C9A227" stroke-width="1.5" marker-end="url(#fa)" fill="none"/>
    <text x="432" y="192" font-size="9" fill="#854F0B" text-anchor="middle">No req. resp.</text>
    <!-- Archivado → terminado (también puede terminar) -->
    <line x1="500" y1="207" x2="500" y2="272" stroke="#0F6E56" stroke-width="1" stroke-dasharray="3,2" marker-end="url(#fa)" fill="none"/>
  `;

  let nodosSVG = '';
  Object.entries(nodos).forEach(([key, n]) => {
    const w = 88, h = 36;
    const x = n.x - w/2, y = n.y - h/2;
    nodosSVG += `
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="white" stroke="${n.color}" stroke-width="1.5"/>
      <text x="${n.x}" y="${n.y - 5}" text-anchor="middle" font-size="11" fill="${n.color}" font-weight="600">${n.icon} ${n.label.length > 10 ? n.label.substring(0,9)+'…' : n.label}</text>
    `;
  });

  return flechas + nodosSVG;
}

function setFlujoModo(modo) {
  flujoModo = modo;
  renderFlujoCompleto();
}

function startFlujoAnim() {
  if (flujoAnimId) cancelAnimationFrame(flujoAnimId);
  function loop() {
    renderPuntosOficiosEnFlujo();
    flujoAnimId = requestAnimationFrame(loop);
  }
  loop();
}

function stopFlujoAnim() {
  if (flujoAnimId) cancelAnimationFrame(flujoAnimId);
}

function etapaANodo(etapa, modo) {
  const mapReq = {
    recibido:'recibido', en_proceso:'proceso', firmado:'firmado',
    requiere_respuesta:'sinresp', sin_respuesta:'sinresp',
    reiterar:'reiterar', respondido:'respondido',
    terminado:'terminado', archivado:'archivado'
  };
  const mapNoReq = {
    recibido:'recibido', en_proceso:'proceso', firmado:'firmado',
    terminado:'terminado', archivado:'archivado',
    respondido:'archivado', sin_respuesta:'archivado',
    reiterar:'recibido', requiere_respuesta:'archivado'
  };
  return (modo === 'req' ? mapReq : mapNoReq)[etapa] || 'recibido';
}

function renderPuntosOficiosEnFlujo() {
  const layer = document.getElementById('oficios-puntos');
  if (!layer) return;
  layer.innerHTML = '';
  const nodos = NODOS[flujoModo];
  const t = Date.now() / 900;
  const counts = {recibido:0,proceso:0,firmado:0,sinresp:0,reiterar:0,respondido:0,terminado:0,archivado:0};
  const grupos = {};

  flujoOficiosData.forEach(of => {
    const nk = etapaANodo(of.etapa, flujoModo);
    if (!grupos[nk]) grupos[nk] = [];
    grupos[nk].push(of);
    if (counts[nk] !== undefined) counts[nk]++;
  });

  Object.entries(grupos).forEach(([nk, lista]) => {
    const pos = nodos[nk];
    if (!pos) return;
    lista.forEach((of, i) => {
      const total = lista.length;
      const angulo = (i / Math.max(total,1)) * Math.PI * 2 + t * 0.4;
      const radio = total > 1 ? Math.min(14, 6 + total * 2) : 0;
      const cx = pos.x + Math.cos(angulo) * radio;
      const cy = pos.y + Math.sin(angulo) * radio;
      const color = pos.color;
      const esCritico = ['sinresp','reiterar'].includes(nk);
      const esSeleccionado = flujoOficioSeleccionado && flujoOficioSeleccionado.id === of.id;

      const g = document.createElementNS('http://www.w3.org/2000/svg','g');
      g.style.cursor = 'pointer';

      // Halo crítico
      if (esCritico) {
        const h = document.createElementNS('http://www.w3.org/2000/svg','circle');
        h.setAttribute('cx', cx);
        h.setAttribute('cy', cy);
        h.setAttribute('r', 12 + Math.sin(t*3+i)*3);
        h.setAttribute('fill', color);
        h.setAttribute('opacity','0.18');
        g.appendChild(h);
      }

      // Halo seleccionado
      if (esSeleccionado) {
        const hs = document.createElementNS('http://www.w3.org/2000/svg','circle');
        hs.setAttribute('cx', cx);
        hs.setAttribute('cy', cy);
        hs.setAttribute('r', 13);
        hs.setAttribute('fill', 'none');
        hs.setAttribute('stroke', '#C9A227');
        hs.setAttribute('stroke-width', '2');
        g.appendChild(hs);
      }

      const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
      c.setAttribute('cx', cx);
      c.setAttribute('cy', cy);
      c.setAttribute('r', 8);
      c.setAttribute('fill', color);
      c.setAttribute('stroke', '#fff');
      c.setAttribute('stroke-width', '1.5');
      g.appendChild(c);

      // Etiqueta con número de oficio (no solo ID)
      const numCorto = (of.numero || String(of.id)).replace('OF-2026-','').replace('OF-','');
      const lbl = document.createElementNS('http://www.w3.org/2000/svg','text');
      lbl.setAttribute('x', cx);
      lbl.setAttribute('y', cy + 0.5);
      lbl.setAttribute('text-anchor','middle');
      lbl.setAttribute('dominant-baseline','central');
      lbl.setAttribute('font-size','6');
      lbl.setAttribute('font-weight','700');
      lbl.setAttribute('fill','#fff');
      lbl.setAttribute('pointer-events','none');
      lbl.textContent = numCorto.length > 4 ? numCorto.substring(0,4) : numCorto;
      g.appendChild(lbl);

      // Tooltip flotante sobre el SVG
      const titulo = document.createElementNS('http://www.w3.org/2000/svg','title');
      titulo.textContent = `${of.numero || 'OF-'+of.id}: ${of.tema || ''} | Etapa: ${of.etapa || ''} | ${of.asignado_nombre || 'Sin asignar'}`;
      g.appendChild(titulo);

      g.addEventListener('click', () => {
        flujoOficioSeleccionado = of;
        mostrarOficioGrande(of);
      });

      layer.appendChild(g);
    });
  });

  // Stats
  const bar = document.getElementById('flujo-stats-bar');
  if (bar) {
    const total = flujoOficiosData.length;
    const enProc = (counts.recibido||0)+(counts.proceso||0)+(counts.firmado||0);
    const atencion = (counts.sinresp||0)+(counts.reiterar||0);
    const term = (counts.terminado||0)+(counts.archivado||0);
    bar.innerHTML = `
      <div class="flujo-stat"><div class="flujo-stat-val" style="color:#185FA5">${total}</div><div class="flujo-stat-label">Total</div></div>
      <div class="flujo-stat"><div class="flujo-stat-val" style="color:#185FA5">${enProc}</div><div class="flujo-stat-label">En proceso</div></div>
      <div class="flujo-stat"><div class="flujo-stat-val" style="color:#A32D2D">${atencion}</div><div class="flujo-stat-label">Requieren atención</div></div>
      <div class="flujo-stat"><div class="flujo-stat-val" style="color:#0F6E56">${term}</div><div class="flujo-stat-label">Terminados</div></div>
      <div class="flujo-stat"><div class="flujo-stat-val" style="color:#C9A227">${counts.respondido||0}</div><div class="flujo-stat-label">Respondidos</div></div>`;
  }
}

function mostrarOficioGrande(of) {
  const el = document.getElementById('oficio-seleccionado-grande');
  if (!el) return;
  const etapaLabel = (of.etapa||'').replace(/_/g,' ').toUpperCase();
  el.style.display = 'block';
  el.innerHTML = `
    <div class="oficio-grande">
      <div class="oficio-grande-header">
        <div>
          <div class="oficio-grande-num">${of.numero || 'OF-'+of.id}</div>
          <div class="oficio-grande-tema">${of.tema || ''}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="badge ${etapaBadgeClass(of.etapa)}">${etapaLabel}</span>
          <button class="btn-primary" onclick="openEtapaModal(${of.id},'${of.numero}','${of.etapa}')"><i class="ti ti-git-branch"></i> Mover etapa</button>
          <button class="btn-gold" onclick="generarPDF(${of.id},'${of.numero}')"><i class="ti ti-file-text"></i> PDF</button>
          <button class="btn-outline" onclick="document.getElementById('oficio-seleccionado-grande').style.display='none'"><i class="ti ti-x"></i></button>
        </div>
      </div>
      <div class="oficio-grande-grid">
        <div class="oficio-campo"><div class="oficio-campo-label">Departamento</div><div class="oficio-campo-val">${of.departamento||'—'}</div></div>
        <div class="oficio-campo"><div class="oficio-campo-label">Asignado a</div><div class="oficio-campo-val">${of.asignado_nombre||'—'}</div></div>
        <div class="oficio-campo"><div class="oficio-campo-label">Prioridad</div><div class="oficio-campo-val">${(of.prioridad||'').toUpperCase()}</div></div>
        <div class="oficio-campo"><div class="oficio-campo-label">Fecha inicio</div><div class="oficio-campo-val">${of.fecha_inicio||'—'}</div></div>
        <div class="oficio-campo"><div class="oficio-campo-label">Fecha despacho</div><div class="oficio-campo-val">${of.fecha_despacho||'—'}</div></div>
        <div class="oficio-campo"><div class="oficio-campo-label">Fecha respuesta</div><div class="oficio-campo-val">${of.fecha_respuesta||'—'}</div></div>
      </div>
      ${of.observaciones ? `<div style="background:var(--bg);border-radius:8px;padding:10px 12px;font-size:13px"><strong>Observaciones:</strong> ${of.observaciones}</div>` : ''}
    </div>`;
}

function etapaBadgeClass(etapa) {
  const m = {recibido:'badge-proc',en_proceso:'badge-proc',firmado:'badge-proc',
    requiere_respuesta:'badge-pend',sin_respuesta:'badge-sin',reiterar:'badge-sin',
    respondido:'badge-term',terminado:'badge-term',archivado:'badge-arch'};
  return m[etapa] || 'badge-normal';
}

async function loadInstruccionesFlujo() {
  const el = document.getElementById('instr-flujo-list');
  if (!el) return;
  try {
    const r = await fetch('/api/instrucciones?estado=pendiente', {credentials:'include'});
    const data = await r.json();
    if (!data || !data.length) { el.innerHTML = '<div style="font-size:12px;color:#888;padding:4px">Sin instrucciones pendientes</div>'; return; }
    el.innerHTML = data.slice(0,5).map(i => `
      <div class="instr-item">
        <div>
          <strong style="color:#9B59B6">${i.folio}</strong>
          <span style="margin-left:8px;color:var(--text-muted)">${(i.instruccion||'').substring(0,50)}${i.instruccion?.length>50?'...':''}</span>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="badge" style="background:rgba(155,89,182,0.1);color:#9B59B6">${i.prioridad||'normal'}</span>
          ${!i.convertido_oficio ? `<button class="btn-sm" style="background:rgba(155,89,182,0.12);color:#9B59B6;border:none;cursor:pointer" onclick="convertirInstr(${i.id},'${i.folio}')"><i class="ti ti-file-plus"></i> → Oficio</button>` : '<span style="font-size:11px;color:#0F6E56">✅ Convertida</span>'}
        </div>
      </div>`).join('');
  } catch(e) { el.innerHTML = '<div style="font-size:12px;color:#888">Error cargando instrucciones</div>'; }
}
