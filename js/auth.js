/**
 * CTRL ENTROPICO — auth.js
 * Autenticación con Google Sign-In (GSI).
 * Gestiona login, sesión y datos del usuario.
 */

const Auth = (function() {

  const GOOGLE_CLIENT_ID = '740126822035-nl9u7q25o7os4i73nolq4rpn0gsado9g.apps.googleusercontent.com';
  const STORAGE_KEY = 'ce_session';

  let usuario = null;
  let onLoginCallback = null;
  let onLogoutCallback = null;

  /**
   * Inicializa Google Sign-In.
   * @param {Object} opts - { onLogin: fn, onLogout: fn }
   */
  function init(opts) {
    onLoginCallback = opts.onLogin || function() {};
    onLogoutCallback = opts.onLogout || function() {};

    // Intentar restaurar sesión
    const sesionGuardada = localStorage.getItem(STORAGE_KEY);
    if (sesionGuardada) {
      try {
        const datos = JSON.parse(sesionGuardada);
        // Verificar que no esté expirada (tokens de Google duran ~1 hora)
        if (datos.expira && Date.now() < datos.expira) {
          usuario = datos;
          onLoginCallback(usuario);
          return;
        }
      } catch (e) { /* sesión corrupta, ignorar */ }
      localStorage.removeItem(STORAGE_KEY);
    }

    // Cargar la librería de Google Identity Services
    cargarGSI_();
  }

  /**
   * Carga el script de Google Identity Services.
   */
  function cargarGSI_() {
    if (document.getElementById('gsi-script')) return;

    const script = document.createElement('script');
    script.id = 'gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = function() {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredential_,
        auto_select: false
      });
      // Renderizar botón pendiente si ya se pidió
      if (botonPendiente_) {
        mostrarBotonLogin(botonPendiente_);
        botonPendiente_ = null;
      }
    };
    document.head.appendChild(script);
  }

  let botonPendiente_ = null;

  /**
   * Muestra el botón de Google Sign-In en un contenedor.
   * @param {string|HTMLElement} contenedor - ID o elemento
   */
  function mostrarBotonLogin(contenedor) {
    const el = typeof contenedor === 'string' ? document.getElementById(contenedor) : contenedor;
    if (!el) return;

    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      google.accounts.id.renderButton(el, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        locale: 'es',
        width: el.offsetWidth || 300
      });
    } else {
      // GSI aún no cargó, guardar referencia para renderizar después
      botonPendiente_ = contenedor;
    }
  }

  /**
   * Login manual (fallback si GSI no renderiza).
   */
  function loginManual() {
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.prompt();
    }
  }

  /**
   * Callback cuando Google devuelve la credencial.
   * @param {Object} response - { credential: "JWT token" }
   */
  function handleCredential_(response) {
    const idToken = response.credential;

    // Decodificar el JWT para obtener datos básicos (sin verificar; eso lo hace el backend)
    const payload = decodeJWT_(idToken);

    usuario = {
      token: idToken,
      email: payload.email,
      nombre: payload.name || '',
      foto: payload.picture || '',
      expira: (payload.exp || 0) * 1000 // convertir a milisegundos
    };

    // Guardar sesión
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usuario));

    onLoginCallback(usuario);
  }

  /**
   * Decodifica un JWT (solo el payload, sin verificar firma).
   * La verificación real la hace el backend.
   */
  function decodeJWT_(token) {
    try {
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload;
    } catch (e) {
      return {};
    }
  }

  /**
   * Cierra sesión.
   */
  function logout() {
    usuario = null;
    localStorage.removeItem(STORAGE_KEY);
    if (typeof google !== 'undefined' && google.accounts) {
      google.accounts.id.disableAutoSelect();
    }
    onLogoutCallback();
  }

  /**
   * Retorna el token actual para enviar al backend.
   * @returns {string|null}
   */
  function token() {
    return usuario ? usuario.token : null;
  }

  /**
   * Retorna los datos del usuario actual.
   * @returns {Object|null}
   */
  function usuarioActual() {
    return usuario;
  }

  /**
   * Verifica si hay sesión activa.
   * @returns {boolean}
   */
  function estaLogueado() {
    return usuario !== null && usuario.token !== null;
  }

  return {
    init: init,
    mostrarBotonLogin: mostrarBotonLogin,
    loginManual: loginManual,
    logout: logout,
    token: token,
    usuarioActual: usuarioActual,
    estaLogueado: estaLogueado
  };

})();
