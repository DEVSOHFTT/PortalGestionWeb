// src/core/Config.js

/**
 * ========================================================================
 * Config.gs
 * PROYECTO: Portal de Gestión - Defensoría del Pueblo
 * ========================================================================
 */

const DB_MAP = {
  VISTAS: {
    BANDEJA: "vw_bandeja_casos",
    DETALLE: "vw_detalle_recepcion",
    HISTORIAL: "vw_historial_actuaciones",
    INTERACCIONES: "vw_historial_interacciones", 
    BUSCADOR_CIU: "vw_buscador_ciudadanos"
  },
  TABLAS: {
    RECEPCIONES: "recepciones",
    ACTUACIONES: "actuaciones",
    CIUDADANOS: "ciudadanos",
    AGENTES: "agentes",
    INTERACCIONES: "archivos_recepciones", 
    USUARIOS: "usuarios"
  }
};

const ESTADOS = {
  // FIX: Solo mantenemos los 4 estados activos de la regla de negocio
  RECEPCION: { ASIGNADO: 1, DERIVADO: 2, FINALIZADO: 3, PENDIENTE: 4 },
  EXPEDIENTE: { ABIERTO: 1, CERRADO: 2 },
  ACTUACION: { INICIADA: 1, SUSPENDIDA: 2, FINALIZADA: 3, ANULADA: 4 }
};

function logDebug(mensaje, objeto = null) {
  const modoDesarrollo = true; 
  if (modoDesarrollo) {
    if (objeto) Logger.log(`${mensaje} => ${JSON.stringify(objeto, null, 2)}`);
    else Logger.log(mensaje);
  }
}