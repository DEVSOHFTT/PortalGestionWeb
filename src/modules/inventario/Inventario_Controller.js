/**
 * ========================================================================
 * CONTROLLER_Inventario.js
 * Módulo de Gestión de Inventario e Infraestructura - Defensoría del Pueblo
 * ========================================================================
 */

function obtenerDiccionariosInventario() {
  try {
    const diccionarios = {};
    
    // Función auxiliar para atrapar errores de Supabase
    const fetchSeguro = (tabla, query) => {
       const res = supabaseFetch(tabla, "GET", null, query);
       if (res && res.error) throw new Error(`Fallo en tabla ${tabla}: ${res.error.message || 'Error desconocido'}`);
       return res || [];
    };

    diccionarios.categorias = fetchSeguro("inv_categorias", "?select=*&order=nombre.asc");
    diccionarios.marcas = fetchSeguro("inv_marcas", "?select=*&order=nombre.asc");
    diccionarios.edificios = fetchSeguro("inv_edificios", "?select=*&order=nombre.asc");
    diccionarios.estados = fetchSeguro("inv_estados", "?select=*&order=id.asc");
    diccionarios.tipos_movimiento = fetchSeguro("inv_tipos_movimiento", "?select=*&order=id.asc");
    
    // Core
    diccionarios.agentes = fetchSeguro("agentes", "?estado=eq.true&select=id,nombre,apellido&order=apellido.asc");
    diccionarios.areas = fetchSeguro("areas", "?select=id,nombre&order=nombre.asc");

    return { success: true, data: diccionarios };
  } catch(e) { 
    return { success: false, message: e.message }; 
  }
}

function obtenerInventarioBackend(filtros = {}) {
  try {
    let query = `?order=ultima_modificacion.desc&limit=150`; 
    let queryParams = [];
    
    if (filtros.categoria_id) queryParams.push(`categoria_id=eq.${filtros.categoria_id}`);
    if (filtros.estado_id) queryParams.push(`estado_id=eq.${filtros.estado_id}`);
    if (filtros.edificio_id) queryParams.push(`edificio_id=eq.${filtros.edificio_id}`);
    
    if (queryParams.length > 0) query += `&${queryParams.join('&')}`;
    
    const data = supabaseFetch("vw_inv_bandeja", "GET", null, query);
    if (data && data.error) throw new Error(data.error.message);
    
    return { success: true, data: data || [] };
  } catch(e) { 
    return { success: false, message: e.message }; 
  }
}

function obtenerFichaActivoBackend(idActivo) {
  try {
    const activoData = supabaseFetch("vw_inv_bandeja", "GET", null, `?activo_id=eq.${idActivo}&limit=1`);
    if (!activoData || activoData.length === 0 || activoData.error) throw new Error("El activo escaneado no existe en la base de datos.");
    
    const historialData = supabaseFetch("vw_inv_historial", "GET", null, `?activo_id=eq.${idActivo}&order=fecha_movimiento.desc`);
    
    return { success: true, activo: activoData[0], historial: historialData || [] };
  } catch(e) { 
    return { success: false, message: e.message }; 
  }
}

function crearActivoBackend(payload, idAgenteRegistro) {
  try {
    // Generador de ID corto alfanumérico para el QR (Ej: DF-A8X9)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let shortId = 'DF-';
    for (let i = 0; i < 6; i++) shortId += chars.charAt(Math.floor(Math.random() * chars.length));
    
    payload.id = shortId;
    
    const resActivo = supabaseFetch("inv_activos", "POST", payload);
    if (resActivo && resActivo.error) throw new Error(resActivo.error.message);
    
    // Generar movimiento de Alta
    supabaseFetch("inv_movimientos", "POST", {
      id: "MOV-" + shortId + Date.now().toString().slice(-4),
      activo_id: payload.id,
      tipo_movimiento_id: 1, // 1 = Alta / Ingreso
      cantidad: payload.stock_actual || 1,
      agente_registro_id: idAgenteRegistro,
      edificio_destino_id: payload.edificio_id || null,
      observaciones: "Alta manual en sistema."
    });
    
    return { success: true, id_qr: payload.id };
  } catch(e) { 
    return { success: false, message: e.message }; 
  }
}

