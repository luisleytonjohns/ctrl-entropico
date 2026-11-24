/**
 * CTRL ENTROPICO — decisiones.js
 * Sala de decisiones del estudiante.
 * Carga las variables dinámicamente desde la planilla Motor del curso
 * (endpoint catalogoVariables) y las renderiza por módulo con tabs,
 * agrupadas por subgerencia. Soporta 147 variables en 6 módulos.
 * Validación de presupuesto en tiempo real.
 * Filtro automático de Logística por nivel (1, 2 o 3).
 */

const Decisiones = (function() {

  // Caché local del catálogo (se pide una vez por sesión)
  let _catalogo = null;

  // Nombres de módulos para las tabs
  const NOMBRES_MODULO = {
    marketing:     'Marketing',
    finanzas:      'Finanzas',
    logistica:     'Logística',
    rrhh:          'RRHH',
    contabilidad:  'Contabilidad',
    auditoria:     'Auditoría'
  };

  // Iconos por módulo
  const ICONOS_MODULO = {
    marketing:     '📊',
    finanzas:      '💰',
    logistica:     '🚚',
    rrhh:          '👥',
    contabilidad:  '📋',
    auditoria:     '🔍'
  };

  // Colores por módulo (fondo suave para las secciones)
  const COLORES_MODULO = {
    marketing:     '#E3F2FD',
    finanzas:      '#F3E5F5',
    logistica:     '#E8F5E9',
    rrhh:          '#FFF3E0',
    contabilidad:  '#F1F8E9',
    auditoria:     '#FCE4EC'
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
    html += '<p class="text-xs text-light mt-1">Industria: ' + catalogo.industria;
    if (catalogo.conteoVariables) {
      const totalActivas = Object.values(catalogo.conteoVariables).reduce(function(a, b) { return a + b; }, 0);
      html += ' · ' + totalActivas + ' decisiones activas';
    }
    html += '</p>';
    html += '</div>';
    html += '<div id="presupuesto-badge" class="badge badge-navy">Presupuesto: cargando...</div>';
    html += '</div>';

    // ── Barra de presupuesto visual ──
    html += '<div id="barra-presupuesto" style="margin-bottom:1rem"></div>';

    // ── Tabs de módulos ──
    html += '<div class="tabs-modulo" style="display:flex;gap:4px;margin-bottom:1rem;border-bottom:2px solid var(--border-light);padding-bottom:0;overflow-x:auto">';
    nombresModulo.forEach(function(mod, idx) {
      const activo = idx === 0;
      const conteo = catalogo.conteoVariables ? catalogo.conteoVariables[mod] || 0 : 0;
      html += '<button class="tab-modulo' + (activo ? ' tab-activo' : '') + '" data-modulo="' + mod + '" ';
      html += 'onclick="Decisiones.cambiarTab(\'' + mod + '\')" ';
      html += 'style="padding:0.5rem 1rem;border:none;';
      html += 'background:' + (activo ? 'var(--navy)' : 'transparent') + ';';
      html += 'color:' + (activo ? '#fff' : 'var(--text-secondary)') + ';';
      html += 'border-radius:6px 6px 0 0;cursor:pointer;font-size:0.85rem;white-space:nowrap">';
      html += (ICONOS_MODULO[mod] || '') + ' ' + (NOMBRES_MODULO[mod] || mod);
      html += ' <span style="font-size:0.7rem;opacity:0.7">(' + conteo + ')</span>';
      html += '</button>';
    });
    html += '</div>';

    // ── Paneles de cada módulo ──
    nombresModulo.forEach(function(mod, idx) {
      const visible = idx === 0 ? '' : ' style="display:none"';
      html += '<div class="panel-modulo" id="panel-' + mod + '"' + visible + '>';

      const moduloData = modulos[mod];
      if (!moduloData || !moduloData.variables || moduloData.variables.length === 0) {
        html += '<p class="text-sm text-light">Sin variables en este módulo.</p>';
      } else {
        // Renderizar agrupado por subgerencia
        const subgerencias = moduloData.subgerencias || {};
        const sgNombres = Object.keys(subgerencias);

        if (sgNombres.length > 1) {
          // Múltiples subgerencias: mostrar secciones colapsables
          sgNombres.forEach(function(sg) {
            html += '<div class="subgerencia-seccion" style="margin-bottom:1rem">';
            html += '<div class="sg-header" style="padding:0.5rem 0.75rem;background:' + (COLORES_MODULO[mod] || '#f5f5f5') + ';';
            html += 'border-radius:6px;margin-bottom:0.5rem;cursor:pointer" ';
            html += 'onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === \'none\' ? \'block\' : \'none\'">';
            html += '<span class="font-semibold text-sm">' + sg + '</span>';
            html += ' <span class="text-xs text-light">(' + subgerencias[sg].length + ' variables)</span>';
            html += '</div>';
            html += '<div class="sg-variables">';

            subgerencias[sg].forEach(function(v) {
              const valorActual = obtenerValorGuardado_(data.decisiones, mod, v.id);
              html += renderVariable_(mod, v, valorActual);
            });

            html += '</div></div>';
          });
        } else {
          // Una sola subgerencia o sin agrupación: listar directamente
          moduloData.variables.forEach(function(v) {
            const valorActual = obtenerValorGuardado_(data.decisiones, mod, v.id);
            html += renderVariable_(mod, v, valorActual);
          });
        }
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

    // Actualizar badge y barra de presupuesto
    actualizarPresupuesto_(data.presupuesto);
  }

  /**
   * Renderiza una variable individual según su tipo de input.
   */
  function renderVariable_(modulo, v, valorActual) {
    let html = '<div class="variable-row" style="display:flex;align-items:center;gap:8px;padding:0.6rem 0;border-bottom:1px solid var(--border-light)">';

    // Columna 1: Nombre, cargo y atributo
    html += '<div style="flex:1;min-width:0">';
    html += '<span class="font-semibold text-sm">' + v.nombre + '</span>';
    html += '<br><span class="text-xs text-light">';
    if (v.cargo) html += v.cargo;
    if (v.atributo) html += ' · Atributo: ' + v.atributo;
    if (v.nivelLogistica) html += ' · ' + v.nivelLogistica;
    html += '</span>';

    // Rango e indicador presupuestario
    html += '<br><span class="text-xs text-light">';
    html += formatearRango_(v);
    if (v.esMonetaria) html += ' · <span style="color:var(--warning);font-weight:600">Presupuestaria</span>';
    if (v.kSaturacion > 0) html += ' · K=' + v.kSaturacion + 'MM';
    html += '</span>';
    html += '</div>';

    // Columna 2: Input según tipo
    html += '<div style="width:200px;flex-shrink:0">';

    if (v.esSeleccion) {
      // Selector (dropdown) con opciones reales desde el Motor
      html += '<select class="form-input" ';
      html += 'id="dec-' + modulo + '-' + v.id + '" ';
      html += 'data-modulo="' + modulo + '" data-variable="' + v.id + '" ';
      html += 'onchange="Decisiones.guardarVariable(\'' + modulo + '\',\'' + v.id + '\')" ';
      html += 'style="font-size:0.9rem">';
      html += '<option value="">Seleccionar...</option>';
      if (v.opciones && v.opciones.length > 0) {
        v.opciones.forEach(function(opt) {
          var sel = (valorActual === opt.id) ? ' selected' : '';
          html += '<option value="' + opt.id + '"' + sel + ' title="' + (opt.descripcion || '') + '">' + opt.nombre + '</option>';
        });
      }
      html += '</select>';
      // Mostrar descripción de la opción seleccionada
      if (v.opciones && v.opciones.length > 0) {
        html += '<p id="desc-' + modulo + '-' + v.id + '" class="text-xs text-light mt-1" style="max-width:200px"></p>';
      }
    } else {
      // Input numérico
      const step = calcularStep_(v);
      const placeholder = v.defecto ? formatearValorCorto_(v, v.defecto) : '0';

      html += '<input type="number" class="form-input" ';
      html += 'id="dec-' + modulo + '-' + v.id + '" ';
      html += 'data-modulo="' + modulo + '" data-variable="' + v.id + '" ';
      html += 'value="' + (valorActual !== null && valorActual !== '' ? valorActual : '') + '" ';
      if (v.max > 0) html += 'min="' + v.min + '" max="' + v.max + '" ';
      html += 'step="' + step + '" ';
      html += 'placeholder="' + placeholder + '" ';
      html += 'onchange="Decisiones.guardarVariable(\'' + modulo + '\',\'' + v.id + '\')" ';
      html += 'style="text-align:right;font-size:0.9rem">';
    }

    html += '</div>';

    // Columna 3: Tipo de input (unidad)
    html += '<div class="text-xs text-light" style="width:70px;flex-shrink:0;text-align:center">' + (v.tipoInput || '') + '</div>';

    // Columna 4: Estado (check / error / spinner)
    html += '<div id="estado-' + modulo + '-' + v.id + '" class="text-xs" style="width:30px;text-align:center;flex-shrink:0"></div>';

    html += '</div>';
    return html;
  }

  /**
   * Cambia la tab de módulo activa.
   */
  function cambiarTab(modulo) {
    document.querySelectorAll('.panel-modulo').forEach(function(p) {
      p.style.display = 'none';
    });

    document.querySelectorAll('.tab-modulo').forEach(function(t) {
      t.style.background = 'transparent';
      t.style.color = 'var(--text-secondary)';
      t.classList.remove('tab-activo');
    });

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
   * Guarda una variable individual enviando al backend.
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
      const msgDiv = document.getElementById('mensaje-sala');
      if (msgDiv) msgDiv.innerHTML = '';
    } else {
      estadoDiv.innerHTML = '<span style="color:var(--error)">&#10007;</span>';
      const msgDiv = document.getElementById('mensaje-sala');
      if (msgDiv) msgDiv.innerHTML = '<span class="text-sm" style="color:var(--error)">' + resp.error + '</span>';
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
   * Actualiza el badge y la barra visual de presupuesto.
   */
  function actualizarPresupuesto_(presup) {
    const badge = document.getElementById('presupuesto-badge');
    const barra = document.getElementById('barra-presupuesto');
    if (!badge || !presup) return;

    if (presup.asignado > 0) {
      const pct = Math.min(presup.porcentajeEjecucion, 150);
      const color = pct > 100 ? 'var(--error)' : (pct > 80 ? 'var(--warning)' : 'var(--success)');
      const colorClass = pct > 100 ? 'badge-red' : (pct > 80 ? 'badge-orange' : 'badge-navy');

      badge.className = 'badge ' + colorClass;
      badge.textContent = 'Presupuesto: ' + FrontUtils.moneda(presup.gastado) + ' / ' + FrontUtils.moneda(presup.asignado) + ' (' + presup.porcentajeEjecucion + '%)';

      // Barra visual
      if (barra) {
        let barraHtml = '<div style="background:var(--border-light);border-radius:4px;height:8px;overflow:hidden;position:relative">';
        barraHtml += '<div style="background:' + color + ';height:100%;width:' + Math.min(pct, 100) + '%;border-radius:4px;transition:width 0.3s"></div>';
        barraHtml += '</div>';

        // Detalle por módulo
        if (presup.detallePorModulo && Object.keys(presup.detallePorModulo).length > 0) {
          barraHtml += '<div style="display:flex;gap:12px;margin-top:4px;flex-wrap:wrap">';
          for (const mod in presup.detallePorModulo) {
            barraHtml += '<span class="text-xs text-light">';
            barraHtml += (ICONOS_MODULO[mod] || '') + ' ' + (NOMBRES_MODULO[mod] || mod) + ': ';
            barraHtml += FrontUtils.moneda(presup.detallePorModulo[mod]);
            barraHtml += '</span>';
          }
          barraHtml += '</div>';
        }

        barra.innerHTML = barraHtml;
      }
    } else {
      badge.className = 'badge badge-navy';
      badge.textContent = 'Gastado: ' + FrontUtils.moneda(presup.gastado);
      if (barra) barra.innerHTML = '';
    }
  }

  /**
   * Formatea el rango de una variable para mostrarlo como descripción.
   */
  function formatearRango_(v) {
    if (v.esSeleccion) return 'Selección';
    if (v.max <= 0) return '';
    if (v.esMonetaria) {
      return FrontUtils.moneda(v.min) + ' a ' + FrontUtils.moneda(v.max) + ' MM';
    }
    if (v.esPorcentaje) {
      return v.min + '% a ' + v.max + '%';
    }
    if (v.tipoInput === 'Días') {
      return v.min + ' a ' + v.max + ' días';
    }
    if (v.tipoInput === 'Ratio') {
      return v.min + ' a ' + v.max;
    }
    return v.min + ' a ' + v.max + (v.tipoInput ? ' ' + v.tipoInput : '');
  }

  /**
   * Formatea un valor corto para placeholder.
   */
  function formatearValorCorto_(v, valor) {
    if (v.esMonetaria) {
      return '$' + Number(valor).toLocaleString('es-CL');
    }
    return String(valor);
  }

  /**
   * Calcula el step apropiado para el input según el tipo de variable.
   */
  function calcularStep_(v) {
    if (v.esMonetaria) {
      if (v.max > 500) return 10;
      if (v.max > 100) return 5;
      return 1;
    }
    if (v.esPorcentaje) return 1;
    if (v.tipoInput === 'Ratio') return 0.01;
    if (v.tipoInput === 'Días') return 1;
    if (v.tipoInput === 'Unidades') return 1;
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
