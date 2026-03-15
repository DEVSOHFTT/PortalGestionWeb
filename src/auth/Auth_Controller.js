/**
 * ========================================================================
 * CONTROLLER_SYS_Auth.gs
 * Validación de Login utilizando la API REST (RPC) de Supabase
 * ========================================================================
 */

function validarCredenciales(dni, password) {
  try {
    // 1. Armamos el paquete de datos con los nombres EXACTOS 
    // que nos indicó el error de Supabase (p_username y p_password).
    const payload = {
      p_username: String(dni).trim(),
      p_password: String(password).trim()
    };
    
    // 2. Llamada nativa REST a la función RPC
    const respuesta = supabaseRPC("login_agente", payload);
    
    if (respuesta) {
      // Dependiendo de cómo devuelve los datos tu función SQL, 
      // verificamos si viene como texto JSON o como objeto nativo.
      let datos = respuesta;
      if (typeof respuesta === 'string') {
        datos = JSON.parse(respuesta);
      }
      
      return {
        success: datos.success,
        user: datos.user_data,
        message: datos.message
      };
    }
    
    return { success: false, message: "Error: La base de datos no respondió." };
    
  } catch (e) {
    Logger.log("Fallo en Auth (REST): " + e.message);
    return { success: false, message: e.message };
  }
}