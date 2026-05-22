// Flujo Visual Interactivo de Oficios
// Se llama desde la sección de flujo del sistema

const NODO_POS = {
  recibido:    {x:68,  y:210, label:'Recibido',    color:'#185FA5'},
  proceso:     {x:196, y:210, label:'En proceso',  color:'#185FA5'},
  firmado:     {x:324, y:210, label:'Firmado',     color:'#C9A227'},
  decision:    {x:420, y:210, label:'¿Req. resp?', color:'#854F0B'},
  sinresp:     {x:540, y:128, label:'Sin resp.',   color:'#A32D2D'},
  reiterar:    {x:540, y:188, label:'Reiterar',    color:'#A32D2D'},
  respondido:  {x:540, y:248, label:'Respondido',  color:'#0F6E56'},
  terminado:   {x:540, y:320, label:'Terminado',   color:'#0F6E56'},
  archivado:   {x:324, y:332, label:'Archivado',   color:'#888'},
  instruccion: {x:68,  y:332, label:'Instrucción', color:'#9B59B6'}
};

function initFlujoVisual(oficiosData) {
  const container = document.getElementById('flujo-visual-container');
  if (!container) return;

  container.innerHTML = `
    <div style="padding:16px">
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
        <span style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Oficios en el sistema:</span>
        <div style="display:flex;align-items:center;gap:5px;font-size:11px"><span style="width:10px;height:10px;border-radius:50%;background:#185FA5;display:inline-block"></span> En proceso</div>
        <div style="display:flex;align-items:center;gap:5px;font-size:11px"><span style="width:10px;height:10px;border-radius:50%;background:#C9A227;display:inline-block"></span> Requiere atención</div>
        <div style="display:flex;align-items:center;gap:5px;font-size:11px"><span style="width:10px;height:10px;border-radius:50%;background:#A32D2D;display:inline-block"></span> Sin respuesta</div>
        <div style="display:flex;align-items:center;gap:5px;font-size:11px"><span style="width:10px;height:10px;border-radius:50%;background:#0F6E56;display:inline-block"></span> Terminado</div>
      </div>
      <p style="font-size:11px;color:var(--text-muted);margin-bottom:12px">Haz clic en cualquier punto para ver el detalle del oficio</p>
      <div style="overflow-x:auto">
        <svg id="flujo-svg-real" width="100%" viewBox="0 0 680 420" style="min-width:600px">
          <defs>
            <marker id="arr2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </marker>
          </defs>
          <!-- Fondo -->
          <rect width="680" height="420" rx="12" fill="transparent"/>

          <!-- NODOS -->
          <rect x="20" y="188" width="96" height="44" rx="8" fill="white" stroke="#185FA5" stroke-width="1.5"/>
          <text x="68" y="206" text-anchor="middle" font-size="10" font-weight="600" fill="#185FA5">📥 Recibido</text>
          <text x="68" y="220" text-anchor="middle" font-size="8" fill="#888">N°, tema, cantidad</text>

          <rect x="148" y="188" width="96" height="44" rx="8" fill="white" stroke="#185FA5" stroke-width="1.5"/>
          <text x="196" y="206" text-anchor="middle" font-size="10" font-weight="600" fill="#185FA5">⚙️ En proceso</text>
          <text x="196" y="220" text-anchor="middle" font-size="8" fill="#888">Asignado a</text>

          <rect x="276" y="188" width="96" height="44" rx="8" fill="white" stroke="#C9A227" stroke-width="1.5"/>
          <text x="324" y="206" text-anchor="middle" font-size="10" font-weight="600" fill="#854F0B">✍️ Firmado</text>
          <text x="324" y="220" text-anchor="middle" font-size="8" fill="#888">Fecha despacho</text>

          <!-- Diamante decisión -->
          <polygon points="420,188 460,210 420,232 380,210" fill="white" stroke="#854F0B" stroke-width="1.5"/>
          <text x="420" y="207" text-anchor="middle" font-size="8" font-weight="600" fill="#854F0B">¿Requiere</text>
          <text x="420" y="217" text-anchor="middle" font-size="8" font-weight="600" fill="#854F0B">respuesta?</text>

          <rect x="490" y="100" width="100" height="40" rx="8" fill="white" stroke="#A32D2D" stroke-width="1.5"/>
          <text x="540" y="116" text-anchor="middle" font-size="10" font-weight="600" fill="#A32D2D">⚠️ Sin resp.</text>
          <text x="540" y="130" text-anchor="middle" font-size="8" fill="#888">Sin respuesta</text>

          <rect x="490" y="160" width="100" height="40" rx="8" fill="white" stroke="#A32D2D" stroke-width="1.5"/>
          <text x="540" y="176" text-anchor="middle" font-size="10" font-weight="600" fill="#A32D2D">🔁 Reiterar</text>
          <text x="540" y="190" text-anchor="middle" font-size="8" fill="#888">Recordatorio</text>

          <rect x="490" y="220" width="100" height="40" rx="8" fill="white" stroke="#0F6E56" stroke-width="1.5"/>
          <text x="540" y="236" text-anchor="middle" font-size="10" font-weight="600" fill="#0F6E56">✅ Respondido</text>
          <text x="540" y="250" text-anchor="middle" font-size="8" fill="#888">Con fecha resp.</text>

          <rect x="490" y="280" width="100" height="40" rx="8" fill="white" stroke="#0F6E56" stroke-width="1.5"/>
          <text x="540" y="296" text-anchor="middle" font-size="10" font-weight="600" fill="#0F6E56">🏁 Terminado</text>
          <text x="540" y="310" text-anchor="middle" font-size="8" fill="#888">Se termina asunto</text>

          <rect x="276" y="300" width="96" height="44" rx="8" fill="white" stroke="#888" stroke-width="1.5"/>
          <text x="324" y="318" text-anchor="middle" font-size="10" font-weight="600" fill="#555">📁 Archivado</text>
          <text x="324" y="332" text-anchor="middle" font-size="8" fill="#888">Concluido</text>

          <rect x="20" y="300" width="96" height="44" rx="8" fill="white" stroke="#9B59B6" stroke-width="1.5" stroke-dasharray="4,2"/>
          <text x="68" y="318" text-anchor="middle" font-size="10" font-weight="600" fill="#9B59B6">📋 Instrucción</text>
          <text x="68" y="332" text-anchor="middle" font-size="8" fill="#888">Pendiente/D.G.</text>

          <!-- FLECHAS -->
          <line x1="116" y1="210" x2="146" y2="210" stroke="#888" stroke-width="1" marker-end="url(#arr2)" fill="none"/>
          <line x1="244" y1="210" x2="274" y2="210" stroke="#888" stroke-width="1" marker-end="url(#arr2)" fill="none"/>
          <line x1="372" y1="210" x2="378" y2="210" stroke="#888" stroke-width="1" marker-end="url(#arr2)" fill="none"/>
          <!-- Decision → archivado (no) -->
          <path d="M420 232 L420 322 L374 322" fill="none" stroke="#888" stroke-width="1" stroke-dasharray="3,2" marker-end="url(#arr2)"/>
          <text x="400" y="265" font-size="8" fill="#888" text-anchor="middle">No requiere</text>
          <!-- Decision → sin resp -->
          <path d="M460 210 L540 210 L540 140" fill="none" stroke="#A32D2D" stroke-width="1" marker-end="url(#arr2)"/>
          <text x="500" y="205" font-size="8" fill="#A32D2D" text-anchor="middle">Sí</text>
          <!-- Sin resp → reiterar -->
          <line x1="540" y1="140" x2="540" y2="158" stroke="#A32D2D" stroke-width="1" marker-end="url(#arr2)" fill="none"/>
          <!-- Reiterar → loop regresa -->
          <path d="M490 180 L68 180 L68 186" fill="none" stroke="#A32D2D" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#arr2)"/>
          <text x="280" y="174" font-size="8" fill="#A32D2D" text-anchor="middle">Se reitera petición (recordatorio)</text>
          <!-- Decision → respondido -->
          <path d="M460 210 L540 210 L540 220" fill="none" stroke="#0F6E56" stroke-width="1" stroke-dasharray="3,2" marker-end="url(#arr2)"/>
          <!-- Respondido → terminado -->
          <line x1="540" y1="260" x2="540" y2="278" stroke="#0F6E56" stroke-width="1" marker-end="url(#arr2)" fill="none"/>
          <!-- Terminado → archivado -->
          <path d="M490 300 L374 322" fill="none" stroke="#0F6E56" stroke-width="1" marker-end="url(#arr2)"/>
          <!-- Instruccion → proceso -->
          <path d="M116 322 L196 322 L196 234" fill="none" stroke="#9B59B6" stroke-width="1" stroke-dasharray="3,2" marker-end="url(#arr2)"/>
          <text x="160" y="355" font-size="8" fill="#9B59B6" text-anchor="middle">→ genera oficio</text>

          <!-- CAPA DE OFICIOS -->
          <g id="oficios-puntos"></g>
        </svg>
      </div>

      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:12px">
        <div style="background:var(--bg);border-radius:8px;padding:10px;text-align:center;border:1px solid var(--border)">
          <div style="font-size:22px;font-weight:700;color:#185FA5" id="fv-proceso">0</div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">En proceso</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:10px;text-align:center;border:1px solid var(--border)">
          <div style="font-size:22px;font-weight:700;color:#A32D2D" id="fv-sinresp">0</div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Sin respuesta</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:10px;text-align:center;border:1px solid var(--border)">
          <div style="font-size:22px;font-weight:700;color:#A32D2D" id="fv-reiterar">0</div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Reiterados</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:10px;text-align:center;border:1px solid var(--border)">
          <div style="font-size:22px;font-weight:700;color:#0F6E56" id="fv-term">0</div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Terminados</div>
        </div>
        <div style="background:var(--bg);border-radius:8px;padding:10px;text-align:center;border:1px solid var(--border)">
          <div style="font-size:22px;font-weight:700;color:#9B59B6" id="fv-instr">0</div>
          <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase">Instrucciones</div>
        </div>
      </div>
    </div>
  `;

  renderPuntos(oficiosData);
}

