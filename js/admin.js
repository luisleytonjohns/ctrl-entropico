/**
 * CTRL ENTROPICO — admin.js
 * Lógica del panel del académico.
 * Creación de cursos, control de simulación, cierre programado,
 * gestión de estudiantes, equipos, ranking y calificaciones.
 */

const AdminApp = (function() {

  let cursos = [];
  let cursoActivo = null;

  // Las 12 industrias disponibles (el backend mapea a Motor ID via PropertiesService)
  const INDUSTRIAS = [
    { clave: 'bebidas',            nombre: 'Bebidas',                  descripcion: 'Mercado de bebidas analcohólicas en Chile' },
    { clave: 'retail',             nombre: 'Retail',                   descripcion: 'Cadenas de tiendas y comercio minorista' },
    { clave: 'consumo_masivo',     nombre: 'Consumo Masivo',           descripcion: 'Alimentos, limpieza, cuidado personal' },
    { clave: 'farmaceutica',       nombre: 'Farmacéutica',             descripcion: 'Laboratorios y distribución farmacéutica' },
    { clave: 'telecomunicaciones', nombre: 'Telecomunicaciones',       descripcion: 'Operadores móviles, banda ancha, fibra' },
    { clave: 'manufactura',        nombre: 'Manufactura',              descripcion: 'Producción industrial B2B' },
    { clave: 'agricola',           nombre: 'Agrícola',                 descripcion: 'Producción y exportación agrícola' },
    { clave: 'banca',              nombre: 'Banca',                    descripcion: 'Banca comercial y servicios financieros' },
    { clave: 'construccion',       nombre: 'Construcción',             descripcion: 'Construcción de viviendas y obras civiles' },
    { clave: 'energia',            nombre: 'Energía',                  descripcion: 'Generación y distribución de energía eléctrica' },
    { clave: 'mineria',            nombre: 'Minería',                  descripcion: 'Gran minería del cobre y litio' },
    { clave: 'transporte',         nombre: 'Transporte y Logística',   descripcion: 'Transporte de carga y operadores logísticos' }
  ];

  const MODULOS = [
    { clave: 'marketing',     nombre: 'Marketing',     obligatorio: true },
    { clave: 'finanzas',      nombre: 'Finanzas',      obligatorio: true },
    { clave: 'logistica',     nombre: 'Logística',     obligatorio: false },
    { clave: 'rrhh',          nombre: 'RRHH',          obligatorio: false },
    { clave: 'contabilidad',  nombre: 'Contabilidad',  obligatorio: false },
    { clave: 'auditoria',     nombre: 'Auditoría',     obligatorio: false }
  ];

  // ══════════════════════════════════════════════════
  // INICIALIZACIÓN
  // ══════════════════════════════════════════════════

  async function init() {
    await verCursos();
  }

  // ══════════════════════════════════════════════════
  // LISTA DE CURSOS
  // ══════════════════════════════════════════════════

  async function verCursos() {
    cursoActivo = null;
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
      if (c.industria) html += ' <span class="badge badge-orange">' + c.industria + '</span>';
      html += '<br><span class="text-sm text-secondary">' + (c.institucion ? c.institucion.sigla + ' — ' + c.institucion.cursoNombre : '') + '</span></div>';
      html += '<div class="text-right">';
      html += '<span class="badge badge-navy">' + (c.totalEquipos || 0) + ' equipos</span> ';
      html += '<span class="badge badge-orange">' + (c.totalEstudiantes || 0) + ' est.</span>';
      html += '<br><span class="text-sm text-secondary">Período ' + c.estado.periodoActual + '/' + c.estado.totalPeriodos + ' — ' + c.estado.fase + '</span>';
      html += '</div></div></div>';
    });
    html += '<button class="btn btn-outline mt-2" onclick="AdminApp.formCrearCurso()">+ Crear curso nuevo</button>';
    html += '</div>';
    div.innerHTML = html;
  }

  // ══════════════════════════════════════════════════
  // CREAR CURSO
  // ══════════════════════════════════════════════════

  function formCrearCurso() {
    const div = document.getElementById('admin-contenido');

    let html = '<div class="card">';
    html += '<h2 class="text-navy mb-3">Crear curso nuevo</h2>';

    // Nombre del curso
    html += '<div class="form-grupo mb-3">';
    html += '<label class="form-label">Nombre del curso</label>';
    html += '<input type="text" class="form-input" id="cc-nombre" placeholder="Ej: Negocios II — Sección 1 — 2026-2">';
    html += '</div>';

    // Institución
    html += '<div class="flex gap-3 mb-3">';
    html += '<div style="flex:1"><label class="form-label">Sigla institución</label>';
    html += '<input type="text" class="form-input" id="cc-sigla" placeholder="Ej: UOH"></div>';
    html += '<div style="flex:1"><label class="form-label">Nombre asignatura</label>';
    html += '<input type="text" class="form-input" id="cc-asignatura" placeholder="Ej: Negocios II"></div>';
    html += '<div style="flex:1"><label class="form-label">Código asignatura</label>';
    html += '<input type="text" class="form-input" id="cc-codigo" placeholder="Ej: ICA3002"></div>';
    html += '</div>';

    // Industria
    html += '<div class="form-grupo mb-3">';
    html += '<label class="form-label">Industria de simulación</label>';
    html += '<select class="form-input" id="cc-industria" onchange="AdminApp.mostrarDescIndustria()">';
    html += '<option value="">Seleccionar industria...</option>';
    INDUSTRIAS.forEach(function(ind) {
      html += '<option value="' + ind.clave + '">' + ind.nombre + '</option>';
    });
    html += '</select>';
    html += '<p id="cc-desc-industria" class="text-xs text-secondary mt-1"></p>';
    html += '</div>';

    // Períodos
    html += '<div class="flex gap-3 mb-3">';
    html += '<div style="flex:1"><label class="form-label">Total de períodos</label>';
    html += '<input type="number" class="form-input" id="cc-periodos" value="6" min="3" max="18" step="1"></div>';
    html += '<div style="flex:1"><label class="form-label">Semestre</label>';
    html += '<select class="form-input" id="cc-semestre">';
    html += '<option value="2026-2">2026-2</option>';
    html += '<option value="2027-1">2027-1</option>';
    html += '<option value="2027-2">2027-2</option>';
    html += '</select></div>';
    html += '</div>';

    // Módulos activos
    html += '<div class="form-grupo mb-3">';
    html += '<label class="form-label">Módulos activos</label>';
    html += '<p class="text-xs text-secondary mb-2">Marketing y Finanzas son obligatorios. Los demás módulos añaden complejidad y roles adicionales.</p>';
    html += '<div class="flex gap-3 flex-wrap">';
    MODULOS.forEach(function(m) {
      const checked = m.obligatorio ? ' checked disabled' : ' checked';
      html += '<label style="display:flex;align-items:center;gap:6px;cursor:pointer">';
      html += '<input type="checkbox" id="cc-mod-' + m.clave + '" value="' + m.clave + '"' + checked + '>';
      html += '<span class="text-sm">' + m.nombre + (m.obligatorio ? ' (obligatorio)' : '') + '</span>';
      html += '</label>';
    });
    html += '</div></div>';

    // Nivel de logística (solo visible si logística está activo)
    html += '<div class="form-grupo mb-3" id="cc-nivel-log-grupo">';
    html += '<label class="form-label">Nivel de Logística</label>';
    html += '<p class="text-xs text-secondary mb-2">Determina cuántas decisiones logísticas toman los estudiantes. Solo aplica si Logística está activo.</p>';
    html += '<div class="flex gap-3">';
    html += '<label style="display:flex;align-items:center;gap:6px;cursor:pointer">';
    html += '<input type="radio" name="cc-nivel-log" value="basico"> <span class="text-sm">Básico (5 decisiones)</span></label>';
    html += '<label style="display:flex;align-items:center;gap:6px;cursor:pointer">';
    html += '<input type="radio" name="cc-nivel-log" value="avanzado" checked> <span class="text-sm">Avanzado (21 decisiones)</span></label>';
    html += '<label style="display:flex;align-items:center;gap:6px;cursor:pointer">';
    html += '<input type="radio" name="cc-nivel-log" value="especializado"> <span class="text-sm">Especializado (42 decisiones)</span></label>';
    html += '</div></div>';

    // Inducción
    html += '<div class="form-grupo mb-3">';
    html += '<label class="form-label">Semanas de inducción</label>';
    html += '<div class="flex gap-3">';
    html += '<div style="flex:1"><input type="number" class="form-input" id="cc-induccion-semanas" value="2" min="0" max="4"></div>';
    html += '<div style="flex:2"><p class="text-xs text-secondary mt-2">0 = sin inducción; los estudiantes pasan directo a la simulación</p></div>';
    html += '</div></div>';

    // Botones
    html += '<hr class="separador">';
    html += '<div class="flex gap-2">';
    html += '<button class="btn btn-primary" onclick="AdminApp.crearCurso()">Crear curso</button>';
    html += '<button class="btn btn-outline" onclick="AdminApp.verCursos()">Cancelar</button>';
    html += '</div>';

    html += '</div>';
    div.innerHTML = html;
  }

  function mostrarDescIndustria() {
    const sel = document.getElementById('cc-industria');
    const desc = document.getElementById('cc-desc-industria');
    const ind = INDUSTRIAS.find(function(i) { return i.clave === sel.value; });
    desc.textContent = ind ? ind.descripcion : '';
  }

  async function crearCurso() {
    const nombre = document.getElementById('cc-nombre').value.trim();
    const sigla = document.getElementById('cc-sigla').value.trim();
    const asignatura = document.getElementById('cc-asignatura').value.trim();
    const codigo = document.getElementById('cc-codigo').value.trim();
    const industria = document.getElementById('cc-industria').value;
    const periodos = parseInt(document.getElementById('cc-periodos').value) || 6;
    const semestre = document.getElementById('cc-semestre').value;
    const induccionSemanas = parseInt(document.getElementById('cc-induccion-semanas').value) || 0;

    if (!nombre) { alert('Ingresa el nombre del curso.'); return; }
    if (!industria) { alert('Selecciona una industria.'); return; }

    // Recoger módulos activos
    const modulosActivos = [];
    MODULOS.forEach(function(m) {
      const cb = document.getElementById('cc-mod-' + m.clave);
      if (cb && (cb.checked || m.obligatorio)) modulosActivos.push(m.clave);
    });

    // Nivel de logística
    var nivelLogistica = 'avanzado';
    var radios = document.querySelectorAll('input[name="cc-nivel-log"]');
    radios.forEach(function(r) { if (r.checked) nivelLogistica = r.value; });

    const datos = {
      nombre: nombre,
      institucion: { sigla: sigla, cursoNombre: asignatura, codigo: codigo },
      industria: industria,
      totalPeriodos: periodos,
      semestre: semestre,
      modulosActivos: modulosActivos,
      induccionSemanas: induccionSemanas,
      nivelLogistica: nivelLogistica
    };

    const div = document.getElementById('admin-contenido');
    div.innerHTML = '<div class="card"><div class="spinner"></div> Creando curso... esto puede tomar unos segundos.</div>';

    const resp = await API.crearCurso(datos);

    if (resp.ok) {
      alert('Curso creado exitosamente: ' + resp.data.nombre);
      await verCursos();
    } else {
      div.innerHTML = '<div class="alerta alerta-error">' + resp.error + '</div>';
      div.innerHTML += '<button class="btn btn-outline mt-2" onclick="AdminApp.formCrearCurso()">Volver al formulario</button>';
    }
  }

  // ══════════════════════════════════════════════════
  // SELECCIÓN DE CURSO Y NAVEGACIÓN
  // ══════════════════════════════════════════════════

  function seleccionarCurso(id) {
    cursoActivo = cursos.find(function(c) { return c.id === id; });
    verSimulacion();
  }

  /**
   * Renderiza las tabs de navegación del curso seleccionado.
   */
  function renderNavCurso_() {
    const tabs = [
      { id: 'simulacion',   nombre: 'Simulación',   fn: 'verSimulacion' },
      { id: 'estudiantes',  nombre: 'Estudiantes',   fn: 'verEstudiantes' },
      { id: 'equipos',      nombre: 'Equipos',       fn: 'verEquipos' },
      { id: 'ranking',      nombre: 'Ranking',       fn: 'verRanking' },
      { id: 'entregables',  nombre: 'Entregables',   fn: 'verEntregables' },
      { id: 'calificaciones', nombre: 'Calificaciones', fn: 'verCalificaciones' },
      { id: 'cierre',       nombre: 'Cierre',        fn: 'verCierreProgramado' },
      { id: 'config',       nombre: 'Configuración', fn: 'verConfiguracion' }
    ];

    let html = '<div style="display:flex;gap:2px;margin-bottom:1rem;overflow-x:auto;border-bottom:2px solid var(--border-light)">';
    tabs.forEach(function(t) {
      html += '<button class="tab-admin" id="tab-' + t.id + '" onclick="AdminApp.' + t.fn + '()" ';
      html += 'style="padding:0.4rem 0.8rem;border:none;background:transparent;color:var(--text-secondary);cursor:pointer;font-size:0.8rem;white-space:nowrap;border-radius:6px 6px 0 0">';
      html += t.nombre + '</button>';
    });
    html += '</div>';

    // Botón volver
    html += '<div style="margin-bottom:0.5rem"><button class="btn btn-outline btn-sm" onclick="AdminApp.verCursos()" style="font-size:0.75rem;padding:0.2rem 0.6rem">&larr; Mis cursos</button>';
    html += ' <strong class="text-navy">' + cursoActivo.nombre + '</strong></div>';

    return html;
  }

  function activarTab_(tabId) {
    document.querySelectorAll('.tab-admin').forEach(function(t) {
      t.style.background = 'transparent';
      t.style.color = 'var(--text-secondary)';
    });
    const tab = document.getElementById('tab-' + tabId);
    if (tab) {
      tab.style.background = 'var(--navy)';
      tab.style.color = '#fff';
    }
  }

  // ══════════════════════════════════════════════════
  // SIMULACIÓN (panel principal del curso)
  // ══════════════════════════════════════════════════

  async function verSimulacion() {
    if (!cursoActivo) { verCursos(); return; }
    const div = document.getElementById('admin-contenido');
    const e = cursoActivo.estado;

    let html = renderNavCurso_();

    // Estado actual
    html += '<div class="card">';
    html += '<h3 class="text-navy mb-3">Control de simulación</h3>';
    html += '<div class="flex gap-3 flex-wrap mb-3">';
    html += tarjeta_('Período', e.periodoActual + '/' + e.totalPeriodos, 'text-navy');
    html += tarjeta_('Publicado', String(e.periodoPublicado), 'text-navy');
    html += tarjeta_('Sala', e.salaAbierta ? 'Abierta' : 'Cerrada', e.salaAbierta ? 'text-orange' : 'text-secondary');
    html += tarjeta_('Fase', e.fase, 'text-navy');
    html += '</div>';

    // Acciones
    html += '<h4 class="text-navy mb-2">Acciones</h4>';
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
    html += '<h4 class="text-navy mt-4 mb-2">Links del curso</h4>';
    html += '<div class="card" style="background:var(--border-light);padding:0.8rem">';
    html += '<p class="text-sm mb-1"><strong>Registro:</strong> <code>https://luisleytonjohns.github.io/ctrl-entropico/?curso=' + cursoActivo.id + '</code></p>';
    html += '<p class="text-sm"><strong>Equipos:</strong> <code>https://luisleytonjohns.github.io/ctrl-entropico/equipos.html?curso=' + cursoActivo.id + '</code></p>';
    html += '</div>';

    html += '</div>';
    div.innerHTML = html;
    activarTab_('simulacion');
  }

  function tarjeta_(titulo, valor, colorClass) {
    return '<div class="card" style="flex:1;min-width:130px;text-align:center;padding:0.8rem">' +
      '<p class="text-xs text-secondary">' + titulo + '</p>' +
      '<p class="font-bold text-lg ' + colorClass + '">' + valor + '</p></div>';
  }

  // ══════════════════════════════════════════════════
  // ACCIONES DE SIMULACIÓN
  // ══════════════════════════════════════════════════

  async function abrirSala() {
    if (!confirm('¿Abrir la sala de decisiones?')) return;
    const resp = await API.abrirSala();
    alert(resp.ok ? resp.data.mensaje : resp.error);
    if (resp.ok) { cursoActivo.estado.periodoActual++; cursoActivo.estado.salaAbierta = true; verSimulacion(); }
  }

  async function cerrarSala() {
    const resp = await API.cerrarSala();
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

    const resp = await API.procesarPeriodo();
    if (resp.ok) {
      let html = renderNavCurso_();
      html += '<div class="card"><h3 class="text-navy mb-3">Período ' + resp.data.periodo + ' procesado</h3>';
      html += '<p class="text-secondary mb-2">' + resp.data.mensaje + '</p>';
      if (resp.data.resumen && resp.data.resumen.length > 0) {
        html += '<table class="tabla"><thead><tr><th>#</th><th>Empresa</th><th>Ingresos</th><th>Margen</th><th>Puntaje</th><th>Nota</th></tr></thead><tbody>';
        resp.data.resumen.forEach(function(r, i) {
          html += '<tr><td>' + (i+1) + '</td><td>' + r.empresa + '</td><td>' + FrontUtils.moneda(r.ingresos) + '</td><td>' + r.margen + '</td><td>' + r.puntaje + '</td><td>' + r.nota + '</td></tr>';
        });
        html += '</tbody></table>';
      }
      html += '<div class="flex gap-2 mt-3">';
      html += '<button class="btn btn-primary" onclick="AdminApp.publicarResultados()">Publicar resultados y notificar</button>';
      html += '<button class="btn btn-outline" onclick="AdminApp.verSimulacion()">Volver</button>';
      html += '</div></div>';
      div.innerHTML = html;
      activarTab_('simulacion');
    } else {
      div.innerHTML = '<div class="alerta alerta-error">' + resp.error + '</div><button class="btn btn-outline mt-2" onclick="AdminApp.verSimulacion()">Volver</button>';
    }
  }

  async function publicarResultados() {
    const resp = await API.publicarResultados();
    alert(resp.ok ? resp.data.mensaje : resp.error);
    if (resp.ok) { cursoActivo.estado.periodoPublicado = cursoActivo.estado.periodoActual; verSimulacion(); }
  }

  // ══════════════════════════════════════════════════
  // ESTUDIANTES
  // ══════════════════════════════════════════════════

  async function verEstudiantes() {
    if (!cursoActivo) { alert('Selecciona un curso primero.'); return; }
    const div = document.getElementById('admin-contenido');
    let html = renderNavCurso_();
    html += '<div class="card"><div class="spinner"></div> Cargando estudiantes...</div>';
    div.innerHTML = html;
    activarTab_('estudiantes');

    const resp = await API.listarEstudiantes(cursoActivo.id);
    if (!resp.ok) { div.innerHTML = renderNavCurso_() + '<div class="alerta alerta-error">' + resp.error + '</div>'; activarTab_('estudiantes'); return; }

    html = renderNavCurso_();
    html += '<div class="card"><h3 class="text-navy mb-3">Estudiantes (' + resp.data.estudiantes.length + ')</h3>';
    html += '<table class="tabla"><thead><tr><th></th><th>Nombre</th><th>Correo inst.</th><th>Correo pers.</th><th>Equipo</th><th>Rol</th></tr></thead><tbody>';
    resp.data.estudiantes.forEach(function(e) {
      html += '<tr>';
      html += '<td>' + (e.foto ? '<img class="avatar-sm" src="' + e.foto + '">' : '') + '</td>';
      html += '<td>' + e.nombre + '</td>';
      html += '<td class="text-sm">' + (e.correo_institucional || '') + '</td>';
      html += '<td class="text-sm">' + (e.correo_personal || '') + '</td>';
      html += '<td>' + (e.equipo_nombre || '<span class="text-light">Sin equipo</span>') + '</td>';
      html += '<td><span class="badge badge-navy">' + (e.rol || '') + '</span></td>';
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    div.innerHTML = html;
    activarTab_('estudiantes');
  }

  // ══════════════════════════════════════════════════
  // EQUIPOS
  // ══════════════════════════════════════════════════

  async function verEquipos() {
    if (!cursoActivo) { alert('Selecciona un curso primero.'); return; }
    const div = document.getElementById('admin-contenido');
    let html = renderNavCurso_();
    html += '<div class="card"><div class="spinner"></div> Cargando equipos...</div>';
    div.innerHTML = html;
    activarTab_('equipos');

    const resp = await API.listarEquipos(cursoActivo.id);
    if (!resp.ok) { div.innerHTML = renderNavCurso_() + '<div class="alerta alerta-error">' + resp.error + '</div>'; activarTab_('equipos'); return; }

    html = renderNavCurso_();
    html += '<div class="card"><h3 class="text-navy mb-3">Equipos (' + resp.data.equipos.length + ')</h3>';
    resp.data.equipos.forEach(function(eq) {
      html += '<div class="card card-accent mb-2"><div class="flex items-center justify-between">';
      html += '<div><strong>' + eq.nombreEmpresa + '</strong>' + (eq.nombreProducto ? ' — ' + eq.nombreProducto : '') + '</div>';
      html += '<span class="badge badge-navy">' + eq.integrantes + ' integrantes</span>';
      html += '</div>';
      if (eq.miembros) {
        html += '<div class="mt-2">';
        eq.miembros.forEach(function(m) {
          html += '<span class="text-sm" style="display:inline-block;margin-right:1rem">';
          html += (m.foto ? '<img class="avatar-sm" src="' + m.foto + '" style="vertical-align:middle;margin-right:4px">' : '');
          html += m.nombre + ' <span class="badge badge-orange">' + m.rol + '</span></span>';
        });
        html += '</div>';
      }
      html += '</div>';
    });
    html += '</div>';
    div.innerHTML = html;
    activarTab_('equipos');
  }

  // ══════════════════════════════════════════════════
  // RANKING
  // ══════════════════════════════════════════════════

  async function verRanking() {
    if (!cursoActivo) { alert('Selecciona un curso primero.'); return; }
    const div = document.getElementById('admin-contenido');
    let html = renderNavCurso_();
    html += '<div class="card"><div class="spinner"></div> Cargando ranking...</div>';
    div.innerHTML = html;
    activarTab_('ranking');

    const resp = await API.ranking();
    if (!resp.ok) {
      div.innerHTML = renderNavCurso_() + '<div class="alerta alerta-info">' + resp.error + '</div>';
      activarTab_('ranking');
      return;
    }

    const d = resp.data;
    html = renderNavCurso_();
    html += '<div class="card"><h3 class="text-navy mb-3">Ranking — Período ' + d.periodo + '</h3>';
    html += '<table class="tabla"><thead><tr><th>#</th><th>Empresa</th><th>Puntaje</th><th>Ingresos</th><th>Margen</th><th>Nota</th></tr></thead><tbody>';
    d.ranking.forEach(function(r) {
      html += '<tr><td><strong>' + r.posicion + '</strong></td><td>' + r.empresa + '</td><td>' + r.puntaje + '</td>';
      html += '<td>' + FrontUtils.moneda(r.ingresos || 0) + '</td>';
      html += '<td>' + (r.margen || 0) + '%</td><td>' + (r.nota ? r.nota.toFixed(1) : '-') + '</td></tr>';
    });
    html += '</tbody></table></div>';
    div.innerHTML = html;
    activarTab_('ranking');
  }

  // ══════════════════════════════════════════════════
  // ENTREGABLES Y CALIFICACIONES (próximamente)
  // ══════════════════════════════════════════════════

  function verEntregables() {
    if (!cursoActivo) { alert('Selecciona un curso primero.'); return; }
    const div = document.getElementById('admin-contenido');
    let html = renderNavCurso_();
    html += '<div class="card"><h3 class="text-navy">Vista integral de entregables</h3>';
    html += '<p class="text-secondary mt-2">Próximamente: panorama de decisiones, bitácoras, memorandos por equipo con estado de envío y acceso directo a corrección con rúbrica.</p></div>';
    div.innerHTML = html;
    activarTab_('entregables');
  }

  function verCalificaciones() {
    if (!cursoActivo) { alert('Selecciona un curso primero.'); return; }
    const div = document.getElementById('admin-contenido');
    let html = renderNavCurso_();
    html += '<div class="card"><h3 class="text-navy">Calificaciones</h3>';
    html += '<p class="text-secondary mt-2">Próximamente: cálculo de notas con pesos configurables, heteroevaluación, autoevaluación, exportación a Excel.</p></div>';
    div.innerHTML = html;
    activarTab_('calificaciones');
  }

  // ══════════════════════════════════════════════════
  // CIERRE PROGRAMADO
  // ══════════════════════════════════════════════════

  async function verCierreProgramado() {
    if (!cursoActivo) { alert('Selecciona un curso primero.'); return; }
    const div = document.getElementById('admin-contenido');
    let html = renderNavCurso_();
    html += '<div class="card"><div class="spinner"></div> Cargando configuración de cierre...</div>';
    div.innerHTML = html;
    activarTab_('cierre');

    const resp = await API.estadoCierre();

    html = renderNavCurso_();
    html += '<div class="card">';
    html += '<h3 class="text-navy mb-3">Cierre programado de sala</h3>';
    html += '<p class="text-sm text-secondary mb-3">Configura un cierre automático de la sala de decisiones. Los equipos que no hayan enviado su decisión definitiva recibirán una advertencia; el académico será notificado.</p>';

    const cierre = (resp.ok && resp.data) ? resp.data : {};

    // Formulario
    html += '<div class="flex gap-3 mb-3">';
    html += '<div style="flex:1"><label class="form-label">Día de cierre</label>';
    html += '<select class="form-input" id="cierre-dia">';
    ['lunes','martes','miércoles','jueves','viernes','sábado','domingo'].forEach(function(d, i) {
      const sel = cierre.dia === d ? ' selected' : '';
      html += '<option value="' + d + '"' + sel + '>' + d.charAt(0).toUpperCase() + d.slice(1) + '</option>';
    });
    html += '</select></div>';

    html += '<div style="flex:1"><label class="form-label">Hora de cierre</label>';
    html += '<input type="time" class="form-input" id="cierre-hora" value="' + (cierre.hora || '23:00') + '"></div>';
    html += '</div>';

    html += '<div class="form-grupo mb-3">';
    html += '<label style="display:flex;align-items:center;gap:6px;cursor:pointer">';
    html += '<input type="checkbox" id="cierre-forzar"' + (cierre.forzar ? ' checked' : '') + '>';
    html += '<span class="text-sm">Forzar cierre aunque haya equipos pendientes</span>';
    html += '</label></div>';

    // Estado actual
    if (cierre.activo) {
      html += '<div class="alerta alerta-info mb-3">Cierre programado <strong>activo</strong>: ' + cierre.dia + ' a las ' + cierre.hora + (cierre.forzar ? ' (forzado)' : '') + '</div>';
    }

    html += '<div class="flex gap-2">';
    html += '<button class="btn btn-primary" onclick="AdminApp.guardarCierre()">Activar cierre programado</button>';
    if (cierre.activo) {
      html += '<button class="btn btn-secondary" onclick="AdminApp.desactivarCierre()">Desactivar</button>';
    }
    html += '</div>';

    html += '</div>';
    div.innerHTML = html;
    activarTab_('cierre');
  }

  async function guardarCierre() {
    const dia = document.getElementById('cierre-dia').value;
    const hora = document.getElementById('cierre-hora').value;
    const forzar = document.getElementById('cierre-forzar').checked;

    const resp = await API.configurarCierre({
      cursoId: cursoActivo.id,
      activo: true,
      dia: dia,
      hora: hora,
      forzar: forzar
    });

    alert(resp.ok ? 'Cierre programado activado: ' + dia + ' a las ' + hora : resp.error);
    if (resp.ok) verCierreProgramado();
  }

  async function desactivarCierre() {
    const resp = await API.configurarCierre({
      cursoId: cursoActivo.id,
      activo: false
    });
    alert(resp.ok ? 'Cierre programado desactivado.' : resp.error);
    if (resp.ok) verCierreProgramado();
  }

  // ══════════════════════════════════════════════════
  // CONFIGURACIÓN DEL CURSO
  // ══════════════════════════════════════════════════

  function verConfiguracion() {
    if (!cursoActivo) { alert('Selecciona un curso primero.'); return; }
    const div = document.getElementById('admin-contenido');
    let html = renderNavCurso_();
    html += '<div class="card">';
    html += '<h3 class="text-navy mb-3">Configuración del curso</h3>';
    html += '<p class="text-secondary">Próximamente: cambiar industria, ajustar pesos de calificación, activar/desactivar módulos, configurar inducción.</p>';
    html += '</div>';
    div.innerHTML = html;
    activarTab_('config');
  }

  // ══════════════════════════════════════════════════
  // EXPORTAR PÚBLICO
  // ══════════════════════════════════════════════════

  return {
    init: init,
    verCursos: verCursos,
    seleccionarCurso: seleccionarCurso,
    verSimulacion: verSimulacion,
    formCrearCurso: formCrearCurso,
    mostrarDescIndustria: mostrarDescIndustria,
    crearCurso: crearCurso,
    verEstudiantes: verEstudiantes,
    verEquipos: verEquipos,
    verRanking: verRanking,
    verEntregables: verEntregables,
    verCalificaciones: verCalificaciones,
    verCierreProgramado: verCierreProgramado,
    guardarCierre: guardarCierre,
    desactivarCierre: desactivarCierre,
    verConfiguracion: verConfiguracion,
    abrirSala: abrirSala,
    cerrarSala: cerrarSala,
    procesarPeriodo: procesarPeriodo,
    publicarResultados: publicarResultados
  };

})();
