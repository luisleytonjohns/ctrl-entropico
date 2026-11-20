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
  // ATAJOS PARA ACCIONES FRECUENTES
  // ══════════════════════════════════════════════════

  async function miPerfil() { return llamar('miPerfil'); }

  async function registrar(datos) { return llamar('registrar', datos); }

  async function actualizarPerfil(datos) { return llamar('actualizarPerfil', datos); }

  async function crearEquipo(datos) { return llamar('crearEquipo', datos); }

  async function unirseEquipo(codigo) { return llamar('unirseEquipo', { codigo: codigo }); }

  async function miEquipo() { return llamar('miEquipo'); }

  async function listarEquipos(cursoId) { return llamar('listarEquipos', { cursoId: cursoId }); }

  async function guardarDecision(datos) { return llamar('guardarDecision', datos); }

  async function misDecisiones(periodo) { return llamar('misDecisiones', { periodo: periodo }); }

  async function enviarDefinitiva(periodo) { return llamar('enviarDefinitiva', { periodo: periodo }); }

  async function misResultados(periodo) { return llamar('misResultados', { periodo: periodo }); }

  async function ranking(periodo) { return llamar('ranking', { periodo: periodo }); }

  async function comprarInforme(informeId) { return llamar('comprarInforme', { informeId: informeId }); }

  return {
    configurar: configurar,
    llamar: llamar,
    ping: ping,
    miPerfil: miPerfil,
    registrar: registrar,
    actualizarPerfil: actualizarPerfil,
    crearEquipo: crearEquipo,
    unirseEquipo: unirseEquipo,
    miEquipo: miEquipo,
    listarEquipos: listarEquipos,
    guardarDecision: guardarDecision,
    misDecisiones: misDecisiones,
    enviarDefinitiva: enviarDefinitiva,
    misResultados: misResultados,
    ranking: ranking,
    comprarInforme: comprarInforme
  };

})();
