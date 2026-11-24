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
        headers: { 'Content-Type': 'text/plain' }, // Apps Script no acepta application/json en CORS
        body: JSON.stringify(datos),
        redirect: 'follow' // Apps Script redirige en doPost
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
  // REGISTRO Y PERFIL
  // ══════════════════════════════════════════════════

  async function miPerfil() { return llamar('miPerfil'); }
  async function registrar(datos) { return llamar('registrar', datos); }
  async function actualizarPerfil(datos) { return llamar('actualizarPerfil', datos); }

  // ══════════════════════════════════════════════════
  // EQUIPOS
  // ══════════════════════════════════════════════════

  async function crearEquipo(datos) { return llamar('crearEquipo', datos); }
  async function unirseEquipo(codigo) { return llamar('unirseEquipo', { codigo: codigo }); }
  async function miEquipo() { return llamar('miEquipo'); }
  async function listarEquipos(cursoId) { return llamar('listarEquipos', { cursoId: cursoId }); }

  // ══════════════════════════════════════════════════
  // DECISIONES
  // ══════════════════════════════════════════════════

  async function guardarDecision(datos) { return llamar('guardarDecision', datos); }
  async function misDecisiones(periodo) { return llamar('misDecisiones', { periodo: periodo }); }
  async function enviarDefinitiva(periodo) { return llamar('enviarDefinitiva', { periodo: periodo }); }

  // ══════════════════════════════════════════════════
  // RESULTADOS
  // ══════════════════════════════════════════════════

  async function misResultados(periodo) { return llamar('misResultados', { periodo: periodo }); }
  async function ranking(periodo) { return llamar('ranking', { periodo: periodo }); }

  // ══════════════════════════════════════════════════
  // INFORMES DE MERCADO
  // ══════════════════════════════════════════════════

  async function comprarInforme(informeId) { return llamar('comprarInforme', { informeId: informeId }); }
  async function misInformes() { return llamar('misInformes'); }

  // ══════════════════════════════════════════════════
  // INDUCCIÓN Y MATERIALES
  // ══════════════════════════════════════════════════

  async function estadoInduccion() { return llamar('estadoInduccion'); }
  async function contenidoLectura(materialId) { return llamar('contenidoLectura', { materialId: materialId }); }
  async function registrarPagina(materialId, pagina) { return llamar('registrarPagina', { materialId: materialId, pagina: pagina }); }
  async function responderControl(materialId, respuestas) { return llamar('responderControl', { materialId: materialId, respuestas: respuestas }); }
  async function listarMateriales(fase) { return llamar('listarMateriales', { fase: fase || 'todos' }); }
  async function descargarMaterial(materialId) { return llamar('descargarMaterial', { materialId: materialId }); }

  // ══════════════════════════════════════════════════
  // CALIFICACIONES
  // ══════════════════════════════════════════════════

  async function misCalificaciones() { return llamar('misCalificaciones'); }

  // ══════════════════════════════════════════════════
  // CIERRE PROGRAMADO (ADMIN)
  // ══════════════════════════════════════════════════

  async function configurarCierre(datos) { return llamar('configurarCierre', datos); }
  async function estadoCierre(cursoId) { return llamar('estadoCierre', { cursoId: cursoId }); }

  // ══════════════════════════════════════════════════
  // ADMIN
  // ══════════════════════════════════════════════════

  async function panelAcademico() { return llamar('panelAcademico'); }
  async function crearCurso(datos) { return llamar('crearCurso', datos); }
  async function configurarCurso(datos) { return llamar('configurarCurso', datos); }
  async function listarEstudiantes(cursoId, filtro) { return llamar('listarEstudiantes', { cursoId: cursoId, filtro: filtro }); }
  async function asignarEquipo(datos) { return llamar('asignarEquipo', datos); }
  async function abrirSala(cursoId) { return llamar('abrirSala', { cursoId: cursoId }); }
  async function cerrarSala(cursoId, forzar) { return llamar('cerrarSala', { cursoId: cursoId, forzar: forzar }); }
  async function procesarPeriodo(cursoId) { return llamar('procesarPeriodo', { cursoId: cursoId }); }
  async function publicarResultados(cursoId) { return llamar('publicarResultados', { cursoId: cursoId }); }

  return {
    configurar: configurar,
    llamar: llamar,
    ping: ping,
    // Registro y perfil
    miPerfil: miPerfil,
    registrar: registrar,
    actualizarPerfil: actualizarPerfil,
    // Equipos
    crearEquipo: crearEquipo,
    unirseEquipo: unirseEquipo,
    miEquipo: miEquipo,
    listarEquipos: listarEquipos,
    // Decisiones
    guardarDecision: guardarDecision,
    misDecisiones: misDecisiones,
    enviarDefinitiva: enviarDefinitiva,
    // Resultados
    misResultados: misResultados,
    ranking: ranking,
    // Informes
    comprarInforme: comprarInforme,
    misInformes: misInformes,
    // Inducción y materiales
    estadoInduccion: estadoInduccion,
    contenidoLectura: contenidoLectura,
    registrarPagina: registrarPagina,
    responderControl: responderControl,
    listarMateriales: listarMateriales,
    descargarMaterial: descargarMaterial,
    // Calificaciones
    misCalificaciones: misCalificaciones,
    // Cierre programado
    configurarCierre: configurarCierre,
    estadoCierre: estadoCierre,
    // Admin
    panelAcademico: panelAcademico,
    crearCurso: crearCurso,
    configurarCurso: configurarCurso,
    listarEstudiantes: listarEstudiantes,
    asignarEquipo: asignarEquipo,
    abrirSala: abrirSala,
    cerrarSala: cerrarSala,
    procesarPeriodo: procesarPeriodo,
    publicarResultados: publicarResultados
  };

})();
