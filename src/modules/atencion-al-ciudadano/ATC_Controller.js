/**
 * ========================================================================
 * CONTROLLER_ATC.js
 * Módulo de Atención al Ciudadano - Defensoría del Pueblo
 * ========================================================================
 * CAMBIO ARQUITECTÓNICO: Zero-Trust aplicado. El payload enviado por
 * el frontend para agente_id, area_id o nombres es IGNORADO. Toda
 * identidad se extrae desencriptando el JWT enviado como primer parámetro.
 * ========================================================================
 */

function obtenerCasosPaginados(jwtToken, tipoFiltro, pagina = 1, terminoBusqueda = '', filtrosAvanzados = {}) {
  const itemsPorPagina = 20;
  const offset = (pagina - 1) * itemsPorPagina;

  try {
    const usuario = validarSesionSupabase(jwtToken);
    const idAgenteReal = usuario.agente_id;
    const idAreaReal = usuario.area_id;

    let query = `?order=fecha_inicio.desc&limit=${itemsPorPagina}&offset=${offset}`;
    let filtros = [];

    if (tipoFiltro === 'MIO') filtros.push(`agente_responsable_id=eq.${idAgenteReal}`);
    else if (tipoFiltro === 'AREA') filtros.push(`area_destino_id=eq.${idAreaReal}`);

    if (terminoBusqueda) {
      const term = encodeURIComponent(`*${terminoBusqueda.trim()}*`);
      filtros.push(`or=(ciudadano_nombre_completo.ilike.${term},ciudadano_dni.ilike.${term},recepcion_id.ilike.${term},expediente_codigo.ilike.${term})`);
    }

    if (filtrosAvanzados.estado) filtros.push(`estado=ilike.${filtrosAvanzados.estado}`);
    if (filtrosAvanzados.categoria) filtros.push(`categoria=eq.${encodeURIComponent(filtrosAvanzados.categoria)}`);
    if (filtrosAvanzados.fechaDesde) filtros.push(`fecha_inicio=gte.${filtrosAvanzados.fechaDesde}T00:00:00`);
    if (filtrosAvanzados.fechaHasta) filtros.push(`fecha_inicio=lte.${filtrosAvanzados.fechaHasta}T23:59:59`);
    if (filtrosAvanzados.agenteId) filtros.push(`agente_responsable_id=eq.${filtrosAvanzados.agenteId}`);
    if (filtrosAvanzados.areaId) filtros.push(`area_destino_id=eq.${filtrosAvanzados.areaId}`);

    if (filtros.length > 0) query += `&${filtros.join('&')}`;

    const response = supabaseFetch("vw_bandeja_casos", "GET", null, query, true);

    const casos = response.data.map(fila => ({
      id: fila.recepcion_id,
      fecha: formatSupabaseDate(fila.fecha_inicio),
      ciudadano: fila.ciudadano_nombre_completo || "No registrado",
      dni: fila.ciudadano_dni || "S/D",
      categoria: fila.categoria || "S/D",
      estado: fila.estado || "Pendiente",
      expediente: fila.expediente_codigo || "",
      agente: fila.agente_responsable_nombre || "Sin Asignar", 
      area: fila.area_destino_nombre || "Sin Asignar"
    }));

    return { success: true, casos: casos, pagina: pagina, totalRegistros: response.count, itemsPorPagina: itemsPorPagina };
  } catch (e) { return { success: false, error: e.message }; }
}

function obtenerNotificacionesBackend(jwtToken) {
  try {
    const usuario = validarSesionSupabase(jwtToken);
    let notis = [], totalMios = 0, totalArea = 0;
    
    const qMios = `?agente_responsable_id=eq.${usuario.agente_id}&estado_id=eq.1&order=fecha_inicio.desc&limit=5`;
    const resMios = supabaseFetch("vw_bandeja_casos", "GET", null, qMios, true); 
    if(resMios && Array.isArray(resMios.data)) {
       totalMios = resMios.count || 0;
       resMios.data.forEach(r => notis.push({ id: r.recepcion_id, tipo: 'personal', titulo: r.categoria, fecha: formatSupabaseDate(r.fecha_inicio), mensaje: 'Asignado a ti. Requiere inicio de gestión.' }));
    }

    if (usuario.area_id) {
       const qArea = `?area_destino_id=eq.${usuario.area_id}&agente_responsable_id=is.null&estado_id=eq.4&order=fecha_inicio.desc&limit=5`;
       const resArea = supabaseFetch("vw_bandeja_casos", "GET", null, qArea, true);
       if(resArea && Array.isArray(resArea.data)) {
          totalArea = resArea.count || 0;
          resArea.data.forEach(r => notis.push({ id: r.recepcion_id, tipo: 'area', titulo: r.categoria, fecha: formatSupabaseDate(r.fecha_inicio), mensaje: 'Ingresó al Área. Esperando que un agente lo tome.' }));
       }
    }
    return { success: true, lista: notis, total: (totalMios + totalArea) };
  } catch(e) { return { success: false, message: e.message }; }
}

