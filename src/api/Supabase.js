/**
 * ========================================================================
 * CONTROLLER_API_Supabase.gs
 * Motor nativo de peticiones HTTP REST hacia Supabase (PostgREST)
 * ========================================================================
 * CAMBIO V2.1: Credenciales movidas a Script Properties.
 */

// Lectura segura desde Script Properties con cache en memoria
var _supabaseCache = null;

function _getSupabaseConfig() {
  if (_supabaseCache) return _supabaseCache;
  
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('SUPABASE_URL');
  const key = props.getProperty('SUPABASE_KEY');
  
  if (!url || !key) {
    throw new Error(
      'Faltan las Script Properties: SUPABASE_URL y/o SUPABASE_KEY. ' +
      'Configurarlas en Proyecto → Configuración → Propiedades del script.'
    );
  }
  
  _supabaseCache = { url: url, key: key };
  return _supabaseCache;
}

/**
 * Función maestra para comunicarse con Supabase
 * @param {string} endpoint - La tabla, vista o procedimiento (ej: "vw_bandeja_casos")
 * @param {string} method - "GET", "POST", "PATCH", "DELETE"
 * @param {object} payload - Los datos a enviar (para POST/PATCH)
 * @param {string} query - Filtros adicionales de URL (ej: "?select=*&id=eq.5")
 * @param {boolean} returnCount - Si es true, retorna un objeto {data, count} extrayendo headers.
 */
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

  if (payload && (method === "POST" || method === "PATCH")) {
    options.payload = JSON.stringify(payload);
  }

  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  const content = response.getContentText();

  if (code >= 200 && code < 300) {
    const data = content ? JSON.parse(content) : [];
    
    if (returnCount) {
      const headers = response.getHeaders();
      const contentRange = headers['Content-Range'] || headers['content-range'];
      let count = 0;
      if (contentRange) {
        count = parseInt(contentRange.split('/')[1], 10);
      }
      return { data: data, count: count };
    }
    
    return data;
  } else {
    throw new Error(`Fallo de API Supabase (${code}): ${content}`);
  }
}

/**
 * Función para llamar a Procedimientos Almacenados (Stored Procedures / RPC)
 */
function supabaseRPC(functionName, payload = null) {
  const config = _getSupabaseConfig();
  const url = `${config.url}/rest/v1/rpc/${functionName}`;
  
  const options = {
    method: "POST",
    headers: {
      "apikey": config.key,
      "Authorization": `Bearer ${config.key}`,
      "Content-Type": "application/json"
    },
    muteHttpExceptions: true
  };

  if (payload) options.payload = JSON.stringify(payload);

  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  const content = response.getContentText();

  if (code >= 200 && code < 300) {
    return content ? JSON.parse(content) : null;
  } else {
    throw new Error(`Fallo RPC Supabase (${code}): ${content}`);
  }
}