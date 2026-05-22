const NODOS_REQ = {
  recibido:   { x: 58,  y: 195, label: 'Recibido',      color: '#185FA5', icon: '📥' },
  proceso:    { x: 175, y: 195, label: 'En proceso',     color: '#185FA5', icon: '⚙️' },
  firmado:    { x: 292, y: 195, label: 'Firmado',        color: '#C9A227', icon: '✍️' },
  sinresp:    { x: 450, y: 118, label: 'Sin respuesta',  color: '#A32D2D', icon: '⚠️' },
  reiterar:   { x: 450, y: 178, label: 'Reiterar',       color: '#A32D2D', icon: '🔁' },
  respondido: { x: 450, y: 238, label: 'Respondido',     color: '#0F6E56', icon: '✅' },
  terminado:  { x: 450, y: 298, label: 'Terminado',      color: '#0F6E56', icon: '🏁' },
  archivado:  { x: 292, y: 315, label: 'Archivado',      color: '#666',   icon: '📁' }
};

const NODOS_NOREQ = {
  recibido:   { x: 80,  y: 195, label: 'Recibido',      color: '#185FA5', icon: '📥' },
  proceso:    { x: 210, y: 195, label: 'En proceso',     color: '#185FA5', icon: '⚙️' },
  firmado:    { x: 340, y: 195, label: 'Firmado',        color: '#C9A227', icon: '✍️' },
  archivado:  { x: 470, y: 195, label: 'Archivado',      color: '#666',   icon: '📁' },
  terminado:  { x: 470, y: 295, label: 'Terminado',      color: '#0F6E56', icon: '🏁' }
};

const ETAPA_A_NODO_REQ = {
  recibido: 'recibido', en_proceso: 'proceso', firmado: 'firmado',
  requiere_respuesta: 'sinresp', sin_respuesta: 'sinresp',
  reiterar: 'reiterar', respondido: 'respondido',
  terminado: 'terminado', archivado: 'archivado'
};

const ETAPA_A_NODO_NOREQ = {
  recibido: 'recibido', en_proceso: 'proceso', firmado: 'firmado',
  terminado: 'terminado', archivado: 'archivado',
  respondido: 'archivado', sin_respuesta: 'archivado',
  reiterar: 'recibido', requiere_respuesta: 'archivado'
};

let flujoModo = 'req';
let flujoData = [];
let flujoAnimId = null;

function initFlujoVisual(oficios) {
  flujoData = oficios || [];
  renderFlujo();
}

