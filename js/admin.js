/**
 * CTRL ENTROPICO — admin.js
 * Lógica del panel del académico.
 */

const AdminApp = (function() {

  let cursos = [];
  let cursoActivo = null;

  async function init() {
    await verCursos();
  }

  // ══════════════════════════════════════════════════
  // LISTADO DE CURSOS
  // ══════════════════════════════════════════════════

  async function verCursos() {
    const div = document.getElementById('admin-contenido');
    div.innerHTML = '<div class="card"><div class="spinner"></div> Cargando cursos...</div>';

    const resp = await API.panelAcademico();
    if (!resp.ok) { div.innerHTML = '<div class="alerta alerta-error">' + resp.error + '</div>'; return; }

    cursos = resp.data.cursos;

    if (cursos.length === 0) {
      div.innerHTML = '<div class="card"><h2>Bienvenido a CTRL ENTROPICO</h2><p class="text-secondary mt-2">Aún no tienes cursos creados.</p><button class="btn btn-primary mt-2" onclick="AdminApp.formCrearCurso()">Crear primer curso</button></div>';
      return;
    }

    let html = '<div class="card"><h2 class="text-navy mb-3">Mis cursos</h2>';
    cursos.forEach(function(c) {
      html += '<div class="card card-accent mb-2" style="cursor:pointer" onclick="AdminApp.seleccionarCurso(\'' + c.id + '\')">';
      html += '<div class="flex items-center justify-between">';
      html += '<div><strong class="text-navy">' + c.nombre + '</strong>';
      html += '<br><span class="text-sm text-secondary">' + c.institucion.sigla + ' — ' + c.institucion.cursoNombre + '</span></div>';
      html += '<div class="text-right">';
      html += '<span class="badge badge-navy">' + c.totalEquipos + ' equipos</span> ';
      html += '<span class="badge badge-orange">' + c.totalEstudiantes + ' est.</span>';
      if (c.estudiantesSinEquipo > 0) html += ' <span class="badge badge-red">' + c.estudiantesSinEquipo + ' sin eq.</span>';
      html += '<br><span class="text-sm text-secondary">Período ' + c.estado.periodoActual + '/' + c.estado.totalPeriodos + ' — ' + c.estado.fase + '</span>';
      html += '</div></div></div>';
    });
    html += '<button class="btn btn-outline mt-2" onclick="AdminApp.formCrearCurso()">+ Crear curso nuevo</button>';
    html += '</div>';
    div.innerHTML = html;
  }

  function seleccionarCurso(id) {
    cursoActivo = cursos.filter(function(c) { return c.id === id; })[0];
    verSimulacion();
  }

  // ══════════════════════════════════════════════════
  // CONTROL DE SIMULACIÓN
  // ══════════════════════════════════════════════════

  async function verSimulacion() {
    if (!cursoActivo) { verCursos(); return; }
    const div = document.getElementById('admin-contenido');
    const e = cursoActivo.estado;

    let html = '<div class="card">';

    // Header con navegación
    html += '<div class="flex items-center justify-between mb-3">';
    html += '<h2 class="text-navy">' + cursoActivo.nombre + '</h2>';
    html += '<button class="btn btn-outline btn-sm" onclick="AdminApp.verCursos()">Volver a cursos</button>';
    html += '</div>';

    // Navegación del panel
    html += '<div class="flex gap-2 mb-3 flex-wrap">';
    html += '<button class="btn btn-secondary btn-sm" onclick="AdminApp.verSimulacion()">Simulación</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="AdminApp.verEstudiantes()">Estudiantes</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="AdminApp.verEquipos()">Equipos</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="AdminApp.verRanking()">Ranking</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="AdminApp.verCalificaciones()">Calificaciones</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="AdminApp.verCierreProgramado()">Cierre programado</button>';
    html += '<button class="btn btn-outline btn-sm" onclick="AdminApp.verEntregables()">Entregables</button>';
    html += '</div>';

    // Estado actual
    html += '<div class="flex gap-3 flex-wrap mb-3">';
    html += tarjetaEstado_('Período', e.periodoActual + '/' + e.totalPeriodos);
    html += tarjetaEstado_('Publicado', '' + e.periodoPublicado);
    html += tarjetaEstado_('Sala', e.salaAbierta ? 'Abierta' : 'Cerrada', e.salaAbierta ? 'text-orange' : '');
    html += tarjetaEstado_('Fase', e.fase);
    html += '</div>';

    // Acciones
    html += '<h3 class="text-navy mb-2">Acciones</h3>';
    html += '<div class="flex gap-2 flex-wrap mb-3">';

    if (!e.salaAbierta && e.periodoActual < e.totalPeriodos) {
      html += '<button class="btn btn-primary" onclick="AdminApp.abrirSala()">Abrir sala (período ' + (e.periodoActual + 1) + ')</button>';
    }
    if (e.salaAbierta) {
      html += '<button class="btn btn-secondary" onclick="AdminApp.cerrarSala()">Cerrar sala</button>';
    }
    if (!e.salaAbierta && e.periodoActual > 0 && e.periodoActual > e.periodoPublicado) {
      html += '<button class="btn btn-primary" onclick="AdminApp.procesarPeriodo()">Procesar período ' + e.periodoActual + '</button>';
    }
    if (e.periodoActual > e.periodoPublicado) {
      html += '<button class="btn btn-primary" onclick="AdminApp.publicarResultados()">Publicar resultados</button>';
    }

    html += '</div>';

    // Links del curso
    html += '<h3 class="text-navy mt-4 mb-2">Links del curso</h3>';
    html += '<div class="card" style="background:var(--border-light)">';
    html += '<p class="text-sm mb-1"><strong>Registro:</strong> <code>https://luisleytonjohns.github.io/ctrl-entropico/?curso=' + cursoActivo.id + '</code></p>';
    html += '<p class="text-sm mb-1"><strong>Equipos:</strong> <code>https://luisleytonjohns.github.io/ctrl-entropico/equipos.html?curso=' + cursoActivo.id + '</code></p>';
    html += '</div>';

    html += '</div>';
    div.innerHTML = html;
  }

  function tarjetaEstado_(label, valor, claseColor) {
    return '<div class="card" style="flex:1;min-width:140px;text-align:center;padding:1rem">' +
      '<p class="text-sm text-secondary">' + label + '</p>' +
      '<p class="font-bold text-lg ' + (claseColor || 'text-navy') + '">' + valor + '</p></div>';
  }

  // ══════════════════════════════════════════════════
  // CIERRE PROGRAMADO
  // ══════════════════════════════════════════════════

  async function verCierreProgramado() {
    if (!cursoActivo) { alert('Selecciona un curso primero.'); return; }
    const div = document.getElementById('admin-contenido');
    div.innerHTML = '<div class="card"><div class="spinner"></div> Cargando configuración de cierre...</div>';

    const resp = await API.estadoCierre(cursoActivo.id);

    let html = '<div class="card">';
    html += '<div class="flex items-center justify-between mb-3">';
    html += '<h2 class="text-navy">Cierre programado</h2>';
    html += '<button class="btn btn-outline btn-sm" onclick="AdminApp.verSimulacion()">Volver</button>';
    html += '</div>';

    if (resp.ok) {
      var d = resp.data;

      // Estado actual
      html += '<div class="card card-accent mb-3" style="text-align:center">';
      if (d.activo) {
        html += '<span class="badge badge-green" style="font-size:0.9rem;padding:6px 16px">Activo</span>';
        html += '<p class="mt-2 font-semibold text-navy" style="font-size:1.2rem">Cada ' + d.dia + ' a las ' + d.hora + '</p>';
        if (d.salaAbierta && d.proximoCierre) {
          var fecha = new Date(d.proximoCierre);
          html += '<p class="text-sm text-secondary mt-1">Próximo cierre: ' + fecha.toLocaleString('es-CL') + '</p>';
          html += '<p class="text-sm text-secondary">Forzar cierre sin decisiones completas: <strong>' + (d.forzar ? 'Sí' : 'No') + '</strong></p>';
        }
      } else {
        html += '<span class="badge badge-secondary" style="font-size:0.9rem;padding:6px 16px">Desactivado</span>';
        html += '<p class="text-sm text-secondary mt-2">La sala se cierra manualmente.</p>';
      }
      html += '</div>';
    }

    // Formulario de configuración
    html += '<h3 class="text-navy mb-2">Configurar cierre automático</h3>';

    html += '<div class="form-grupo">';
    html += '<label class="form-label">Día de la semana</label>';
    html += '<select class="form-input" id="cierre-dia">';
    var dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    var diasLabel = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    dias.forEach(function(d, i) {
      var sel = resp.ok && resp.data.dia === d ? ' selected' : '';
      html += '<option value="' + d + '"' + sel + '>' + diasLabel[i] + '</option>';
    });
    html += '</select></div>';

    html += '<div class="form-grupo">';
    html += '<label class="form-label">Hora de cierre</label>';
    html += '<input type="time" class="form-input" id="cierre-hora" value="' + (resp.ok && resp.data.hora ? resp.data.hora : '23:59') + '">';
    html += '<p class="form-hint">Hora de Santiago de Chile (UTC-3)</p>';
    html += '</div>';

    html += '<div class="form-grupo">';
    html += '<label class="form-label"><input type="checkbox" id="cierre-forzar"' + (resp.ok && resp.data.forzar ? ' checked' : '') + '> Forzar cierre aunque falten decisiones</label>';
    html += '<p class="form-hint">Si está marcado, la sala se cierra sin esperar que todos los equipos envíen. Si no, el sistema avisa al académico y no cierra.</p>';
    html += '</div>';

    html += '<div class="flex gap-2">';
    html += '<button class="btn btn-primary" onclick="AdminApp.guardarCierre(true)">Activar cierre programado</button>';
    if (resp.ok && resp.data.activo) {
      html += '<button class="btn btn-outline" onclick="AdminApp.guardarCierre(false)">Desactivar</button>';
    }
    html += '</div>';

    html += '</div>';
    div.innerHTML = html;
  }

  async function guardarCierre(activar) {
    var datos = {
      cursoId: cursoActivo.id,
      activo: activar ? 'si' : 'no'
    };

    if (activar) {
      datos.dia = document.getElementById('cierre-dia').value;
      datos.hora = document.getElementById('cierre-hora').value;
      datos.forzar = document.getElementById('cierre-forzar').checked ? 'si' : 'no';
    }

    const resp = await API.configurarCierre(datos);
    alert(resp.ok ? resp.data.mensaje : resp.error);
    if (resp.ok) verCierreProgramado();
  }

  // ══════════════════════════════════════════════════
  // ACCIONES DE SIMULACIÓN
  // ══════════════════════════════════════════════════

  async function abrirSala() {
    if (!confirm('¿Abrir la sala de decisiones?')) return;
    const resp = await API.abrirSala(cursoActivo.id);
    alert(resp.ok ? resp.data.mensaje : resp.error);
    if (resp.ok) { cursoActivo.estado.periodoActual++; cursoActivo.estado.salaAbierta = true; verSimulacion(); }
  }

  async function cerrarSala() {
    const resp = await API.cerrarSala(cursoActivo.id, false);
    if (!resp.ok && resp.error.indexOf('forzar') >= 0) {
      if (confirm(resp.error + '\n\n¿Cerrar de todos modos?')) {
        const resp2 = await API.cerrarSala(cursoActivo.id, true);
        alert(resp2.ok ? resp2.data.mensaje : resp2.error);
        if (resp2.ok) { cursoActivo.estado.salaAbierta = false; verSimulacion(); }
      }
      return;
    }
    alert(resp.ok ? resp.data.mensaje : resp.error);
    if (resp.ok) { cursoActivo.estado.salaAbierta = false; verSimulacion(); }
  }

  async function procesarPeriodo() {
    if (!confirm('¿Procesar el período ' + cursoActivo.estado.periodoActual + '? Esta acción ejecuta el motor de simulación.')) return;
    const div = document.getElementById('admin-contenido');
    div.innerHTML = '<div class="card"><div class="spinner"></div> Procesando período... esto puede tomar unos segundos.</div>';

    const resp = await API.procesarPeriodo(cursoActivo.id);
    if (resp.ok) {
      let html = '<div class="card"><h3 class="text-navy mb-3">Período ' + resp.data.periodo + ' procesado</h3>';
      html += '<div class="flex gap-3 flex-wrap mb-3">';
      html += tarjetaEstado_('Equipos', '' + resp.data.equiposProcesados);
      html += tarjetaEstado_('Eventos', '' + resp.data.eventosActivados);
      html += tarjetaEstado_('Momento evaluativo', resp.data.momentoEvaluativo ? 'Sí' : 'No');
      html += '</div>';

      html += '<table class="tabla"><thead><tr><th>Empresa</th><th>Ingresos</th><th>Resultado</th><th>Puntaje</th></tr></thead><tbody>';
      resp.data.resumen.forEach(function(r) {
        html += '<tr><td>' + r.equipo + '</td><td>' + r.ingresos + '</td><td>' + r.resultado + '</td><td>' + r.puntaje + '</td></tr>';
      });
      html += '</tbody></table>';
      html += '<div class="flex gap-2 mt-3">';
      html += '<button class="btn btn-primary" onclick="AdminApp.publicarResultados()">Publicar resultados y notificar</button>';
      html += '<button class="btn btn-outline" onclick="AdminApp.verSimulacion()">Volver</button>';
      html += '</div></div>';
      div.innerHTML = html;
    } else {
      div.innerHTML = '<div class="alerta alerta-error">' + resp.error + '</div><button class="btn btn-outline mt-2" onclick="AdminApp.verSimulacion()">Volver</button>';
    }
  }

  async function publicarResultados() {
    const resp = await API.publicarResultados(cursoActivo.id);
    alert(resp.ok ? resp.data.mensaje : resp.error);
    if (resp.ok) { cursoActivo.estado.periodoPublicado = cursoActivo.estado.periodoActual; verSimulacion(); }
  }

  // ══════════════════════════════════════════════════
  // ESTUDIANTES Y EQUIPOS
  // ══════════════════════════════════════════════════

  async function verEstudiantes() {
    if (!cursoActivo) { alert('Selecciona un curso primero.'); return; }
    const div = document.getElementById('admin-contenido');
    div.innerHTML = '<div class="card"><div class="spinner"></div> Cargando estudiantes...</div>';

    const resp = await API.listarEstudiantes(cursoActivo.id, 'todos');
    if (!resp.ok) { div.innerHTML = '<div class="alerta alerta-error">' + resp.error + '</div>'; return; }

    let html = '<div class="card">';
    html += '<div class="flex items-center justify-between mb-3">';
    html += '<h2 class="text-navy">Estudiantes — ' + cursoActivo.nombre + '</h2>';
    html += '<button class="btn btn-outline btn-sm" onclick="AdminApp.verSimulacion()">Volver</button>';
    html += '</div>';

    html += '<table class="tabla"><thead><tr><th></th><th>Nombre</th><th>Correo inst.</th><th>Correo pers.</th><th>Equipo</th><th>Rol</th></tr></thead><tbody>';
    resp.data.estudiantes.forEach(function(e) {
      html += '<tr>';
      html += '<td>' + (e.foto ? '<img style="width:28px;height:28px;border-radius:50%" src="' + e.foto + '">' : '') + '</td>';
      html += '<td>' + e.nombre + '</td>';
      html += '<td class="text-sm">' + (e.correo_institucional || '') + '</td>';
      html += '<td class="text-sm">' + (e.correo_personal || '') + '</td>';
      html += '<td>' + (e.equipo_id || '<span class="text-light">Sin equipo</span>') + '</td>';
      html += '<td><span class="badge badge-navy">' + (e.rol || '') + '</span></td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    div.innerHTML = html;
  }

  async function verEquipos() {
    if (!cursoActivo) { alert('Selecciona un curso primero.'); return; }
    const div = document.getElementById('admin-contenido');
    div.innerHTML = '<div class="card"><div class="spinner"></div> Cargando equipos...</div>';

    const resp = await API.listarEquipos(cursoActivo.id);
    if (!resp.ok) { div.innerHTML = '<div class="alerta alerta-error">' + resp.error + '</div>'; return; }

    let html = '<div class="card">';
    html += '<div class="flex items-center justify-between mb-3">';
    html += '<h2 class="text-navy">Equipos — ' + cursoActivo.nombre + '</h2>';
    html += '<button class="btn btn-outline btn-sm" onclick="AdminApp.verSimulacion()">Volver</button>';
    html += '</div>';

    resp.data.equipos.forEach(function(eq) {
      html += '<div class="card card-accent mb-2"><div class="flex items-center justify-between">';
      html += '<div><strong>' + eq.nombreEmpresa + '</strong>' + (eq.nombreProducto ? ' — ' + eq.nombreProducto : '') + '</div>';
      html += '<span class="badge badge-navy">' + eq.integrantes + ' integrantes</span>';
      html += '</div>';
      if (eq.miembros) {
        html += '<div class="mt-2">';
        eq.miembros.forEach(function(m) {
          html += '<span class="text-sm" style="display:inline-block;margin-right:1rem">' + (m.foto ? '<img style="width:24px;height:24px;border-radius:50%;vertical-align:middle;margin-right:4px" src="' + m.foto + '">' : '') + m.nombre + ' <span class="badge badge-orange">' + m.rol + '</span></span>';
        });
        html += '</div>';
      }
      html += '</div>';
    });
    html += '</div>';
    div.innerHTML = html;
  }

  // ══════════════════════════════════════════════════
  // RANKING (ADMIN)
  // ══════════════════════════════════════════════════

  async function verRanking() {
    if (!cursoActivo) { alert('Selecciona un curso primero.'); return; }
    const div = document.getElementById('admin-contenido');
    div.innerHTML = '<div class="card"><div class="spinner"></div> Cargando ranking...</div>';

    const resp = await API.ranking();
    if (!resp.ok) { div.innerHTML = '<div class="alerta alerta-info">' + (resp.error || 'No hay ranking disponible.') + '</div>'; return; }

    const d = resp.data;
    let html = '<div class="card">';
    html += '<div class="flex items-center justify-between mb-3">';
    html += '<h2 class="text-navy">Ranking — Período ' + d.periodo + '</h2>';
    html += '<button class="btn btn-outline btn-sm" onclick="AdminApp.verSimulacion()">Volver</button>';
    html += '</div>';

    html += '<table class="tabla"><thead><tr><th>#</th><th>Empresa</th><th>Puntaje</th><th>Ingresos</th><th>Resultado op.</th><th>Nota</th></tr></thead><tbody>';
    d.ranking.forEach(function(r) {
      html += '<tr><td><strong>' + r.posicion + '</strong></td><td>' + r.empresa + '</td><td>' + r.puntaje + '</td>';
      html += '<td>' + (r.ingresos ? FrontUtils.moneda(r.ingresos) : '') + '</td>';
      html += '<td>' + (r.resultadoOperacional ? FrontUtils.moneda(r.resultadoOperacional) : '') + '</td>';
      html += '<td>' + r.nota.toFixed(1) + '</td></tr>';
    });
    html += '</tbody></table></div>';
    div.innerHTML = html;
  }

  // ══════════════════════════════════════════════════
  // CALIFICACIONES (ADMIN)
  // ══════════════════════════════════════════════════

  async function verCalificaciones() {
    if (!cursoActivo) { alert('Selecciona un curso primero.'); return; }
    const div = document.getElementById('admin-contenido');

    let html = '<div class="card">';
    html += '<div class="flex items-center justify-between mb-3">';
    html += '<h2 class="text-navy">Calificaciones — ' + cursoActivo.nombre + '</h2>';
    html += '<button class="btn btn-outline btn-sm" onclick="AdminApp.verSimulacion()">Volver</button>';
    html += '</div>';
    html += '<p class="text-secondary">Próximamente: vista consolidada de notas por estudiante, cálculo de momentos evaluativos, heteroevaluación, autoevaluación y exportación.</p>';
    html += '</div>';
    div.innerHTML = html;
  }

  // ══════════════════════════════════════════════════
  // ENTREGABLES Y PLACEHOLDER
  // ══════════════════════════════════════════════════

  function verEntregables() {
    if (!cursoActivo) { alert('Selecciona un curso primero.'); return; }
    const div = document.getElementById('admin-contenido');

    let html = '<div class="card">';
    html += '<div class="flex items-center justify-between mb-3">';
    html += '<h2 class="text-navy">Entregables — ' + cursoActivo.nombre + '</h2>';
    html += '<button class="btn btn-outline btn-sm" onclick="AdminApp.verSimulacion()">Volver</button>';
    html += '</div>';
    html += '<p class="text-secondary">Próximamente: panorama de decisiones, bitácoras y memorandos por equipo con estado de envío y acceso directo a corrección con rúbrica.</p>';
    html += '</div>';
    div.innerHTML = html;
  }

  function formCrearCurso() {
    const div = document.getElementById('admin-contenido');
    let html = '<div class="card">';
    html += '<div class="flex items-center justify-between mb-3">';
    html += '<h2 class="text-navy">Crear curso nuevo</h2>';
    html += '<button class="btn btn-outline btn-sm" onclick="AdminApp.verCursos()">Cancelar</button>';
    html += '</div>';
    html += '<p class="text-secondary">Próximamente: formulario completo de configuración del curso.</p>';
    html += '</div>';
    div.innerHTML = html;
  }

  return {
    init: init,
    verCursos: verCursos,
    seleccionarCurso: seleccionarCurso,
    verSimulacion: verSimulacion,
    verEstudiantes: verEstudiantes,
    verEquipos: verEquipos,
    verRanking: verRanking,
    verCalificaciones: verCalificaciones,
    verCierreProgramado: verCierreProgramado,
    guardarCierre: guardarCierre,
    verEntregables: verEntregables,
    formCrearCurso: formCrearCurso,
    abrirSala: abrirSala,
    cerrarSala: cerrarSala,
    procesarPeriodo: procesarPeriodo,
    publicarResultados: publicarResultados
  };

})();
