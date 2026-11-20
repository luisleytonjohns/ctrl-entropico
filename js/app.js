/**
 * CTRL ENTROPICO — app.js
 * Lógica principal de la aplicación del estudiante.
 * Gestiona navegación, carga de datos y renderizado de pantallas.
 */

const App = (function() {

  let perfil = null;
  let cursoId = null;

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
    const resp = await API.llamar('estadoInduccion');
    if (resp.ok && !resp.data.induccionCompleta) {
      renderInduccion(resp.data);
      return;
    }
    // Si la inducción está completa, mostrar dashboard
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
    html += '</div></div></div>';

    // Navegación por pestañas
    html += '<div class="flex gap-2 mb-3 flex-wrap">';
    html += '<button class="btn btn-secondary btn-sm" onclick="App.verDecisiones()">Sala de decisiones</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="App.verResultados()">Resultados</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="App.verRanking()">Ranking</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="App.verBitacora()">Bitácora</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="App.verMemorando()">Memorando</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="App.verInformes()">Informes de mercado</button>';
    html += '</div>';

    // Área de contenido dinámico
    html += '<div id="area-dinamica"></div>';

    contenido.innerHTML = html;

    // Cargar vista por defecto
    if (estado.salaAbierta) {
      verDecisiones();
    } else if (estado.periodoPublicado > 0) {
      verResultados();
    }
  }

  /**
   * Muestra la sala de decisiones.
   */
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

  /**
   * Muestra los resultados.
   */
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
    html += indicador('Puntaje', d.resultado.puntaje + '/100', d.variaciones ? d.variaciones.puntaje : null);
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
        html += '<tr><td>' + t.periodo + '</td><td>' + Utils.moneda(t.ingresos) + '</td><td>' + t.margen + '%</td><td>' + t.puntaje + '</td><td>' + t.nota.toFixed(1) + '</td></tr>';
      });
      html += '</tbody></table>';
    }

    html += '</div>';
    area.innerHTML = html;
  }

  /**
   * Muestra el ranking.
   */
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

  async function verInformes() {
    const area = document.getElementById('area-dinamica');
    area.innerHTML = '<div class="card"><div class="spinner"></div> Cargando informes...</div>';
    const resp = await API.llamar('misInformes');
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

  function renderInduccion(data) {
    const contenido = document.getElementById('app-contenido');
    let html = '<div class="card"><h2 class="text-navy mb-3">Lecturas obligatorias</h2>';
    html += '<p class="text-secondary mb-3">' + data.mensaje + '</p>';
    data.lecturas.forEach(function(l) {
      html += '<div class="flex items-center justify-between" style="padding:0.75rem 0;border-bottom:1px solid var(--border-light)">';
      html += '<div><strong>' + l.titulo + '</strong><br><span class="text-sm text-secondary">' + l.paginasCompletadas + '/' + l.paginasTotal + ' páginas</span></div>';
      html += l.completada ? '<span class="badge badge-green">Completada</span>' : '<a href="#" class="btn btn-sm btn-primary" onclick="App.abrirLectura(\'' + l.id + '\',' + (l.paginasCompletadas + 1) + ')">Continuar</a>';
      html += '</div>';
    });
    html += '</div>';
    contenido.innerHTML = html;
  }

  async function abrirLectura(id, pag) {
    const resp = await API.llamar('contenidoInduccion', { lecturaId: id, pagina: pag });
    if (!resp.ok) { alert(resp.error); return; }
    const d = resp.data;
    const contenido = document.getElementById('app-contenido');
    let html = '<div class="card"><h3 class="text-navy">' + d.titulo + '</h3>';
    html += '<p class="text-sm text-secondary mb-3">Página ' + d.pagina + ' de ' + d.totalPaginas + '</p>';
    html += '<div class="mb-3">' + d.contenido + '</div>';
    if (d.preguntaControl) {
      html += '<div class="card card-accent"><p class="font-semibold">' + d.preguntaControl.pregunta + '</p>';
      d.preguntaControl.opciones.forEach(function(op) {
        html += '<button class="btn btn-outline btn-sm mt-1" style="display:block;width:100%;text-align:left" onclick="App.responderControl(\'' + id + '\',' + d.pagina + ',\'' + op.replace(/'/g, "\\'") + '\')">' + op + '</button>';
      });
      html += '</div>';
    } else {
      html += '<button class="btn btn-primary" onclick="App.responderControl(\'' + id + '\',' + d.pagina + ',\'ok\')">Siguiente</button>';
    }
    html += '</div>';
    contenido.innerHTML = html;
  }

  async function responderControl(lecturaId, pagina, respuesta) {
    const resp = await API.llamar('registrarPaginaInduccion', { lecturaId: lecturaId, pagina: pagina, respuesta: respuesta });
    if (!resp.ok) { alert(resp.error); return; }
    if (resp.data.siguiente) {
      abrirLectura(lecturaId, resp.data.siguiente);
    } else {
      verificarInduccion();
    }
  }

  // Helper para tarjetas de indicadores
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
    verDecisiones: verDecisiones,
    verResultados: verResultados,
    verRanking: verRanking,
    verBitacora: verBitacora,
    guardarBitacora: guardarBitacora,
    enviarBitacoraDefinitiva: enviarBitacoraDefinitiva,
    verMemorando: verMemorando,
    guardarMemorando: guardarMemorando,
    enviarMemorandoDefinitivo: enviarMemorandoDefinitivo,
    verInformes: verInformes,
    comprarInforme: comprarInforme,
    abrirLectura: abrirLectura,
    responderControl: responderControl
  };

})();

// Utilidades del frontend
const Utils = {
  moneda: function(n) {
    if (!n || isNaN(n)) return '$0';
    return '$' + Math.round(Math.abs(n)).toLocaleString('es-CL');
  }
};