function renderFlujo() {
  const cont = document.getElementById('flujo-visual-container');
  if (!cont) return;

  const nodos = flujoModo === 'req' ? NODOS_REQ : NODOS_NOREQ;
  const svgFlechas = flujoModo === 'req' ? svgFlechasReq() : svgFlechasNoReq();
  const svgNodos = Object.entries(nodos).map(([k, n]) => {
    const w = 90, h = 36;
    const x = n.x - w / 2, y = n.y - h / 2;
    const lbl = n.label.length > 11 ? n.label.substring(0, 10) + '…' : n.label;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="white" stroke="${n.color}" stroke-width="1.5"/>
    <text x="${n.x}" y="${n.y}" text-anchor="middle" dominant-baseline="central" font-size="10.5" font-weight="600" fill="${n.color}" font-family="Inter,sans-serif">${n.icon} ${lbl}</text>`;
  }).join('');

  cont.innerHTML = `
    <div style="padding:14px">
      <div style="display:flex;gap:10px;margin-bottom:12px">
        <button class="flujo-mode-btn ${flujoModo === 'req' ? 'active' : ''}" onclick="setFlujoModo('req')"><i class="ti ti-help-circle"></i> Se requiere respuesta</button>
        <button class="flujo-mode-btn ${flujoModo === 'noreq' ? 'active' : ''}" onclick="setFlujoModo('noreq')"><i class="ti ti-check"></i> No se requiere respuesta</button>
      </div>
      <div style="overflow-x:auto;border-radius:10px;border:1px solid #E8E8EF;background:#FAFBFD">
        <svg id="flujo-svg" width="100%" viewBox="0 0 580 390" style="min-width:520px;display:block">
          <defs>
            <marker id="fa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round"/>
            </marker>
          </defs>
          <rect width="580" height="390" fill="#FAFBFD"/>
          ${svgFlechas}
          ${svgNodos}
          <g id="flujo-puntos"></g>
        </svg>
      </div>
      <div class="flujo-stats" id="flujo-stats-bar"></div>
      <div style="border:1px dashed rgba(155,89,182,0.35);border-radius:10px;padding:12px;margin-top:10px">
        <div style="font-size:10px;font-weight:700;color:#9B59B6;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;display:flex;align-items:center;gap:6px"><i class="ti ti-list-check"></i> Instrucciones / Pendientes activos</div>
        <div id="flujo-instr-list"><div style="font-size:12px;color:#888">Cargando...</div></div>
      </div>
    </div>`;

  startFlujoAnim();
  cargarInstrFlujo();
}

function svgFlechasReq() {
  return `
    <line x1="103" y1="195" x2="128" y2="195" stroke="#888" stroke-width="1" marker-end="url(#fa)"/>
    <line x1="220" y1="195" x2="245" y2="195" stroke="#888" stroke-width="1" marker-end="url(#fa)"/>
    <line x1="337" y1="195" x2="372" y2="175" stroke="#C9A227" stroke-width="1" marker-end="url(#fa)"/>
    <text x="353" y="172" font-size="8" fill="#854F0B" text-anchor="middle" font-family="Inter,sans-serif">Sí</text>
    <line x1="408" y1="195" x2="405" y2="135" stroke="#A32D2D" stroke-width="1" marker-end="url(#fa)"/>
    <line x1="450" y1="136" x2="450" y2="160" stroke="#A32D2D" stroke-width="1" marker-end="url(#fa)"/>
    <path d="M410 178 L58 178 L58 177" fill="none" stroke="#A32D2D" stroke-width="1" stroke-dasharray="5,3" marker-end="url(#fa)"/>
    <text x="234" y="170" font-size="8" fill="#A32D2D" text-anchor="middle" font-family="Inter,sans-serif">Se reitera petición</text>
    <line x1="408" y1="210" x2="405" y2="238" stroke="#0F6E56" stroke-width="1" stroke-dasharray="3,2" marker-end="url(#fa)"/>
    <line x1="450" y1="256" x2="450" y2="280" stroke="#0F6E56" stroke-width="1" marker-end="url(#fa)"/>
    <path d="M408 298 L340 315" fill="none" stroke="#0F6E56" stroke-width="1" marker-end="url(#fa)"/>
    <path d="M337 210 L337 250 L268 315" fill="none" stroke="#888" stroke-width="1" stroke-dasharray="3,2" marker-end="url(#fa)"/>
    <text x="316" y="268" font-size="8" fill="#888" text-anchor="middle" font-family="Inter,sans-serif">No</text>
    <polygon points="372,195 397,182 422,195 397,208" fill="white" stroke="#854F0B" stroke-width="1.5"/>
    <text x="397" y="192" font-size="7.5" font-weight="600" fill="#854F0B" text-anchor="middle" font-family="Inter,sans-serif">¿Req.</text>
    <text x="397" y="202" font-size="7.5" font-weight="600" fill="#854F0B" text-anchor="middle" font-family="Inter,sans-serif">resp?</text>`;
}

function svgFlechasNoReq() {
  return `
    <line x1="125" y1="195" x2="172" y2="195" stroke="#888" stroke-width="1" marker-end="url(#fa)"/>
    <line x1="255" y1="195" x2="302" y2="195" stroke="#888" stroke-width="1" marker-end="url(#fa)"/>
    <line x1="385" y1="195" x2="427" y2="195" stroke="#C9A227" stroke-width="1.5" marker-end="url(#fa)"/>
    <text x="406" y="188" font-size="8" fill="#854F0B" text-anchor="middle" font-family="Inter,sans-serif">Sin resp.</text>
    <line x1="470" y1="213" x2="470" y2="277" stroke="#0F6E56" stroke-width="1" stroke-dasharray="3,2" marker-end="url(#fa)"/>`;
}

function setFlujoModo(modo) {
  flujoModo = modo;
  renderFlujo();
}

function startFlujoAnim() {
  if (flujoAnimId) cancelAnimationFrame(flujoAnimId);
  function loop() {
    renderPuntos();
    flujoAnimId = requestAnimationFrame(loop);
  }
  loop();
}

function stopFlujoAnim() {
  if (flujoAnimId) { cancelAnimationFrame(flujoAnimId); flujoAnimId = null; }
}

function renderPuntos() {
  const layer = document.getElementById('flujo-puntos');
  if (!layer) return;
  const nodos = flujoModo === 'req' ? NODOS_REQ : NODOS_NOREQ;
  const mapa = flujoModo === 'req' ? ETAPA_A_NODO_REQ : ETAPA_A_NODO_NOREQ;
  const t = Date.now() / 900;
  const grupos = {};
  const counts = { proceso: 0, atencion: 0, sinresp: 0, term: 0 };

  flujoData.forEach(of => {
    const nk = mapa[of.etapa] || 'recibido';
    if (!grupos[nk]) grupos[nk] = [];
    grupos[nk].push(of);
    if (['recibido', 'proceso', 'firmado'].includes(nk)) counts.proceso++;
    if (nk === 'sinresp') counts.sinresp++;
    if (nk === 'reiterar') counts.atencion++;
    if (['terminado', 'archivado'].includes(nk)) counts.term++;
  });

  let svg = '';
  Object.entries(grupos).forEach(([nk, lista]) => {
    const pos = nodos[nk];
    if (!pos) return;
    lista.forEach((of, i) => {
      const ang = (i / Math.max(lista.length, 1)) * Math.PI * 2 + t * 0.4;
      const radio = lista.length > 1 ? Math.min(16, 5 + lista.length * 2.5) : 0;
      const cx = pos.x + Math.cos(ang) * radio;
      const cy = pos.y + Math.sin(ang) * radio;
      const color = pos.color;
      const critico = ['sinresp', 'reiterar'].includes(nk);
      const numCorto = (of.numero || String(of.id)).replace(/OF\s*DIR\s*/i, '').replace(/OF-20\d\d-/i, '').substring(0, 6);

      if (critico) {
        const pr = 11 + Math.sin(t * 3 + i) * 3;
        svg += `<circle cx="${cx}" cy="${cy}" r="${pr}" fill="${color}" opacity="0.15"/>`;
      }
      svg += `<circle cx="${cx}" cy="${cy}" r="9" fill="${color}" stroke="white" stroke-width="2"/>`;
      svg += `<text x="${cx}" y="${cy + 0.5}" text-anchor="middle" dominant-baseline="central" font-size="6" font-weight="700" fill="white" font-family="Inter,sans-serif" pointer-events="none">${numCorto}</text>`;
      svg += `<circle cx="${cx}" cy="${cy}" r="9" fill="transparent" style="cursor:pointer"><title>${of.numero}: ${of.tema} | ${(of.etapa || '').replace(/_/g, ' ')} | ${of.asignado_nombre || 'Sin asignar'}</title></circle>`;
    });
  });

  layer.innerHTML = svg;

  const bar = document.getElementById('flujo-stats-bar');
  if (bar) {
    bar.innerHTML = `
      <div class="flujo-stat"><div class="flujo-stat-val" style="color:#185FA5">${flujoData.length}</div><div class="flujo-stat-label">Total</div></div>
      <div class="flujo-stat"><div class="flujo-stat-val" style="color:#185FA5">${counts.proceso}</div><div class="flujo-stat-label">En proceso</div></div>
      <div class="flujo-stat"><div class="flujo-stat-val" style="color:#A32D2D">${counts.sinresp}</div><div class="flujo-stat-label">Sin respuesta</div></div>
      <div class="flujo-stat"><div class="flujo-stat-val" style="color:#A32D2D">${counts.atencion}</div><div class="flujo-stat-label">A reiterar</div></div>
      <div class="flujo-stat"><div class="flujo-stat-val" style="color:#0F6E56">${counts.term}</div><div class="flujo-stat-label">Terminados</div></div>`;
  }
}

async function cargarInstrFlujo() {
  const el = document.getElementById('flujo-instr-list');
  if (!el) return;
  try {
    const r = await fetch('/api/instrucciones?estado=pendiente', { credentials: 'include' });
    const data = await r.json();
    if (!data || !data.length) { el.innerHTML = '<div style="font-size:12px;color:#888">Sin instrucciones pendientes</div>'; return; }
    el.innerHTML = data.slice(0, 5).map(i => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:white;border-radius:7px;border:1px solid rgba(155,89,182,0.18);margin-bottom:5px;font-size:12px">
        <span><strong style="color:#9B59B6">${i.folio}</strong> — ${(i.instruccion || '').substring(0, 50)}${i.instruccion?.length > 50 ? '...' : ''}</span>
        ${!i.convertido_oficio ? `<button onclick="convertirPend(${i.id},'${i.folio}')" style="background:rgba(155,89,182,0.1);color:#9B59B6;border:none;border-radius:6px;padding:3px 9px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit"><i class="ti ti-file-plus"></i> → Oficio</button>` : '<span style="font-size:11px;color:#0F6E56">✅ Convertida</span>'}
      </div>`).join('');
  } catch (e) {
    el.innerHTML = '<div style="font-size:12px;color:#888">No disponible</div>';
  }
}
