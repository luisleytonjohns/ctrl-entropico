/**
 * CTRL ENTROPICO — decisiones.js
 * Sala de decisiones del estudiante.
 * Renderiza las variables por módulo y categoría,
 * con validación de presupuesto en tiempo real.
 *
 * Las variables se envían al backend con { modulo, variable, valor }.
 * Proceso.gs lee las decisiones como dec['modulo.variable'].
 */

const Decisiones = (function() {

  // Cache de variables para saber el módulo de cada una
  let variablesCache_ = {};

  /**
   * Renderiza la sala de decisiones.
   * @param {HTMLElement} contenedor
   * @param {Object} data - { periodo, decisiones, presupuesto, estado }
   * @param {Object} perfil - Perfil del usuario
   */
  function render(contenedor, data, perfil) {
    const periodo = data.periodo;
    const estado = data.estado;

    if (estado === 'definitiva') {
      contenedor.innerHTML = '<div class="alerta alerta-info">Las decisiones del período ' + periodo + ' ya fueron enviadas como definitivas.</div>';
      return;
    }

    if (!perfil.estadoSimulacion.salaAbierta) {
      contenedor.innerHTML = '<div class="alerta alerta-info">La sala de decisiones no está abierta. Espera las instrucciones del académico.</div>';
      return;
    }

    let html = '<div class="card">';
    html += '<div class="flex items-center justify-between mb-3">';
    html += '<h3 class="text-navy">Sala de decisiones — Período ' + periodo + '</h3>';
    html += '<div id="presupuesto-badge" class="badge badge-navy">Presupuesto: cargando...</div>';
    html += '</div>';

    // Obtener módulos activos y sus variables
    var modulosActivos = perfil.modulosActivos || ['marketing'];
    var todasLasVariables = obtenerVariables_(modulosActivos);

    // Guardar en cache para acceso rápido por ID
    variablesCache_ = {};
    todasLasVariables.forEach(function(v) { variablesCache_[v.id] = v; });

    // Agrupar por módulo y categoría
    var porModulo = {};
    todasLasVariables.forEach(function(v) {
      if (!porModulo[v.modulo]) porModulo[v.modulo] = {};
      if (!porModulo[v.modulo][v.categoria]) porModulo[v.modulo][v.categoria] = [];
      porModulo[v.modulo][v.categoria].push(v);
    });

    // Nombres de módulos para mostrar
    var nombresModulos = {
      marketing: 'Marketing', finanzas: 'Finanzas', logistica: 'Logística',
      rrhh: 'Recursos Humanos', contabilidad: 'Contabilidad', auditoria: 'Auditoría'
    };

    // Renderizar cada módulo
    for (var modulo in porModulo) {
      html += '<div class="mb-4">';
      html += '<h3 style="color:var(--orange);font-size:1rem;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px">' + (nombresModulos[modulo] || modulo) + '</h3>';

      for (var cat in porModulo[modulo]) {
        html += '<div class="mb-3">';
        html += '<h4 class="text-blue mb-2" style="border-bottom:2px solid var(--border-light);padding-bottom:0.5rem">' + cat + '</h4>';

        porModulo[modulo][cat].forEach(function(v) {
          var decModulo = data.decisiones[v.modulo] || {};
          var valorActual = decModulo[v.id] ? decModulo[v.id].valor : '';

          html += '<div class="flex items-center gap-2 mb-2" style="padding:0.5rem 0;border-bottom:1px solid var(--border-light)">';
          html += '<div style="flex:1"><span class="font-semibold text-sm">' + v.nombre + '</span>';
          html += '<br><span class="text-xs text-light">' + v.descripcion + '</span></div>';
          html += '<div style="width:180px">';

          if (v.tipo === 'numerico') {
            html += '<input type="number" class="form-input" id="dec-' + v.id + '" value="' + (valorActual || '') + '" ';
            html += 'min="' + v.min + '" max="' + v.max + '" step="' + (v.step || 1000000) + '" ';
            html += 'onchange="Decisiones.guardarVariable(\'' + v.id + '\')" ';
            html += 'style="text-align:right;font-size:0.9rem">';
          } else if (v.tipo === 'selector') {
            html += '<select class="form-input" id="dec-' + v.id + '" onchange="Decisiones.guardarVariable(\'' + v.id + '\')">';
            html += '<option value="">Seleccionar</option>';
            v.opciones.forEach(function(op) {
              html += '<option value="' + op.valor + '"' + (valorActual == op.valor ? ' selected' : '') + '>' + op.texto + '</option>';
            });
            html += '</select>';
          }

          html += '</div>';
          html += '<div id="estado-' + v.id + '" class="text-xs" style="width:60px;text-align:center"></div>';
          html += '</div>';
        });

        html += '</div>';
      }

      html += '</div>';
    }

    // Botón de envío definitivo (solo Gerente General)
    html += '<hr class="separador">';
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
   * Guarda una variable individual.
   * @param {string} variableId
   */
  async function guardarVariable(variableId) {
    const input = document.getElementById('dec-' + variableId);
    const estadoDiv = document.getElementById('estado-' + variableId);
    const valor = input.value;

    // Obtener el módulo de la variable desde el cache
    var varDef = variablesCache_[variableId];
    var modulo = varDef ? varDef.modulo : 'marketing';

    estadoDiv.innerHTML = '<div class="spinner" style="width:14px;height:14px"></div>';

    const resp = await API.guardarDecision({
      modulo: modulo,
      variable: variableId,
      valor: valor
    });

    if (resp.ok) {
      estadoDiv.innerHTML = '<span style="color:var(--success)">&#10003;</span>';
      if (resp.data.presupuesto) actualizarPresupuesto_(resp.data.presupuesto);
    } else {
      estadoDiv.innerHTML = '<span style="color:var(--error)">&#10007;</span>';
      document.getElementById('mensaje-sala').innerHTML = '<span class="text-sm" style="color:var(--error)">' + resp.error + '</span>';
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
      badge.textContent = 'Gastado: ' + FrontUtils.moneda(presup.gastado);
    }
  }

  // ══════════════════════════════════════════════════
  // CATÁLOGO DE VARIABLES POR MÓDULO
  // ══════════════════════════════════════════════════
  //
  // Los IDs de las variables coinciden con lo que Proceso.gs
  // lee como dec['modulo.variable']. El módulo se envía aparte.
  //
  // TODO: cargar desde la planilla Motor de la industria.
  // ══════════════════════════════════════════════════

  function obtenerVariables_(modulosActivos) {
    var todas = [];

    if (modulosActivos.indexOf('marketing') >= 0) {
      todas = todas.concat(variablesMarketing_());
    }
    if (modulosActivos.indexOf('logistica') >= 0) {
      todas = todas.concat(variablesLogistica_());
    }
    if (modulosActivos.indexOf('rrhh') >= 0) {
      todas = todas.concat(variablesRRHH_());
    }
    if (modulosActivos.indexOf('finanzas') >= 0) {
      todas = todas.concat(variablesFinanzas_());
    }

    return todas;
  }

  /**
   * Variables de Marketing nivel avanzado.
   * Proceso.gs lee: marketing.precio, marketing.publicidad, marketing.calidad
   */
  function variablesMarketing_() {
    return [
      // Precio
      { id: 'precio', nombre: 'Precio de venta unitario', descripcion: '±30% del precio referencia de la industria', tipo: 'numerico', min: 0, max: 999999999, step: 100, categoria: 'Precio', modulo: 'marketing' },

      // Canales de distribución
      { id: 'inv_canal_masivo', nombre: 'Inv. canal distribución masivo', descripcion: '$0 a $200M', tipo: 'numerico', min: 0, max: 200000000, step: 1000000, categoria: 'Canales de distribución', modulo: 'marketing' },
      { id: 'inv_canal_especializado', nombre: 'Inv. canal especializado', descripcion: '$0 a $200M', tipo: 'numerico', min: 0, max: 200000000, step: 1000000, categoria: 'Canales de distribución', modulo: 'marketing' },
      { id: 'inv_canal_institucional', nombre: 'Inv. canal profesional/institucional', descripcion: '$0 a $120M', tipo: 'numerico', min: 0, max: 120000000, step: 1000000, categoria: 'Canales de distribución', modulo: 'marketing' },
      { id: 'inv_canal_ecommerce', nombre: 'Inv. canal e-commerce', descripcion: '$0 a $150M', tipo: 'numerico', min: 0, max: 150000000, step: 1000000, categoria: 'Canales de distribución', modulo: 'marketing' },
      { id: 'inv_canal_mayorista', nombre: 'Inv. canal mayorista/distribución', descripcion: '$0 a $120M', tipo: 'numerico', min: 0, max: 120000000, step: 1000000, categoria: 'Canales de distribución', modulo: 'marketing' },

      // Comunicación (publicidad se suma internamente para el motor)
      { id: 'publicidad', nombre: 'Publicidad total (medios + digital)', descripcion: 'Monto total de inversión publicitaria', tipo: 'numerico', min: 0, max: 360000000, step: 1000000, categoria: 'Comunicación', modulo: 'marketing' },
      { id: 'promociones', nombre: 'Promociones y activaciones', descripcion: '$0 a $150M', tipo: 'numerico', min: 0, max: 150000000, step: 1000000, categoria: 'Comunicación', modulo: 'marketing' },
      { id: 'ferias_eventos', nombre: 'Ferias y eventos', descripcion: '$0 a $100M', tipo: 'numerico', min: 0, max: 100000000, step: 1000000, categoria: 'Comunicación', modulo: 'marketing' },

      // Producto
      { id: 'calidad', nombre: 'Inversión en calidad de producto', descripcion: 'I+D, packaging, posicionamiento', tipo: 'numerico', min: 0, max: 320000000, step: 1000000, categoria: 'Producto', modulo: 'marketing' },

      // Fuerza de ventas
      { id: 'capacitacion_fdv', nombre: 'Capacitación fuerza de ventas', descripcion: '$0 a $80M', tipo: 'numerico', min: 0, max: 80000000, step: 1000000, categoria: 'Fuerza de ventas', modulo: 'marketing' },
      { id: 'incentivos_comisiones', nombre: 'Incentivos y comisiones', descripcion: '$0 a $100M', tipo: 'numerico', min: 0, max: 100000000, step: 1000000, categoria: 'Fuerza de ventas', modulo: 'marketing' },
      { id: 'capacitacion_canal', nombre: 'Capacitación técnica canal', descripcion: '$0 a $80M', tipo: 'numerico', min: 0, max: 80000000, step: 1000000, categoria: 'Fuerza de ventas', modulo: 'marketing' },

      // Servicio
      { id: 'fidelizacion', nombre: 'Programas de fidelización', descripcion: '$0 a $100M', tipo: 'numerico', min: 0, max: 100000000, step: 1000000, categoria: 'Servicio', modulo: 'marketing' },
      { id: 'postventa', nombre: 'Servicio postventa', descripcion: '$0 a $80M', tipo: 'numerico', min: 0, max: 80000000, step: 1000000, categoria: 'Servicio', modulo: 'marketing' },
      { id: 'merchandising', nombre: 'Merchandising y ejecución', descripcion: '$0 a $80M', tipo: 'numerico', min: 0, max: 80000000, step: 1000000, categoria: 'Servicio', modulo: 'marketing' },
      { id: 'cobertura_territorial', nombre: 'Cobertura territorial', descripcion: '$0 a $60M', tipo: 'numerico', min: 0, max: 60000000, step: 1000000, categoria: 'Servicio', modulo: 'marketing' },
      { id: 'rebajas_condiciones', nombre: 'Rebajas y condiciones comerciales', descripcion: '$0 a $150M', tipo: 'numerico', min: 0, max: 150000000, step: 1000000, categoria: 'Servicio', modulo: 'marketing' },
    ];
  }

  /**
   * Variables de Logística.
   * Proceso.gs lee: logistica.inversion
   */
  function variablesLogistica_() {
    return [
      { id: 'inversion', nombre: 'Inversión en eficiencia operacional', descripcion: 'Reduce el costo unitario hasta un 15%', tipo: 'numerico', min: 0, max: 10000000, step: 500000, categoria: 'Eficiencia operacional', modulo: 'logistica' },
      { id: 'transporte', nombre: 'Inversión en transporte y distribución', descripcion: '$0 a $80M', tipo: 'numerico', min: 0, max: 80000000, step: 1000000, categoria: 'Distribución', modulo: 'logistica' },
      { id: 'almacenamiento', nombre: 'Inversión en almacenamiento', descripcion: '$0 a $60M', tipo: 'numerico', min: 0, max: 60000000, step: 1000000, categoria: 'Distribución', modulo: 'logistica' },
      { id: 'tecnologia_scm', nombre: 'Tecnología supply chain', descripcion: '$0 a $50M', tipo: 'numerico', min: 0, max: 50000000, step: 1000000, categoria: 'Tecnología', modulo: 'logistica' },
    ];
  }

  /**
   * Variables de Recursos Humanos.
   * Proceso.gs lee: rrhh.capacitacion, rrhh.bonos
   */
  function variablesRRHH_() {
    return [
      { id: 'capacitacion', nombre: 'Inversión en capacitación', descripcion: 'Formación y desarrollo del equipo', tipo: 'numerico', min: 0, max: 80000000, step: 1000000, categoria: 'Desarrollo de personas', modulo: 'rrhh' },
      { id: 'bonos', nombre: 'Bonos e incentivos al personal', descripcion: 'Bonos de desempeño y retención', tipo: 'numerico', min: 0, max: 100000000, step: 1000000, categoria: 'Compensaciones', modulo: 'rrhh' },
      { id: 'bienestar', nombre: 'Programas de bienestar', descripcion: '$0 a $40M', tipo: 'numerico', min: 0, max: 40000000, step: 1000000, categoria: 'Bienestar', modulo: 'rrhh' },
      { id: 'seleccion', nombre: 'Inversión en selección y contratación', descripcion: '$0 a $30M', tipo: 'numerico', min: 0, max: 30000000, step: 1000000, categoria: 'Dotación', modulo: 'rrhh' },
    ];
  }

  /**
   * Variables de Finanzas.
   * Proceso.gs aún no lee estas variables (se incorporan con el Motor).
   */
  function variablesFinanzas_() {
    return [
      { id: 'credito_cortoplazo', nombre: 'Crédito de corto plazo', descripcion: 'Línea de crédito para capital de trabajo', tipo: 'numerico', min: 0, max: 500000000, step: 5000000, categoria: 'Financiamiento', modulo: 'finanzas' },
      { id: 'credito_largoplazo', nombre: 'Crédito de largo plazo', descripcion: 'Crédito para inversión', tipo: 'numerico', min: 0, max: 1000000000, step: 10000000, categoria: 'Financiamiento', modulo: 'finanzas' },
      { id: 'inv_deposito', nombre: 'Inversión en depósito a plazo', descripcion: 'Excedentes de caja', tipo: 'numerico', min: 0, max: 500000000, step: 5000000, categoria: 'Inversión', modulo: 'finanzas' },
      { id: 'politica_cobro', nombre: 'Plazo de cobro a clientes (días)', descripcion: '15 a 120 días', tipo: 'numerico', min: 15, max: 120, step: 1, categoria: 'Gestión de capital de trabajo', modulo: 'finanzas' },
      { id: 'politica_pago', nombre: 'Plazo de pago a proveedores (días)', descripcion: '30 a 90 días', tipo: 'numerico', min: 30, max: 90, step: 1, categoria: 'Gestión de capital de trabajo', modulo: 'finanzas' },
    ];
  }

  return {
    render: render,
    guardarVariable: guardarVariable,
    enviarDefinitiva: enviarDefinitiva
  };

})();
