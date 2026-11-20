/**
 * CTRL ENTROPICO — decisiones.js
 * Sala de decisiones del estudiante.
 * Renderiza las variables por módulo y subgerencia,
 * con validación de presupuesto en tiempo real.
 */

const Decisiones = (function() {

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

    // Variables de decisión agrupadas por categoría
    // TODO: cargar desde el catálogo de la industria
    const variables = obtenerVariablesMkt_();

    // Agrupar por categoría
    const categorias = {};
    variables.forEach(function(v) {
      if (!categorias[v.categoria]) categorias[v.categoria] = [];
      categorias[v.categoria].push(v);
    });

    for (const cat in categorias) {
      html += '<div class="mb-3">';
      html += '<h4 class="text-blue mb-2" style="border-bottom:2px solid var(--border-light);padding-bottom:0.5rem">' + cat + '</h4>';

      categorias[cat].forEach(function(v) {
        const valorActual = data.decisiones.marketing ? (data.decisiones.marketing[v.id] || {}).valor : '';
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

    estadoDiv.innerHTML = '<div class="spinner" style="width:14px;height:14px"></div>';

    const resp = await API.guardarDecision({
      modulo: 'marketing',
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
      badge.textContent = 'Presupuesto: ' + Utils.moneda(presup.gastado) + ' / ' + Utils.moneda(presup.asignado) + ' (' + pct + '%)';
    } else {
      badge.textContent = 'Gastado: ' + Utils.moneda(presup.gastado);
    }
  }

  /**
   * Variables de Marketing nivel avanzado (22 decisiones).
   * TODO: cargar desde la planilla Motor de la industria.
   */
  function obtenerVariablesMkt_() {
    return [
      { id: 'precio_venta', nombre: 'Precio de venta unitario', descripcion: '±30% del precio referencia', tipo: 'numerico', min: 0, max: 999999999, step: 1000, categoria: 'Precio' },
      { id: 'inv_canal_masivo', nombre: 'Inv. canal distribución masivo', descripcion: '$0 a $200M', tipo: 'numerico', min: 0, max: 200000000, step: 1000000, categoria: 'Canales de distribución' },
      { id: 'inv_canal_especializado', nombre: 'Inv. canal especializado', descripcion: '$0 a $200M', tipo: 'numerico', min: 0, max: 200000000, step: 1000000, categoria: 'Canales de distribución' },
      { id: 'inv_canal_institucional', nombre: 'Inv. canal profesional/institucional', descripcion: '$0 a $120M', tipo: 'numerico', min: 0, max: 120000000, step: 1000000, categoria: 'Canales de distribución' },
      { id: 'inv_canal_ecommerce', nombre: 'Inv. canal e-commerce', descripcion: '$0 a $150M', tipo: 'numerico', min: 0, max: 150000000, step: 1000000, categoria: 'Canales de distribución' },
      { id: 'inv_canal_mayorista', nombre: 'Inv. canal mayorista/distribución', descripcion: '$0 a $120M', tipo: 'numerico', min: 0, max: 120000000, step: 1000000, categoria: 'Canales de distribución' },
      { id: 'publicidad_tradicional', nombre: 'Publicidad medios tradicionales', descripcion: '$0 a $180M', tipo: 'numerico', min: 0, max: 180000000, step: 1000000, categoria: 'Comunicación' },
      { id: 'publicidad_digital', nombre: 'Publicidad digital y redes', descripcion: '$0 a $180M', tipo: 'numerico', min: 0, max: 180000000, step: 1000000, categoria: 'Comunicación' },
      { id: 'promociones', nombre: 'Promociones y activaciones', descripcion: '$0 a $150M', tipo: 'numerico', min: 0, max: 150000000, step: 1000000, categoria: 'Comunicación' },
      { id: 'ferias_eventos', nombre: 'Ferias y eventos', descripcion: '$0 a $100M', tipo: 'numerico', min: 0, max: 100000000, step: 1000000, categoria: 'Comunicación' },
      { id: 'innovacion_id', nombre: 'Innovación de producto (I+D)', descripcion: '$0 a $120M', tipo: 'numerico', min: 0, max: 120000000, step: 1000000, categoria: 'Producto' },
      { id: 'packaging', nombre: 'Packaging y presentación', descripcion: '$0 a $100M', tipo: 'numerico', min: 0, max: 100000000, step: 1000000, categoria: 'Producto' },
      { id: 'posicionamiento_relato', nombre: 'Posicionamiento y relato', descripcion: '$0 a $100M', tipo: 'numerico', min: 0, max: 100000000, step: 1000000, categoria: 'Producto' },
      { id: 'capacitacion_fdv', nombre: 'Capacitación fuerza de ventas', descripcion: '$0 a $80M', tipo: 'numerico', min: 0, max: 80000000, step: 1000000, categoria: 'Fuerza de ventas' },
      { id: 'incentivos_comisiones', nombre: 'Incentivos y comisiones', descripcion: '$0 a $100M', tipo: 'numerico', min: 0, max: 100000000, step: 1000000, categoria: 'Fuerza de ventas' },
      { id: 'capacitacion_canal', nombre: 'Capacitación técnica canal', descripcion: '$0 a $80M', tipo: 'numerico', min: 0, max: 80000000, step: 1000000, categoria: 'Fuerza de ventas' },
      { id: 'fidelizacion', nombre: 'Programas de fidelización', descripcion: '$0 a $100M', tipo: 'numerico', min: 0, max: 100000000, step: 1000000, categoria: 'Servicio' },
      { id: 'postventa', nombre: 'Servicio postventa', descripcion: '$0 a $80M', tipo: 'numerico', min: 0, max: 80000000, step: 1000000, categoria: 'Servicio' },
      { id: 'merchandising', nombre: 'Merchandising y ejecución', descripcion: '$0 a $80M', tipo: 'numerico', min: 0, max: 80000000, step: 1000000, categoria: 'Servicio' },
      { id: 'cobertura_territorial', nombre: 'Cobertura territorial', descripcion: '$0 a $60M', tipo: 'numerico', min: 0, max: 60000000, step: 1000000, categoria: 'Servicio' },
      { id: 'rebajas_condiciones', nombre: 'Rebajas y condiciones', descripcion: '$0 a $150M', tipo: 'numerico', min: 0, max: 150000000, step: 1000000, categoria: 'Servicio' },
    ];
  }

  return {
    render: render,
    guardarVariable: guardarVariable,
    enviarDefinitiva: enviarDefinitiva
  };

})();
