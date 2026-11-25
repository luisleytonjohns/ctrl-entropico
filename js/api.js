/**
 * CTRL ENTROPICO — api.js
 * Comunicación con el backend (Apps Script).
 * Todas las llamadas al servidor pasan por aquí.
 */

const API = (function() {

  // URL de la web app de Apps Script (se configura al desplegar)
  let BASE_URL = '';

  /**
   * Configura la URL base del backend.
   * @param {string} url
   */
  function configurar(url) {
    BASE_URL = url;
  }

  /**
   * Envía una petición al backend.
   * @param {string} accion - Nombre de la acción (ej. 'miPerfil', 'guardarDecision')
   * @param {Object} [datos={}] - Parámetros adicionales
   * @returns {Promise<Object>} Respuesta del backend { ok, data, error }
   */
  async function llamar(accion, datos) {
    datos = datos || {};
    datos.accion = accion;
    datos.token = Auth.token();

    try {
      const resp = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(datos),
        redirect: 'follow'
      });

      if (!resp.ok) {
        return { ok: false, error: 'Error de red: ' + resp.status };
      }

      const json = await resp.json();
      return json;

    } catch (err) {
      console.error('Error API:', accion, err);
      return { ok: false, error: 'No se pudo conectar con el servidor.' };
    }
  }

  /**
   * Verifica que el backend esté disponible.
   * @returns {Promise<boolean>}
   */
  async function ping() {
    const resp = await llamar('ping');
    return resp.ok === true;
  }

  // ══════════════════════════════════════════════════
  // ATAJOS: REGISTRO Y PERFIL
  // ══════════════════════════════════════════════════

  async function miPerfil() { return llamar('miPerfil'); }
  async function registrar(datos) { return llamar('registrar', datos); }
  async function actualizarPerfil(datos) { return llamar('actualizarPerfil', datos); }

  // ══════════════════════════════════════════════════
  // ATAJOS: EQUIPOS
  // ══════════════════════════════════════════════════

  async function crearEquipo(datos) { return llamar('crearEquipo', datos); }
  async function unirseEquipo(codigo) { return llamar('unirseEquipo', { codigo: codigo }); }
  async function miEquipo() { return llamar('miEquipo'); }
  async function listarEquipos(cursoId) { return llamar('listarEquipos', { cursoId: cursoId }); }

  // ══════════════════════════════════════════════════
  // ATAJOS: DECISIONES
  // ══════════════════════════════════════════════════

  async function catalogoVariables() { return llamar('catalogoVariables'); }
  async function guardarDecision(datos) { return llamar('guardarDecision', datos); }
  async function misDecisiones(periodo) { return llamar('misDecisiones', { periodo: periodo }); }
  async function enviarDefinitiva(periodo) { return llamar('enviarDefinitiva', { periodo: periodo }); }

  // ══════════════════════════════════════════════════
  // ATAJOS: RESULTADOS E INFORMES
  // ══════════════════════════════════════════════════

  async function misResultados(periodo) { return llamar('misResultados', { periodo: periodo }); }
  async function ranking(periodo) { return llamar('ranking', { periodo: periodo }); }
  async function comprarInforme(informeId) { return llamar('comprarInforme', { informeId: informeId }); }

  // ══════════════════════════════════════════════════
  // ATAJOS: INDUCCIÓN Y MATERIALES
  // ══════════════════════════════════════════════════

  async function estadoInduccion() { return llamar('estadoInduccion'); }
  async function contenidoLectura(datos) { return llamar('contenidoLectura', datos); }
  async function registrarPagina(datos) { return llamar('registrarPagina', datos); }
  async function responderControl(datos) { return llamar('responderControl', datos); }
  async function listarMateriales() { return llamar('listarMateriales'); }
  async function descargarMaterial(datos) { return llamar('descargarMaterial', datos); }

  // ══════════════════════════════════════════════════
  // ATAJOS: PERIÓDICO VOX LIBER
  // ══════════════════════════════════════════════════

  async function obtenerPeriodico(cursoId, periodo) { return llamar('obtenerPeriodico', { cursoId: cursoId, periodo: periodo }); }
  async function listarPeriodicos(cursoId) { return llamar('listarPeriodicos', { cursoId: cursoId }); }
  async function generarPeriodico(cursoId, periodo) { return llamar('generarPeriodico', { cursoId: cursoId, periodo: periodo }); }

  // ══════════════════════════════════════════════════
  // ATAJOS: DISEÑO ESTRATÉGICO
  // ══════════════════════════════════════════════════

  async function opcionesDisenoEstrategico(cursoId) { return llamar('opcionesDisenoEstrategico', { cursoId: cursoId }); }
  async function guardarDisenoEstrategico(datos) { return llamar('guardarDisenoEstrategico', datos); }
  async function obtenerDisenoEstrategico(cursoId) { return llamar('obtenerDisenoEstrategico', { cursoId: cursoId }); }

  // ══════════════════════════════════════════════════
  // ATAJOS: CALIFICACIONES
  // ══════════════════════════════════════════════════

  async function misCalificaciones() { return llamar('misCalificaciones'); }

  // ══════════════════════════════════════════════════
  // ATAJOS: ADMIN / ACADÉMICO
  // ══════════════════════════════════════════════════

  async function panelAcademico() { return llamar('panelAcademico'); }
  async function crearCurso(datos) { return llamar('crearCurso', datos); }
  async function configurarCurso(datos) { return llamar('configurarCurso', datos); }
  async function listarEstudiantes(cursoId) { return llamar('listarEstudiantes', { cursoId: cursoId }); }
  async function asignarEquipo(datos) { return llamar('asignarEquipo', datos); }
  async function abrirSala() { return llamar('abrirSala'); }
  async function cerrarSala() { return llamar('cerrarSala'); }
  async function procesarPeriodo() { return llamar('procesarPeriodo'); }
  async function publicarResultados() { return llamar('publicarResultados'); }
  async function configurarCierre(datos) { return llamar('configurarCierre', datos); }
  async function estadoCierre() { return llamar('estadoCierre'); }

  return {
    configurar: configurar,
    llamar: llamar,
    ping: ping,
    // Registro
    miPerfil: miPerfil,
    registrar: registrar,
    actualizarPerfil: actualizarPerfil,
    // Equipos
    crearEquipo: crearEquipo,
    unirseEquipo: unirseEquipo,
    miEquipo: miEquipo,
    listarEquipos: listarEquipos,
    // Decisiones
    catalogoVariables: catalogoVariables,
    guardarDecision: guardarDecision,
    misDecisiones: misDecisiones,
    enviarDefinitiva: enviarDefinitiva,
    // Resultados
    misResultados: misResultados,
    ranking: ranking,
    comprarInforme: comprarInforme,
    // Inducción
    estadoInduccion: estadoInduccion,
    contenidoLectura: contenidoLectura,
    registrarPagina: registrarPagina,
    responderControl: responderControl,
    listarMateriales: listarMateriales,
    descargarMaterial: descargarMaterial,
    // Periódico Vox Liber
    obtenerPeriodico: obtenerPeriodico,
    listarPeriodicos: listarPeriodicos,
    generarPeriodico: generarPeriodico,
    // Diseño estratégico
    opcionesDisenoEstrategico: opcionesDisenoEstrategico,
    guardarDisenoEstrategico: guardarDisenoEstrategico,
    obtenerDisenoEstrategico: obtenerDisenoEstrategico,
    // Calificaciones
    misCalificaciones: misCalificaciones,
    // Admin
    panelAcademico: panelAcademico,
    crearCurso: crearCurso,
    configurarCurso: configurarCurso,
    listarEstudiantes: listarEstudiantes,
    asignarEquipo: asignarEquipo,
    abrirSala: abrirSala,
    cerrarSala: cerrarSala,
    procesarPeriodo: procesarPeriodo,
    publicarResultados: publicarResultados,
    configurarCierre: configurarCierre,
    estadoCierre: estadoCierre
  };

})();
