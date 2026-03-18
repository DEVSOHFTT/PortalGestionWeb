/**
 * ========================================================================
 * CONTROLLER_Usuarios.js
 * Módulo de Gestión de Usuarios — Defensoría del Pueblo
 * ========================================================================
 * Usa la Supabase Auth Admin API (service_role) para crear usuarios.
 * NUNCA insertar directo en auth.users — GoTrue necesita crear el registro.
 *
 * Solo accesible para tipo_usuario_id = 1 (Sistemas)
 * ========================================================================
 */

function crearUsuarioSistema(jwtToken, payload) {
  try {
    validarSesionSupabase(jwtToken); // Idealmente validar que el usuario que ejecuta sea admin
    const config = _getSupabaseConfig();
    const dni = String(payload.dni).trim();
    if (!dni || !payload.password || payload.password.length < 6) throw new Error('Credenciales inválidas.');

    const agentes = supabaseFetch('agentes', 'GET', null, `?dni=eq.${dni}&estado=eq.true&limit=1`);
    if (!agentes || agentes.length === 0) throw new Error('Agente inexistente.');
    if (agentes[0].auth_id) throw new Error('Este agente ya tiene un usuario asignado.');

    const email = dni + '@defensoria.local';
    const authResponse = UrlFetchApp.fetch(`${config.url}/auth/v1/admin/users`, {
      method: 'POST',
      headers: { 'apikey': config.key, 'Authorization': 'Bearer ' + config.key, 'Content-Type': 'application/json' },
      payload: JSON.stringify({ email: email, password: payload.password, email_confirm: true }),
      muteHttpExceptions: true
    });

    if (authResponse.getResponseCode() >= 300) throw new Error('Error Auth: ' + authResponse.getContentText());
    const authId = JSON.parse(authResponse.getContentText()).id;

    supabaseFetch('agentes', 'PATCH', { auth_id: authId }, `?id=eq.${agentes[0].id}`);
    const usuarioRes = supabaseFetch('usuarios', 'POST', { username: dni, password_hash: '***', agente_id: agentes[0].id, tipo_usuario_id: payload.tipo_usuario_id || 4, estado: true });
    
    if (payload.permisos_ids && payload.permisos_ids.length > 0) {
      supabaseFetch('usuarios_permisos', 'POST', payload.permisos_ids.map(pid => ({ usuario_id: usuarioRes[0].id, permiso_id: parseInt(pid) })));
    }
    return { success: true, message: `Usuario creado.` };
  } catch (e) { return { success: false, message: e.message }; }
}

function listarUsuariosSistema(jwtToken) {
  try { validarSesionSupabase(jwtToken); return { success: true, data: supabaseFetch('v_user', 'GET', null, '?select=id,username,estado,tipo_usuario_id,nombre,apellido,area_id,accesos&order=apellido.asc') || [] }; } catch (e) { return { success: false, message: e.message }; }
}

function obtenerDiccionariosUsuarios(jwtToken) {
  try {
    validarSesionSupabase(jwtToken);
    return { success: true, data: {
      agentes_sin_usuario: supabaseFetch('agentes', 'GET', null, '?estado=eq.true&auth_id=is.null&select=id,dni,nombre,apellido,area_id&order=apellido.asc') || [],
      tipos_usuario: supabaseFetch('tipos_usuario', 'GET', null, '?select=*&order=id.asc') || [],
      permisos: supabaseFetch('permisos', 'GET', null, '?select=*&order=clave_tecnica.asc') || [],
      areas: supabaseFetch('areas', 'GET', null, '?select=id,nombre&order=nombre.asc') || []
    }};
  } catch (e) { return { success: false, message: e.message }; }
}

function desactivarUsuario(jwtToken, usuarioId) {
  try { validarSesionSupabase(jwtToken); supabaseFetch('usuarios', 'PATCH', { estado: false }, `?id=eq.${usuarioId}`); return { success: true, message: 'Usuario desactivado.' }; } catch (e) { return { success: false, message: e.message }; }
}

function reactivarUsuario(jwtToken, usuarioId) {
  try { validarSesionSupabase(jwtToken); supabaseFetch('usuarios', 'PATCH', { estado: true }, `?id=eq.${usuarioId}`); return { success: true, message: 'Usuario reactivado.' }; } catch (e) { return { success: false, message: e.message }; }
}

function resetearPasswordUsuario(jwtToken, dni, nuevoPassword) {
  try {
    validarSesionSupabase(jwtToken);
    const config = _getSupabaseConfig();
    const listRes = UrlFetchApp.fetch(`${config.url}/auth/v1/admin/users?email=${encodeURIComponent(dni + '@defensoria.local')}`, { method: 'GET', headers: { 'apikey': config.key, 'Authorization': 'Bearer ' + config.key }, muteHttpExceptions: true });
    const users = JSON.parse(listRes.getContentText());
    if (!users || !users.users || users.users.length === 0) throw new Error('No se encontró usuario de autenticación.');

    const updateRes = UrlFetchApp.fetch(`${config.url}/auth/v1/admin/users/${users.users[0].id}`, {
      method: 'PUT', headers: { 'apikey': config.key, 'Authorization': 'Bearer ' + config.key, 'Content-Type': 'application/json' },
      payload: JSON.stringify({ password: nuevoPassword }), muteHttpExceptions: true
    });
    if (updateRes.getResponseCode() >= 300) throw new Error('Error al resetear.');
    return { success: true, message: 'Contraseña actualizada.' };
  } catch (e) { return { success: false, message: e.message }; }
}

function obtenerUsuarioConPermisos(jwtToken, usuarioId) {
  try {
    validarSesionSupabase(jwtToken);
    const u = supabaseFetch('v_user', 'GET', null, `?id=eq.${usuarioId}&limit=1`);
    if (!u || u.length===0) throw new Error('Usuario no encontrado.');
    return { success: true, data: {
      usuario: u[0],
      permisos_actuales: (supabaseFetch('usuarios_permisos', 'GET', null, `?usuario_id=eq.${usuarioId}&select=permiso_id`) || []).map(p => p.permiso_id),
      todos_permisos: supabaseFetch('permisos', 'GET', null, '?select=*&order=clave_tecnica.asc') || [],
      tipos_usuario: supabaseFetch('tipos_usuario', 'GET', null, '?select=*&order=id.asc') || []
    }};
  } catch (e) { return { success: false, message: e.message }; }
}

function actualizarUsuarioCompleto(jwtToken, usuarioId, tipoUsuarioId, permisosIds) {
  try {
    validarSesionSupabase(jwtToken);
    supabaseFetch('usuarios', 'PATCH', { tipo_usuario_id: parseInt(tipoUsuarioId) }, `?id=eq.${usuarioId}`);
    supabaseFetch('usuarios_permisos', 'DELETE', null, `?usuario_id=eq.${usuarioId}`);
    if (permisosIds && permisosIds.length > 0) supabaseFetch('usuarios_permisos', 'POST', permisosIds.map(pid => ({ usuario_id: usuarioId, permiso_id: parseInt(pid) })));
    return { success: true, message: 'Usuario actualizado.' };
  } catch (e) { return { success: false, message: e.message }; }
}