function procesarAccionBackend(jwtToken, accion, idCaso) {
  try {
    const usuario = validarSesionSupabase(jwtToken);
    let payload = {};
    if (accion === 'tomar' || accion === 'reabrir') payload = { agente_responsable_id: usuario.agente_id, estado_id: 1, fecha_final: null };
    else if (accion === 'finalizar') payload = { estado_id: 3, fecha_final: new Date().toISOString() };

    const response = supabaseFetch("recepciones", "PATCH", payload, `?id=eq.${idCaso}`);
    if (response && response.length > 0) {
       let msg = "";
       if (accion === 'tomar') msg = `El agente ${usuario.nombre} ${usuario.apellido} tomó la responsabilidad del caso.`;
       else if (accion === 'reabrir') msg = `El agente ${usuario.nombre} ${usuario.apellido} reabrió el caso.`;
       else if (accion === 'finalizar') msg = `El agente ${usuario.nombre} ${usuario.apellido} finalizó el caso.`;
       try { supabaseFetch("archivos_recepciones", "POST", { recepcion_id: idCaso, agente_id: usuario.agente_id, es_mensaje_sistema: true, observacion: msg }); } catch (logError) {}
       return { success: true };
    }
    return { success: false, message: "No se pudo actualizar el estado." };
  } catch (e) { return { success: false, message: e.message }; }
}

function guardarInteraccionBackend(jwtToken, payload) {
  try {
    const usuario = validarSesionSupabase(jwtToken);
    payload.agente_id = usuario.agente_id;

    if (payload.id) {
       const idStr = payload.id; delete payload.id;
       supabaseFetch("archivos_recepciones", "PATCH", { observacion: payload.observacion }, `?id=eq.${idStr}`);
    } else {
       payload.id = generarIDUnico(10);
       supabaseFetch("archivos_recepciones", "POST", payload);
       supabaseFetch("recepciones", "PATCH", { estado_id: 5 }, `?id=eq.${payload.recepcion_id}&estado_id=eq.1`);
    }
    return { success: true };
  } catch (e) { return { success: false, message: e.message }; }
}

function guardarActuacionBackend(jwtToken, payload) {
  try {
    const usuario = validarSesionSupabase(jwtToken);
    payload.agente_id = usuario.agente_id;

    if (payload.id) {
       const idStr = payload.id;
       supabaseFetch("actuaciones", "PATCH", { tramite_id: payload.tramite_id, estado_id: payload.estado_id, observaciones: payload.observaciones }, `?id=eq.${idStr}`);
    } else {
       payload.id = generarIDUnico(10);
       supabaseFetch("actuaciones", "POST", payload);
       supabaseFetch("recepciones", "PATCH", { estado_id: 5 }, `?id=eq.${payload.recepcion_id}&estado_id=eq.1`);
    }
    return { success: true };
  } catch (e) { return { success: false, message: e.message }; }
}

function obtenerPaqueteCompletoCaso(jwtToken, idCaso) {
  try {
    validarSesionSupabase(jwtToken);
    const fila = supabaseFetch("vw_detalle_recepcion", "GET", null, `?recepcion_id=eq.${idCaso}`)[0];
    if (!fila) throw new Error("Caso no registrado.");

    const gestion = {
      id: fila.recepcion_id, fecha: formatSupabaseDate(fila.fecha_inicio),
      estado: fila.estado || "PENDIENTE", idEstado: fila.estado_id, 
      observaciones: fila.observaciones || "Sin observaciones.", 
      categoria: fila.categoria || "SIN CATEGORÍA",
      agenteResp: fila.agente_responsable || "Sin asignar", agenteRespId: fila.agente_responsable_id || null, 
      areaNombre: fila.area_destino || "No asignada", areaDestinoId: fila.area_destino_id || null, 
      expediente: fila.expediente_codigo || "No posee", canal: fila.canal_atencion || "S/E",
      prioridad: fila.prioridad || "Normal", agenteOrigen: fila.agente_origen || "Sistema"
    };

    let ciudadanoInfo = { id: fila.ciudadano_id, nombre: fila.ciudadano_nombre || "S/D", dni: fila.ciudadano_dni, telefono: fila.ciudadano_telefono, email: fila.ciudadano_email };
    if (fila.ciudadano_id) { try { ciudadanoInfo = supabaseFetch("ciudadanos", "GET", null, `?id=eq.${fila.ciudadano_id}`)[0] || ciudadanoInfo; } catch(e) {} }
    
    let historial = [];
    supabaseFetch("vw_historial_actuaciones", "GET", null, `?recepcion_id=eq.${idCaso}`).forEach(r => historial.push({ tipo: 'ACTUACION', idOriginal: r.actuacion_id, agente: r.agente_ejecutor, agenteId: r.agente_id, timestamp: new Date(r.fecha_inicio).getTime(), fechaFormat: formatSupabaseDate(r.fecha_inicio), titulo: r.tramite_nombre || "Actuación", subtitulo: r.estado || "S/D", texto: r.observaciones || "", dataCruda: r }));
    supabaseFetch("vw_historial_interacciones", "GET", null, `?recepcion_id=eq.${idCaso}`).forEach(r => historial.push({ tipo: r.es_mensaje_sistema ? 'SISTEMA' : 'INTERACCION', idOriginal: r.interaccion_id, agente: r.agente_autor, agenteId: r.agente_id, timestamp: new Date(r.fecha_interaccion).getTime(), fechaFormat: formatSupabaseDate(r.fecha_interaccion), titulo: r.es_mensaje_sistema ? "Auditoría de Sistema" : "Nota Interna", subtitulo: "", texto: r.observacion || "", dataCruda: r }));
    historial.sort((a, b) => b.timestamp - a.timestamp);

    return { success: true, gestion, ciudadano: ciudadanoInfo, historialUnificado: historial };
  } catch (e) { return { success: false, message: e.message }; }
}

