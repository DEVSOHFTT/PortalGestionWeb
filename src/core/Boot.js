// src/core/Boot.js

/**
 * ========================================================================
 * Boot.js - Core de Arranque del Sistema
 * ========================================================================
 * Este script solo carga información transversal (Sesión, Permisos, Notificaciones Globales).
 * CADA MÓDULO (ATC, INV, RRHH) debe tener su propio método de inicialización para
 * traer sus diccionarios y bandejas de forma asíncrona.
 */

function bootSystemBackend(idAgente, idArea) {
  try {
    const payload = {
      notificaciones: [],
      totalNotificaciones: 0,
      diccionariosGlobales: {}
    };

    // 1. CARGAMOS NOTIFICACIONES GLOBALES (Si el motor de notificaciones es transversal)
    // Nota: Si las notificaciones son exclusivas de ATC, esto también debería moverse a ATC_Controller.
    const notis = obtenerNotificacionesBackend(idAgente, idArea);
    payload.notificaciones = notis.success ? notis.lista : [];
    payload.totalNotificaciones = notis.success ? notis.total : 0;

    // 2. DICCIONARIOS ESTRUCTURALES (Solo áreas y agentes, que se usan en todo el sistema)
    payload.diccionariosGlobales.areas = supabaseFetch("areas", "GET", null, "?select=id,nombre&order=nombre.asc");
    payload.diccionariosGlobales.agentes = supabaseFetch("agentes", "GET", null, "?select=id,nombre,apellido&estado=eq.true&order=apellido.asc");

    return { success: true, data: payload };

  } catch (e) {
    Logger.log("Fallo crítico en bootSystemBackend (REST): " + e.message);
    return { success: false, message: e.message };
  }
}

function formatSupabaseDate(isoString) {
  if (!isoString) return "S/D";
  try {
    const d = new Date(isoString);
    return Utilities.formatDate(d, "GMT-3", "dd/MM/yyyy HH:mm");
  } catch(e) { return isoString.substring(0, 10); }
}