/**
 * ========================================================================
 * CONTROLLER_Ciudadanos.js
 * Módulo de Gestión de Ciudadanos - Defensoría del Pueblo
 * ========================================================================
 * CAMBIO ARQUITECTÓNICO: Implementación de validación JWT (Zero-Trust).
 * Todas las funciones requieren el token de sesión como primer parámetro.
 * ========================================================================
 */

function buscarCiudadanoBackend(jwtToken, valorBuscado) {
  try {
    validarSesionSupabase(jwtToken);
    valorBuscado = String(valorBuscado).trim();
    let query = (valorBuscado.length === 11 && !isNaN(valorBuscado))
      ? `?or=(cuil.eq.${valorBuscado},dni.eq.${valorBuscado},dni.eq.${valorBuscado.substring(2, 10)},dni.eq.${parseInt(valorBuscado.substring(2, 10), 10).toString()})&limit=1`
      : `?or=(dni.eq.${valorBuscado},cuil.eq.${valorBuscado})&limit=1`;

    const data = supabaseFetch("ciudadanos", "GET", null, query);
    if (!data || data.length === 0) return { encontrado: false, datos_externos: null };

    const c = data[0];
    const casosPrevios = (supabaseFetch("vw_detalle_recepcion", "GET", null, `?ciudadano_id=eq.${c.id}&order=fecha_inicio.desc`) || []).map(caso => ({
      id: caso.recepcion_id, fecha: formatSupabaseDate(caso.fecha_inicio).split(' ')[0], hora: formatSupabaseDate(caso.fecha_inicio).split(' ')[1] || '',
      estado: caso.estado || 'PENDIENTE', categoria: caso.categoria || 'Sin Categoría',
      area: caso.area_destino || caso.area_destino_nombre || 'Sin asignar', agente: caso.agente_responsable || caso.agente_responsable_nombre || 'Sin asignar', expediente: caso.expediente_codigo || caso.expediente_id || ''
    }));

    return { encontrado: true, data: { ciudadano_id: c.id, tipo_entidad_id: c.tipo_entidad_id || '', nombre: c.nombre || '', apellido: c.apellido || '', cuil: c.cuil || '', dni: c.dni || '', fecha_nacimiento: c.fecha_nacimiento || '', genero_id: c.genero_id || '', telefono: c.telefono || '', email: c.email || '', calle: c.calle || '', altura: c.altura || '', piso: c.piso || '', dpto: c.dpto || '', barrio_id: c.barrio_id || '', casos_previos: casosPrevios } };
  } catch(e) { throw new Error("Error: " + e.message); }
}

function obtenerFichaCompletaCiudadanoBackend(jwtToken, idCiudadano) {
  try {
    validarSesionSupabase(jwtToken);
    const cData = supabaseFetch("ciudadanos", "GET", null, `?id=eq.${idCiudadano}`);
    if(!cData || cData.length === 0) throw new Error("Ciudadano no encontrado.");
    const historial = (supabaseFetch("vw_detalle_recepcion", "GET", null, `?ciudadano_id=eq.${idCiudadano}&order=fecha_inicio.desc`) || []).map(caso => ({
      id: caso.recepcion_id, fecha: formatSupabaseDate(caso.fecha_inicio).split(' ')[0], hora: formatSupabaseDate(caso.fecha_inicio).split(' ')[1] || '',
      estado: caso.estado || 'PENDIENTE', categoria: caso.categoria || 'Sin Categoría', area: caso.area_destino || caso.area_destino_nombre || 'Sin asignar', agente: caso.agente_responsable || caso.agente_responsable_nombre || 'Sin asignar', expediente: caso.expediente_codigo || caso.expediente_id || ''
    }));
    return { success: true, ciudadano: cData[0], historial: historial };
  } catch(e) { return { success: false, message: e.message }; }
}

function actualizarCiudadanoBackend(jwtToken, payload) {
  try {
    validarSesionSupabase(jwtToken);
    const id = payload.id; delete payload.id;
    if (supabaseFetch("ciudadanos", "PATCH", payload, `?id=eq.${id}`).length > 0) return { success: true };
    return { success: false, message: "La base de datos rechazó la modificación." };
  } catch (e) { return { success: false, message: e.message }; }
}