function registrarRecepcionBackend(jwtToken, paquete) {
  try {
    const usuario = validarSesionSupabase(jwtToken);
    let ciudadanoId = paquete.ciudadano.id;

    if (!ciudadanoId) {
      const resCiu = supabaseFetch("ciudadanos", "POST", {
        id: generarIDUnico(10), tipo_entidad_id: paquete.ciudadano.tipo_entidad_id ? parseInt(paquete.ciudadano.tipo_entidad_id) : 1,
        dni: paquete.ciudadano.dni || null, apellido: paquete.ciudadano.apellido || '-', nombre: paquete.ciudadano.nombre,
        cuil: paquete.ciudadano.cuil || null, fecha_nacimiento: paquete.ciudadano.fecha_nacimiento || null,
        genero_id: parseInt(paquete.ciudadano.genero_id) || null, telefono: paquete.ciudadano.telefono || null,
        email: paquete.ciudadano.email || null, barrio_id: parseInt(paquete.ciudadano.barrio_id) || null,
        calle: paquete.ciudadano.calle || null, altura: paquete.ciudadano.altura || null, piso: paquete.ciudadano.piso || null, dpto: paquete.ciudadano.dpto || null
      });
      if (resCiu && resCiu.length > 0) ciudadanoId = resCiu[0].id; else throw new Error("Fallo al registrar ciudadano.");
    }

    if (!paquete.recepcion.forzar_duplicado) {
        const dup = supabaseFetch("recepciones", "GET", null, `?ciudadano_id=eq.${ciudadanoId}&categoria_id=eq.${paquete.recepcion.categoria_id}&estado_id=in.(1,2,4,5)&limit=1`);
        if (dup && dup.length > 0) return { success: false, isDuplicado: true, casoDuplicadoId: dup[0].id };
    }

    const tipoDest = paquete.recepcion.tipo_destinatario_id ? parseInt(paquete.recepcion.tipo_destinatario_id) : null;
    const asig = (tipoDest === 1 && paquete.recepcion.destino_id) ? String(paquete.recepcion.destino_id) : null;

    const payloadRec = {
      id: generarIDUnico(10), ciudadano_id: ciudadanoId,
      canal_id: parseInt(paquete.recepcion.canal_id) || 1, categoria_id: parseInt(paquete.recepcion.categoria_id) || 1,
      prioridad_id: parseInt(paquete.recepcion.prioridad_id) || null, reprogramado: paquete.recepcion.reprogramado,
      area_origen_id: usuario.area_id, agente_origen_id: String(usuario.agente_id),
      tipo_destinatario_id: tipoDest, agente_responsable_id: asig,
      area_destino_id: tipoDest === 2 ? parseInt(paquete.recepcion.destino_id) : null,
      organismo_destino_id: tipoDest === 3 ? parseInt(paquete.recepcion.destino_id) : null,
      observaciones: paquete.recepcion.observaciones, estado_id: asig ? 1 : 4,
      telefono: paquete.recepcion.telefono || null, email: paquete.recepcion.email || null
    };
    if (paquete.recepcion.reprogramado && paquete.recepcion.fecha_inicio_manual) payloadRec.fecha_inicio = new Date(paquete.recepcion.fecha_inicio_manual).toISOString();

    const resRec = supabaseFetch("recepciones", "POST", payloadRec);
    return { success: true, nuevoId: resRec[0].id };
  } catch(e) { return { success: false, message: e.message }; }
}

