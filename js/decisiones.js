/**
 * CTRL ENTROPICO — decisiones.js
 * Sala de decisiones del estudiante.
 * Carga las variables dinámicamente desde la planilla Motor del curso
 * (endpoint catalogoVariables) y las renderiza por módulo con tabs,
 * agrupadas por subgerencia. Soporta 147 variables en 6 módulos.
 * Validación de presupuesto en tiempo real.
 * Filtro automático de Logística por nivel (1, 2 o 3).
 *
 * HISTÓRICO: permite ver decisiones de períodos anteriores en modo
 * solo lectura, con comparación visual contra el período previo.
 */

const Decisiones = (function() {

  let _catalogo = null;
  let _historial = {};
  let _periodoActual = 0;
  let _periodoViendo = 0;
  let _modoLectura = false;
  let _contenedorRef = null;
  let _perfilRef = null;
  let _dataRef = null;

  const NOMBRES_MODULO = {
    marketing: 'Marketing', finanzas: 'Finanzas', logistica: 'Logística',
    rrhh: 'RRHH', contabilidad: 'Contabilidad', auditoria: 'Auditoría'
  };
  const ICONOS_MODULO = {
    marketing: '📊', finanzas: '💰', logistica: '🚚',
    rrhh: '👥', contabilidad: '📋', auditoria: '🔍'
  };
  const COLORES_MODULO = {
    marketing: '#E3F2FD', finanzas: '#F3E5F5', logistica: '#E8F5E9',
    rrhh: '#FFF3E0', contabilidad: '#F1F8E9', auditoria: '#FCE4EC'
  };

  async function cargarCatalogo() {
    if (_catalogo) return _catalogo;
    const resp = await API.catalogoVariables();
    if (resp.ok) { _catalogo = resp.data; return _catalogo; }
    console.error('Error cargando catálogo:', resp.error);
    return null;
  }

  async function render(contenedor, data, perfil) {
    _contenedorRef = contenedor;
    _perfilRef = perfil;
    _dataRef = data;
    const periodo = data.periodo;
    _periodoActual = periodo;
    _periodoViendo = periodo;
    _modoLectura = false;
    if (data.decisiones) _historial[periodo] = data.decisiones;
    cargarHistorialSilencioso_(periodo);
    renderInterno_(contenedor, data, perfil, periodo, false);
  }

  async function cargarHistorialSilencioso_(periodoActual) {
    for (var p = 1; p < periodoActual; p++) {
      if (!_historial[p]) {
        var resp = await API.misDecisiones(p);
        if (resp.ok && resp.data && resp.data.decisiones) {
          _historial[p] = resp.data.decisiones;
        }
      }
    }
  }

  async function verPeriodo(periodo) {
    _periodoViendo = periodo;
    _modoLectura = (periodo !== _periodoActual);
    if (!_historial[periodo]) {
      var resp = await API.misDecisiones(periodo);
      if (resp.ok && resp.data && resp.data.decisiones) {
        _historial[periodo] = resp.data.decisiones;
      }
    }
    var dataVista = {
      periodo: periodo,
      decisiones: _historial[periodo] || {},
      presupuesto: _modoLectura ? null : _dataRef.presupuesto,
      estado: _modoLectura ? 'historico' : _dataRef.estado
    };
    renderInterno_(_contenedorRef, dataVista, _perfilRef, periodo, _modoLectura);
  }

  async function renderInterno_(contenedor, data, perfil, periodo, soloLectura) {
    const estado = data.estado;

    if (estado === 'definitiva' && !soloLectura) {
      contenedor.innerHTML = '<div class="alerta alerta-info">Las decisiones del período ' + periodo + ' ya fueron enviadas como definitivas.</div>';
      return;
    }
    if (!soloLectura && (!perfil.estadoSimulacion || !perfil.estadoSimulacion.salaAbierta)) {
      contenedor.innerHTML = '<div class="alerta alerta-info">La sala de decisiones no está abierta. Espera las instrucciones del académico.</div>';
      return;
    }

    contenedor.innerHTML = '<div class="text-center p-4"><div class="spinner"></div><p class="text-sm mt-2">Cargando variables de la industria...</p></div>';
    const catalogo = await cargarCatalogo();
    if (!catalogo) {
      contenedor.innerHTML = '<div class="alerta alerta-error">No se pudo cargar el catálogo de variables.</div>';
      return;
    }

    const modulos = catalogo.modulos;
    const nombresModulo = Object.keys(modulos);
    if (nombresModulo.length === 0) {
      contenedor.innerHTML = '<div class="alerta alerta-info">No hay módulos activos en este curso.</div>';
      return;
    }

    var decAnterior = (periodo > 1 && _historial[periodo - 1]) ? _historial[periodo - 1] : null;

    let html = '<div class="card">';

    // Banner modo lectura
    if (soloLectura) {
      html += '<div style="background:#FFF3E0;border:1px solid #FFB74D;border-radius:8px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:8px">';
      html += '<span style="font-size:1.1rem">📂</span>';
      html += '<span style="font:500 .82rem/1.3 var(--disp,sans-serif);color:#E65100">Histórico del período ' + periodo + ' (solo lectura)</span>';
      html += '<button onclick="Decisiones.verPeriodo(' + _periodoActual + ')" style="margin-left:auto;font:500 .7rem/1 sans-serif;padding:5px 12px;border:1px solid #E65100;border-radius:5px;background:none;color:#E65100;cursor:pointer">Volver al período actual</button>';
      html += '</div>';
    }

    html += '<div class="flex items-center justify-between mb-3"><div>';
    html += '<h3 class="text-navy">Sala de decisiones — Período ' + periodo + '</h3>';
    html += '<p class="text-xs text-light mt-1">Industria: ' + catalogo.industria;
    if (catalogo.conteoVariables) {
      const totalActivas = Object.values(catalogo.conteoVariables).reduce(function(a, b) { return a + b; }, 0);
      html += ' · ' + totalActivas + ' decisiones activas';
    }
    html += '</p></div>';
    if (!soloLectura) html += '<div id="presupuesto-badge" class="badge badge-navy">Presupuesto: cargando...</div>';
    html += '</div>';

    // Selector de períodos
    if (_periodoActual > 1) {
      html += '<div style="display:flex;gap:5px;margin-bottom:12px;flex-wrap:wrap;align-items:center">';
      html += '<span style="font:500 .65rem/1 sans-serif;letter-spacing:.1em;text-transform:uppercase;color:#888;margin-right:4px">Período:</span>';
      for (var pp = 1; pp <= _periodoActual; pp++) {
        var esActivo = pp === periodo;
        var esActual = pp === _periodoActual;
        var btnBg = esActivo ? '#1B2A4A' : (esActual ? '#E3F2FD' : '#fff');
        var btnColor = esActivo ? '#fff' : '#1B2A4A';
        var btnBorder = esActivo ? '#1B2A4A' : (esActual ? '#2E5C8A' : '#ddd');
        html += '<button onclick="Decisiones.verPeriodo(' + pp + ')" style="font:500 .7rem/1 sans-serif;padding:5px 12px;border:1px solid ' + btnBorder + ';border-radius:5px;cursor:pointer;background:' + btnBg + ';color:' + btnColor + '">';
        html += pp;
        if (esActual) html += ' <span style="font-size:.55rem;opacity:.7">(actual)</span>';
        html += '</button>';
      }
      // Botón histórico completo
      if (Object.keys(_historial).length > 1) {
        html += '<button onclick="Decisiones.verHistoricoCompleto()" style="margin-left:8px;font:500 .65rem/1 sans-serif;padding:5px 12px;border:1px solid #00A896;border-radius:5px;cursor:pointer;background:none;color:#00A896;letter-spacing:.06em;text-transform:uppercase">📋 Histórico completo</button>';
      }

      html += '</div>';
    }

    // Panel histórico completo (oculto por defecto)
    html += '<div id="panel-historico-completo" style="display:none;margin-bottom:16px"></div>';

    if (!soloLectura) html += '<div id="barra-presupuesto" style="margin-bottom:1rem"></div>';

    // Tabs de módulos
    html += '<div class="tabs-modulo" style="display:flex;gap:4px;margin-bottom:1rem;border-bottom:2px solid #eee;padding-bottom:0;overflow-x:auto">';
    nombresModulo.forEach(function(mod, idx) {
      const activo = idx === 0;
      const conteo = catalogo.conteoVariables ? catalogo.conteoVariables[mod] || 0 : 0;
      html += '<button class="tab-modulo' + (activo ? ' tab-activo' : '') + '" data-modulo="' + mod + '" ';
      html += 'onclick="Decisiones.cambiarTab(\'' + mod + '\')" ';
      html += 'style="padding:0.5rem 1rem;border:none;';
      html += 'background:' + (activo ? '#1B2A4A' : 'transparent') + ';';
      html += 'color:' + (activo ? '#fff' : '#888') + ';';
      html += 'border-radius:6px 6px 0 0;cursor:pointer;font-size:0.85rem;white-space:nowrap">';
      html += (ICONOS_MODULO[mod] || '') + ' ' + (NOMBRES_MODULO[mod] || mod);
      html += ' <span style="font-size:0.7rem;opacity:0.7">(' + conteo + ')</span>';
      html += '</button>';
    });
    html += '</div>';

    // Paneles de cada módulo
    nombresModulo.forEach(function(mod, idx) {
      const visible = idx === 0 ? '' : ' style="display:none"';
      html += '<div class="panel-modulo" id="panel-' + mod + '"' + visible + '>';
      const moduloData = modulos[mod];
      if (!moduloData || !moduloData.variables || moduloData.variables.length === 0) {
        html += '<p class="text-sm text-light">Sin variables en este módulo.</p>';
      } else {
        const subgerencias = moduloData.subgerencias || {};
        const sgNombres = Object.keys(subgerencias);
        if (sgNombres.length > 1) {
          sgNombres.forEach(function(sg) {
            html += '<div class="subgerencia-seccion" style="margin-bottom:1rem">';
            html += '<div class="sg-header" style="padding:0.5rem 0.75rem;background:' + (COLORES_MODULO[mod] || '#f5f5f5') + ';border-radius:6px;margin-bottom:0.5rem;cursor:pointer" ';
            html += 'onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === \'none\' ? \'block\' : \'none\'">';
            html += '<span class="font-semibold text-sm">' + sg + '</span>';
            html += ' <span class="text-xs text-light">(' + subgerencias[sg].length + ' variables)</span>';
            html += '</div><div class="sg-variables">';
            subgerencias[sg].forEach(function(v) {
              const valorActual = obtenerValorGuardado_(data.decisiones, mod, v.id);
              const valorAnterior = decAnterior ? obtenerValorGuardado_(decAnterior, mod, v.id) : null;
              html += renderVariable_(mod, v, valorActual, valorAnterior, soloLectura);
            });
            html += '</div></div>';
          });
        } else {
          moduloData.variables.forEach(function(v) {
            const valorActual = obtenerValorGuardado_(data.decisiones, mod, v.id);
            const valorAnterior = decAnterior ? obtenerValorGuardado_(decAnterior, mod, v.id) : null;
            html += renderVariable_(mod, v, valorActual, valorAnterior, soloLectura);
          });
        }
      }
      html += '</div>';
    });

    // Botón envío definitivo (solo período actual)
    if (!soloLectura) {
      html += '<hr class="separador" style="margin-top:1.5rem">';
      html += '<div class="flex items-center justify-between">';
      html += '<div id="mensaje-sala" class="text-sm"></div>';
      if (perfil.rol === 'gerente_general') {
        html += '<button class="btn btn-primary btn-lg" onclick="Decisiones.enviarDefinitiva()">Enviar decisión definitiva</button>';
      } else {
        html += '<p class="text-sm text-secondary">Solo el Gerente General puede enviar la decisión definitiva.</p>';
      }
      html += '</div>';
    }

    html += '</div>';
    contenedor.innerHTML = html;
    if (!soloLectura) actualizarPresupuesto_(data.presupuesto);
  }

  function renderVariable_(modulo, v, valorActual, valorAnterior, soloLectura) {
    let html = '<div class="variable-row" style="display:flex;align-items:center;gap:8px;padding:0.6rem 0;border-bottom:1px solid #eee">';

    // Col 1: nombre, cargo, atributo
    html += '<div style="flex:1;min-width:0">';
    html += '<span class="font-semibold text-sm">' + v.nombre + '</span>';
    html += '<br><span class="text-xs text-light">';
    if (v.cargo) html += v.cargo;
    if (v.atributo) html += ' · Atributo: ' + v.atributo;
    if (v.nivelLogistica) html += ' · ' + v.nivelLogistica;
    html += '</span><br><span class="text-xs text-light">';
    html += formatearRango_(v);
    if (v.esMonetaria) html += ' · <span style="color:#E8600A;font-weight:600">Presupuestaria</span>';
    if (v.kSaturacion > 0) html += ' · K=' + v.kSaturacion + 'MM';
    html += '</span></div>';

    // Col 2: input o valor
    html += '<div style="width:200px;flex-shrink:0">';
    if (v.esSeleccion) {
      if (soloLectura) {
        var opNombre = '(sin seleccionar)';
        if (valorActual && v.opciones) {
          var opEnc = v.opciones.find(function(o) { return o.id === valorActual; });
          if (opEnc) opNombre = opEnc.nombre;
        }
        html += '<div style="font:500 .88rem/1.3 sans-serif;color:#1B2A4A;padding:6px 0">' + opNombre + '</div>';
      } else {
        html += '<select class="form-input" id="dec-' + modulo + '-' + v.id + '" data-modulo="' + modulo + '" data-variable="' + v.id + '" onchange="Decisiones.guardarVariable(\'' + modulo + '\',\'' + v.id + '\')" style="font-size:0.9rem">';
        html += '<option value="">Seleccionar...</option>';
        if (v.opciones && v.opciones.length > 0) {
          v.opciones.forEach(function(opt) {
            var sel = (valorActual === opt.id) ? ' selected' : '';
            html += '<option value="' + opt.id + '"' + sel + ' title="' + (opt.descripcion || '') + '">' + opt.nombre + '</option>';
          });
        }
        html += '</select>';
        if (v.opciones && v.opciones.length > 0) {
          html += '<p id="desc-' + modulo + '-' + v.id + '" class="text-xs text-light mt-1" style="max-width:200px"></p>';
        }
      }
    } else {
      if (soloLectura) {
        var mostrar = valorActual !== null && valorActual !== '' ? valorActual : '—';
        if (v.esMonetaria && mostrar !== '—') mostrar = '$' + Number(mostrar).toLocaleString('es-CL');
        else if (v.esPorcentaje && mostrar !== '—') mostrar = mostrar + '%';
        html += '<div style="font:500 .88rem/1.3 sans-serif;color:#1B2A4A;padding:6px 0;text-align:right">' + mostrar + '</div>';
      } else {
        const step = calcularStep_(v);
        const placeholder = v.defecto ? formatearValorCorto_(v, v.defecto) : '0';
        html += '<input type="number" class="form-input" id="dec-' + modulo + '-' + v.id + '" data-modulo="' + modulo + '" data-variable="' + v.id + '" value="' + (valorActual !== null && valorActual !== '' ? valorActual : '') + '" ';
        if (v.max > 0) html += 'min="' + v.min + '" max="' + v.max + '" ';
        html += 'step="' + step + '" placeholder="' + placeholder + '" onchange="Decisiones.guardarVariable(\'' + modulo + '\',\'' + v.id + '\')" style="text-align:right;font-size:0.9rem">';
      }
    }
    html += '</div>';

    // Col 3: unidad
    html += '<div class="text-xs text-light" style="width:70px;flex-shrink:0;text-align:center">' + (v.tipoInput || '') + '</div>';

    // Col 4: estado guardado
    if (soloLectura) {
      html += '<div style="width:30px;flex-shrink:0"></div>';
    } else {
      html += '<div id="estado-' + modulo + '-' + v.id + '" class="text-xs" style="width:30px;text-align:center;flex-shrink:0"></div>';
    }

    // Col 5: valor anterior (comparación)
    if (valorAnterior !== null && valorAnterior !== '') {
      var textoAnt = valorAnterior;
      if (v.esSeleccion && v.opciones) {
        var opAnt = v.opciones.find(function(o) { return o.id === valorAnterior; });
        if (opAnt) textoAnt = opAnt.nombre;
      } else if (v.esMonetaria) {
        textoAnt = '$' + Number(valorAnterior).toLocaleString('es-CL');
      } else if (v.esPorcentaje) {
        textoAnt = valorAnterior + '%';
      }
      var cambio = '';
      if (!v.esSeleccion && valorActual !== null && valorActual !== '') {
        var diff = parseFloat(valorActual) - parseFloat(valorAnterior);
        if (diff > 0) cambio = ' <span style="color:#16a34a;font-weight:600">↑</span>';
        else if (diff < 0) cambio = ' <span style="color:#dc2626;font-weight:600">↓</span>';
        else cambio = ' <span style="color:#888">=</span>';
      }
      html += '<div style="width:120px;flex-shrink:0;text-align:right;font:400 .72rem/1.3 sans-serif;color:#aaa" title="Período anterior">';
      html += '<span style="font-size:.58rem;text-transform:uppercase;letter-spacing:.06em">Ant:</span> ' + textoAnt + cambio;
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  function cambiarTab(modulo) {
    document.querySelectorAll('.panel-modulo').forEach(function(p) { p.style.display = 'none'; });
    document.querySelectorAll('.tab-modulo').forEach(function(t) {
      t.style.background = 'transparent'; t.style.color = '#888'; t.classList.remove('tab-activo');
    });
    var panel = document.getElementById('panel-' + modulo);
    if (panel) panel.style.display = 'block';
    var tab = document.querySelector('.tab-modulo[data-modulo="' + modulo + '"]');
    if (tab) { tab.style.background = '#1B2A4A'; tab.style.color = '#fff'; tab.classList.add('tab-activo'); }
  }

  async function guardarVariable(modulo, variableId) {
    if (_modoLectura) return;
    const input = document.getElementById('dec-' + modulo + '-' + variableId);
    const estadoDiv = document.getElementById('estado-' + modulo + '-' + variableId);
    const valor = input.value;
    if (!valor && valor !== '0') { estadoDiv.innerHTML = ''; return; }
    estadoDiv.innerHTML = '<div class="spinner" style="width:14px;height:14px"></div>';
    const resp = await API.guardarDecision({ modulo: modulo, variable: variableId, valor: valor });
    if (resp.ok) {
      estadoDiv.innerHTML = '<span style="color:#16a34a">&#10003;</span>';
      if (resp.data.presupuesto) actualizarPresupuesto_(resp.data.presupuesto);
      var msgDiv = document.getElementById('mensaje-sala');
      if (msgDiv) msgDiv.innerHTML = '';
    } else {
      estadoDiv.innerHTML = '<span style="color:#dc2626">&#10007;</span>';
      var msgDiv = document.getElementById('mensaje-sala');
      if (msgDiv) msgDiv.innerHTML = '<span class="text-sm" style="color:#dc2626">' + resp.error + '</span>';
      input.classList.add('input-error');
      setTimeout(function() { input.classList.remove('input-error'); }, 2000);
    }
  }

  async function enviarDefinitiva() {
    if (_modoLectura) return;
    if (!confirm('¿Confirmas el envío definitivo de las decisiones? No se podrán modificar después.')) return;
    const resp = await API.enviarDefinitiva();
    var msgDiv = document.getElementById('mensaje-sala');
    if (resp.ok) {
      msgDiv.innerHTML = '<span style="color:#16a34a">' + resp.data.mensaje + '</span>';
      setTimeout(function() { App.verDecisiones(); }, 1500);
    } else {
      msgDiv.innerHTML = '<span style="color:#dc2626">' + resp.error + '</span>';
    }
  }

  function obtenerValorGuardado_(decisiones, modulo, variableId) {
    if (!decisiones || !decisiones[modulo]) return null;
    var d = decisiones[modulo][variableId];
    return d ? d.valor : null;
  }

  function actualizarPresupuesto_(presup) {
    var badge = document.getElementById('presupuesto-badge');
    var barra = document.getElementById('barra-presupuesto');
    if (!badge || !presup) return;
    if (presup.asignado > 0) {
      var pct = Math.min(presup.porcentajeEjecucion, 150);
      var color = pct > 100 ? '#dc2626' : (pct > 80 ? '#E8600A' : '#16a34a');
      badge.textContent = 'Presupuesto: ' + FrontUtils.moneda(presup.gastado) + ' / ' + FrontUtils.moneda(presup.asignado) + ' (' + presup.porcentajeEjecucion + '%)';
      if (barra) {
        var barraHtml = '<div style="background:#eee;border-radius:4px;height:8px;overflow:hidden">';
        barraHtml += '<div style="background:' + color + ';height:100%;width:' + Math.min(pct, 100) + '%;border-radius:4px;transition:width 0.3s"></div></div>';
        if (presup.detallePorModulo && Object.keys(presup.detallePorModulo).length > 0) {
          barraHtml += '<div style="display:flex;gap:12px;margin-top:4px;flex-wrap:wrap">';
          for (var mod in presup.detallePorModulo) {
            barraHtml += '<span class="text-xs text-light">' + (ICONOS_MODULO[mod] || '') + ' ' + (NOMBRES_MODULO[mod] || mod) + ': ' + FrontUtils.moneda(presup.detallePorModulo[mod]) + '</span>';
          }
          barraHtml += '</div>';
        }
        barra.innerHTML = barraHtml;
      }
    } else {
      badge.textContent = 'Gastado: ' + FrontUtils.moneda(presup.gastado);
      if (barra) barra.innerHTML = '';
    }
  }

  function formatearRango_(v) {
    if (v.esSeleccion) return 'Selección';
    if (v.max <= 0) return '';
    if (v.esMonetaria) return FrontUtils.moneda(v.min) + ' a ' + FrontUtils.moneda(v.max) + ' MM';
    if (v.esPorcentaje) return v.min + '% a ' + v.max + '%';
    if (v.tipoInput === 'Días') return v.min + ' a ' + v.max + ' días';
    if (v.tipoInput === 'Ratio') return v.min + ' a ' + v.max;
    return v.min + ' a ' + v.max + (v.tipoInput ? ' ' + v.tipoInput : '');
  }

  function formatearValorCorto_(v, valor) {
    if (v.esMonetaria) return '$' + Number(valor).toLocaleString('es-CL');
    return String(valor);
  }

  function calcularStep_(v) {
    if (v.esMonetaria) { if (v.max > 500) return 10; if (v.max > 100) return 5; return 1; }
    if (v.esPorcentaje) return 1;
    if (v.tipoInput === 'Ratio') return 0.01;
    if (v.tipoInput === 'Días') return 1;
    if (v.tipoInput === 'Unidades') return 1;
    if (v.max <= 10) return 1;
    if (v.max <= 100) return 5;
    return 1;
  }

  function invalidarCatalogo() { _catalogo = null; }

  /**
   * Muestra/oculta la tabla histórica consolidada de decisiones.
   */
  function verHistoricoCompleto() {
    var panel = document.getElementById('panel-historico-completo');
    if (!panel) return;

    if (panel.style.display !== 'none') {
      panel.style.display = 'none';
      return;
    }

    if (!_catalogo) {
      panel.innerHTML = '<p style="color:#888;font-size:.85rem">Cargando catálogo...</p>';
      panel.style.display = 'block';
      return;
    }

    var periodos = [];
    for (var p = 1; p <= _periodoActual; p++) {
      if (_historial[p]) periodos.push(p);
    }
    if (periodos.length < 2) {
      panel.innerHTML = '<p style="color:#888;font-size:.85rem">Se necesitan al menos 2 períodos para mostrar el histórico.</p>';
      panel.style.display = 'block';
      return;
    }

    var modulos = _catalogo.modulos;
    var html = '<div style="background:#fff;border:1px solid #ddd;border-radius:10px;overflow:hidden">';
    html += '<div style="background:#1B2A4A;color:#fff;padding:10px 14px;display:flex;align-items:center;justify-content:space-between">';
    html += '<span style="font:700 .7rem/1 sans-serif;letter-spacing:.12em;text-transform:uppercase">Histórico completo de decisiones</span>';
    html += '<button onclick="document.getElementById(\'panel-historico-completo\').style.display=\'none\'" style="background:none;border:none;color:#fff;cursor:pointer;font-size:1rem">&times;</button>';
    html += '</div>';
    html += '<div style="overflow-x:auto;max-height:600px;overflow-y:auto">';
    html += '<table style="width:100%;border-collapse:collapse;font-size:.8rem;min-width:' + (220 + periodos.length * 110) + 'px">';

    // Encabezado
    html += '<thead style="position:sticky;top:0;z-index:1"><tr>';
    html += '<th style="text-align:left;padding:8px 10px;background:#1B2A4A;color:#fff;min-width:200px;position:sticky;left:0;z-index:2">Variable</th>';
    for (var h = 0; h < periodos.length; h++) {
      var esSel = periodos[h] === _periodoViendo;
      html += '<th style="text-align:right;padding:8px 10px;background:' + (esSel ? '#1a3a5c' : '#1B2A4A') + ';color:#fff;min-width:100px">P' + periodos[h] + '</th>';
    }
    html += '</tr></thead><tbody>';

    // Por cada módulo
    for (var mod in modulos) {
      var moduloData = modulos[mod];
      if (!moduloData || !moduloData.variables || moduloData.variables.length === 0) continue;

      // Fila separador del módulo
      html += '<tr><td colspan="' + (periodos.length + 1) + '" style="background:' + (COLORES_MODULO[mod] || '#f5f5f5') + ';padding:6px 10px;font:600 .7rem/1 sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#1B2A4A;position:sticky;left:0">';
      html += (ICONOS_MODULO[mod] || '') + ' ' + (NOMBRES_MODULO[mod] || mod);
      html += '</td></tr>';

      var variables = moduloData.variables;
      for (var vi = 0; vi < variables.length; vi++) {
        var v = variables[vi];
        html += '<tr>';
        html += '<td style="padding:5px 10px;border-bottom:1px solid #f0f0f0;font:500 .78rem/1.2 sans-serif;color:#333;position:sticky;left:0;background:#fff">' + v.nombre + '</td>';

        for (var pi = 0; pi < periodos.length; pi++) {
          var val = obtenerValorGuardado_(_historial[periodos[pi]], mod, v.id);
          var mostrar = '';

          if (val !== null && val !== '') {
            if (v.esSeleccion && v.opciones) {
              var opEnc = v.opciones.find(function(o) { return o.id === val; });
              mostrar = opEnc ? opEnc.nombre : val;
            } else if (v.esMonetaria) {
              mostrar = '$' + Number(val).toLocaleString('es-CL');
            } else if (v.esPorcentaje) {
              mostrar = val + '%';
            } else {
              mostrar = val;
            }
          } else {
            mostrar = '<span style="color:#ccc">—</span>';
          }

          // Flecha de cambio vs anterior
          var flechaHtml = '';
          if (pi > 0 && !v.esSeleccion) {
            var valAnt = obtenerValorGuardado_(_historial[periodos[pi - 1]], mod, v.id);
            if (val !== null && val !== '' && valAnt !== null && valAnt !== '') {
              var diff = parseFloat(val) - parseFloat(valAnt);
              if (diff > 0) flechaHtml = ' <span style="color:#16a34a;font-size:.65rem">↑</span>';
              else if (diff < 0) flechaHtml = ' <span style="color:#dc2626;font-size:.65rem">↓</span>';
            }
          }

          var esSel2 = periodos[pi] === _periodoViendo;
          html += '<td style="text-align:right;padding:5px 10px;border-bottom:1px solid #f0f0f0;font:400 .78rem/1.2 sans-serif;' + (esSel2 ? 'background:#EFF6FF;' : '') + '">' + mostrar + flechaHtml + '</td>';
        }
        html += '</tr>';
      }
    }

    html += '</tbody></table></div></div>';

    panel.innerHTML = html;
    panel.style.display = 'block';
  }

  return {
    render: render,
    cargarCatalogo: cargarCatalogo,
    cambiarTab: cambiarTab,
    guardarVariable: guardarVariable,
    enviarDefinitiva: enviarDefinitiva,
    invalidarCatalogo: invalidarCatalogo,
    verPeriodo: verPeriodo,
    verHistoricoCompleto: verHistoricoCompleto
  };

})();
