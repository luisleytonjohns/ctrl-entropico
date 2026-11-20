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

  async function verCursos() {
    const div = document.getElementById('admin-contenido');
    div.innerHTML = '<div class="card"><div class="spinner"></div> Cargando cursos...</div>';

    const resp = await API.llamar('panelAcademico');
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

  async function verSimulacion() {
    if (!cursoActivo) { verCursos(); return; }
    const div = document.getElementById('admin-contenido');
    const e = cursoActivo.estado;

    let html = '<div class="card">';
    html += '<h2 class="text-navy mb-3">' + cursoActivo.nombre + ' — Control de simulación</h2>';

    // Estado actual
    html += '<div class="flex gap-3 flex-wrap mb-3">';
    html += '<div class="card" style="flex:1;min-width:140px;text-align:center;padding:1rem"><p class="text-sm text-secondary">Período</p><p class="font-bold text-lg text-navy">' + e.periodoActual + '/' + e.totalPeriodos + '</p></div>';
    html += '<div class="card" style="flex:1;min-width:140px;text-align:center;padding:1rem"><p class="text-sm text-secondary">Publicado</p><p class="font-bold text-lg text-navy">' + e.periodoPublicado + '</p></div>';
    html += '<div class="card" style="flex:1;min-width:140px;text-align:center;padding:1rem"><p class="text-sm text-secondary">Sala</p><p class="font-bold text-lg ' + (e.salaAbierta ? 'text-orange' : 'text-secondary') + '">' + (e.salaAbierta ? 'Abierta' : 'Cerrada') + '</p></div>';
    html += '<div class="card" style="flex:1;min-width:140px;text-align:center;padding:1rem"><p class="text-sm text-secondary">Fase</p><p class="font-bold text-lg text-navy">' + e.fase + '</p></div>';
    html += '</div>';

    // Acciones
    html += '<h3 class="text-navy mb-2">Acciones</h3>';
    html += '<div class="flex gap-2 flex-wrap">';

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

    // Links
    html += '<h3 class="text-navy mt-4 mb-2">Links del curso</h3>';
    html += '<div class="card" style="background:var(--border-light)">';
    html += '<p class="text-sm mb-1"><strong>Registro:</strong> <code>https://luisleytonjohns.github.io/ctrl-entropico/?curso=' + cursoActivo.id + '</code></p>';
    html += '<p class="text-sm mb-1"><strong>Equipos:</strong> <code>https://luisleytonjohns.github.io/ctrl-entropico/equipos.html?curso=' + cursoActivo.id + '</code></p>';
    html += '</div>';

    html += '</div>';
    div.innerHTML = html;
  }

  async function abrirSala() {
    if (!confirm('¿Abrir la sala de decisiones?')) return;
    const resp = await API.llamar('abrirSala', { cursoId: cursoActivo.id });
    alert(resp.ok ? resp.data.mensaje : resp.error);
    if (resp.ok) { cursoActivo.estado.periodoActual++; cursoActivo.estado.salaAbierta = true; verSimulacion(); }
  }

  async function cerrarSala() {
    const resp = await API.llamar('cerrarSala', { cursoId: cursoActivo.id });
    if (!resp.ok && resp.error.indexOf('forzar') >= 0) {
      if (confirm(resp.error + '\n\n¿Cerrar de todos modos?')) {
        const resp2 = await API.llamar('cerrarSala', { cursoId: cursoActivo.id, forzar: true });
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

    const resp = await API.llamar('procesarPeriodo', { cursoId: cursoActivo.id });
    if (resp.ok) {
      let html = '<div class="card"><h3 class="text-navy mb-3">Período ' + resp.data.periodo + ' procesado</h3>';
      html += '<p class="text-secondary mb-2">' + resp.data.mensaje + '</p>';
      html += '<table class="tabla"><thead><tr><th>#</th><th>Empresa</th><th>Ingresos</th><th>Margen</th><th>Puntaje</th><th>Nota</th></tr></thead><tbody>';
      resp.data.resumen.forEach(function(r, i) {
        html += '<tr><td>' + (i+1) + '</td><td>' + r.empresa + '</td><td>' + r.ingresos + '</td><td>' + r.margen + '</td><td>' + r.puntaje + '</td><td>' + r.nota + '</td></tr>';
      });
      html += '</tbody></table>';
      html += '<button class="btn btn-primary mt-3" onclick="AdminApp.publicarResultados()">Publicar resultados y notificar</button>';
      html += ' <button class="btn btn-outline mt-3" onclick="AdminApp.verSimulacion()">Volver</button>';
      html += '</div>';
      div.innerHTML = html;
    } else {
      div.innerHTML = '<div class="alerta alerta-error">' + resp.error + '</div><button class="btn btn-outline mt-2" onclick="AdminApp.verSimulacion()">Volver</button>';
    }
  }

  async function publicarResultados() {
    const resp = await API.llamar('publicarResultados', { cursoId: cursoActivo.id });
    alert(resp.ok ? resp.data.mensaje : resp.error);
    if (resp.ok) { cursoActivo.estado.periodoPublicado = cursoActivo.estado.periodoActual; verSimulacion(); }
  }

  async function verEstudiantes() {
    if (!cursoActivo) { alert('Selecciona un curso primero.'); return; }
    const div = document.getElementById('admin-contenido');
    const resp = await API.llamar('listarEstudiantes', { cursoId: cursoActivo.id, filtro: 'todos' });
    if (!resp.ok) { div.innerHTML = '<div class="alerta alerta-error">' + resp.error + '</div>'; return; }

    let html = '<div class="card"><h2 class="text-navy mb-3">Estudiantes — ' + cursoActivo.nombre + '</h2>';
    html += '<table class="tabla"><thead><tr><th>Foto</th><th>Nombre</th><th>Correo inst.</th><th>Correo pers.</th><th>Equipo</th><th>Rol</th></tr></thead><tbody>';
    resp.data.estudiantes.forEach(function(e) {
      html += '<tr>';
      html += '<td>' + (e.foto ? '<img class="avatar-sm" src="' + e.foto + '">' : '') + '</td>';
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
    const resp = await API.llamar('listarEquipos', { cursoId: cursoActivo.id });
    if (!resp.ok) { div.innerHTML = '<div class="alerta alerta-error">' + resp.error + '</div>'; return; }

    let html = '<div class="card"><h2 class="text-navy mb-3">Equipos — ' + cursoActivo.nombre + '</h2>';
    resp.data.equipos.forEach(function(eq) {
      html += '<div class="card card-accent mb-2"><div class="flex items-center justify-between">';
      html += '<div><strong>' + eq.nombreEmpresa + '</strong>' + (eq.nombreProducto ? ' — ' + eq.nombreProducto : '') + '</div>';
      html += '<span class="badge badge-navy">' + eq.integrantes + ' integrantes</span>';
      html += '</div>';
      if (eq.miembros) {
        html += '<div class="mt-2">';
        eq.miembros.forEach(function(m) {
          html += '<span class="text-sm" style="display:inline-block;margin-right:1rem">' + (m.foto ? '<img class="avatar-sm" src="' + m.foto + '" style="vertical-align:middle;margin-right:4px">' : '') + m.nombre + ' <span class="badge badge-orange">' + m.rol + '</span></span>';
        });
        html += '</div>';
      }
      html += '</div>';
    });
    html += '</div>';
    div.innerHTML = html;
  }

  async function verRanking() {
    if (!cursoActivo) { alert('Selecciona un curso primero.'); return; }
    const div = document.getElementById('admin-contenido');
    const resp = await API.llamar('ranking', { cursoId: cursoActivo.id });
    if (!resp.ok) { div.innerHTML = '<div class="alerta alerta-info">' + resp.error + '</div>'; return; }

    const d = resp.data;
    let html = '<div class="card"><h2 class="text-navy mb-3">Ranking — Período ' + d.periodo + '</h2>';
    html += '<table class="tabla"><thead><tr><th>#</th><th>Empresa</th><th>Puntaje</th><th>Ingresos</th><th>Margen</th><th>Nota</th></tr></thead><tbody>';
    d.ranking.forEach(function(r) {
      html += '<tr><td><strong>' + r.posicion + '</strong></td><td>' + r.empresa + '</td><td>' + r.puntaje + '</td>';
      html += '<td>' + (r.detalle ? '$' + Math.round(r.ingresos).toLocaleString() : '') + '</td>';
      html += '<td>' + r.margen + '%</td><td>' + r.nota.toFixed(1) + '</td></tr>';
    });
    html += '</tbody></table></div>';
    div.innerHTML = html;
  }

  function verEntregables() {
    if (!cursoActivo) { alert('Selecciona un curso primero.'); return; }
    document.getElementById('admin-contenido').innerHTML = '<div class="card"><h2 class="text-navy">Vista integral de entregables</h2><p class="text-secondary mt-2">Próximamente: panorama de decisiones, bitácoras, memorandos por equipo con estado de envío y acceso directo a corrección con rúbrica.</p></div>';
  }

  function verCalificaciones() {
    if (!cursoActivo) { alert('Selecciona un curso primero.'); return; }
    document.getElementById('admin-contenido').innerHTML = '<div class="card"><h2 class="text-navy">Calificaciones</h2><p class="text-secondary mt-2">Próximamente: cálculo de notas con pesos configurables, heteroevaluación, autoevaluación, exportación a Excel.</p></div>';
  }

  function formCrearCurso() {
    document.getElementById('admin-contenido').innerHTML = '<div class="card"><h2 class="text-navy mb-3">Crear curso nuevo</h2><p class="text-secondary">Próximamente: formulario completo de configuración del curso.</p></div>';
  }

  return {
    init: init,
    verCursos: verCursos,
    seleccionarCurso: seleccionarCurso,
    verSimulacion: verSimulacion,
    verEstudiantes: verEstudiantes,
    verEquipos: verEquipos,
    verRanking: verRanking,
    verEntregables: verEntregables,
    verCalificaciones: verCalificaciones,
    formCrearCurso: formCrearCurso,
    abrirSala: abrirSala,
    cerrarSala: cerrarSala,
    procesarPeriodo: procesarPeriodo,
    publicarResultados: publicarResultados
  };

})();
