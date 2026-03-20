/**
 * ========================================================================
 * CONTROLLER_Inventario.js  — v2.3
 * Módulo de Gestión de Inventario e Infraestructura - Defensoría del Pueblo
 * ========================================================================
 * CAMBIOS V2.3:
 *   • inv_movimientos.id ahora es BIGINT auto-generado por la DB.
 *     → Se eliminó toda asignación manual de payload.id en movimientos.
 *   • inv_tipos_movimiento NO tiene columna afecta_stock.
 *     → La lógica de stock se resolvió con la constante DELTA_STOCK_POR_TIPO.
 *   • inv_estados NO tiene columna color.
 *     → estado_color se elimina del controller; lo resuelve la capa JS.
 *   • inv_movimientos no tiene columna fecha_movimiento.
 *     → La vista expone created_at AS fecha_movimiento (alias en SQL).
 * ========================================================================
 */

// ─── Constante de impacto sobre stock por tipo de movimiento ────────────────
// Solo los tipos que modifican stock_actual (consumibles) figuran aquí.
// Tipos no listados → no tocan stock_actual.
//   +1 = incrementa  (Alta de insumos)
//   -1 = decrementa  (Consumo / Entrega)
const INV_DELTA_STOCK = {
  1: +1,  // Alta
  5: -1   // Consumo
};

// ─── Estado → id numérico resultante del movimiento (equipos fijos) ─────────
// Los tipos no listados no cambian el estado_id del activo.
const INV_ESTADO_POR_TIPO = {
  2: 2,  // Traslado   → Asignado
  3: 3,  // Reparación → En reparación
  4: 2,  // Asignación → Asignado
  6: 4   // Baja       → De baja
};

// ─────────────────────────────────────────────────────────────────────────────

