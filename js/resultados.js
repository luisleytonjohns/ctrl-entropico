/**
 * CTRL ENTROPICO — resultados.js
 * Vista de resultados del simulador.
 * Muestra: resumen financiero, atributos del motor, multiplicadores
 * RRHH y logística, ranking competitivo.
 */

var ResultadosUI = (function() {

  var usuario = null;
  var cursoId = null;
  var equipoId = null;
  var periodoPublicado = 0;
  var periodoSeleccionado = 0;

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

    // Obtener período publicado desde el último resultado disponible
    periodoPublicado = resp.data.periodoPublicado || 0;

    if (periodoPublicado === 0) {
      mostrarVacio('A&uacute;n no hay resultados publicados. Los resultados se publican al cierre de cada per&iacute;odo.');
      return;
    }

    periodoSeleccionado = periodoPublicado;
    await cargarResultados(periodoSeleccionado);
  }

  /**
   * Carga y muestra resultados de un período.
   */
  async function cargarResultados(periodo) {
    document.getElementById('app').innerHTML = '<div class="r-cargando">Cargando resultados del per&iacute;odo ' + periodo + '...</div>';

    // Cargar resultados propios y ranking en paralelo
    var respRes = await API.misResultados(periodo);
    var respRank = await API.ranking(periodo);

    if (!respRes.ok || !respRes.data) {
      mostrarVacio('No se encontraron resultados para el per&iacute;odo ' + periodo + '.');
      return;
    }

    periodoSeleccionado = periodo;
    renderizar(respRes.data, respRank.ok ? respRank.data : null);
  }

  /**
   * Renderiza la vista completa de resultados.
   */
  function renderizar(resultado, ranking) {
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

    // ── TILES RESUMEN ──
    html += '<div class="r-tiles"><div class="in">';

    var ingresos = num(resultado.ingresos);
    var costoVar = num(resultado.costo_variable);
    var margen = num(resultado.margen_bruto);
    var gastosOp = num(resultado.gastos_operacionales);
    var resOp = num(resultado.resultado_operacional);
    var demanda = num(resultado.demanda);
    var precioVenta = num(resultado.precio_venta);
    var puntaje = num(resultado.puntaje_motor);

    html += tile('Ingresos', moneda(ingresos), '', clasePosNeg(ingresos));
    html += tile('Costo variable', moneda(costoVar), '', '');
    html += tile('Margen bruto', moneda(margen), pct(margen, ingresos) + ' del ingreso', clasePosNeg(margen));
    html += tile('Gastos operacionales', moneda(gastosOp), '', '');
    html += tile('Resultado operacional', moneda(resOp), '', clasePosNeg(resOp));
    html += tile('Demanda', formatNum(demanda) + ' uds.', '', '');
    html += tile('Precio de venta', moneda(precioVenta), '', '');
    html += tile('Puntaje motor', formatNum(puntaje, 1), 'Escala 0 a 100', '');

    html += '</div></div>';

    // ── MULTIPLICADORES RRHH Y LOGÍSTICA ──
    var multRRHH = parseFloat(resultado.multiplicador_rrhh) || 1.0;
    var efLog = parseFloat(resultado.eficiencia_logistica) || 0;

    html += '<div class="r-seccion"><div class="in">';
    html += '<div class="r-sec-titulo">Multiplicadores transversales</div>';
    html += '<div class="r-mults">';

    html += '<div class="r-mult">';
    html += '<div class="etiqueta">Multiplicador RRHH</div>';
    html += renderGauge(multRRHH, 0.4, 1.3, formatNum(multRRHH, 2) + 'x');
    html += '<div class="detalle" style="font:400 .72rem/1.3 var(--sans);color:#888;margin-top:8px;text-align:center">Rango 0.4x a 1.3x. Afecta demanda y productividad de todos los m&oacute;dulos.</div>';
    html += '</div>';

    html += '<div class="r-mult">';
    html += '<div class="etiqueta">Eficiencia log&iacute;stica</div>';
    html += renderGauge(efLog, 0, 0.25, formatNum(efLog * 100, 1) + '%');
    html += '<div class="detalle" style="font:400 .72rem/1.3 var(--sans);color:#888;margin-top:8px;text-align:center">Reducci&oacute;n del costo unitario. M&aacute;ximo 25%.</div>';
    html += '</div>';

    html += '<div class="r-mult">';
    html += '<div class="etiqueta">Nota simulada</div>';
    var nota = parseFloat(resultado.nota_simulada) || 0;
    html += renderGauge(nota, 1, 7, formatNum(nota, 1));
    html += '<div class="detalle" style="font:400 .72rem/1.3 var(--sans);color:#888;margin-top:8px;text-align:center">Escala 1.0 a 7.0</div>';
    html += '</div>';

    html += '</div>';
    html += '</div></div>';

    // ── ATRIBUTOS ──
    var atributos = null;
    if (resultado.atributos) {
      try {
        atributos = typeof resultado.atributos === 'string' ? JSON.parse(resultado.atributos) : resultado.atributos;
      } catch(e) {}
    }

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

        html += '<div class="r-attr">';
        html += '<div class="nombre">' + esc(capitalizar(attr)) + '</div>';
        html += '<div class="barra-bg"><div class="barra-fg" style="width:' + pctVal + '%;background:' + color + '"></div></div>';
        html += '<div class="valor">' + formatNum(pctVal, 1) + '%</div>';
        html += '</div>';
        idx++;
      }

      html += '</div>';
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
  // UTILIDADES DE RENDERIZADO
  // ══════════════════════════════════════════════════

  function tile(etiqueta, cifra, detalle, clase) {
    return '<div class="r-tile ' + clase + '">' +
      '<div class="etiqueta">' + etiqueta + '</div>' +
      '<div class="cifra">' + cifra + '</div>' +
      (detalle ? '<div class="detalle">' + detalle + '</div>' : '') +
      '</div>';
  }

  function renderGauge(valor, min, max, label) {
    // Gauge semicircular simplificado con CSS
    var pct = Math.max(0, Math.min(1, (valor - min) / (max - min)));
    var deg = 225 + pct * 270; // 225° inicio, 270° rango total
    var color = pct < 0.33 ? 'var(--rojo)' : pct < 0.66 ? 'var(--orange)' : 'var(--turquesa)';

    return '<div class="gauge">' +
      '<div class="gauge-bg"></div>' +
      '<div class="gauge-fg" style="transform:rotate(' + deg + 'deg);border-top-color:' + color + ';border-right-color:' + color + '"></div>' +
      '<div class="gauge-val">' + label + '</div>' +
      '</div>';
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
