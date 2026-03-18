/**
 * ========================================================================
 * CONTROLLER_API_Supabase.gs
 * Motor nativo de peticiones HTTP REST hacia Supabase (PostgREST)
 * ========================================================================
 * CAMBIO V2.1: Credenciales movidas a Script Properties.
 *
 * CONFIGURACIÓN REQUERIDA (una sola vez):
 *   1. Abrí el editor de Apps Script
 *   2. Menú: Proyecto → Configuración del proyecto → Propiedades del script
 *   3. Agregá estas dos propiedades:
 *        SUPABASE_URL  →  https://qgegablqfspqczxygwvf.supabase.co
 *        SUPABASE_KEY  →  (tu service_role key)
 *   4. Guardá y listo.
 *
 * La key NUNCA debe quedar en el código fuente.
 * ========================================================================

 * ========================================================================
 * CAMBIO V2.2: Implementación de validación JWT y seguridad Zero-Trust.
 * ========================================================================
 */

var _supabaseCache = null;

function _getSupabaseConfig() {
  if (_supabaseCache) return _supabaseCache;
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('SUPABASE_URL');
  const key = props.getProperty('SUPABASE_KEY'); 
  if (!url || !key) throw new Error('Faltan las Script Properties: SUPABASE_URL y/o SUPABASE_KEY.');
  _supabaseCache = { url: url, key: key };
  return _supabaseCache;
}

function validarSesionSupabase(token) {
  if (!token) throw new Error("Acceso denegado: Token no proporcionado.");
  
  const config = _getSupabaseConfig();
  const url = `${config.url}/auth/v1/user`;
  
  const options = {
    method: "GET",
    headers: { "apikey": config.key, "Authorization": `Bearer ${token}` },
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  
  if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
    const authUser = JSON.parse(response.getContentText());
    
    // BÚSQUEDA ROBUSTA (A prueba de fallos de metadata)
    const agenteData = supabaseFetch("agentes", "GET", null, `?auth_id=eq.${authUser.id}&limit=1`);
    
    if (!agenteData || agenteData.length === 0) {
       throw new Error("El usuario no tiene un perfil de Agente vinculado en la base de datos.");
    }
    
    // Retornamos identidad inmutable
    return {
       auth_id: authUser.id,
       agente_id: agenteData[0].id,
       area_id: agenteData[0].area_id,
       nombre: agenteData[0].nombre,
       apellido: agenteData[0].apellido,
       dni: agenteData[0].dni,
       email: authUser.email
    };
  } else {
    throw new Error("Acceso denegado: Token inválido o expirado.");
  }
}

function supabaseFetch(endpoint, method = "GET", payload = null, query = "", returnCount = false) {
  const config = _getSupabaseConfig();
  const url = `${config.url}/rest/v1/${endpoint}${query}`;
  
  const options = {
    method: method,
    headers: {
      "apikey": config.key,
      "Authorization": `Bearer ${config.key}`,
      "Content-Type": "application/json"
    },
    muteHttpExceptions: true
  };

  if (method === "POST" || method === "PATCH") options.headers["Prefer"] = "return=representation";
  if (returnCount && method === "GET") options.headers["Prefer"] = "count=exact";
  if (payload && (method === "POST" || method === "PATCH")) options.payload = JSON.stringify(payload);

  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  const content = response.getContentText();

  if (code >= 200 && code < 300) {
    const data = content ? JSON.parse(content) : [];
    if (returnCount) {
      const headers = response.getHeaders();
      const contentRange = headers['Content-Range'] || headers['content-range'];
      let count = contentRange ? parseInt(contentRange.split('/')[1], 10) : 0;
      return { data: data, count: count };
    }
    return data;
  } else {
    throw new Error(`Fallo de API Supabase (${code}): ${content}`);
  }
}

function supabaseRPC(functionName, payload = null) {
  const config = _getSupabaseConfig();
  const url = `${config.url}/rest/v1/rpc/${functionName}`;
  const options = {
    method: "POST",
    headers: { "apikey": config.key, "Authorization": `Bearer ${config.key}`, "Content-Type": "application/json" },
    muteHttpExceptions: true
  };
  if (payload) options.payload = JSON.stringify(payload);
  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  if (code >= 200 && code < 300) return JSON.parse(response.getContentText() || '{}');
  throw new Error(`Fallo RPC Supabase (${code}): ${response.getContentText()}`);
}