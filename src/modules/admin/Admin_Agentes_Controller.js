/**
 * ========================================================================
 * Admin_Agentes_Controller.js
 * ABM de Agentes — Defensoría del Pueblo
 * ========================================================================
 */

function obtenerDiccionariosAgentes() {
  try {
    return {
      success: true,
      data: {
        generos:      supabaseFetch('generos', 'GET', null, '?order=id.asc'),
        estados_civil: supabaseFetch('estados_civil', 'GET', null, '?order=id.asc'),
        niveles_estudio: supabaseFetch('niveles_estudio', 'GET', null, '?order=id.asc'),
        modalidades:  supabaseFetch('modalidades_contratacion', 'GET', null, '?order=id.asc'),
        delegaciones: supabaseFetch('delegaciones', 'GET', null, '?order=nombre.asc'),
        areas:        supabaseFetch('areas', 'GET', null, '?order=nombre.asc'),
        cargos:       supabaseFetch('cargos', 'GET', null, '?order=nombre.asc')
      }
    };
  } catch (e) { return { success: false, message: e.message }; }
}

function listarAgentesBackend(filtros) {
  try {
    let query = '?order=apellido.asc&limit=200';
    if (filtros && filtros.area_id) query += `&area_id=eq.${filtros.area_id}`;
    if (filtros && filtros.estado !== undefined && filtros.estado !== '') query += `&estado=eq.${filtros.estado}`;

    const data = supabaseFetch('agentes', 'GET', null, query);
    return { success: true, data: data || [] };
  } catch (e) { return { success: false, message: e.message }; }
}

function obtenerAgenteBackend(id) {
  try {
    const data = supabaseFetch('agentes', 'GET', null, `?id=eq.${id}&limit=1`);
    if (!data || data.length === 0) throw new Error('Agente no encontrado.');
    return { success: true, data: data[0] };
  } catch (e) { return { success: false, message: e.message }; }
}

function guardarAgenteBackend(payload) {
  try {
    const id = payload.id;

    // Sanitizar campos numéricos
    const camposInt = ['genero_id','estado_civil_id','nivel_estudio_id','modalidad_id','delegacion_id','area_id','cargo_id','hijos_a_cargo','horas_laborales'];
    camposInt.forEach(c => { if (payload[c] !== null && payload[c] !== '' && payload[c] !== undefined) payload[c] = parseInt(payload[c]); else payload[c] = null; });

    // Sanitizar booleanos
    payload.estado = payload.estado !== false && payload.estado !== 'false';
    payload.discapacidad = payload.discapacidad === true || payload.discapacidad === 'true';

    if (id) {
      // UPDATE
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.auth_id;
      const res = supabaseFetch('agentes', 'PATCH', payload, `?id=eq.${id}`);
      if (res && res.length > 0) return { success: true, message: 'Agente actualizado.', data: res[0] };
      return { success: false, message: 'No se pudo actualizar.' };
    } else {
      // INSERT
      delete payload.id;
      const res = supabaseFetch('agentes', 'POST', payload);
      if (res && res.length > 0) return { success: true, message: 'Agente creado exitosamente.', data: res[0] };
      return { success: false, message: 'No se pudo crear.' };
    }
  } catch (e) { return { success: false, message: e.message }; }
}

function toggleEstadoAgenteBackend(id, nuevoEstado) {
  try {
    const res = supabaseFetch('agentes', 'PATCH', { estado: nuevoEstado }, `?id=eq.${id}`);
    if (res && res.length > 0) return { success: true, message: nuevoEstado ? 'Agente activado.' : 'Agente desactivado.' };
    return { success: false, message: 'No se pudo cambiar el estado.' };
  } catch (e) { return { success: false, message: e.message }; }
}
