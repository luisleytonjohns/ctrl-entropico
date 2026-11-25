/**
 * CTRL ENTROPICO — reporte.js
 * Renderiza el reporte ejecutivo como página imprimible.
 * Se accede desde resultados.html con URL: reporte.html?periodo=3
 */

var ReporteUI = (function() {

  async function init(usuario) {
    var params = new URLSearchParams(window.location.search);
    var periodo = parseInt(params.get('periodo'), 10);

    var resp = await API.miPerfil();
    if (!resp.ok || !resp.data) {
      document.getElementById('app').innerHTML = '<div class="rpt-cargando">No se pudo cargar tu perfil.</div>';
      return;
    }

    var cursoId = resp.data.cursoId;
    if (!periodo) periodo = resp.data.periodoPublicado || 1;

    var respRpt = await API.llamar('generarReporte', {cursoId: cursoId, periodo: periodo});
    if (!respRpt.ok || !respRpt.data || !respRpt.data.reporte) {
      document.getElementById('app').innerHTML = '<div class="rpt-cargando">No se pudo generar el reporte del período ' + periodo + '.</div>';
      return;
    }

    renderizar(respRpt.data.reporte);
  }

  function renderizar(r) {
    var html = '';

    // ── PORTADA ──
    html += '<div class="rpt-portada"><div class="in">';
    html += '<div style="font:.5rem/1 var(--disp);letter-spacing:.3em;text-transform:uppercase;color:#8899B0;margin-bottom:12px">CTRL ENTROPICO</div>';
    html += '<h1>' + esc(r.empresa) + '</h1>';
    html += '<div class="sub">' + esc(r.producto) + '</div>';
    if (r.diseno && r.diseno.slogan) html += '<div style="font-style:italic;color:#FFB74D;margin-top:8px">“' + esc(r.diseno.slogan) + '”</div>';
    html += '<div class="rpt-badge">Reporte Ejecutivo — Período ' + r.periodo + '</div>';
    html += '<div class="meta">';
    html += 'Industria: ' + esc(r.industria) + ' · Posición: #' + r.posicion + ' de ' + r.totalEquipos;
    if (r.institucion) html += '<br>' + esc(r.institucion) + (r.curso ? ' · ' + esc(r.curso) : '');
    html += '<br>' + new Date(r.fecha).toLocaleDateString('es-CL', {year:'numeric',month:'long',day:'numeric'});
    html += '</div>';

    // Integrantes
    if (r.integrantes && r.integrantes.length > 0) {
      html += '<div style="margin-top:16px;font:.75rem/1.4 var(--sans);color:#8899B0">';
      r.integrantes.forEach(function(i) {
        html += esc(i.nombre) + ' (' + esc(i.rol) + ')' + ' · ';
      });
      html = html.slice(0, -3);
      html += '</div>';
    }
    html += '</div></div>';

    // ── RESUMEN FINANCIERO ──
    html += '<div class="in">';
    html += '<div class="rpt-sec">';
    html += '<div class="rpt-sec-titulo">Resumen financiero</div>';
    html += '<div class="rpt-tiles">';
    html += tileVar('Ingresos', moneda(r.financiero.ingresos), r.variacion ? r.variacion.ingresos : null);
    html += tileVar('Resultado op.', moneda(r.financiero.resultado_operacional), r.variacion ? r.variacion.resultado_operacional : null);
    html += tileVar('Demanda', fnum(r.financiero.demanda) + ' uds.', r.variacion ? r.variacion.demanda : null);
    html += tileVar('Puntaje', fnum(r.financiero.puntaje_motor, 1) + ' / 100', r.variacion ? r.variacion.puntaje_motor : null);
    html += '</div>';

    // Estado de resultados
    html += '<table>';
    html += '<tr><th>Concepto</th><th style="text-align:right">Monto</th><th style="text-align:right">% Ingreso</th></tr>';
    var ing = r.financiero.ingresos || 1;
    html += filaER('Ingresos por ventas', r.financiero.ingresos, 100);
    html += filaER('Costo variable', -r.financiero.costo_variable, -(r.financiero.costo_variable/ing*100));
    html += filaER('Margen bruto', r.financiero.margen_bruto, r.financiero.margen_bruto/ing*100, true);
    html += filaER('Gastos operacionales', -r.financiero.gastos_operacionales, -(r.financiero.gastos_operacionales/ing*100));
    html += filaER('Resultado operacional', r.financiero.resultado_operacional, r.financiero.resultado_operacional/ing*100, true);
    html += '</table>';
    html += '</div>';

    // ── POSICIÓN COMPETITIVA ──
    html += '<div class="rpt-sec">';
    html += '<div class="rpt-sec-titulo">Posición competitiva</div>';
    html += '<div class="rpt-tiles">';
    html += tile('Posición', '#' + r.posicion + ' de ' + r.totalEquipos);
    html += tile('Nota simulada', fnum(r.financiero.nota_simulada, 1));
    html += tile('Mult. RRHH', fnum(r.financiero.multiplicador_rrhh, 2) + 'x');
    html += tile('Efic. logística', fnum(r.financiero.eficiencia_logistica * 100, 1) + '%');
    html += '</div>';

    // Comparación vs mercado
    if (r.vsMercado) {
      html += '<table>';
      html += '<tr><th>Indicador</th><th style="text-align:right">Tu empresa</th><th style="text-align:right">vs Promedio mercado</th></tr>';
      html += '<tr><td>Ingresos</td><td class="num">' + moneda(r.financiero.ingresos) + '</td><td class="num ' + clsPosNeg(r.vsMercado.ingresos) + '">' + signo(r.vsMercado.ingresos) + '%</td></tr>';
      html += '<tr><td>Resultado operacional</td><td class="num">' + moneda(r.financiero.resultado_operacional) + '</td><td class="num ' + clsPosNeg(r.vsMercado.resultado_operacional) + '">' + signo(r.vsMercado.resultado_operacional) + '%</td></tr>';
      html += '<tr><td>Puntaje motor</td><td class="num">' + fnum(r.financiero.puntaje_motor, 1) + '</td><td class="num ' + clsPosNeg(r.vsMercado.puntaje_motor) + '">' + signo(r.vsMercado.puntaje_motor) + '%</td></tr>';
      html += '</table>';
    }
    html += '</div>';

    // ── RANKING ──
    if (r.ranking && r.ranking.length > 0) {
      html += '<div class="rpt-sec">';
      html += '<div class="rpt-sec-titulo">Ranking del período</div>';
      html += '<table>';
      html += '<tr><th>#</th><th>Empresa</th><th style="text-align:right">Ingresos</th><th style="text-align:right">Resultado op.</th><th style="text-align:right">Puntaje</th><th style="text-align:right">Nota</th></tr>';
      r.ranking.forEach(function(eq) {
        html += '<tr class="' + (eq.esMio ? 'mi-eq' : '') + '">';
        html += '<td style="font-weight:700">' + eq.posicion + '</td>';
        html += '<td>' + esc(eq.empresa) + (eq.esMio ? ' ←' : '') + '</td>';
        html += '<td class="num">' + moneda(eq.ingresos) + '</td>';
        html += '<td class="num ' + clsPosNeg(eq.resultado_operacional) + '">' + moneda(eq.resultado_operacional) + '</td>';
        html += '<td class="num">' + fnum(eq.puntaje, 1) + '</td>';
        html += '<td class="num">' + fnum(eq.nota, 1) + '</td>';
        html += '</tr>';
      });
      html += '</table>';
      html += '</div>';
    }

    // ── ATRIBUTOS ──
    if (r.atributos && Object.keys(r.atributos).length > 0) {
      html += '<div class="rpt-sec">';
      html += '<div class="rpt-sec-titulo">Atributos de la empresa</div>';
      html += '<div class="rpt-attr">';
      var colores = ['#E8600A','#2E5C8A','#00A896','#7C3AED','#D97706','#DC2626','#059669','#4F46E5'];
      var ci = 0;
      for (var attr in r.atributos) {
        var val = parseFloat(r.atributos[attr]) * 100 || 0;
        var col = colores[ci % colores.length];
        html += '<div class="rpt-attr-item">';
        html += '<div class="nombre">' + capitalizar(attr) + '</div>';
        html += '<div class="barra"><div class="fill" style="width:' + Math.min(val, 100) + '%;background:' + col + '"></div></div>';
        html += '<div class="pct">' + fnum(val, 1) + '%</div>';
        html += '</div>';
        ci++;
      }
      html += '</div>';
      html += '</div>';
    }

    // ── EVOLUCIÓN HISTÓRICA ──
    if (r.historial && r.historial.length > 1) {
      html += '<div class="rpt-sec">';
      html += '<div class="rpt-sec-titulo">Evolución histórica</div>';
      html += '<table>';
      html += '<tr><th>Período</th><th style="text-align:right">Ingresos</th><th style="text-align:right">Resultado op.</th><th style="text-align:right">Demanda</th><th style="text-align:right">Puntaje</th><th style="text-align:right">Nota</th></tr>';
      r.historial.forEach(function(h) {
        var esCur = h.periodo === r.periodo;
        html += '<tr' + (esCur ? ' class="mi-eq"' : '') + '>';
        html += '<td style="font-weight:600">P' + h.periodo + '</td>';
        html += '<td class="num">' + moneda(h.ingresos) + '</td>';
        html += '<td class="num ' + clsPosNeg(h.resultado_operacional) + '">' + moneda(h.resultado_operacional) + '</td>';
        html += '<td class="num">' + fnum(h.demanda) + '</td>';
        html += '<td class="num">' + fnum(h.puntaje_motor, 1) + '</td>';
        html += '<td class="num">' + fnum(h.nota_simulada, 1) + '</td>';
        html += '</tr>';
      });
      html += '</table>';
      html += '</div>';
    }

    // ── DECISIONES DEL PERÍODO ──
    if (r.decisiones && Object.keys(r.decisiones).length > 0) {
      html += '<div class="rpt-sec">';
      html += '<div class="rpt-sec-titulo">Decisiones del período ' + r.periodo + '</div>';
      var modNames = {marketing:'Marketing',finanzas:'Finanzas',logistica:'Logística',rrhh:'RRHH',contabilidad:'Contabilidad',auditoria:'Auditoría'};
      for (var mod in r.decisiones) {
        if (mod === 'informes') continue;
        html += '<div style="margin-bottom:10px">';
        html += '<div style="font:600 .68rem/1 var(--disp);color:var(--navy);margin-bottom:4px">' + (modNames[mod] || mod) + ' (' + r.decisiones[mod].length + ' decisiones)</div>';
        html += '<table><tr><th>Variable</th><th style="text-align:right">Valor</th></tr>';
        r.decisiones[mod].forEach(function(d) {
          html += '<tr><td>' + esc(d.variable) + '</td><td class="num">' + esc(String(d.valor)) + '</td></tr>';
        });
        html += '</table></div>';
      }
      html += '</div>';
    }

    // ── PIE ──
    html += '<div style="border-top:2px solid var(--navy);padding:16px 0;margin-top:20px;text-align:center;font:.7rem/1.4 var(--sans);color:#888">';
    html += 'CTRL ENTROPICO · Reporte Ejecutivo · Período ' + r.periodo + ' · ' + esc(r.empresa);
    html += '<br>Generado el ' + new Date(r.fecha).toLocaleDateString('es-CL') + ' · Davinci Factory';
    html += '</div>';

    html += '</div>'; // .in

    document.getElementById('app').innerHTML = html;
  }

  // ── Utilidades ──
  function tile(et, val) { return '<div class="rpt-tile"><div class="et">' + et + '</div><div class="val">' + val + '</div></div>'; }
  function tileVar(et, val, variacion) {
    var cls = variacion > 0 ? 'pos' : variacion < 0 ? 'neg' : '';
    var varHtml = variacion !== null ? '<div class="var">' + signo(variacion) + '%</div>' : '';
    return '<div class="rpt-tile ' + cls + '"><div class="et">' + et + '</div><div class="val">' + val + '</div>' + varHtml + '</div>';
  }
  function filaER(concepto, monto, pct, bold) {
    var estilo = bold ? 'font-weight:600;border-top:1px solid #ccc' : '';
    return '<tr style="' + estilo + '"><td>' + concepto + '</td><td class="num ' + clsPosNeg(monto) + '">' + moneda(monto) + '</td><td class="num">' + fnum(pct, 1) + '%</td></tr>';
  }
  function moneda(v) { return '$' + Math.round(parseFloat(v) || 0).toLocaleString('es-CL'); }
  function fnum(v, d) { return Number(v || 0).toLocaleString('es-CL', {minimumFractionDigits:d||0, maximumFractionDigits:d||0}); }
  function signo(v) { return (v >= 0 ? '+' : '') + fnum(v, 1); }
  function clsPosNeg(v) { return parseFloat(v) > 0 ? 'pos' : parseFloat(v) < 0 ? 'neg' : ''; }
  function capitalizar(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : ''; }
  function esc(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }

  return { init: init };
})();
