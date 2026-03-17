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

/**
 * Crear un usuario completo: auth.users + agentes.auth_id + usuarios + permisos
 * @param {object} payload - { dni, password, tipo_usuario_id, permisos_ids[] }
 */
function crearUsuarioSistema(payload) {
  try {
    const config = _getSupabaseConfig();
    const dni = String(payload.dni).trim();
    const password = String(payload.password).trim();
    const tipoUsuarioId = parseInt(payload.tipo_usuario_id) || 4;
    const permisosIds = payload.permisos_ids || [];

    if (!dni || !password) throw new Error('DNI y contraseña son obligatorios.');
    if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');

    // 1. Verificar que existe el agente
    const agentes = supabaseFetch('agentes', 'GET', null, `?dni=eq.${dni}&estado=eq.true&limit=1`);
    if (!agentes || agentes.length === 0) throw new Error('No existe un agente activo con DNI: ' + dni);
    const agente = agentes[0];

    // 2. Verificar que no tenga auth_id ya
    if (agente.auth_id) throw new Error('Este agente ya tiene un usuario asignado.');

    // 3. Crear usuario via Supabase Auth Admin API
    const email = dni + '@defensoria.local';
    const authResponse = UrlFetchApp.fetch(`${config.url}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey': config.key,
        'Authorization': 'Bearer ' + config.key,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          dni: dni,
          nombre: agente.nombre,
          apellido: agente.apellido,
          agente_id: agente.id,
          area_id: agente.area_id,
          delegacion_id: agente.delegacion_id,
          tipo_usuario_id: tipoUsuarioId
        }
      }),
      muteHttpExceptions: true
    });

    const authCode = authResponse.getResponseCode();
    const authBody = JSON.parse(authResponse.getContentText());

    if (authCode < 200 || authCode >= 300) {
      throw new Error('Error Auth: ' + (authBody.msg || authBody.message || JSON.stringify(authBody)));
    }

    const authId = authBody.id;

    // 4. Vincular auth_id al agente
    supabaseFetch('agentes', 'PATCH', { auth_id: authId }, `?id=eq.${agente.id}`);

    // 5. Crear registro en tabla usuarios (para permisos)
    const usuarioRes = supabaseFetch('usuarios', 'POST', {
      username: dni,
      password_hash: '*** gestionado por Supabase Auth ***',
      agente_id: agente.id,
      tipo_usuario_id: tipoUsuarioId,
      estado: true
    });

    if (!usuarioRes || usuarioRes.length === 0) throw new Error('No se pudo crear el registro en tabla usuarios.');
    const usuarioId = usuarioRes[0].id;

    // 6. Asignar permisos
    if (permisosIds.length > 0) {
      const permisosPayload = permisosIds.map(pid => ({
        usuario_id: usuarioId,
        permiso_id: parseInt(pid)
      }));
      supabaseFetch('usuarios_permisos', 'POST', permisosPayload);
    }

    return {
      success: true,
      message: `Usuario creado exitosamente para ${agente.apellido}, ${agente.nombre}.`,
      data: { auth_id: authId, usuario_id: usuarioId, agente_id: agente.id }
    };

  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Listar usuarios del sistema con sus permisos
*/

function listarUsuariosSistema() {
  try {
    const data = supabaseFetch('v_user', 'GET', null, '?select=id,username,estado,tipo_usuario_id,nombre,apellido,area_id,accesos&order=apellido.asc');
    return { success: true, data: data || [] };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Obtener datos para el formulario (agentes sin usuario + tipos + permisos)
*/

function obtenerDiccionariosUsuarios() {
  try {
    const agentes = supabaseFetch('agentes', 'GET', null,
      '?estado=eq.true&auth_id=is.null&select=id,dni,nombre,apellido,area_id&order=apellido.asc');
    const tipos = supabaseFetch('tipos_usuario', 'GET', null, '?select=*&order=id.asc');
    const permisos = supabaseFetch('permisos', 'GET', null, '?select=*&order=clave_tecnica.asc');
    const areas = supabaseFetch('areas', 'GET', null, '?select=id,nombre&order=nombre.asc');

    return {
      success: true,
      data: {
        agentes_sin_usuario: agentes || [],
        tipos_usuario: tipos || [],
        permisos: permisos || [],
        areas: areas || []
      }
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Actualizar permisos de un usuario existente
*/

function actualizarPermisosUsuario(usuarioId, permisosIds) {
  try {
    // Borrar permisos actuales
    supabaseFetch('usuarios_permisos', 'DELETE', null, `?usuario_id=eq.${usuarioId}`);

    // Insertar nuevos
    if (permisosIds && permisosIds.length > 0) {
      const payload = permisosIds.map(pid => ({
        usuario_id: usuarioId,
        permiso_id: parseInt(pid)
      }));
      supabaseFetch('usuarios_permisos', 'POST', payload);
    }

    return { success: true, message: 'Permisos actualizados correctamente.' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Desactivar usuario (no borra — soft disable)
*/

function desactivarUsuario(usuarioId) {
  try {
    supabaseFetch('usuarios', 'PATCH', { estado: false }, `?id=eq.${usuarioId}`);
    return { success: true, message: 'Usuario desactivado.' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Resetear contraseña de un usuario
*/

function resetearPasswordUsuario(dni, nuevoPassword) {
  try {
    const config = _getSupabaseConfig();
    const email = dni + '@defensoria.local';

    // Buscar el auth user por email
    const listRes = UrlFetchApp.fetch(`${config.url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
      method: 'GET',
      headers: {
        'apikey': config.key,
        'Authorization': 'Bearer ' + config.key
      },
      muteHttpExceptions: true
    });

    const users = JSON.parse(listRes.getContentText());
    if (!users || !users.users || users.users.length === 0) {
      throw new Error('No se encontró usuario de autenticación para DNI: ' + dni);
    }

    const authUserId = users.users[0].id;

    // Actualizar password via Admin API
    const updateRes = UrlFetchApp.fetch(`${config.url}/auth/v1/admin/users/${authUserId}`, {
      method: 'PUT',
      headers: {
        'apikey': config.key,
        'Authorization': 'Bearer ' + config.key,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({ password: nuevoPassword }),
      muteHttpExceptions: true
    });

    const code = updateRes.getResponseCode();
    if (code < 200 || code >= 300) {
      throw new Error('Error al resetear: ' + updateRes.getContentText());
    }

    return { success: true, message: 'Contraseña actualizada exitosamente.' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Obtener datos de un usuario con sus permisos actuales (para el modal de edición)
*/

function obtenerUsuarioConPermisos(usuarioId) {
  try {
    const usuario = supabaseFetch('v_user', 'GET', null, `?id=eq.${usuarioId}&limit=1`);
    if (!usuario || usuario.length === 0) throw new Error('Usuario no encontrado.');
 
    const permisosActuales = supabaseFetch('usuarios_permisos', 'GET', null,
      `?usuario_id=eq.${usuarioId}&select=permiso_id`);
 
    const todosPermisos = supabaseFetch('permisos', 'GET', null, '?select=*&order=clave_tecnica.asc');
    const tiposUsuario = supabaseFetch('tipos_usuario', 'GET', null, '?select=*&order=id.asc');
 
    return {
      success: true,
      data: {
        usuario: usuario[0],
        permisos_actuales: (permisosActuales || []).map(p => p.permiso_id),
        todos_permisos: todosPermisos || [],
        tipos_usuario: tiposUsuario || []
      }
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Actualizar tipo de usuario + permisos
*/

function actualizarUsuarioCompleto(usuarioId, tipoUsuarioId, permisosIds) {
  try {
    // Actualizar tipo de usuario
    supabaseFetch('usuarios', 'PATCH',
      { tipo_usuario_id: parseInt(tipoUsuarioId) },
      `?id=eq.${usuarioId}`
    );
 
    // Reemplazar permisos
    supabaseFetch('usuarios_permisos', 'DELETE', null, `?usuario_id=eq.${usuarioId}`);
 
    if (permisosIds && permisosIds.length > 0) {
      const payload = permisosIds.map(pid => ({
        usuario_id: usuarioId,
        permiso_id: parseInt(pid)
      }));
      supabaseFetch('usuarios_permisos', 'POST', payload);
    }
 
    return { success: true, message: 'Usuario actualizado correctamente.' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Reactivar usuario desactivado
 */

function reactivarUsuario(usuarioId) {
  try {
    supabaseFetch('usuarios', 'PATCH', { estado: true }, `?id=eq.${usuarioId}`);
    return { success: true, message: 'Usuario reactivado.' };
  } catch (e) {
    return { success: false, message: e.message };
  }
}