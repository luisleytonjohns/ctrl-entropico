/**
 * CTRL ENTROPICO — decisiones.js
 * Sala de decisiones del estudiante.
 * Carga las variables dinámicamente desde la planilla Motor del curso
 * (endpoint catalogoVariables) y las renderiza por módulo con tabs.
 * Validación de presupuesto en tiempo real.
 */

const Decisiones = (function() {

  // Caché local del catálogo (se pide una vez por sesión)
  let _catalogo = null;

  // Nombres de módulos para las tabs
  const NOMBRES_MODULO = {
    marketing:     'Marketing',
    logistica:     'Logística',
    rrhh:          'RRHH',
    finanzas:      'Finanzas',
    contabilidad:  'Contabilidad',
    auditoria:     'Auditoría'
  };

  // Iconos por módulo
  const ICONOS_MODULO = {
    marketing:     '📊',
    logistica:     '🚚',
    rrhh:          '👥',
    finanzas:      '💰',
    contabilidad:  '📋',
    auditoria:     '🔍'
  };

  /**
   * Carga el catálogo de variables desde el backend (Motor de la industria).
   * @returns {Promise<Object|null>}
   */
  async function cargarCatalogo() {
    if (_catalogo) return _catalogo;

    const resp = await API.catalogoVariables();
    if (resp.ok) {
      _catalogo = resp.data;
      return _catalogo;
    }
    console.error('Error cargando catálogo:', resp.error);
    return null;
  }

  /**
   * Renderiza la sala de decisiones.
   * @param {HTMLElement} contenedor
   * @param {Object} data - { periodo, decisiones, presupuesto, estado }
   * @param {Object} perfil - Perfil del usuario
   */
  async function render(contenedor, data, perfil) {
    const periodo = data.periodo;
    const estado = data.estado;

    if (estado === 'definitiva') {
      contenedor.innerHTML = '<div class="alerta alerta-info">Las decisiones del período ' + periodo + ' ya fueron enviadas como definitivas.</div>';
      return;
    }

    if (!perfil.estadoSimulacion || !perfil.estadoSimulacion.salaAbierta) {
      contenedor.innerHTML = '<div class="alerta alerta-info">La sala de decisiones no está abierta. Espera las instrucciones del académico.</div>';
      return;
    }

    // Cargar catálogo de la industria
    contenedor.innerHTML = '<div class="text-center p-4"><div class="spinner"></div><p class="text-sm mt-2">Cargando variables de la industria...</p></div>';
    const catalogo = await cargarCatalogo();

    if (!catalogo) {
      contenedor.innerHTML = '<div class="alerta alerta-error">No se pudo cargar el catálogo de variables. El curso puede no tener una industria asignada.</div>';
      return;
    }

    const modulos = catalogo.modulos;
    const nombresModulo = Object.keys(modulos);

    if (nombresModulo.length === 0) {
      contenedor.innerHTML = '<div class="alerta alerta-info">No hay módulos activos en este curso.</div>';
      return;
    }

    // ── Encabezado ──
    let html = '<div class="card">';
    html += '<div class="flex items-center justify-between mb-3">';
    html += '<div>';
    html += '<h3 class="text-navy">Sala de decisiones — Período ' + periodo + '</h3>';
    html += '<p class="text-xs text-light mt-1">Industria: ' + catalogo.industria + '</p>';
    html += '</div>';
    html += '<div id="presupuesto-badge" class="badge badge-navy">Presupuesto: cargando...</div>';
    html += '</div>';

    // ── Tabs de módulos ──
    html += '<div class="tabs-modulo" style="display:flex;gap:4px;margin-bottom:1rem;border-bottom:2px solid var(--border-light);padding-bottom:0;overflow-x:auto">';
    nombresModulo.forEach(function(mod, idx) {
      const activo = idx === 0 ? ' tab-activo' : '';
      html += '<button class="tab-modulo' + activo + '" data-modulo="' + mod + '" onclick="Decisiones.cambiarTab(\'' + mod + '\')" ';
      html += 'style="padding:0.5rem 1rem;border:none;background:' + (idx === 0 ? 'var(--navy)' : 'transparent') + ';';
      html += 'color:' + (idx === 0 ? '#fff' : 'var(--text-secondary)') + ';border-radius:6px 6px 0 0;cursor:pointer;font-size:0.85rem;white-space:nowrap">';
      html += (ICONOS_MODULO[mod] || '') + ' ' + (NOMBRES_MODULO[mod] || mod);
      html += '</button>';
    });
    html += '</div>';

    // ── Paneles de cada módulo ──
    nombresModulo.forEach(function(mod, idx) {
      const visible = idx === 0 ? '' : ' style="display:none"';
      html += '<div class="panel-modulo" id="panel-' + mod + '"' + visible + '>';

      const vars = modulos[mod];
      if (!vars || vars.length === 0) {
        html += '<p class="text-sm text-light">Sin variables en este módulo.</p>';
      } else {
        vars.forEach(function(v) {
          const valorActual = obtenerValorGuardado_(data.decisiones, mod, v.id);
          html += renderVariable_(mod, v, valorActual);
        });
      }

      html += '</div>';
    });

    // ── Botón de envío definitivo ──
    html += '<hr class="separador" style="margin-top:1.5rem">';
    html += '<div class="flex items-center justify-between">';
    html += '<div id="mensaje-sala" class="text-sm"></div>';

    if (perfil.rol === 'gerente_general') {
      html += '<button class="btn btn-primary btn-lg" onclick="Decisiones.enviarDefinitiva()">Enviar decisión definitiva</button>';
    } else {
      html += '<p class="text-sm text-secondary">Solo el Gerente General puede enviar la decisión definitiva.</p>';
    }

    html += '</div>';
    html += '</div>';

    contenedor.innerHTML = html;

    // Actualizar badge de presupuesto
    actualizarPresupuesto_(data.presupuesto);
  }

  /**
   * Renderiza una variable individual.
   */
  function renderVariable_(modulo, v, valorActual) {
    let html = '<div class="flex items-center gap-2 mb-2" style="padding:0.6rem 0;border-bottom:1px solid var(--border-light)">';

    // Nombre y rango
    html += '<div style="flex:1">';
    html += '<span class="font-semibold text-sm">' + v.nombre + '</span>';
    html += '<br><span class="text-xs text-light">';
    html += formatearRango_(v);
    if (v.esMonetaria) html += ' · <span style="color:var(--warning)">Presupuestaria</span>';
    html += '</span></div>';

    // Input
    html += '<div style="width:200px">';
    const step = calcularStep_(v);
    const placeholder = v.defecto ? formatearValorCorto_(v, v.defecto) : '';

    html += '<input type="number" class="form-input" ';
    html += 'id="dec-' + modulo + '-' + v.id + '" ';
    html += 'data-modulo="' + modulo + '" data-variable="' + v.id + '" ';
    html += 'value="' + (valorActual !== null ? valorActual : '') + '" ';
    html += 'min="' + v.min + '" max="' + v.max + '" step="' + step + '" ';
    html += 'placeholder="' + placeholder + '" ';
    html += 'onchange="Decisiones.guardarVariable(\'' + modulo + '\',\'' + v.id + '\')" ';
    html += 'style="text-align:right;font-size:0.9rem">';
    html += '</div>';

    // Unidad
    html += '<div class="text-xs text-light" style="width:70px">' + (v.unidad || '') + '</div>';

    // Estado (check / error)
    html += '<div id="estado-' + modulo + '-' + v.id + '" class="text-xs" style="width:30px;text-align:center"></div>';

    html += '</div>';
    return html;
  }

  /**
   * Cambia la tab de módulo activa.
   */
  function cambiarTab(modulo) {
    // Ocultar todos los paneles
    document.querySelectorAll('.panel-modulo').forEach(function(p) {
      p.style.display = 'none';
    });

    // Desactivar todas las tabs
    document.querySelectorAll('.tab-modulo').forEach(function(t) {
      t.style.background = 'transparent';
      t.style.color = 'var(--text-secondary)';
      t.classList.remove('tab-activo');
    });

    // Activar la seleccionada
    const panel = document.getElementById('panel-' + modulo);
    if (panel) panel.style.display = 'block';

    const tab = document.querySelector('.tab-modulo[data-modulo="' + modulo + '"]');
    if (tab) {
      tab.style.background = 'var(--navy)';
      tab.style.color = '#fff';
      tab.classList.add('tab-activo');
    }
  }

  /**
   * Guarda una variable individual enviando el módulo correcto.
   * @param {string} modulo
   * @param {string} variableId
   */
  async function guardarVariable(modulo, variableId) {
    const input = document.getElementById('dec-' + modulo + '-' + variableId);
    const estadoDiv = document.getElementById('estado-' + modulo + '-' + variableId);
    const valor = input.value;

    if (!valor && valor !== '0') {
      estadoDiv.innerHTML = '';
      return;
    }

    estadoDiv.innerHTML = '<div class="spinner" style="width:14px;height:14px"></div>';

    const resp = await API.guardarDecision({
      modulo: modulo,
      variable: variableId,
      valor: valor
    });

    if (resp.ok) {
      estadoDiv.innerHTML = '<span style="color:var(--success)">&#10003;</span>';
      if (resp.data.presupuesto) actualizarPresupuesto_(resp.data.presupuesto);
      // Limpiar mensaje de error previo
      const msgDiv = document.getElementById('mensaje-sala');
      if (msgDiv) msgDiv.innerHTML = '';
    } else {
      estadoDiv.innerHTML = '<span style="color:var(--error)">&#10007;</span>';
      const msgDiv = document.getElementById('mensaje-sala');
      if (msgDiv) msgDiv.innerHTML = '<span class="text-sm" style="color:var(--error)">' + resp.error + '</span>';
      // Restaurar valor anterior si fue rechazado por rango o presupuesto
      input.classList.add('input-error');
      setTimeout(function() { input.classList.remove('input-error'); }, 2000);
    }
  }

  /**
   * Envía las decisiones como definitivas.
   */
  async function enviarDefinitiva() {
    if (!confirm('¿Confirmas el envío definitivo de las decisiones? No se podrán modificar después.')) return;

    const resp = await API.enviarDefinitiva();
    const msgDiv = document.getElementById('mensaje-sala');

    if (resp.ok) {
      msgDiv.innerHTML = '<span style="color:var(--success)">' + resp.data.mensaje + '</span>';
      setTimeout(function() { App.verDecisiones(); }, 1500);
    } else {
      msgDiv.innerHTML = '<span style="color:var(--error)">' + resp.error + '</span>';
    }
  }

  // ══════════════════════════════════════════════════
  // UTILIDADES INTERNAS
  // ══════════════════════════════════════════════════

  /**
   * Busca el valor guardado de una variable en las decisiones del período.
   */
  function obtenerValorGuardado_(decisiones, modulo, variableId) {
    if (!decisiones || !decisiones[modulo]) return null;
    var d = decisiones[modulo][variableId];
    return d ? d.valor : null;
  }

  /**
   * Actualiza el badge de presupuesto.
   */
  function actualizarPresupuesto_(presup) {
    const badge = document.getElementById('presupuesto-badge');
    if (!badge || !presup) return;

    if (presup.asignado > 0) {
      const pct = presup.porcentajeEjecucion;
      const color = pct > 100 ? 'badge-red' : (pct > 80 ? 'badge-orange' : 'badge-navy');
      badge.className = 'badge ' + color;
      badge.textContent = 'Presupuesto: ' + FrontUtils.moneda(presup.gastado) + ' / ' + FrontUtils.moneda(presup.asignado) + ' (' + pct + '%)';
    } else {
      badge.className = 'badge badge-navy';
      badge.textContent = 'Gastado: ' + FrontUtils.moneda(presup.gastado);
    }

    // Mostrar detalle por módulo si hay datos
    if (presup.detallePorModulo) {
      let detalle = '';
      for (const mod in presup.detallePorModulo) {
        detalle += (NOMBRES_MODULO[mod] || mod) + ': ' + FrontUtils.moneda(presup.detallePorModulo[mod]) + '  ';
      }
      badge.title = detalle;
    }
  }

  /**
   * Formatea el rango de una variable para mostrarlo como descripción.
   */
  function formatearRango_(v) {
    if (v.esMonetaria || v.unidad === 'CLP') {
      return FrontUtils.moneda(v.min) + ' a ' + FrontUtils.moneda(v.max);
    }
    if (v.unidad === 'ratio' || v.unidad === '%') {
      return v.min + ' a ' + v.max;
    }
    return v.min + ' a ' + v.max + (v.unidad ? ' ' + v.unidad : '');
  }

  /**
   * Formatea un valor corto para placeholder.
   */
  function formatearValorCorto_(v, valor) {
    if (v.esMonetaria || v.unidad === 'CLP') {
      return '$' + Number(valor).toLocaleString('es-CL');
    }
    return String(valor);
  }

  /**
   * Calcula el step apropiado para el input según la escala de la variable.
   */
  function calcularStep_(v) {
    if (v.esMonetaria || v.unidad === 'CLP') {
      const rango = v.max - v.min;
      if (rango > 100000000) return 5000000;
      if (rango > 10000000) return 1000000;
      if (rango > 1000000) return 100000;
      return 10000;
    }
    if (v.unidad === 'ratio') return 0.01;
    if (v.max <= 10) return 1;
    if (v.max <= 100) return 5;
    return 1;
  }

  /**
   * Invalida la caché del catálogo (útil si el admin cambia la industria).
   */
  function invalidarCatalogo() {
    _catalogo = null;
  }

  return {
    render: render,
    cargarCatalogo: cargarCatalogo,
    cambiarTab: cambiarTab,
    guardarVariable: guardarVariable,
    enviarDefinitiva: enviarDefinitiva,
    invalidarCatalogo: invalidarCatalogo
  };

})();