function registrarMovimientoInventarioBackend(payload) {
  try {
    const checkActivo = supabaseFetch("inv_activos", "GET", null, `?id=eq.${payload.activo_id}&limit=1`);
    if (!checkActivo || checkActivo.length === 0) throw new Error("Activo inexistente.");
    const activo = checkActivo[0];
    
    const checkMov = supabaseFetch("inv_tipos_movimiento", "GET", null, `?id=eq.${payload.tipo_movimiento_id}&limit=1`);
    const afectaStock = checkMov[0].afecta_stock; 
    
    let payloadUpdateActivo = {};
    
    if (activo.es_consumible) {
       const nuevoStock = activo.stock_actual + (payload.cantidad * afectaStock);
       if (nuevoStock < 0) throw new Error(`Stock insuficiente. Actual: ${activo.stock_actual}`);
       payloadUpdateActivo.stock_actual = nuevoStock;
    } else {
       payload.cantidad = 1; 
       if (payload.area_destino_id) payloadUpdateActivo.area_asignada_id = payload.area_destino_id;
       if (payload.agente_destino_id) payloadUpdateActivo.agente_asignado_id = payload.agente_destino_id;
       if (payload.edificio_destino_id) payloadUpdateActivo.edificio_id = payload.edificio_destino_id;
       
       if (payload.tipo_movimiento_id === 6) {
          payloadUpdateActivo.estado_id = 5; 
          payloadUpdateActivo.area_asignada_id = null; 
          payloadUpdateActivo.agente_asignado_id = null; 
       } else if (payload.tipo_movimiento_id === 2 || payload.tipo_movimiento_id === 4) {
          payloadUpdateActivo.estado_id = 2; 
       }
    }

    const movId = "MOV-" + Date.now().toString().slice(-6);
    payload.id = movId;
    delete payload.edificio_destino_id; 

    supabaseFetch("inv_movimientos", "POST", payload);
    if (Object.keys(payloadUpdateActivo).length > 0) {
       supabaseFetch("inv_activos", "PATCH", payloadUpdateActivo, `?id=eq.${payload.activo_id}`);
    }
    
    return { success: true, movimiento_id: movId, mensaje: "Movimiento registrado." };
  } catch(e) { 
    return { success: false, message: e.message }; 
  }
}
function subirFotoEvidenciaBackend(payload) {
  try {
    // Decodifica el base64 y lo sube a Google Drive
    const carpetaId = PropertiesService.getScriptProperties().getProperty('DRIVE_CARPETA_EVIDENCIAS');
    if (!carpetaId) throw new Error('Propiedad DRIVE_CARPETA_EVIDENCIAS no configurada en Script Properties.');

    const carpeta = DriveApp.getFolderById(carpetaId);
    const blob = Utilities.newBlob(
      Utilities.base64Decode(payload.base64_data),
      payload.mime_type,
      `${payload.activo_id}_${Date.now()}_${payload.nombre_archivo}`
    );

    const archivo = carpeta.createFile(blob);
    archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const urlPublica = `https://drive.google.com/uc?id=${archivo.getId()}`;

    // Registra el movimiento de tipo "Foto Adjuntada" en el historial
    supabaseFetch("inv_movimientos", "POST", {
      id: "MOV-FOTO-" + Date.now().toString().slice(-6),
      activo_id: payload.activo_id,
      tipo_movimiento_id: 7, // 7 = Foto / Evidencia (agregá este tipo en tu tabla inv_tipos_movimiento)
      cantidad: 1,
      agente_registro_id: payload.agente_id,
      observaciones: `Evidencia fotográfica adjuntada. URL: ${urlPublica}`
    });

    return { success: true, url: urlPublica };
  } catch(e) {
    return { success: false, message: e.message };
  }
}
