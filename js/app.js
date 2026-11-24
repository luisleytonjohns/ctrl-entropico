/**
 * CTRL ENTROPICO — app.js
 * Lógica principal de la aplicación del estudiante.
 * Gestiona navegación, carga de datos y renderizado de pantallas.
 */

const App = (function() {

  let perfil = null;
  let cursoId = null;
  let countdownInterval = null;

  /**
   * Inicializa la aplicación con el perfil del usuario.
   * @param {Object} p - Perfil del usuario
   */
  function init(p) {
    perfil = p;
    cursoId = p.cursoId;

    // Verificar inducción completada
    verificarInduccion();
  }

  async function verificarInduccion() {
    const resp = await API.estadoInduccion();
    if (resp.ok && resp.data.activa && !resp.data.induccionCompleta) {
      renderInduccion(resp.data);
      return;
    }
    // Si la inducción está completa o no está activa, mostrar dashboard
    renderDashboard();
  }

  /**
   * Renderiza el dashboard principal del estudiante.
   */
  async function renderDashboard() {
    const contenido = document.getElementById('app-contenido');
    const estado = perfil.estadoSimulacion;
    const equipo = perfil.equipo;

    let html = '';

    // Si no tiene equipo, mostrar mensaje
    if (!equipo) {
      html = '<div class="card"><h2>Bienvenido a CTRL ENTROPICO</h2>';
      html += '<p class="text-secondary mt-2">Aún no perteneces a un equipo. Cuando el académico habilite la formación de equipos, podrás crear uno o unirte a uno existente.</p>';
      html += '<a href="equipos.html?curso=' + cursoId + '" class="btn btn-primary mt-2">Ir a formación de equipos</a></div>';
      contenido.innerHTML = html;
      return;
    }

    // Header con info del equipo
    html += '<div class="card card-accent mb-3">';
    html += '<div class="flex items-center justify-between">';
    html += '<div><h2 class="text-navy">' + equipo.nombreEmpresa + '</h2>';
    if (equipo.nombreProducto) html += '<p class="text-secondary">' + equipo.nombreProducto + '</p>';
    html += '</div>';
    html += '<div class="text-right"><span class="badge badge-navy">Período ' + estado.periodoActual + '/' + estado.totalPeriodos + '</span>';
    if (estado.salaAbierta) html += '<br><span class="badge badge-orange mt-1">Sala abierta</span>';
    html += '</div></div>';

    // Countdown de cierre programado
    html += '<div id="countdown-container"></div>';
    html += '</div>';

    // Navegación por pestañas
    html += '<div class="flex gap-2 mb-3 flex-wrap">';
    html += '<button class="btn btn-secondary btn-sm" onclick="App.verDecisiones()">Sala de decisiones</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="App.verResultados()">Resultados</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="App.verRanking()">Ranking</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="App.verCalificaciones()">Calificaciones</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="App.verMateriales()">Materiales</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="App.verBitacora()">Bitácora</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="App.verMemorando()">Memorando</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="App.verInformes()">Informes de mercado</button>';
    html += '</div>';

    // Área de contenido dinámico
    html += '<div id="area-dinamica"></div>';

    contenido.innerHTML = html;

    // Cargar countdown si hay cierre programado
    cargarCountdown_();

    // Cargar vista por defecto
    if (estado.salaAbierta) {
      verDecisiones();
    } else if (estado.periodoPublicado > 0) {
      verResultados();
    }
  }

  // ══════════════════════════════════════════════════
  // COUNTDOWN DE CIERRE PROGRAMADO
  // ══════════════════════════════════════════════════

  async function cargarCountdown_() {
    const container = document.getElementById('countdown-container');
    if (!container) return;

    const resp = await API.estadoCierre(cursoId);
    if (!resp.ok || !resp.data.activo || !resp.data.salaAbierta || !resp.data.proximoCierre) {
      container.innerHTML = '';
      return;
    }

    const fechaCierre = new Date(resp.data.proximoCierre);
    iniciarCountdown_(container, fechaCierre, resp.data.dia, resp.data.hora);
  }

  function iniciarCountdown_(container, fechaCierre, dia, hora) {
    if (countdownInterval) clearInterval(countdownInterval);

    function actualizar() {
      const ahora = new Date();
      const diff = fechaCierre.getTime() - ahora.getTime();

      if (diff <= 0) {
        container.innerHTML = '<div style="margin-top:12px;padding:12px 16px;background:rgba(232,96,10,0.12);border-radius:8px;text-align:center">' +
          '<span style="color:var(--orange);font-weight:600">La sala se cerró automáticamente</span></div>';
        clearInterval(countdownInterval);
        return;
      }

      const dias = Math.floor(diff / 86400000);
      const horas = Math.floor((diff % 86400000) / 3600000);
      const minutos = Math.floor((diff % 3600000) / 60000);
      const segundos = Math.floor((diff % 60000) / 1000);

      let textoTiempo = '';
      if (dias > 0) textoTiempo += dias + 'd ';
      textoTiempo += String(horas).padStart(2, '0') + ':' + String(minutos).padStart(2, '0') + ':' + String(segundos).padStart(2, '0');

      const urgente = diff < 3600000; // menos de 1 hora
      const colorFondo = urgente ? 'rgba(220,38,38,0.12)' : 'rgba(232,96,10,0.08)';
      const colorTexto = urgente ? '#DC2626' : 'var(--orange)';

      container.innerHTML = '<div style="margin-top:12px;padding:12px 16px;background:' + colorFondo + ';border-radius:8px;display:flex;align-items:center;justify-content:space-between">' +
        '<span style="font-size:0.85rem;color:var(--pizarra)">Cierre automático: ' + dia + ' ' + hora + '</span>' +
        '<span style="font-family:var(--disp);font-size:1.6rem;font-weight:700;color:' + colorTexto + ';letter-spacing:0.04em">' + textoTiempo + '</span>' +
        '</div>';
    }

    actualizar();
    countdownInterval = setInterval(actualizar, 1000);
  }

  // ══════════════════════════════════════════════════
  // SALA DE DECISIONES
  // ══════════════════════════════════════════════════

  async function verDecisiones() {
    const area = document.getElementById('area-dinamica');
    area.innerHTML = '<div class="card"><div class="spinner"></div> Cargando sala de decisiones...</div>';

    const resp = await API.misDecisiones();
    if (!resp.ok) {
      area.innerHTML = '<div class="alerta alerta-error">' + resp.error + '</div>';
      return;
    }

    Decisiones.render(area, resp.data, perfil);
  }

  // ══════════════════════════════════════════════════
  // RESULTADOS
  // ══════════════════════════════════════════════════

  async function verResultados() {
    const area = document.getElementById('area-dinamica');
    area.innerHTML = '<div class="card"><div class="spinner"></div> Cargando resultados...</div>';

    const resp = await API.misResultados();
    if (!resp.ok) {
      area.innerHTML = '<div class="alerta alerta-info">' + (resp.error || 'No hay resultados publicados aún.') + '</div>';
      return;
    }

    const d = resp.data;
    let html = '<div class="card">';
    html += '<h3 class="text-navy mb-3">Resultados del período ' + d.periodo + '</h3>';

    // Indicadores principales
    html += '<div class="flex gap-3 flex-wrap mb-3">';
    html += indicador('Ingresos', d.formateado.ingresos, d.variaciones ? d.variaciones.ingresos : null);
    html += indicador('Margen bruto', d.formateado.margenPct, d.variaciones ? d.variaciones.margenBruto : null);
    html += indicador('Resultado op.', d.formateado.resultadoOp, d.variaciones ? d.variaciones.resultadoOperacional : null);
    html += indicador('Puntaje', d.resultado.puntaje + '/1000', d.variaciones ? d.variaciones.puntaje : null);
    html += indicador('Nota', d.resultado.nota.toFixed(1), null);
    html += '</div>';

    // Eventos del período
    if (d.eventos && d.eventos.length > 0) {
      html += '<div class="alerta alerta-aviso mb-3"><strong>Eventos del período:</strong><br>';
      d.eventos.forEach(function(ev) { html += ev.titulo + ': ' + ev.descripcion + '<br>'; });
      html += '</div>';
    }

    // Tendencia
    if (d.tendencias && d.tendencias.length > 1) {
      html += '<h4 class="text-navy mt-3 mb-2">Tendencia</h4>';
      html += '<table class="tabla"><thead><tr><th>Período</th><th>Ingresos</th><th>Margen</th><th>Puntaje</th><th>Nota</th></tr></thead><tbody>';
      d.tendencias.forEach(function(t) {
        html += '<tr><td>' + t.periodo + '</td><td>' + FrontUtils.moneda(t.ingresos) + '</td><td>' + t.margen + '%</td><td>' + t.puntaje + '</td><td>' + t.nota.toFixed(1) + '</td></tr>';
      });
      html += '</tbody></table>';
    }

    html += '</div>';
    area.innerHTML = html;
  }

  // ══════════════════════════════════════════════════
  // RANKING
  // ══════════════════════════════════════════════════

  async function verRanking() {
    const area = document.getElementById('area-dinamica');
    area.innerHTML = '<div class="card"><div class="spinner"></div> Cargando ranking...</div>';

    const resp = await API.ranking();
    if (!resp.ok) {
      area.innerHTML = '<div class="alerta alerta-info">' + (resp.error || 'No hay ranking disponible.') + '</div>';
      return;
    }

    const d = resp.data;
    let html = '<div class="card">';
    html += '<h3 class="text-navy mb-3">Ranking — Período ' + d.periodo + '</h3>';

    html += '<table class="tabla"><thead><tr><th>#</th><th>Empresa</th><th>Puntaje</th><th>Nota</th></tr></thead><tbody>';
    d.ranking.forEach(function(r) {
      const esMio = perfil.equipo && r.empresa === perfil.equipo.nombreEmpresa;
      html += '<tr' + (esMio ? ' style="background:rgba(232,96,10,0.08)"' : '') + '>';
      html += '<td><strong>' + r.posicion + '</strong></td>';
      html += '<td>' + r.empresa + (esMio ? ' <span class="badge badge-orange">Tú</span>' : '') + '</td>';
      html += '<td>' + r.puntaje + '</td>';
      html += '<td>' + r.nota.toFixed(1) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';

    // Acumulado
    if (d.acumulado && d.acumulado.length > 0) {
      html += '<h4 class="text-navy mt-4 mb-2">Ranking acumulado</h4>';
      html += '<table class="tabla"><thead><tr><th>#</th><th>Empresa</th><th>Puntaje prom.</th><th>Nota prom.</th></tr></thead><tbody>';
      d.acumulado.forEach(function(r) {
        html += '<tr><td>' + r.posicion + '</td><td>' + r.empresa + '</td><td>' + r.puntajePromedio + '</td><td>' + r.notaPromedio + '</td></tr>';
      });
      html += '</tbody></table>';
    }

    html += '</div>';
    area.innerHTML = html;
  }

  // ══════════════════════════════════════════════════
  // CALIFICACIONES
  // ══════════════════════════════════════════════════

  async function verCalificaciones() {
    const area = document.getElementById('area-dinamica');
    area.innerHTML = '<div class="card"><div class="spinner"></div> Cargando calificaciones...</div>';

    const resp = await API.misCalificaciones();
    if (!resp.ok) {
      area.innerHTML = '<div class="alerta alerta-info">' + (resp.error || 'No hay calificaciones disponibles.') + '</div>';
      return;
    }

    const d = resp.data;
    let html = '<div class="card">';
    html += '<h3 class="text-navy mb-3">Mis calificaciones</h3>';

    // Nota acumulada destacada
    html += '<div style="text-align:center;padding:20px 0;margin-bottom:20px;border-bottom:1px solid var(--border-light)">';
    html += '<p class="text-sm text-secondary">Nota acumulada</p>';
    html += '<p style="font-family:var(--disp);font-size:3rem;font-weight:700;color:var(--navy)">' + d.notaAcumulada.toFixed(1) + '</p>';
    html += '<p class="text-sm text-secondary">' + d.momentosEvaluados + ' de ' + d.totalMomentos + ' momentos evaluativos</p>';
    html += '</div>';

    // Pesos de evaluación
    html += '<div class="flex gap-2 flex-wrap mb-3" style="font-size:0.8rem;color:var(--pizarra)">';
    html += '<span>Simulador ' + Math.round(d.configuracion.pesoSimulador * 100) + '%</span>';
    html += '<span>·</span>';
    html += '<span>Académico ' + Math.round(d.configuracion.pesoAcademico * 100) + '%</span>';
    html += '<span>·</span>';
    html += '<span>Pares ' + Math.round(d.configuracion.pesoPares * 100) + '%</span>';
    html += '<span>·</span>';
    html += '<span>Auto ' + Math.round(d.configuracion.pesoAuto * 100) + '%</span>';
    html += '</div>';

    // Tabla de notas por momento
    if (d.calificaciones.length > 0) {
      html += '<table class="tabla"><thead><tr><th>Momento</th><th>Hasta período</th><th>Simulador</th><th>Académico</th><th>Pares</th><th>Auto</th><th>Final</th></tr></thead><tbody>';
      d.calificaciones.forEach(function(c) {
        html += '<tr>';
        html += '<td>' + c.momentoEvaluativo + '</td>';
        html += '<td>' + c.periodoHasta + '</td>';
        html += '<td>' + c.notaSimulador.toFixed(1) + '</td>';
        html += '<td>' + c.notaAcademico.toFixed(1) + '</td>';
        html += '<td>' + c.notaPares.toFixed(1) + '</td>';
        html += '<td>' + c.notaAuto.toFixed(1) + '</td>';
        html += '<td><strong>' + c.notaFinal.toFixed(1) + '</strong></td>';
        html += '</tr>';
      });
      html += '</tbody></table>';
    } else {
      html += '<p class="text-secondary">Aún no hay momentos evaluativos cerrados.</p>';
    }

    // Próximo momento
    if (d.proximoMomento) {
      html += '<div class="alerta alerta-info mt-3">Próximo momento evaluativo: período ' + d.proximoMomento + ' (actualmente en período ' + d.periodoActual + ')</div>';
    }

    html += '</div>';
    area.innerHTML = html;
  }

  // ══════════════════════════════════════════════════
  // MATERIALES
  // ══════════════════════════════════════════════════

  async function verMateriales() {
    const area = document.getElementById('area-dinamica');
    area.innerHTML = '<div class="card"><div class="spinner"></div> Cargando materiales...</div>';

    const resp = await API.listarMateriales('todos');
    if (!resp.ok) {
      area.innerHTML = '<div class="alerta alerta-error">' + resp.error + '</div>';
      return;
    }

    const materiales = resp.data.materiales;
    if (materiales.length === 0) {
      area.innerHTML = '<div class="alerta alerta-info">No hay materiales disponibles en este curso.</div>';
      return;
    }

    let html = '<div class="card">';
    html += '<h3 class="text-navy mb-3">Materiales del curso</h3>';

    materiales.forEach(function(m) {
      html += '<div class="flex items-center justify-between" style="padding:0.75rem 0;border-bottom:1px solid var(--border-light)">';
      html += '<div style="flex:1"><strong>' + m.titulo + '</strong>';
      if (m.descripcion) html += '<br><span class="text-sm text-secondary">' + m.descripcion + '</span>';
      html += '<br><span class="text-xs text-secondary">' + m.totalPaginas + ' páginas · ' + m.fase + (m.obligatorio ? ' · Obligatorio' : '') + '</span>';
      html += '</div>';

      // Avance
      html += '<div style="text-align:right;min-width:100px">';
      if (m.avance.controlAprobado) {
        html += '<span class="badge badge-green">Completado</span>';
      } else if (m.avance.porcentaje > 0) {
        html += '<span class="text-sm text-secondary">' + m.avance.paginasLeidas + '/' + m.totalPaginas + '</span>';
        html += '<div style="height:4px;background:#E2E5EA;border-radius:2px;margin-top:4px"><div style="height:100%;background:var(--orange);border-radius:2px;width:' + m.avance.porcentaje + '%"></div></div>';
      }
      html += ' <button class="btn btn-sm btn-outline" onclick="App.descargarMaterial(\'' + m.id + '\')" title="Descargar PDF" style="margin-left:6px">&#9660;</button>';
      html += '</div>';
      html += '</div>';
    });

    html += '</div>';
    area.innerHTML = html;
  }

  async function descargarMaterial(materialId) {
    const resp = await API.descargarMaterial(materialId);
    if (!resp.ok) { alert(resp.error); return; }
    window.open(resp.data.urlDescarga, '_blank');
  }

  // ══════════════════════════════════════════════════
  // BITÁCORA
  // ══════════════════════════════════════════════════

  async function verBitacora() {
    const area = document.getElementById('area-dinamica');
    const resp = await API.llamar('obtenerBitacora');
    if (!resp.ok) {
      area.innerHTML = '<div class="alerta alerta-info">' + resp.error + '</div>';
      return;
    }
    const b = resp.data.bitacora;
    let html = '<div class="card"><h3 class="text-navy mb-3">Bitácora — Período ' + resp.data.periodo + '</h3>';
    ['analisis', 'opciones', 'justificacion', 'uso_informacion'].forEach(function(sec) {
      const label = { analisis: 'Análisis de la situación', opciones: 'Opciones consideradas', justificacion: 'Justificación de decisiones', uso_informacion: 'Uso de información' }[sec];
      html += '<div class="form-grupo"><label class="form-label">' + label + '</label>';
      html += '<textarea class="form-input" id="bit-' + sec + '" rows="4">' + (b[sec] || '') + '</textarea></div>';
    });
    html += '<button class="btn btn-primary" onclick="App.guardarBitacora()">Guardar bitácora</button>';
    if (perfil.rol === 'gerente_general') html += ' <button class="btn btn-secondary" onclick="App.enviarBitacoraDefinitiva()">Enviar definitiva</button>';
    html += '</div>';
    area.innerHTML = html;
  }

  async function guardarBitacora() {
    const secciones = ['analisis', 'opciones', 'justificacion', 'uso_informacion'];
    for (const sec of secciones) {
      await API.llamar('guardarBitacora', { seccion: sec, contenido: document.getElementById('bit-' + sec).value });
    }
    alert('Bitácora guardada.');
  }

  async function enviarBitacoraDefinitiva() {
    await API.llamar('enviarBitacoraDefinitiva');
    alert('Bitácora enviada como definitiva.');
  }

  // ══════════════════════════════════════════════════
  // MEMORANDO
  // ══════════════════════════════════════════════════

  async function verMemorando() {
    const area = document.getElementById('area-dinamica');
    const resp = await API.llamar('obtenerMemorando');
    if (!resp.ok) { area.innerHTML = '<div class="alerta alerta-info">' + resp.error + '</div>'; return; }
    const m = resp.data.memorando;
    let html = '<div class="card"><h3 class="text-navy mb-3">Memorando ejecutivo — Período ' + resp.data.periodo + '</h3>';
    ['resumenEjecutivo', 'justificacion', 'proyecciones', 'riesgos'].forEach(function(sec) {
      const label = { resumenEjecutivo: 'Resumen ejecutivo', justificacion: 'Justificación de decisiones', proyecciones: 'Proyecciones', riesgos: 'Riesgos identificados' }[sec];
      html += '<div class="form-grupo"><label class="form-label">' + label + '</label>';
      html += '<textarea class="form-input" id="memo-' + sec + '" rows="4">' + (m[sec] || '') + '</textarea></div>';
    });
    html += '<button class="btn btn-primary" onclick="App.guardarMemorando()">Guardar</button>';
    if (perfil.rol === 'gerente_general') html += ' <button class="btn btn-secondary" onclick="App.enviarMemorandoDefinitivo()">Enviar definitivo</button>';
    html += '</div>';
    area.innerHTML = html;
  }

  async function guardarMemorando() {
    await API.llamar('guardarMemorando', {
      resumenEjecutivo: document.getElementById('memo-resumenEjecutivo').value,
      justificacion: document.getElementById('memo-justificacion').value,
      proyecciones: document.getElementById('memo-proyecciones').value,
      riesgos: document.getElementById('memo-riesgos').value
    });
    alert('Memorando guardado.');
  }

  async function enviarMemorandoDefinitivo() {
    await API.llamar('enviarMemorandoDefinitivo');
    alert('Memorando enviado como definitivo.');
  }

  // ══════════════════════════════════════════════════
  // INFORMES DE MERCADO
  // ══════════════════════════════════════════════════

  async function verInformes() {
    const area = document.getElementById('area-dinamica');
    area.innerHTML = '<div class="card"><div class="spinner"></div> Cargando informes...</div>';
    const resp = await API.misInformes();
    if (!resp.ok) { area.innerHTML = '<div class="alerta alerta-error">' + resp.error + '</div>'; return; }

    let html = '<div class="card"><h3 class="text-navy mb-3">Informes de mercado</h3>';
    html += '<table class="tabla"><thead><tr><th>Informe</th><th>Costo</th><th></th></tr></thead><tbody>';
    resp.data.informes.forEach(function(inf) {
      html += '<tr><td><strong>' + inf.nombre + '</strong><br><span class="text-sm text-secondary">' + inf.descripcion + '</span></td>';
      html += '<td>' + inf.costoFormateado + '</td>';
      html += '<td>' + (inf.comprado ? '<span class="badge badge-green">Comprado</span>' : '<button class="btn btn-sm btn-primary" onclick="App.comprarInforme(\'' + inf.id + '\')">Comprar</button>') + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    area.innerHTML = html;
  }

  async function comprarInforme(id) {
    if (!confirm('¿Confirmas la compra de este informe?')) return;
    const resp = await API.comprarInforme(id);
    if (!resp.ok) { alert(resp.error); return; }
    alert(resp.data.mensaje);
    verInformes();
  }

  // ══════════════════════════════════════════════════
  // INDUCCIÓN
  // ══════════════════════════════════════════════════

  function renderInduccion(data) {
    const contenido = document.getElementById('app-contenido');
    let html = '<div class="card"><h2 class="text-navy mb-3">Fase de inducción</h2>';

    // Avance global
    html += '<div style="margin-bottom:16px">';
    html += '<div class="flex items-center justify-between mb-1"><span class="text-sm">Avance global</span><span class="text-sm font-semibold">' + data.avanceGlobal + '%</span></div>';
    html += '<div style="height:8px;background:#E2E5EA;border-radius:4px"><div style="height:100%;background:var(--turquesa);border-radius:4px;width:' + data.avanceGlobal + '%;transition:width 0.3s"></div></div>';
    html += '<p class="text-xs text-secondary mt-1">' + data.materialesCompletados + ' de ' + data.totalMateriales + ' materiales completados</p>';
    html += '</div>';

    // Lista de materiales
    data.detalle.forEach(function(m) {
      html += '<div class="flex items-center justify-between" style="padding:0.75rem 0;border-bottom:1px solid var(--border-light)">';
      html += '<div style="flex:1"><strong>' + m.titulo + '</strong>';
      html += '<br><span class="text-sm text-secondary">' + m.paginasLeidas + '/' + m.totalPaginas + ' páginas';
      if (m.notaControl > 0) html += ' · Control: ' + m.notaControl.toFixed(1);
      html += '</span></div>';

      if (m.controlAprobado) {
        html += '<span class="badge badge-green">Aprobado</span>';
      } else if (m.porcentaje >= 100) {
        html += '<button class="btn btn-sm btn-primary" onclick="App.iniciarControl(\'' + m.materialId + '\')">Responder control</button>';
      } else if (m.paginasLeidas > 0) {
        html += '<button class="btn btn-sm btn-outline" onclick="App.abrirLectura(\'' + m.materialId + '\',' + (m.paginasLeidas + 1) + ')">Continuar</button>';
      } else {
        html += '<button class="btn btn-sm btn-outline" onclick="App.abrirLectura(\'' + m.materialId + '\',1)">Comenzar</button>';
      }
      html += '</div>';
    });

    html += '</div>';
    contenido.innerHTML = html;
  }

  async function abrirLectura(materialId, pagina) {
    const resp = await API.contenidoLectura(materialId);
    if (!resp.ok) { alert(resp.error); return; }

    const mat = resp.data.material;
    const avance = resp.data.avance;
    const contenido = document.getElementById('app-contenido');

    let html = '<div class="card">';
    html += '<div class="flex items-center justify-between mb-3">';
    html += '<h3 class="text-navy">' + mat.titulo + '</h3>';
    html += '<button class="btn btn-sm btn-outline" onclick="App.verificarInduccion()">Volver</button>';
    html += '</div>';
    html += '<p class="text-sm text-secondary mb-3">Página ' + pagina + ' de ' + mat.totalPaginas + '</p>';

    // Barra de progreso
    var pct = Math.round((pagina / mat.totalPaginas) * 100);
    html += '<div style="height:4px;background:#E2E5EA;border-radius:2px;margin-bottom:16px"><div style="height:100%;background:var(--turquesa);border-radius:2px;width:' + pct + '%"></div></div>';

    // Contenido del material (embebido desde Drive)
    if (mat.archivoId) {
      html += '<iframe src="https://drive.google.com/file/d/' + mat.archivoId + '/preview" style="width:100%;height:600px;border:1px solid var(--border-light);border-radius:8px" allowfullscreen></iframe>';
    } else {
      html += '<div class="alerta alerta-info">El contenido de este material se cargará próximamente.</div>';
    }

    // Navegación de páginas
    html += '<div class="flex items-center justify-between mt-3">';
    if (pagina > 1) {
      html += '<button class="btn btn-outline" onclick="App.navegarPagina(\'' + materialId + '\',' + (pagina - 1) + ')">Anterior</button>';
    } else {
      html += '<div></div>';
    }
    if (pagina < mat.totalPaginas) {
      html += '<button class="btn btn-primary" onclick="App.navegarPagina(\'' + materialId + '\',' + (pagina + 1) + ')">Siguiente</button>';
    } else {
      html += '<button class="btn btn-primary" onclick="App.iniciarControl(\'' + materialId + '\')">Ir al control de lectura</button>';
    }
    html += '</div>';

    html += '</div>';
    contenido.innerHTML = html;

    // Registrar avance de página
    API.registrarPagina(materialId, pagina);
  }

  function navegarPagina(materialId, pagina) {
    abrirLectura(materialId, pagina);
  }

  async function iniciarControl(materialId) {
    // Por ahora, enviar respuestas placeholder (el backend acepta todo en MVP)
    const respuestas = [{ preguntaId: 'q1', respuesta: 'ok' }];
    const resp = await API.responderControl(materialId, respuestas);
    if (!resp.ok) { alert(resp.error); return; }

    if (resp.data.aprobado) {
      alert(resp.data.mensaje);
    } else {
      alert(resp.data.mensaje);
    }
    verificarInduccion();
  }

  // ══════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════

  function indicador(label, valor, variacion) {
    let varHtml = '';
    if (variacion !== null && variacion !== undefined) {
      const color = variacion > 0 ? 'var(--success)' : (variacion < 0 ? 'var(--error)' : 'var(--text-light)');
      const signo = variacion > 0 ? '+' : '';
      varHtml = '<span style="font-size:0.8rem;color:' + color + '">' + signo + variacion + '%</span>';
    }
    return '<div class="card" style="flex:1;min-width:140px;text-align:center;padding:1rem">' +
      '<p class="text-sm text-secondary">' + label + '</p>' +
      '<p class="font-bold text-lg text-navy">' + valor + '</p>' +
      varHtml + '</div>';
  }

  return {
    init: init,
    verificarInduccion: verificarInduccion,
    verDecisiones: verDecisiones,
    verResultados: verResultados,
    verRanking: verRanking,
    verCalificaciones: verCalificaciones,
    verMateriales: verMateriales,
    descargarMaterial: descargarMaterial,
    verBitacora: verBitacora,
    guardarBitacora: guardarBitacora,
    enviarBitacoraDefinitiva: enviarBitacoraDefinitiva,
    verMemorando: verMemorando,
    guardarMemorando: guardarMemorando,
    enviarMemorandoDefinitivo: enviarMemorandoDefinitivo,
    verInformes: verInformes,
    comprarInforme: comprarInforme,
    abrirLectura: abrirLectura,
    navegarPagina: navegarPagina,
    iniciarControl: iniciarControl
  };

})();

// Utilidades del frontend (renombrado para no colisionar con Utils.gs)
const FrontUtils = {
  moneda: function(n) {
    if (!n || isNaN(n)) return '$0';
    const neg = n < 0;
    return (neg ? '-$' : '$') + Math.round(Math.abs(n)).toLocaleString('es-CL');
  }
};
