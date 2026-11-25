/**
 * CTRL ENTROPICO — resultados.js
 * Vista de resultados del simulador con históricos.
 * Muestra: resumen financiero con variación vs anterior, atributos del motor,
 * multiplicadores RRHH y logística, ranking competitivo,
 * gráfico de evolución multi-período (SVG), evolución de atributos.
 */

var ResultadosUI = (function() {

  var usuario = null;
  var cursoId = null;
  var equipoId = null;
  var periodoPublicado = 0;
  var periodoSeleccionado = 0;
  var historial = {}; // {periodo: resultado} cache de todos los períodos

  /**
   * Inicializa el módulo.
   */
  async function init(usr) {
    usuario = usr;

    var resp = await API.miPerfil();
    if (!resp.ok || !resp.data) {
      mostrarVacio('No est&aacute;s registrado en ning&uacute;n curso activo.');
      return;
    }

    cursoId = resp.data.cursoId;
    equipoId = resp.data.equipoId;

    if (!cursoId) {
      mostrarVacio('No se encontr&oacute; un curso activo.');
      return;
    }
    if (!equipoId) {
      mostrarVacio('A&uacute;n no perteneces a un equipo. Reg&iacute;strate en un equipo para ver resultados.');
      return;
    }

    periodoPublicado = resp.data.periodoPublicado || 0;

    if (periodoPublicado === 0) {
      mostrarVacio('A&uacute;n no hay resultados publicados. Los resultados se publican al cierre de cada per&iacute;odo.');
      return;
    }

    // Cargar todos los períodos para el historial
    await cargarHistorial();

    periodoSeleccionado = periodoPublicado;
    await cargarResultados(periodoSeleccionado);
  }

  /**
   * Carga todos los resultados históricos para gráficos de evolución.
   */
  async function cargarHistorial() {
    var promesas = [];
    for (var p = 1; p <= periodoPublicado; p++) {
      promesas.push(cargarPeriodoSilencioso(p));
    }
    await Promise.all(promesas);
  }

  async function cargarPeriodoSilencioso(periodo) {
    var resp = await API.misResultados(periodo);
    if (resp.ok && resp.data) {
      historial[periodo] = resp.data;
    }
  }

  /**
   * Carga y muestra resultados de un período.
   */
  async function cargarResultados(periodo) {
    document.getElementById('app').innerHTML = '<div class="r-cargando">Cargando resultados del per&iacute;odo ' + periodo + '...</div>';

    // Si no está en cache, cargarlo
    if (!historial[periodo]) {
      var respRes = await API.misResultados(periodo);
      if (respRes.ok && respRes.data) {
        historial[periodo] = respRes.data;
      }
    }

    var respRank = await API.ranking(periodo);

    if (!historial[periodo]) {
      mostrarVacio('No se encontraron resultados para el per&iacute;odo ' + periodo + '.');
      return;
    }

    periodoSeleccionado = periodo;
    var anterior = periodo > 1 ? historial[periodo - 1] : null;
    renderizar(historial[periodo], anterior, respRank.ok ? respRank.data : null);
  }

  /**
   * Renderiza la vista completa de resultados.
   */
  function renderizar(resultado, anterior, ranking) {
    var html = '';

    // ── ENCABEZADO ──
    html += '<div class="r-header"><div class="in">';
    html += '<h1>Resultados <span>Per&iacute;odo ' + periodoSeleccionado + '</span></h1>';
    html += '<div class="r-periodos">';
    for (var p = 1; p <= periodoPublicado; p++) {
      var activo = p === periodoSeleccionado ? ' activo' : '';
      html += '<button class="r-per-btn' + activo + '" onclick="ResultadosUI.cambiarPeriodo(' + p + ')">' + p + '</button>';
    }
    html += '</div>';
    html += '</div></div>';

    // ── TILES RESUMEN CON VARIACIÓN ──
    html += '<div class="r-tiles"><div class="in">';

    var campos = [
      {key:'ingresos', label:'Ingresos', fmt:'moneda'},
      {key:'costo_variable', label:'Costo variable', fmt:'moneda'},
      {key:'margen_bruto', label:'Margen bruto', fmt:'moneda'},
      {key:'gastos_operacionales', label:'Gastos operacionales', fmt:'moneda'},
      {key:'resultado_operacional', label:'Resultado operacional', fmt:'moneda'},
      {key:'demanda', label:'Demanda', fmt:'uds'},
      {key:'precio_venta', label:'Precio de venta', fmt:'moneda'},
      {key:'puntaje_motor', label:'Puntaje motor', fmt:'num1'}
    ];

    for (var t = 0; t < campos.length; t++) {
      var c = campos[t];
      var val = num(resultado[c.key]);
      var valAnt = anterior ? num(anterior[c.key]) : null;
      var cifraStr = c.fmt === 'moneda' ? moneda(val) : c.fmt === 'uds' ? formatNum(val) + ' uds.' : formatNum(val, 1);
      var clase = (c.key === 'costo_variable' || c.key === 'gastos_operacionales') ? '' : clasePosNeg(val);

      var detalle = '';
      if (c.key === 'margen_bruto') {
        detalle = pct(val, num(resultado.ingresos)) + ' del ingreso';
      }
      if (c.key === 'puntaje_motor') {
        detalle = 'Escala 0 a 100';
      }

      // Variación vs período anterior
      var variacion = '';
      if (valAnt !== null && valAnt !== 0) {
        var cambio = ((val - valAnt) / Math.abs(valAnt)) * 100;
        var signo = cambio >= 0 ? '+' : '';
        var colorVar = cambio >= 0 ? 'var(--verde)' : 'var(--rojo)';
        // Para costos, invertir la lógica del color
        if (c.key === 'costo_variable' || c.key === 'gastos_operacionales') {
          colorVar = cambio <= 0 ? 'var(--verde)' : 'var(--rojo)';
        }
        variacion = '<div class="variacion" style="color:' + colorVar + '">' + signo + formatNum(cambio, 1) + '% vs P' + (periodoSeleccionado - 1) + '</div>';
      } else if (valAnt !== null && valAnt === 0 && val !== 0) {
        variacion = '<div class="variacion" style="color:var(--pizarra)">nuevo</div>';
      }

      html += '<div class="r-tile ' + clase + '">';
      html += '<div class="etiqueta">' + c.label + '</div>';
      html += '<div class="cifra">' + cifraStr + '</div>';
      html += variacion;
      if (detalle) html += '<div class="detalle">' + detalle + '</div>';
      html += '</div>';
    }

    html += '</div></div>';

    // ── GRÁFICO DE EVOLUCIÓN MULTI-PERÍODO ──
    if (periodoPublicado > 1 && Object.keys(historial).length > 1) {
      html += '<div class="r-seccion"><div class="in">';
      html += '<div class="r-sec-titulo">Evoluci&oacute;n por per&iacute;odo</div>';
      html += renderGraficoEvolucion();
      html += '</div></div>';
    }

    // ── MULTIPLICADORES RRHH Y LOGÍSTICA ──
    var multRRHH = parseFloat(resultado.multiplicador_rrhh) || 1.0;
    var efLog = parseFloat(resultado.eficiencia_logistica) || 0;
    var nota = parseFloat(resultado.nota_simulada) || 0;

    html += '<div class="r-seccion"><div class="in">';
    html += '<div class="r-sec-titulo">Multiplicadores transversales</div>';
    html += '<div class="r-mults">';

    html += renderMultCard('Multiplicador RRHH', multRRHH, 0.4, 1.3, 'x', 'Rango 0.4x a 1.3x. Afecta demanda y productividad.');
    html += renderMultCard('Eficiencia log&iacute;stica', efLog * 100, 0, 25, '%', 'Reducci&oacute;n del costo unitario. M&aacute;ximo 25%.');
    html += renderMultCard('Nota simulada', nota, 1, 7, '', 'Escala 1.0 a 7.0');

    html += '</div>';
    html += '</div></div>';

    // ── ATRIBUTOS CON EVOLUCIÓN ──
    var atributos = parseAtributos(resultado.atributos);
    var atributosAnt = anterior ? parseAtributos(anterior.atributos) : null;

    if (atributos && Object.keys(atributos).length > 0) {
      html += '<div class="r-seccion"><div class="in">';
      html += '<div class="r-sec-titulo">Atributos de la empresa</div>';
      html += '<div class="r-atributos">';

      var colores = ['#E8600A','#2E5C8A','#00A896','#7C3AED','#D97706','#DC2626','#059669','#4F46E5'];
      var idx = 0;
      for (var attr in atributos) {
        var val = parseFloat(atributos[attr]) || 0;
        var pctVal = Math.min(100, Math.max(0, val * 100));
        var color = colores[idx % colores.length];

        // Variación vs anterior
        var varAttr = '';
        if (atributosAnt && atributosAnt[attr] !== undefined) {
          var valAntAttr = parseFloat(atributosAnt[attr]) || 0;
          var diff = (val - valAntAttr) * 100;
          if (Math.abs(diff) > 0.1) {
            var signoA = diff >= 0 ? '+' : '';
            var colorA = diff >= 0 ? 'var(--verde)' : 'var(--rojo)';
            varAttr = '<span class="attr-var" style="color:' + colorA + '">' + signoA + formatNum(diff, 1) + ' pp</span>';
          }
        }

        html += '<div class="r-attr">';
        html += '<div class="nombre">' + esc(capitalizar(attr)) + ' ' + varAttr + '</div>';
        html += '<div class="barra-bg"><div class="barra-fg" style="width:' + pctVal + '%;background:' + color + '"></div></div>';
        html += '<div class="valor">' + formatNum(pctVal, 1) + '%</div>';
        html += '</div>';
        idx++;
      }

      html += '</div>';

      // Mini gráfico de evolución de atributos (si hay más de 1 período)
      if (periodoPublicado > 1) {
        html += renderGraficoAtributos(atributos);
      }

      html += '</div></div>';
    }

    // ── RANKING ──
    if (ranking && ranking.equipos && ranking.equipos.length > 0) {
      html += '<div class="r-seccion"><div class="in">';
      html += '<div class="r-sec-titulo">Ranking competitivo &mdash; Per&iacute;odo ' + periodoSeleccionado + '</div>';
      html += '<div class="r-ranking">';
      html += '<table>';
      html += '<tr><th style="width:40px">#</th><th>Empresa</th><th style="text-align:right">Ingresos</th><th style="text-align:right">Resultado op.</th><th style="text-align:right">Puntaje</th><th style="text-align:right">Nota</th></tr>';

      var equipos = ranking.equipos;
      for (var r = 0; r < equipos.length; r++) {
        var eq = equipos[r];
        var esMio = eq.equipo_id === equipoId;
        var posClass = r === 0 ? ' p1' : '';
        html += '<tr class="' + (esMio ? 'mi-equipo' : '') + '">';
        html += '<td class="pos' + posClass + '">' + (r + 1) + '</td>';
        html += '<td class="empresa">' + esc(eq.nombre_empresa || 'Equipo ' + eq.equipo_id) + (esMio ? ' <span style="font-size:.65rem;color:var(--turquesa)">(TU EQUIPO)</span>' : '') + '</td>';
        html += '<td class="num">' + moneda(num(eq.ingresos)) + '</td>';
        html += '<td class="num ' + clasePosNeg(num(eq.resultado_operacional)) + '">' + moneda(num(eq.resultado_operacional)) + '</td>';
        html += '<td class="num">' + formatNum(num(eq.puntaje_motor), 1) + '</td>';
        html += '<td class="num">' + formatNum(num(eq.nota_simulada), 1) + '</td>';
        html += '</tr>';
      }

      html += '</table>';
      html += '</div>';
      html += '</div></div>';
    }

    document.getElementById('app').innerHTML = html;
  }

  // ══════════════════════════════════════════════════
  // GRÁFICO DE EVOLUCIÓN MULTI-PERÍODO (SVG)
  // ══════════════════════════════════════════════════

  function renderGraficoEvolucion() {
    var series = [
      {key:'ingresos', label:'Ingresos', color:'#2E5C8A'},
      {key:'resultado_operacional', label:'Resultado op.', color:'#00A896'},
      {key:'puntaje_motor', label:'Puntaje', color:'#E8600A', ejeDerecho:true}
    ];

    var periodos = [];
    for (var p = 1; p <= periodoPublicado; p++) {
      if (historial[p]) periodos.push(p);
    }
    if (periodos.length < 2) return '';

    // Dimensiones
    var W = 700, H = 260, padL = 70, padR = 70, padT = 30, padB = 40;
    var areaW = W - padL - padR;
    var areaH = H - padT - padB;

    // Encontrar rangos
    var minIzq = Infinity, maxIzq = -Infinity;
    var minDer = Infinity, maxDer = -Infinity;
    for (var i = 0; i < periodos.length; i++) {
      var d = historial[periodos[i]];
      for (var s = 0; s < series.length; s++) {
        var v = num(d[series[s].key]);
        if (series[s].ejeDerecho) {
          if (v < minDer) minDer = v;
          if (v > maxDer) maxDer = v;
        } else {
          if (v < minIzq) minIzq = v;
          if (v > maxIzq) maxIzq = v;
        }
      }
    }

    // Ajustar rangos
    if (minIzq === maxIzq) { minIzq -= 1; maxIzq += 1; }
    if (minDer === maxDer) { minDer -= 1; maxDer += 1; }
    var margenIzq = (maxIzq - minIzq) * 0.1;
    var margenDer = (maxDer - minDer) * 0.1;
    minIzq -= margenIzq; maxIzq += margenIzq;
    minDer -= margenDer; maxDer += margenDer;

    var svg = '<div class="r-grafico"><svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;max-width:700px;height:auto;background:#fff;border:1px solid var(--borde);border-radius:8px">';

    // Grilla horizontal
    for (var g = 0; g <= 4; g++) {
      var gy = padT + (areaH / 4) * g;
      svg += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '" stroke="#f0f0f0" stroke-width="1"/>';
      // Etiqueta eje izquierdo
      var valIzq = maxIzq - ((maxIzq - minIzq) / 4) * g;
      svg += '<text x="' + (padL - 8) + '" y="' + (gy + 4) + '" text-anchor="end" fill="#888" font-size="9" font-family="Inter,sans-serif">' + monedaCorta(valIzq) + '</text>';
      // Etiqueta eje derecho
      var valDer = maxDer - ((maxDer - minDer) / 4) * g;
      svg += '<text x="' + (W - padR + 8) + '" y="' + (gy + 4) + '" text-anchor="start" fill="#888" font-size="9" font-family="Inter,sans-serif">' + formatNum(valDer, 0) + '</text>';
    }

    // Etiquetas períodos (eje X)
    for (var px = 0; px < periodos.length; px++) {
      var x = padL + (areaW / (periodos.length - 1)) * px;
      svg += '<text x="' + x + '" y="' + (H - 10) + '" text-anchor="middle" fill="#888" font-size="10" font-family="Lexend,sans-serif">P' + periodos[px] + '</text>';
    }

    // Dibujar series
    for (var si = 0; si < series.length; si++) {
      var ser = series[si];
      var points = [];
      var min = ser.ejeDerecho ? minDer : minIzq;
      var max = ser.ejeDerecho ? maxDer : maxIzq;

      for (var pi = 0; pi < periodos.length; pi++) {
        var vv = num(historial[periodos[pi]][ser.key]);
        var xx = padL + (areaW / (periodos.length - 1)) * pi;
        var yy = padT + areaH - ((vv - min) / (max - min)) * areaH;
        points.push(xx + ',' + yy);
      }

      // Línea
      svg += '<polyline points="' + points.join(' ') + '" fill="none" stroke="' + ser.color + '" stroke-width="2.5" stroke-linejoin="round"/>';

      // Puntos
      for (var dp = 0; dp < points.length; dp++) {
        var coords = points[dp].split(',');
        svg += '<circle cx="' + coords[0] + '" cy="' + coords[1] + '" r="4" fill="' + ser.color + '" stroke="#fff" stroke-width="2"/>';
      }
    }

    svg += '</svg>';

    // Leyenda
    svg += '<div class="r-leyenda">';
    for (var li = 0; li < series.length; li++) {
      svg += '<span class="r-ley-item"><span class="r-ley-color" style="background:' + series[li].color + '"></span>' + series[li].label + (series[li].ejeDerecho ? ' (eje der.)' : '') + '</span>';
    }
    svg += '</div>';
    svg += '</div>';

    return svg;
  }

  // ══════════════════════════════════════════════════
  // GRÁFICO EVOLUCIÓN ATRIBUTOS (mini sparklines)
  // ══════════════════════════════════════════════════

  function renderGraficoAtributos(atributosActuales) {
    var attrNames = Object.keys(atributosActuales);
    if (attrNames.length === 0) return '';

    var periodos = [];
    for (var p = 1; p <= periodoPublicado; p++) {
      if (historial[p]) periodos.push(p);
    }
    if (periodos.length < 2) return '';

    var colores = ['#E8600A','#2E5C8A','#00A896','#7C3AED','#D97706','#DC2626','#059669','#4F46E5'];

    var html = '<div class="r-sparklines" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-top:16px">';

    for (var a = 0; a < attrNames.length; a++) {
      var nombre = attrNames[a];
      var color = colores[a % colores.length];
      var valores = [];
      for (var pi = 0; pi < periodos.length; pi++) {
        var attrs = parseAtributos(historial[periodos[pi]].atributos);
        valores.push(attrs && attrs[nombre] ? parseFloat(attrs[nombre]) * 100 : 0);
      }

      var maxV = Math.max.apply(null, valores);
      var minV = Math.min.apply(null, valores);
      if (maxV === minV) { minV -= 1; maxV += 1; }

      var sw = 180, sh = 40, sp = 4;
      var pts = [];
      for (var v = 0; v < valores.length; v++) {
        var x = sp + ((sw - 2 * sp) / (valores.length - 1)) * v;
        var y = sp + (sh - 2 * sp) - ((valores[v] - minV) / (maxV - minV)) * (sh - 2 * sp);
        pts.push(x + ',' + y);
      }

      html += '<div style="background:#fff;border:1px solid var(--borde);border-radius:6px;padding:8px 10px">';
      html += '<div style="font:600 .68rem/1 var(--disp);color:var(--navy);margin-bottom:4px">' + esc(capitalizar(nombre)) + '</div>';
      html += '<svg viewBox="0 0 ' + sw + ' ' + sh + '" style="width:100%;height:40px">';
      html += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round"/>';
      // Último punto resaltado
      var last = pts[pts.length - 1].split(',');
      html += '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="3" fill="' + color + '"/>';
      html += '</svg>';
      html += '<div style="font:500 .65rem/1 var(--disp);color:var(--pizarra);text-align:right">' + formatNum(valores[valores.length - 1], 1) + '%</div>';
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  // ══════════════════════════════════════════════════
  // UTILIDADES
  // ══════════════════════════════════════════════════

  function renderMultCard(label, valor, min, max, sufijo, desc) {
    var pctM = Math.max(0, Math.min(1, (valor - min) / (max - min)));
    var color = pctM < 0.33 ? 'var(--rojo)' : pctM < 0.66 ? 'var(--orange)' : 'var(--turquesa)';
    var barW = Math.round(pctM * 100);

    return '<div class="r-mult">' +
      '<div class="etiqueta">' + label + '</div>' +
      '<div style="font:700 1.5rem/1 var(--disp);color:var(--navy);text-align:center;margin:8px 0">' + formatNum(valor, sufijo === 'x' ? 2 : 1) + sufijo + '</div>' +
      '<div style="height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden"><div style="height:100%;width:' + barW + '%;background:' + color + ';border-radius:4px;transition:width .4s"></div></div>' +
      '<div class="detalle" style="font:400 .72rem/1.3 var(--sans);color:#888;margin-top:8px;text-align:center">' + desc + '</div>' +
      '</div>';
  }

  function parseAtributos(raw) {
    if (!raw) return null;
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch(e) { return null; }
  }

  function mostrarVacio(mensaje) {
    document.getElementById('app').innerHTML =
      '<div class="r-vacio">' +
      '<h2>Resultados</h2>' +
      '<p>' + mensaje + '</p>' +
      '</div>';
  }

  function cambiarPeriodo(p) {
    cargarResultados(p);
  }

  // ── Formateo ──
  function num(v) { return parseFloat(v) || 0; }
  function moneda(v) { return '$' + Math.round(v).toLocaleString('es-CL'); }
  function monedaCorta(v) {
    var abs = Math.abs(v);
    if (abs >= 1000000000) return (v < 0 ? '-' : '') + '$' + formatNum(abs / 1000000000, 1) + 'B';
    if (abs >= 1000000) return (v < 0 ? '-' : '') + '$' + formatNum(abs / 1000000, 0) + 'M';
    if (abs >= 1000) return (v < 0 ? '-' : '') + '$' + formatNum(abs / 1000, 0) + 'K';
    return '$' + formatNum(v, 0);
  }
  function formatNum(v, dec) { return Number(v).toLocaleString('es-CL', {minimumFractionDigits: dec||0, maximumFractionDigits: dec||0}); }
  function pct(parte, total) { return total ? formatNum((parte / total) * 100, 1) + '%' : '0%'; }
  function clasePosNeg(v) { return v > 0 ? 'positivo' : v < 0 ? 'negativo' : ''; }
  function capitalizar(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
  }
  function esc(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  return {
    init: init,
    cambiarPeriodo: cambiarPeriodo
  };

})();
