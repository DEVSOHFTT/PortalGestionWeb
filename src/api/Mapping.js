/**
 * ========================================================================
 * CONTROLLER_Mapping.gs
 * PROYECTO: Portal de Gestión - Defensoría del Pueblo
 * DESCRIPCIÓN: Lógica de transformación y saneamiento para Supabase.
 * ========================================================================
 */

/**
 * Mapeo de Agentes (RRHH)
 */
function syncAgente(reg) {
  const payload = {
    "id": parseString(obtenerValor(reg, ["Id", "IdAgente"])),
    "apellido": parseString(obtenerValor(reg, ["Apellido"])),
    "nombre": parseString(obtenerValor(reg, ["Nombre"])),
    "dni": parseString(obtenerValor(reg, ["DNI"])),
    "cuil": parseString(obtenerValor(reg, ["CUIL"])),
    "fecha_nacimiento": parseDate(obtenerValor(reg, ["FechaNacimiento"])),
    "genero_id": parseInteger(obtenerValor(reg, ["GeneroId", "Genero"])),
    "area_id": parseInteger(obtenerValor(reg, ["AreaId", "Area"])),
    "estado": parseBoolean(obtenerValor(reg, ["Estado", "Activo"]))
  };
  return upsertSupabase(DB_MAP.TABLAS.AGENTES, payload);
}

/**
 * Mapeo de Ciudadanos (Padrón)
 */
function syncCiudadano(reg) {
  const payload = {
    "id": parseString(obtenerValor(reg, ["Id", "IdCiudadano"])),
    "apellido": parseString(obtenerValor(reg, ["Apellido"])),
    "nombre": parseString(obtenerValor(reg, ["Nombre"])),
    "dni": parseString(obtenerValor(reg, ["DNI"])),
    "telefono": parseString(obtenerValor(reg, ["Telefono"])),
    "email": parseString(obtenerValor(reg, ["Email"])),
    "barrio_id": parseInteger(obtenerValor(reg, ["BarrioId", "Barrio"]))
  };
  return upsertSupabase(DB_MAP.TABLAS.CIUDADANOS, payload);
}

/**
 * Mapeo de Recepciones (La tabla maestra de Casos)
 */
function syncRecepcion(reg) {
  const payload = {
    "id": parseString(obtenerValor(reg, ["Id", "IdRecepcion"])),
    "reprogramado": parseBoolean(obtenerValor(reg, ["Reprogramado"])),
    "fecha_inicio": parseTimestamp(obtenerValor(reg, ["FechaInicio", "FechaHoraInicial"])),
    "ciudadano_id": parseString(obtenerValor(reg, ["Ciudadano", "IdCiudadano"])),
    "agente_origen_id": parseString(obtenerValor(reg, ["AgenteOrigen"])),
    "canal_id": parseInteger(obtenerValor(reg, ["CanalId", "Canal"])),
    "categoria_id": parseInteger(obtenerValor(reg, ["CategoriaId", "Categoria"])),
    "prioridad_id": parseInteger(obtenerValor(reg, ["PrioridadId", "Prioridad"])),
    "estado_id": parseInteger(obtenerValor(reg, ["EstadoId", "Estado"])),
    "area_destino_id": parseInteger(obtenerValor(reg, ["AreaDestinoId", "AreaDestino"])),
    "agente_responsable_id": parseString(obtenerValor(reg, ["AgenteResponsableId", "AgenteResponsable"])),
    "observaciones": parseString(obtenerValor(reg, ["Observaciones", "Detalle"]))
  };
  return upsertSupabase(DB_MAP.TABLAS.RECEPCIONES, payload);
}

/**
 * Mapeo de Actuaciones (Trámites Formales)
 */
function syncActuacion(reg) {
  const payload = {
    "id": parseString(obtenerValor(reg, ["Id", "IdActuacion"])),
    "recepcion_id": parseString(obtenerValor(reg, ["RecepcionID", "IdRecepcion"])),
    "fecha_inicio": parseTimestamp(obtenerValor(reg, ["FechaInicio", "FechaHora"])),
    "agente_id": parseString(obtenerValor(reg, ["AgenteId", "Agente"])),
    "estado_id": parseInteger(obtenerValor(reg, ["EstadoId", "Estado"])),
    "tramite_id": parseInteger(obtenerValor(reg, ["TramiteId", "Tramite"])),
    "observaciones": parseString(obtenerValor(reg, ["Observaciones"]))
  };
  return upsertSupabase(DB_MAP.TABLAS.ACTUACIONES, payload);
}

// ==========================================
// UTILIDADES DE SANEAMIENTO (INDISPENSABLES)
// ==========================================

function obtenerValor(reg, posiblesNombres) {
  for (let nombre of posiblesNombres) {
    let keyEncontrada = Object.keys(reg).find(k => k.toLowerCase() === nombre.toLowerCase());
    if (keyEncontrada && reg[keyEncontrada] !== "") return reg[keyEncontrada];
  }
  return null;
}

function parseString(v) { return v ? String(v).trim() : null; }
function parseInteger(v) { return v ? parseInt(v, 10) : null; }
function parseBoolean(v) { 
  if (typeof v === 'boolean') return v;
  return ["true", "1", "si", "verdadero"].includes(String(v).toLowerCase());
}
function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}
function parseTimestamp(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}