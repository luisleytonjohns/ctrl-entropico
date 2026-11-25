/**
 * CTRL ENTROPICO — voxliber.js
 * Frontend del periódico Vox Liber.
 * Muestra la edición del período actual con secciones, indicadores,
 * horóscopo empresarial y columnas de opinión.
 * El académico ve además los eventos activos del motor.
 */

var VoxLiberUI = (function() {

  var usuario = null;
  var cursoId = null;
  var ediciones = [];
  var edicionActual = null;
  var periodoActual = 0;

  /**
   * Inicializa el módulo.
   */
  async function init(usr) {
    usuario = usr;

    // Obtener cursoId del perfil
    var resp = await API.miPerfil();
    if (!resp.ok || !resp.data) {
      mostrarVacio('No est&aacute;s registrado en ning&uacute;n curso activo.');
      return;
    }
    cursoId = resp.data.cursoId;
    if (!cursoId) {
      mostrarVacio('No se encontr&oacute; un curso activo.');
      return;
    }

    // Cargar lista de ediciones
    var respList = await API.listarPeriodicos(cursoId);
    if (respList.ok && respList.data && respList.data.length > 0) {
      ediciones = respList.data.sort(function(a, b) { return b.periodo - a.periodo; });
      periodoActual = ediciones[0].periodo;
      await cargarEdicion(periodoActual);
    } else {
      mostrarVacio('A&uacute;n no hay ediciones de Vox Liber disponibles. El peri&oacute;dico se genera cuando el acad&eacute;mico abre la sala de decisiones de cada per&iacute;odo.');
    }
  }

  /**
   * Carga y muestra una edición específica.
   */
  async function cargarEdicion(periodo) {
    document.getElementById('app').innerHTML = '<div class="vl-cargando">Cargando edici&oacute;n N&deg;' + periodo + '...</div>';

    var resp = await API.obtenerPeriodico(cursoId, periodo);
    if (!resp.ok || !resp.data) {
      mostrarVacio('No se pudo cargar la edici&oacute;n del per&iacute;odo ' + periodo + '.');
      return;
    }

    edicionActual = resp.data;
    periodoActual = periodo;
    renderizar();
  }

  /**
   * Renderiza la edición completa del periódico.
   */
  function renderizar() {
    var ed = edicionActual;
    var html = '';

    // ── CABECERA ──
    html += '<header class="vl-cabecera"><div class="in">';
    html += '<div class="vl-meta-top">';
    html += '<span>' + ed.edicion + '</span>';
    html += '<span>' + ed.fecha_publicacion + '</span>';
    html += '</div>';
    html += '<div class="vl-logo-row">';
    html += '<span class="vl-titulo">vox<span>liber</span></span>';
    html += '</div>';
    html += '<div class="vl-linea"></div>';
    html += '<div class="vl-subtitulo">Peri&oacute;dico de negocios e industria &middot; Simulaci&oacute;n CTRL ENTROPICO</div>';

    // Selector de ediciones
    if (ediciones.length > 1) {
      html += '<div class="vl-ediciones">';
      for (var i = 0; i < ediciones.length; i++) {
        var e = ediciones[i];
        var activo = e.periodo === periodoActual ? ' activo' : '';
        html += '<button class="vl-ed-btn' + activo + '" onclick="VoxLiberUI.cambiarEdicion(' + e.periodo + ')">N&deg;' + e.periodo + '</button>';
      }
      html += '</div>';
    }

    html += '</div></header>';

    // ── INDICADORES ──
    if (ed.indicadores && ed.indicadores.length > 0) {
      html += '<div class="vl-indicadores"><div class="in">';
      for (var j = 0; j < ed.indicadores.length; j++) {
        var ind = ed.indicadores[j];
        var cambioClass = '';
        var cambioStr = ind.cambio || '';
        if (cambioStr.indexOf('+') === 0) cambioClass = 'pos';
        else if (cambioStr.indexOf('-') === 0) cambioClass = 'neg';
        html += '<div class="vl-ind">';
        html += '<div class="nombre">' + esc(ind.nombre) + '</div>';
        html += '<div class="valor">' + formatearValor(ind.valor, ind.unidad) + '</div>';
        html += '<div class="cambio ' + cambioClass + '">' + esc(cambioStr) + '</div>';
        html += '</div>';
      }
      html += '</div></div>';
    }

    // ── PORTADA ──
    if (ed.titular_portada) {
      html += '<div class="vl-portada"><div class="in">';
      html += '<h1>' + esc(ed.titular_portada) + '</h1>';
      html += '</div></div>';
    }

    // ── CONTENIDO ──
    html += '<div class="vl-contenido"><div class="in">';

    // Columna principal: secciones de noticias
    html += '<div class="vl-principal">';
    var seccionesOrden = ['Economía', 'Industria', 'Laboral', 'Tecnología'];
    if (ed.secciones) {
      for (var s = 0; s < seccionesOrden.length; s++) {
        var nombreSec = seccionesOrden[s];
        var noticias = ed.secciones[nombreSec];
        if (!noticias || noticias.length === 0) continue;

        html += '<div class="vl-seccion">';
        html += '<div class="vl-sec-titulo">' + esc(nombreSec) + '</div>';
        for (var n = 0; n < noticias.length; n++) {
          html += '<div class="vl-noticia">';
          html += '<h3>' + esc(noticias[n].titular) + '</h3>';
          html += '<p>' + esc(noticias[n].bajada) + '</p>';
          html += '</div>';
        }
        html += '</div>';
      }
    }
    html += '</div>';

    // Columna lateral
    html += '<div class="vl-lateral">';

    // Eventos activos (solo académico)
    if (ed.eventos_activos && ed.eventos_activos.length > 0) {
      html += '<div class="vl-eventos-admin">';
      html += '<div class="vl-ea-titulo">Eventos activos (solo acad&eacute;mico)</div>';
      for (var ea = 0; ea < ed.eventos_activos.length; ea++) {
        var evt = ed.eventos_activos[ea];
        html += '<div class="vl-ea-item"><b>' + esc(evt.nombre) + '</b></div>';
      }
      html += '</div>';
    }

    // Opinión
    if (ed.secciones && ed.secciones['Opinión'] && ed.secciones['Opinión'].length > 0) {
      html += '<div class="vl-opinion">';
      html += '<div class="vl-o-titulo">Opini&oacute;n</div>';
      var opiniones = ed.secciones['Opinión'];
      for (var o = 0; o < opiniones.length; o++) {
        html += '<div class="vl-o-item">';
        html += '<h4>' + esc(opiniones[o].titular) + '</h4>';
        html += '<p>' + esc(opiniones[o].bajada).substring(0, 180) + '...</p>';
        html += '</div>';
      }
      html += '</div>';
    }

    // Horóscopo
    if (ed.horoscopo && ed.horoscopo.length > 0) {
      html += '<div class="vl-horoscopo">';
      html += '<div class="vl-h-titulo">Hor&oacute;scopo Empresarial</div>';
      html += '<ul class="vl-h-lista">';
      var simbolos = {
        'Aries':'♈','Tauro':'♉','Géminis':'♊','Cáncer':'♋',
        'Leo':'♌','Virgo':'♍','Libra':'♎','Escorpio':'♏',
        'Sagitario':'♐','Capricornio':'♑','Acuario':'♒','Piscis':'♓'
      };
      for (var h = 0; h < ed.horoscopo.length; h++) {
        var signo = ed.horoscopo[h];
        var simb = simbolos[signo.signo] || '';
        html += '<li class="vl-h-item" onclick="this.classList.toggle(\'abierto\')">';
        html += '<div class="vl-h-signo">' + simb + ' ' + esc(signo.signo) + '</div>';
        html += '<div class="vl-h-pred">' + esc(signo.prediccion) + '</div>';
        html += '</li>';
      }
      html += '</ul>';
      html += '</div>';
    }

    html += '</div>'; // lateral
    html += '</div></div>'; // contenido

    // ── PIE ──
    html += '<footer class="vl-pie"><div class="in">';
    html += '<div class="vl-pie-izq">Vox Liber es una publicaci&oacute;n ficticia generada por el simulador CTRL ENTROPICO. Las noticias, indicadores y pron&oacute;sticos son simulados con fines pedag&oacute;gicos.</div>';
    html += '<div class="vl-pie-der">CTRL ENTROPICO &middot; Davinci Factory</div>';
    html += '</div></footer>';

    document.getElementById('app').innerHTML = html;
  }

  /**
   * Muestra estado vacío.
   */
  function mostrarVacio(mensaje) {
    document.getElementById('app').innerHTML =
      '<div class="vl-vacio">' +
      '<h2>Vox Liber</h2>' +
      '<p>' + mensaje + '</p>' +
      '</div>';
  }

  /**
   * Cambia a otra edición.
   */
  function cambiarEdicion(periodo) {
    cargarEdicion(periodo);
  }

  /**
   * Escapa HTML.
   */
  function esc(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  /**
   * Formatea valor de indicador.
   */
  function formatearValor(valor, unidad) {
    if (unidad === 'CLP') return '$' + Number(valor).toLocaleString('es-CL');
    if (unidad === 'USD') return 'US$' + Number(valor).toLocaleString('es-CL', {minimumFractionDigits:2, maximumFractionDigits:2});
    if (unidad === '%') return Number(valor).toLocaleString('es-CL', {minimumFractionDigits:1, maximumFractionDigits:1}) + '%';
    if (unidad === 'pts') return Number(valor).toLocaleString('es-CL') + ' pts';
    return String(valor) + ' ' + (unidad || '');
  }

  return {
    init: init,
    cambiarEdicion: cambiarEdicion
  };

})();
