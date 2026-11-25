/**
 * CTRL ENTROPICO — disenoEstrategico.js
 * Fase de diseño estratégico del equipo.
 * Se muestra después de formar equipo y antes de que se abra la sala.
 * El equipo define: nombre de empresa, producto, posicionamiento,
 * segmento objetivo y slogan.
 *
 * Se integra en equipos.html o como sección dentro de la vista principal.
 * Se invoca con DisenoEstrategicoUI.render(contenedor, cursoId).
 */

var DisenoEstrategicoUI = (function() {

  var _cursoId = null;
  var _opciones = null;
  var _disenoActual = null;

  /**
   * Renderiza la fase de diseño estratégico.
   * @param {HTMLElement} contenedor
   * @param {string} cursoId
   */
  async function render(contenedor, cursoId) {
    _cursoId = cursoId;

    contenedor.innerHTML = '<div style="text-align:center;padding:40px"><div class="spinner"></div><p style="font-size:.85rem;color:#888;margin-top:8px">Cargando dise&ntilde;o estrat&eacute;gico...</p></div>';

    // Verificar si ya tiene diseño guardado
    var respDiseno = await API.obtenerDisenoEstrategico(cursoId);
    if (respDiseno.ok && respDiseno.data && respDiseno.data.definido) {
      _disenoActual = respDiseno.data.diseno;
      renderResumen_(contenedor);
      return;
    }

    // Cargar opciones del Motor
    var respOpc = await API.opcionesDisenoEstrategico(cursoId);
    if (!respOpc.ok || !respOpc.data) {
      contenedor.innerHTML = '<div class="alerta alerta-error">No se pudieron cargar las opciones de dise&ntilde;o estrat&eacute;gico.</div>';
      return;
    }

    _opciones = respOpc.data;
    renderFormulario_(contenedor);
  }

  /**
   * Renderiza el formulario de diseño estratégico.
   */
  function renderFormulario_(contenedor) {
    var opc = _opciones;

    var html = '<div style="background:#fff;border:1px solid #ddd;border-radius:12px;overflow:hidden;max-width:680px;margin:0 auto">';

    // Cabecera
    html += '<div style="background:linear-gradient(135deg,#1B2A4A 0%,#2E5C8A 100%);padding:24px 28px;color:#fff">';
    html += '<h2 style="font:600 1.3rem/1.2 \'Lexend\',sans-serif;margin:0">Dise&ntilde;o estrat&eacute;gico</h2>';
    html += '<p style="font:400 .85rem/1.4 sans-serif;color:#C9D3E3;margin:6px 0 0">Define la identidad de tu empresa antes de competir. Estas decisiones son permanentes para toda la simulaci&oacute;n.</p>';
    if (opc.industria) {
      html += '<p style="font:500 .72rem/1 \'Lexend\',sans-serif;color:#00A896;margin:10px 0 0;letter-spacing:.1em;text-transform:uppercase">Industria: ' + esc(opc.industria) + '</p>';
    }
    html += '</div>';

    html += '<div style="padding:24px 28px;display:grid;gap:20px">';

    // Nombre de empresa
    html += campo('nombreEmpresa', 'Nombre de tu empresa', 'text', 'Ej: Andina Foods, PacíficoTech, Austral Logistics...', 'El nombre con el que competir&aacute;s. Debe ser &uacute;nico en el curso.');

    // Nombre de producto
    html += campo('nombreProducto', 'Nombre de tu producto o servicio principal', 'text', 'Ej: AquaPure, TechConnect Pro, FreshBox...', 'El producto estrella de tu empresa.');

    // Posicionamiento
    if (opc.posicionamiento && opc.posicionamiento.length > 0) {
      html += '<div>';
      html += '<label style="font:600 .72rem/1 \'Lexend\',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#475569;display:block;margin-bottom:6px">Posicionamiento</label>';
      html += '<p style="font:400 .78rem/1.4 sans-serif;color:#888;margin:0 0 8px">C&oacute;mo quieres que el mercado perciba tu empresa.</p>';
      html += '<div style="display:grid;gap:6px">';
      opc.posicionamiento.forEach(function(p) {
        html += '<label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid #ddd;border-radius:8px;cursor:pointer;transition:border-color .15s" onmouseover="this.style.borderColor=\'#2E5C8A\'" onmouseout="this.style.borderColor=\'#ddd\'">';
        html += '<input type="radio" name="posicionamiento" value="' + esc(p.id) + '" style="margin-top:3px">';
        html += '<div><span style="font:600 .85rem/1.2 sans-serif;color:#1B2A4A">' + esc(p.nombre) + '</span>';
        if (p.descripcion) html += '<br><span style="font:400 .75rem/1.3 sans-serif;color:#888">' + esc(p.descripcion) + '</span>';
        html += '</div></label>';
      });
      html += '</div></div>';
    }

    // Segmentación
    if (opc.segmentacion && opc.segmentacion.length > 0) {
      html += '<div>';
      html += '<label style="font:600 .72rem/1 \'Lexend\',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#475569;display:block;margin-bottom:6px">Segmento objetivo</label>';
      html += '<p style="font:400 .78rem/1.4 sans-serif;color:#888;margin:0 0 8px">El perfil de cliente al que apuntas.</p>';
      html += '<div style="display:grid;gap:6px">';
      opc.segmentacion.forEach(function(s) {
        html += '<label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid #ddd;border-radius:8px;cursor:pointer;transition:border-color .15s" onmouseover="this.style.borderColor=\'#2E5C8A\'" onmouseout="this.style.borderColor=\'#ddd\'">';
        html += '<input type="radio" name="segmentacion" value="' + esc(s.id) + '" style="margin-top:3px">';
        html += '<div><span style="font:600 .85rem/1.2 sans-serif;color:#1B2A4A">' + esc(s.nombre) + '</span>';
        if (s.descripcion) html += '<br><span style="font:400 .75rem/1.3 sans-serif;color:#888">' + esc(s.descripcion) + '</span>';
        html += '</div></label>';
      });
      html += '</div></div>';
    }

    // Slogan
    if (opc.slogans && opc.slogans.length > 0) {
      html += '<div>';
      html += '<label style="font:600 .72rem/1 \'Lexend\',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#475569;display:block;margin-bottom:6px">Slogan</label>';
      html += '<p style="font:400 .78rem/1.4 sans-serif;color:#888;margin:0 0 8px">La frase que identifica a tu marca. Puedes elegir uno o escribir el tuyo.</p>';
      html += '<div style="display:grid;gap:6px">';
      opc.slogans.forEach(function(sl) {
        var esPersonalizado = sl.id === 'personalizado';
        html += '<label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid #ddd;border-radius:8px;cursor:pointer" onmouseover="this.style.borderColor=\'#2E5C8A\'" onmouseout="this.style.borderColor=\'#ddd\'">';
        html += '<input type="radio" name="slogan" value="' + esc(sl.id) + '" style="margin-top:3px" onchange="DisenoEstrategicoUI.toggleSloganCustom()">';
        html += '<div><span style="font:' + (esPersonalizado ? '500' : '400') + ' .85rem/1.2 sans-serif;color:#1B2A4A;' + (esPersonalizado ? 'font-style:italic' : '') + '">' + esc(sl.nombre) + '</span></div>';
        html += '</label>';
      });
      html += '</div>';
      html += '<div id="slogan-custom-box" style="display:none;margin-top:8px">';
      html += '<input type="text" id="sloganPersonalizado" placeholder="Escribe tu slogan personalizado" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font:400 .9rem/1.4 sans-serif">';
      html += '</div>';
      html += '</div>';
    }

    // Mensaje de error
    html += '<div id="diseno-error" style="display:none;background:#FEE2E2;border:1px solid #FECACA;color:#991B1B;border-radius:8px;padding:10px 14px;font-size:.85rem"></div>';

    // Botón guardar
    html += '<button onclick="DisenoEstrategicoUI.guardar()" id="btn-guardar-diseno" style="background:#E8600A;color:#fff;border:none;border-radius:10px;padding:14px;font:600 .9rem/1 \'Lexend\',sans-serif;letter-spacing:.04em;width:100%;cursor:pointer;transition:background .2s" onmouseover="this.style.background=\'#B84A08\'" onmouseout="this.style.background=\'#E8600A\'">Confirmar dise&ntilde;o estrat&eacute;gico</button>';

    html += '<p style="font:400 .75rem/1.4 sans-serif;color:#aaa;text-align:center;margin:0">Una vez confirmado, el dise&ntilde;o no se puede modificar. Aseg&uacute;rate de que todo el equipo est&eacute; de acuerdo.</p>';

    html += '</div></div>';

    contenedor.innerHTML = html;
  }

  /**
   * Renderiza el resumen del diseño ya guardado.
   */
  function renderResumen_(contenedor) {
    var d = _disenoActual;

    var html = '<div style="background:#fff;border:1px solid #ddd;border-radius:12px;overflow:hidden;max-width:680px;margin:0 auto">';

    html += '<div style="background:linear-gradient(135deg,#1B2A4A 0%,#2E5C8A 100%);padding:24px 28px;color:#fff;text-align:center">';
    html += '<p style="font:500 .65rem/1 \'Lexend\',sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#00A896;margin:0 0 8px">Tu empresa</p>';
    html += '<h2 style="font:700 1.8rem/1.1 \'Lexend\',sans-serif;margin:0">' + esc(d.nombreEmpresa) + '</h2>';
    html += '<p style="font:400 1rem/1.3 sans-serif;color:#C9D3E3;margin:8px 0 0">' + esc(d.nombreProducto) + '</p>';
    if (d.slogan) html += '<p style="font:400 .9rem/1.3 sans-serif;color:#FFB74D;font-style:italic;margin:10px 0 0">&ldquo;' + esc(d.slogan) + '&rdquo;</p>';
    html += '</div>';

    html += '<div style="padding:20px 28px;display:grid;grid-template-columns:1fr 1fr;gap:16px">';

    html += ficha('Posicionamiento', d.posicionamiento);
    html += ficha('Segmento objetivo', d.segmentacion);
    html += ficha('Definido por', d.definidoPor || '');
    html += ficha('Fecha', d.fechaDefinicion ? new Date(d.fechaDefinicion).toLocaleDateString('es-CL') : '');

    html += '</div>';

    html += '<div style="padding:0 28px 20px;text-align:center">';
    html += '<p style="font:400 .78rem/1.4 sans-serif;color:#16a34a;margin:0">&#10003; Dise&ntilde;o estrat&eacute;gico confirmado. Estas decisiones son permanentes.</p>';
    html += '</div>';

    html += '</div>';

    contenedor.innerHTML = html;
  }

  /**
   * Muestra/oculta el campo de slogan personalizado.
   */
  function toggleSloganCustom() {
    var radios = document.getElementsByName('slogan');
    var box = document.getElementById('slogan-custom-box');
    if (!box) return;
    var seleccionado = '';
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].checked) seleccionado = radios[i].value;
    }
    box.style.display = seleccionado === 'personalizado' ? 'block' : 'none';
  }

  /**
   * Guarda el diseño estratégico.
   */
  async function guardar() {
    var errorDiv = document.getElementById('diseno-error');
    errorDiv.style.display = 'none';

    var nombreEmpresa = (document.getElementById('nombreEmpresa') || {}).value || '';
    var nombreProducto = (document.getElementById('nombreProducto') || {}).value || '';

    var posicionamiento = '';
    var radiosPos = document.getElementsByName('posicionamiento');
    for (var i = 0; i < radiosPos.length; i++) {
      if (radiosPos[i].checked) posicionamiento = radiosPos[i].value;
    }

    var segmentacion = '';
    var radiosSeg = document.getElementsByName('segmentacion');
    for (var j = 0; j < radiosSeg.length; j++) {
      if (radiosSeg[j].checked) segmentacion = radiosSeg[j].value;
    }

    var slogan = '';
    var radiosSl = document.getElementsByName('slogan');
    for (var k = 0; k < radiosSl.length; k++) {
      if (radiosSl[k].checked) slogan = radiosSl[k].value;
    }

    var sloganPersonalizado = '';
    if (slogan === 'personalizado') {
      sloganPersonalizado = (document.getElementById('sloganPersonalizado') || {}).value || '';
    }

    // Validar
    if (!nombreEmpresa.trim()) { mostrarError_('Ingresa el nombre de tu empresa.'); return; }
    if (!nombreProducto.trim()) { mostrarError_('Ingresa el nombre de tu producto.'); return; }
    if (!posicionamiento) { mostrarError_('Selecciona un posicionamiento.'); return; }
    if (!segmentacion) { mostrarError_('Selecciona un segmento objetivo.'); return; }

    if (!confirm('¿Confirmas el diseño estratégico? Esta decisión es permanente.\n\nEmpresa: ' + nombreEmpresa + '\nProducto: ' + nombreProducto)) {
      return;
    }

    var btn = document.getElementById('btn-guardar-diseno');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    var resp = await API.guardarDisenoEstrategico({
      cursoId: _cursoId,
      nombreEmpresa: nombreEmpresa,
      nombreProducto: nombreProducto,
      posicionamiento: posicionamiento,
      segmentacion: segmentacion,
      slogan: slogan,
      sloganPersonalizado: sloganPersonalizado
    });

    if (resp.ok) {
      _disenoActual = resp.data.diseno;
      renderResumen_(btn.closest('div').parentElement.parentElement.parentElement);
      // Intentar re-renderizar en el contenedor original
      var cont = document.getElementById('seccion-diseno') || btn.closest('.card') || document.getElementById('app');
      if (cont) renderResumen_(cont);
    } else {
      mostrarError_(resp.error || 'Error al guardar el diseño.');
      btn.disabled = false;
      btn.textContent = 'Confirmar diseño estratégico';
    }
  }

  function mostrarError_(msg) {
    var errorDiv = document.getElementById('diseno-error');
    if (errorDiv) {
      errorDiv.textContent = msg;
      errorDiv.style.display = 'block';
    }
  }

  function campo(id, label, tipo, placeholder, ayuda) {
    var html = '<div>';
    html += '<label for="' + id + '" style="font:600 .72rem/1 \'Lexend\',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#475569;display:block;margin-bottom:6px">' + label + '</label>';
    if (ayuda) html += '<p style="font:400 .78rem/1.4 sans-serif;color:#888;margin:0 0 6px">' + ayuda + '</p>';
    html += '<input type="' + tipo + '" id="' + id + '" placeholder="' + placeholder + '" style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:8px;font:400 .9rem/1.4 sans-serif;color:#1B2A4A" onfocus="this.style.borderColor=\'#E8600A\';this.style.outline=\'none\'" onblur="this.style.borderColor=\'#ddd\'">';
    html += '</div>';
    return html;
  }

  function ficha(label, valor) {
    return '<div style="padding:10px;background:#F7F5EF;border-radius:8px">' +
      '<div style="font:500 .6rem/1 \'Lexend\',sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#888;margin-bottom:4px">' + label + '</div>' +
      '<div style="font:500 .88rem/1.3 sans-serif;color:#1B2A4A">' + esc(valor) + '</div>' +
      '</div>';
  }

  function esc(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  return {
    render: render,
    guardar: guardar,
    toggleSloganCustom: toggleSloganCustom
  };

})();