function obtenerDiccionariosInventario() {
  try {
    const fetchSeguro = (tabla, query) => {
      const res = supabaseFetch(tabla, "GET", null, query);
      if (res && res.error) throw new Error(`Fallo en ${tabla}: ${res.error.message || 'Error desconocido'}`);
      return res || [];
    };

    return {
      success: true,
      data: {
        categorias:       fetchSeguro("inv_categorias",      "?select=*&order=nombre.asc"),
        marcas:           fetchSeguro("inv_marcas",           "?select=*&order=nombre.asc"),
        edificios:        fetchSeguro("inv_edificios",        "?select=id,nombre,direccion,piso,delegacion_id&order=nombre.asc"),
        estados:          fetchSeguro("inv_estados",          "?select=*&order=id.asc"),
        tipos_movimiento: fetchSeguro("inv_tipos_movimiento", "?select=*&order=id.asc"),
        agentes:          fetchSeguro("agentes",              "?estado=eq.true&select=id,nombre,apellido&order=apellido.asc"),
        areas:            fetchSeguro("areas",                "?select=id,nombre&order=nombre.asc")
      }
    };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function obtenerInventarioBackend(filtros = {}) {
  try {
    let query       = "?order=ultima_modificacion.desc&limit=150";
    const params    = [];

    if (filtros.categoria_id) params.push(`categoria_id=eq.${filtros.categoria_id}`);
    if (filtros.estado_id)    params.push(`estado_id=eq.${filtros.estado_id}`);
    if (filtros.edificio_id)  params.push(`edificio_id=eq.${filtros.edificio_id}`);
    if (params.length)        query += `&${params.join('&')}`;

    const data = supabaseFetch("vw_inv_bandeja", "GET", null, query);
    if (data && data.error) throw new Error(data.error.message);

    return { success: true, data: data || [] };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function obtenerFichaActivoBackend(idActivo) {
  try {
    const activoData = supabaseFetch("vw_inv_bandeja", "GET", null,
      `?activo_id=eq.${idActivo}&limit=1`);
    if (!activoData || activoData.length === 0 || activoData.error)
      throw new Error("El activo escaneado no existe en la base de datos. Verifique e intente de nuevo.");

    const historialData = supabaseFetch("vw_inv_historial", "GET", null,
      `?activo_id=eq.${idActivo}&order=fecha_movimiento.desc`);

    return { success: true, activo: activoData[0], historial: historialData || [] };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function crearActivoBackend(payload, idAgenteRegistro) {
  try {
    // Generar ID alfanumérico único para el artículo (el QR lo leerá)
    const chars   = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let   shortId = 'DF-';
    for (let i = 0; i < 6; i++) shortId += chars.charAt(Math.floor(Math.random() * chars.length));
    payload.id = shortId;

    const resActivo = supabaseFetch("inv_articulos", "POST", payload);
    if (resActivo && resActivo.error) throw new Error(resActivo.error.message);

    // Registrar el movimiento de Alta.
    // NO se asigna payload.id → la DB genera el bigint automáticamente.
    const resMov = supabaseFetch("inv_movimientos", "POST", {
      activo_id:           payload.id,
      tipo_movimiento_id:  1,
      cantidad:            payload.stock_actual || 1,
      agente_registro_id:  idAgenteRegistro,
      edificio_destino_id: payload.edificio_id || null,
      observaciones:       "Alta manual en sistema."
    });
    if (resMov && resMov.error) throw new Error(resMov.error.message);

    return { success: true, id_qr: payload.id };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function registrarMovimientoInventarioBackend(payload) {
  try {
    // Verificar que el activo exista
    const checkActivo = supabaseFetch("inv_articulos", "GET", null,
      `?id=eq.${payload.activo_id}&limit=1`);
    if (!checkActivo || checkActivo.length === 0)
      throw new Error("Activo inexistente.");
    const activo = checkActivo[0];

    // es_consumible derivado de stock_actual
    const esConsumible = (activo.stock_actual !== null && activo.stock_actual !== undefined);

    let payloadUpdateActivo = {};

    if (esConsumible) {
      // ── Lógica de stock (insumos) ─────────────────────────────────────────
      const delta      = INV_DELTA_STOCK[payload.tipo_movimiento_id] ?? 0;
      const nuevoStock = activo.stock_actual + (payload.cantidad * delta);
      if (nuevoStock < 0)
        throw new Error(`Stock insuficiente. Actual: ${activo.stock_actual}`);
      payloadUpdateActivo.stock_actual = nuevoStock;

    } else {
      // ── Lógica de equipos fijos ───────────────────────────────────────────
      payload.cantidad = 1;

      if (payload.area_destino_id)    payloadUpdateActivo.area_asignada_id   = payload.area_destino_id;
      if (payload.agente_destino_id)  payloadUpdateActivo.agente_asignado_id = payload.agente_destino_id;
      if (payload.edificio_destino_id) payloadUpdateActivo.edificio_id       = payload.edificio_destino_id;

      const nuevoEstado = INV_ESTADO_POR_TIPO[payload.tipo_movimiento_id];
      if (nuevoEstado) {
        payloadUpdateActivo.estado_id = nuevoEstado;
      }

      // Baja: limpiar asignaciones
      if (payload.tipo_movimiento_id === 6) {
        payloadUpdateActivo.area_asignada_id   = null;
        payloadUpdateActivo.agente_asignado_id = null;
      }
    }

    // Registrar el movimiento.
    // NO se asigna payload.id → la DB genera el bigint automáticamente.
    const resMov = supabaseFetch("inv_movimientos", "POST", payload);
    if (resMov && resMov.error) throw new Error(resMov.error.message);

    if (Object.keys(payloadUpdateActivo).length > 0) {
      const resActualizar = supabaseFetch("inv_articulos", "PATCH",
        payloadUpdateActivo, `?id=eq.${payload.activo_id}`);
      if (resActualizar && resActualizar.error) throw new Error(resActualizar.error.message);
    }

    return { success: true, mensaje: "Movimiento registrado." };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

function subirFotoEvidenciaBackend(payload) {
  try {
    const carpetaId = PropertiesService.getScriptProperties()
      .getProperty('DRIVE_CARPETA_EVIDENCIAS');
    if (!carpetaId)
      throw new Error('Propiedad DRIVE_CARPETA_EVIDENCIAS no configurada en Script Properties.');

    const carpeta = DriveApp.getFolderById(carpetaId);
    const blob    = Utilities.newBlob(
      Utilities.base64Decode(payload.base64_data),
      payload.mime_type,
      `${payload.activo_id}_${Date.now()}_${payload.nombre_archivo}`
    );

    const archivo = carpeta.createFile(blob);
    archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const urlPublica = `https://drive.google.com/uc?id=${archivo.getId()}`;

    // Registrar como movimiento de tipo 7 (Foto evidencia). Sin ID manual.
    const resMov = supabaseFetch("inv_movimientos", "POST", {
      activo_id:          payload.activo_id,
      tipo_movimiento_id: 7,
      cantidad:           1,
      agente_registro_id: payload.agente_id,
      observaciones:      `Evidencia fotográfica adjuntada. URL: ${urlPublica}`
    });
    if (resMov && resMov.error) throw new Error(resMov.error.message);

    return { success: true, url: urlPublica };
  } catch(e) {
    return { success: false, message: e.message };
  }
}