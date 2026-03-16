/**
 * ========================================================================
 * CONTROLLER_API_Supabase.gs
 * Motor nativo de peticiones HTTP REST hacia Supabase (PostgREST)
 * ========================================================================
 */

// 1. CONFIGURACIÓN (Usamos var para asegurar scope global en V8 Apps Script)
var SUPABASE_URL = "https://qgegablqfspqczxygwvf.supabase.co"; 
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnZWdhYmxxZnNwcWN6eHlnd3ZmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjM4Njc0NCwiZXhwIjoyMDg3OTYyNzQ0fQ.rb_8H2B-ImZpx1AzdyvXhWZxY2oyRJS-JmcV21We5cQ"; 

/**
 * Función maestra para comunicarse con Supabase
 * @param {string} endpoint - La tabla, vista o procedimiento (ej: "vw_bandeja_casos")
 * @param {string} method - "GET", "POST", "PATCH", "DELETE"
 * @param {object} payload - Los datos a enviar (para POST/PATCH)
 * @param {string} query - Filtros adicionales de URL (ej: "?select=*&id=eq.5")
 * @param {boolean} returnCount - Si es true, retorna un objeto {data, count} extrayendo headers.
 */
function supabaseFetch(endpoint, method = "GET", payload = null, query = "", returnCount = false) {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}${query}`;
  
  const options = {
    method: method,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json"
    },
    muteHttpExceptions: true
  };

  // Preferencias de Supabase (Insert/Update devuelven registro, Select cuenta total)
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
        // Content-Range viene como "0-19/145", extraemos el 145
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
  const url = `${SUPABASE_URL}/rest/v1/rpc/${functionName}`;
  
  const options = {
    method: "POST",
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
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