function etapaToNodo(etapa) {
  const map = {
    recibido:'recibido', en_proceso:'proceso', firmado:'firmado',
    requiere_respuesta:'decision', sin_respuesta:'sinresp',
    reiterar:'reiterar', respondido:'respondido',
    terminado:'terminado', archivado:'archivado'
  };
  return map[etapa] || 'recibido';
}

function renderPuntos(oficios) {
  const layer = document.getElementById('oficios-puntos');
  if (!layer) return;
  layer.innerHTML = '';
  const counts = {proceso:0, sinresp:0, reiterar:0, term:0, instr:0};
  const t = Date.now() / 800;
  const grupoPorNodo = {};

  oficios.forEach(of => {
    const nodoKey = etapaToNodo(of.etapa);
    if (!grupoPorNodo[nodoKey]) grupoPorNodo[nodoKey] = [];
    grupoPorNodo[nodoKey].push(of);
  });

  Object.entries(grupoPorNodo).forEach(([nodoKey, lista]) => {
    const pos = NODO_POS[nodoKey];
    if (!pos) return;
    lista.forEach((of, idx) => {
      const angulo = (idx / Math.max(lista.length,1)) * Math.PI * 2;
      const radio = lista.length > 1 ? 10 : 0;
      const jx = Math.cos(angulo + t * 0.3) * radio;
      const jy = Math.sin(angulo + t * 0.3) * radio;
      const cx = pos.x + jx;
      const cy = pos.y + jy;
      const color = pos.color;
      const esCritico = ['sinresp','reiterar','decision'].includes(nodoKey);

      const g = document.createElementNS('http://www.w3.org/2000/svg','g');
      g.style.cursor = 'pointer';

      if (esCritico) {
        const halo = document.createElementNS('http://www.w3.org/2000/svg','circle');
        halo.setAttribute('cx', cx);
        halo.setAttribute('cy', cy);
        halo.setAttribute('r', 11 + Math.sin(t * 4 + idx) * 3);
        halo.setAttribute('fill', color);
        halo.setAttribute('opacity', '0.15');
        g.appendChild(halo);
      }

      const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
      c.setAttribute('cx', cx);
      c.setAttribute('cy', cy);
      c.setAttribute('r', 7);
      c.setAttribute('fill', color);
      c.setAttribute('stroke', '#fff');
      c.setAttribute('stroke-width', '1.5');
      g.appendChild(c);

      const txt = document.createElementNS('http://www.w3.org/2000/svg','text');
      txt.setAttribute('x', cx);
      txt.setAttribute('y', cy + 0.5);
      txt.setAttribute('text-anchor','middle');
      txt.setAttribute('dominant-baseline','central');
      txt.setAttribute('font-size','6');
      txt.setAttribute('font-weight','700');
      txt.setAttribute('fill','#fff');
      txt.setAttribute('pointer-events','none');
      txt.textContent = of.id;
      g.appendChild(txt);

      g.addEventListener('click', () => {
        const etapaLabel = of.etapa?.replace(/_/g,' ') || '—';
        alert(`📄 ${of.numero}\n\n📌 ${of.tema}\n\n🔀 Etapa: ${etapaLabel}\n👤 Asignado a: ${of.asignado_nombre||'Sin asignar'}\n📅 Inicio: ${of.fecha_inicio||'—'}`);
      });

      layer.appendChild(g);

      if (['recibido','proceso','firmado','decision'].includes(nodoKey)) counts.proceso++;
      if (nodoKey === 'sinresp') counts.sinresp++;
      if (nodoKey === 'reiterar') counts.reiterar++;
      if (['terminado','archivado'].includes(nodoKey)) counts.term++;
    });
  });

  const fvProceso = document.getElementById('fv-proceso');
  if (fvProceso) fvProceso.textContent = counts.proceso;
  const fvSinresp = document.getElementById('fv-sinresp');
  if (fvSinresp) fvSinresp.textContent = counts.sinresp;
  const fvReit = document.getElementById('fv-reiterar');
  if (fvReit) fvReit.textContent = counts.reiterar;
  const fvTerm = document.getElementById('fv-term');
  if (fvTerm) fvTerm.textContent = counts.term;
}

let flujoAnimFrame = null;
function startFlujoAnimation(getOficios) {
  if (flujoAnimFrame) cancelAnimationFrame(flujoAnimFrame);
  function loop() {
    renderPuntos(getOficios());
    flujoAnimFrame = requestAnimationFrame(loop);
  }
  loop();
}

function stopFlujoAnimation() {
  if (flujoAnimFrame) cancelAnimationFrame(flujoAnimFrame);
}