function derivarCasoBackend(jwtToken, payload) {
  try {
    const usuario = validarSesionSupabase(jwtToken);
    let updatePayload = { tipo_destinatario_id: payload.tipo_destinatario_id, motivo_derivacion: payload.motivo_derivacion, area_destino_id: null, organismo_destino_id: null, agente_responsable_id: null, estado_id: 2 };

    if (payload.tipo_destinatario_id === 1) { 
        updatePayload.agente_responsable_id = String(payload.destino_id); updatePayload.estado_id = 1;
        try { updatePayload.area_destino_id = supabaseFetch("agentes", "GET", null, `?id=eq.${payload.destino_id}&select=area_id`)[0].area_id; } catch(e) { } 
    } else if (payload.tipo_destinatario_id === 2) { 
        updatePayload.area_destino_id = parseInt(payload.destino_id); updatePayload.estado_id = 4;
    } else if (payload.tipo_destinatario_id === 3) { 
        updatePayload.organismo_destino_id = parseInt(payload.destino_id); updatePayload.estado_id = 2; 
    }

    const resPatch = supabaseFetch("recepciones", "PATCH", updatePayload, `?id=eq.${payload.recepcion_id}`);
    if (resPatch && resPatch.length > 0) {
       try { supabaseFetch("archivos_recepciones", "POST", { recepcion_id: payload.recepcion_id, agente_id: usuario.agente_id, es_mensaje_sistema: true, observacion: `Derivado a: ${payload.destino_nombre}.\nMotivo: ${payload.motivo_derivacion}` }); } catch(e) { }
       return { success: true };
    }
    return { success: false, message: "La BD rechazó la derivación." };
  } catch(e) { return { success: false, message: e.message }; }
}

function buscarExpedientesBackend(jwtToken, termino) {
  try { validarSesionSupabase(jwtToken); return termino && termino.length >= 3 ? supabaseFetch("expedientes", "GET", null, `?codigo=ilike.*${encodeURIComponent(termino.trim())}*&limit=8&select=id,codigo,titulo`) || [] : []; } catch(e) { return []; }
}

function gestionarAsociacionExpedienteBackend(jwtToken, idCaso, codigoExp, accion) {
  try {
    const usuario = validarSesionSupabase(jwtToken);
    let expId = null, textoAuditoria = "";

    if (accion === 'vincular') {
        const expData = supabaseFetch("expedientes", "GET", null, `?codigo=eq.${encodeURIComponent(codigoExp)}`);
        if (!expData || expData.length === 0) return { success: false, message: "Código de expediente inexistente." };
        expId = expData[0].id; textoAuditoria = `Vinculado al Expediente: ${codigoExp}.`;
    } else if (accion === 'desvincular') {
        textoAuditoria = `Desvinculado del expediente asociado.`;
    } else return { success: false, message: "Acción no válida." };

    if (supabaseFetch("recepciones", "PATCH", { expediente_id: expId }, `?id=eq.${idCaso}`).length > 0) {
       try { supabaseFetch("archivos_recepciones", "POST", { recepcion_id: idCaso, agente_id: usuario.agente_id, es_mensaje_sistema: true, observacion: textoAuditoria }); } catch(e) {}
       return { success: true };
    }
    return { success: false, message: "Error interno al modificar el caso." };
  } catch (e) { return { success: false, message: e.message }; }
}

function obtenerDiccionariosATCBackend(jwtToken) {
  try {
    validarSesionSupabase(jwtToken);
    return { success: true, data: {
      canales: supabaseFetch("canales_atencion", "GET", null, "?select=id,nombre&order=nombre.asc"),
      categorias: supabaseFetch("categorias", "GET", null, "?select=id,nombre&order=nombre.asc"),
      barrios: supabaseFetch("barrios", "GET", null, "?select=id,nombre&order=nombre.asc"),
      prioridades: supabaseFetch("tipos_prioridad", "GET", null, "?select=id,nombre,descripcion&order=id.asc"),
      tipos_destinatario: supabaseFetch("tipos_destinatario", "GET", null, "?select=id,nombre&order=id.asc"),
      organismos: supabaseFetch("organismos_externos", "GET", null, "?select=id,nombre&order=nombre.asc"),
      estados_actuacion: supabaseFetch("estados_actuacion", "GET", null, "?select=id,nombre&order=id.asc"),
      tramites: supabaseFetch("tramites", "GET", null, "?select=id,nombre,categoria_id&order=nombre.asc"),
      tipos_entidad: supabaseFetch("tipos_entidad", "GET", null, "?select=id,nombre&order=id.asc")
    }};
  } catch (e) { return { success: false, message: e.message }; }
}