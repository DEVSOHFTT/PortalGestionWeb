/**
 * ========================================================================
 * Admin_Agentes_Controller.js
 * ABM de Agentes — Defensoría del Pueblo
 * ========================================================================
 */

function obtenerDiccionariosAgentes(jwtToken) {
  try {
    validarSesionSupabase(jwtToken);
    return { success: true, data: {
      generos:      supabaseFetch('generos', 'GET', null, '?order=id.asc'),
      estados_civil: supabaseFetch('estados_civil', 'GET', null, '?order=id.asc'),
      niveles_estudio: supabaseFetch('niveles_estudio', 'GET', null, '?order=id.asc'),
      modalidades:  supabaseFetch('modalidades_contratacion', 'GET', null, '?order=id.asc'),
      delegaciones: supabaseFetch('delegaciones', 'GET', null, '?order=nombre.asc'),
      areas:        supabaseFetch('areas', 'GET', null, '?order=nombre.asc'),
      cargos:       supabaseFetch('cargos', 'GET', null, '?order=nombre.asc')
    }};
  } catch (e) { return { success: false, message: e.message }; }
}

function listarAgentesBackend(jwtToken, filtros) {
  try {
    validarSesionSupabase(jwtToken);
    let query = '?order=apellido.asc&limit=200';
    if (filtros && filtros.area_id) query += `&area_id=eq.${filtros.area_id}`;
    if (filtros && filtros.estado !== undefined && filtros.estado !== '') query += `&estado=eq.${filtros.estado}`;
    return { success: true, data: supabaseFetch('agentes', 'GET', null, query) || [] };
  } catch (e) { return { success: false, message: e.message }; }
}

function obtenerAgenteBackend(jwtToken, id) {
  try {
    validarSesionSupabase(jwtToken);
    const data = supabaseFetch('agentes', 'GET', null, `?id=eq.${id}&limit=1`);
    if (!data || data.length === 0) throw new Error('Agente no encontrado.');
    return { success: true, data: data[0] };
  } catch (e) { return { success: false, message: e.message }; }
}

function guardarAgenteBackend(jwtToken, payload) {
  try {
    validarSesionSupabase(jwtToken);
    const id = payload.id;
    const camposInt = ['genero_id','estado_civil_id','nivel_estudio_id','modalidad_id','delegacion_id','area_id','cargo_id','hijos_a_cargo','horas_laborales'];
    camposInt.forEach(c => { payload[c] = (payload[c]) ? parseInt(payload[c]) : null; });
    payload.estado = payload.estado !== false && payload.estado !== 'false';
    payload.discapacidad = payload.discapacidad === true || payload.discapacidad === 'true';

    if (id) {
      delete payload.id; delete payload.created_at; delete payload.updated_at; delete payload.auth_id;
      if (supabaseFetch('agentes', 'PATCH', payload, `?id=eq.${id}`).length > 0) return { success: true, message: 'Agente actualizado.' };
      return { success: false, message: 'No se pudo actualizar.' };
    } else {
      delete payload.id;
      if (supabaseFetch('agentes', 'POST', payload).length > 0) return { success: true, message: 'Agente creado.' };
      return { success: false, message: 'No se pudo crear.' };
    }
  } catch (e) { return { success: false, message: e.message }; }
}

function toggleEstadoAgenteBackend(jwtToken, id, nuevoEstado) {
  try {
    validarSesionSupabase(jwtToken);
    if (supabaseFetch('agentes', 'PATCH', { estado: nuevoEstado }, `?id=eq.${id}`).length > 0) return { success: true, message: 'Estado modificado.' };
    return { success: false, message: 'Fallo al actualizar.' };
  } catch (e) { return { success: false, message: e.message }; }
}