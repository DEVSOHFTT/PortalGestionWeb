// src/modules/casos/Casos_Controller.js

function obtenerCasosPaginados(tipoFiltro, idAgente, idArea, pagina = 1, terminoBusqueda = '', filtrosAvanzados = {}) {
  const itemsPorPagina = 20;
  const offset = (pagina - 1) * itemsPorPagina;

  try {
    let query = `?order=fecha_inicio.desc&limit=${itemsPorPagina}&offset=${offset}`;
    let filtros = [];

    if (tipoFiltro === 'MIO') filtros.push(`agente_responsable_id=eq.${idAgente}`);
    else if (tipoFiltro === 'AREA') filtros.push(`area_destino_id=eq.${idArea}`);

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

    const response = supabaseFetch(DB_MAP.VISTAS.BANDEJA, "GET", null, query, true);

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
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function obtenerNotificacionesBackend(idAgente, idArea) {
  try {
    let notis = [];
    let totalMios = 0;
    let totalArea = 0;
    
    const qMios = `?agente_responsable_id=eq.${idAgente}&estado_id=eq.1&order=fecha_inicio.desc&limit=5`;
    const resMios = supabaseFetch("vw_bandeja_casos", "GET", null, qMios, true); 
    if(resMios && Array.isArray(resMios.data)) {
       totalMios = resMios.count || 0;
       resMios.data.forEach(r => notis.push({ id: r.recepcion_id, tipo: 'personal', titulo: r.categoria, fecha: formatSupabaseDate(r.fecha_inicio), mensaje: 'Asignado a ti. Requiere inicio de gestión.' }));
    }

    if (idArea) {
       const qArea = `?area_destino_id=eq.${idArea}&agente_responsable_id=is.null&estado_id=eq.4&order=fecha_inicio.desc&limit=5`;
       const resArea = supabaseFetch("vw_bandeja_casos", "GET", null, qArea, true);
       if(resArea && Array.isArray(resArea.data)) {
          totalArea = resArea.count || 0;
          resArea.data.forEach(r => notis.push({ id: r.recepcion_id, tipo: 'area', titulo: r.categoria, fecha: formatSupabaseDate(r.fecha_inicio), mensaje: 'Ingresó al Área. Esperando que un agente lo tome.' }));
       }
    }

    return { success: true, lista: notis, total: (totalMios + totalArea) };
  } catch(e) { return { success: false, message: e.message }; }
}

function procesarAccionBackend(accion, idCaso, idAgente, nombreAgente) {
  try {
    let payload = {};
    if (accion === 'tomar' || accion === 'reabrir') payload = { agente_responsable_id: idAgente, estado_id: 1, fecha_final: null };
    else if (accion === 'finalizar') payload = { estado_id: 3, fecha_final: new Date().toISOString() };

    const response = supabaseFetch(DB_MAP.TABLAS.RECEPCIONES, "PATCH", payload, `?id=eq.${idCaso}`);
    if (response && response.length > 0) {
       let msg = "";
       if (accion === 'tomar') msg = `El agente ${nombreAgente} tomó la responsabilidad del caso.`;
       else if (accion === 'reabrir') msg = `El agente ${nombreAgente} reabrió el caso.`;
       else if (accion === 'finalizar') msg = `El agente ${nombreAgente} finalizó el caso.`;
       try { supabaseFetch(DB_MAP.TABLAS.INTERACCIONES, "POST", { recepcion_id: idCaso, agente_id: idAgente, es_mensaje_sistema: true, observacion: msg }); } catch (logError) {}
       return { success: true };
    }
    return { success: false, message: "No se pudo actualizar el estado." };
  } catch (e) { return { success: false, message: e.message }; }
}

function guardarInteraccionBackend(payload) {
  try {
    if (payload.id) {
       const idStr = payload.id; delete payload.id;
       supabaseFetch(DB_MAP.TABLAS.INTERACCIONES, "PATCH", { observacion: payload.observacion }, `?id=eq.${idStr}`);
    } else {
       payload.id = generarIDUnico(10);
       supabaseFetch(DB_MAP.TABLAS.INTERACCIONES, "POST", payload);
       supabaseFetch(DB_MAP.TABLAS.RECEPCIONES, "PATCH", { estado_id: 5 }, `?id=eq.${payload.recepcion_id}&estado_id=eq.1`);
    }
    return { success: true };
  } catch (e) { return { success: false, message: e.message }; }
}

function guardarActuacionBackend(payload) {
  try {
    if (payload.id) {
       const idStr = payload.id;
       supabaseFetch(DB_MAP.TABLAS.ACTUACIONES, "PATCH", { tramite_id: payload.tramite_id, estado_id: payload.estado_id, observaciones: payload.observaciones }, `?id=eq.${idStr}`);
    } else {
       payload.id = generarIDUnico(10);
       supabaseFetch(DB_MAP.TABLAS.ACTUACIONES, "POST", payload);
       supabaseFetch(DB_MAP.TABLAS.RECEPCIONES, "PATCH", { estado_id: 5 }, `?id=eq.${payload.recepcion_id}&estado_id=eq.1`);
    }
    return { success: true };
  } catch (e) { return { success: false, message: e.message }; }
}

function obtenerPaqueteCompletoCaso(idCaso) {
  try {
    const queryDetalle = `?recepcion_id=eq.${idCaso}`;
    const dataDetalle = supabaseFetch(DB_MAP.VISTAS.DETALLE, "GET", null, queryDetalle);
    if (!dataDetalle || dataDetalle.length === 0) throw new Error("Caso no registrado.");
    const fila = dataDetalle[0];

    const gestion = {
      id: fila.recepcion_id, 
      fecha: formatSupabaseDate(fila.fecha_inicio),
      estado: fila.estado || "PENDIENTE", 
      idEstado: fila.estado_id, 
      observaciones: fila.observaciones || "Sin observaciones registradas en el inicio del trámite.", 
      categoria: fila.categoria || "SIN CATEGORÍA",
      agenteResp: fila.agente_responsable || "Sin asignar", 
      agenteRespId: fila.agente_responsable_id || null, 
      areaNombre: fila.area_destino || "No asignada", 
      areaDestinoId: fila.area_destino_id || null, 
      expediente: fila.expediente_codigo || "No posee",
      canal: fila.canal_atencion || "No especificado",
      prioridad: fila.prioridad || "Normal",
      agenteOrigen: fila.agente_origen || "Sistema"
    };

    const ciudadanoId = fila.ciudadano_id;
    let ciudadanoInfo = { 
       id: ciudadanoId, 
       nombre: fila.ciudadano_nombre || "No Registrado", 
       dni: fila.ciudadano_dni || null, 
       telefono: fila.ciudadano_telefono || null, 
       email: fila.ciudadano_email || null 
    };

    if (ciudadanoId) {
       try {
         const cData = supabaseFetch("ciudadanos", "GET", null, `?id=eq.${ciudadanoId}`);
         if (cData && cData.length > 0) ciudadanoInfo = cData[0];
       } catch(e) {} 
    }
    
    let historialUnificado = [];

    const dataActuaciones = supabaseFetch(DB_MAP.VISTAS.HISTORIAL, "GET", null, `?recepcion_id=eq.${idCaso}`);
    dataActuaciones.forEach(rsA => {
        historialUnificado.push({
            tipo: 'ACTUACION', idOriginal: rsA.actuacion_id, agente: rsA.agente_ejecutor, agenteId: rsA.agente_id,
            timestamp: new Date(rsA.fecha_inicio).getTime(), fechaFormat: formatSupabaseDate(rsA.fecha_inicio),
            titulo: rsA.tramite_nombre || "Actuación", subtitulo: rsA.estado || "S/D",
            texto: rsA.observaciones || "Sin observaciones", dataCruda: rsA
        });
    });

    try {
      const dataInt = supabaseFetch(DB_MAP.VISTAS.INTERACCIONES, "GET", null, `?recepcion_id=eq.${idCaso}`);
      dataInt.forEach(rsI => {
          historialUnificado.push({
              tipo: rsI.es_mensaje_sistema ? 'SISTEMA' : 'INTERACCION', idOriginal: rsI.interaccion_id,
              agente: rsI.agente_autor, agenteId: rsI.agente_id, timestamp: new Date(rsI.fecha_interaccion).getTime(),
              fechaFormat: formatSupabaseDate(rsI.fecha_interaccion), titulo: rsI.es_mensaje_sistema ? "Auditoría de Sistema" : "Nota Interna",
              subtitulo: "", texto: rsI.observacion || "", dataCruda: rsI
          });
      });
    } catch(bitError) {}

    historialUnificado.sort((a, b) => b.timestamp - a.timestamp);
    return { success: true, gestion, ciudadano: ciudadanoInfo, historialUnificado };
  } catch (e) { return { success: false, message: e.message }; }
}

function registrarRecepcionBackend(paquete) {
  try {
    let ciudadanoId = paquete.ciudadano.id;

    if (!ciudadanoId) {
      const resCiu = supabaseFetch("ciudadanos", "POST", {
        id: generarIDUnico(10), tipo_entidad_id: paquete.ciudadano.tipo_entidad_id ? parseInt(paquete.ciudadano.tipo_entidad_id) : 1,
        dni: paquete.ciudadano.dni || null, apellido: paquete.ciudadano.apellido || '-', nombre: paquete.ciudadano.nombre,
        cuil: paquete.ciudadano.cuil || null, fecha_nacimiento: paquete.ciudadano.fecha_nacimiento || null,
        genero_id: parseInt(paquete.ciudadano.genero_id) || null, telefono: paquete.ciudadano.telefono || null,
        email: paquete.ciudadano.email || null, barrio_id: parseInt(paquete.ciudadano.barrio_id) || null,
        calle: paquete.ciudadano.calle || null, altura: paquete.ciudadano.altura || null,
        piso: paquete.ciudadano.piso || null, dpto: paquete.ciudadano.dpto || null
      });
      if (resCiu && resCiu.length > 0) ciudadanoId = resCiu[0].id;
      else throw new Error("No se pudo registrar al ciudadano.");
    }

    if (!paquete.recepcion.forzar_duplicado) {
        const casoDuplicado = supabaseFetch("recepciones", "GET", null, `?ciudadano_id=eq.${ciudadanoId}&categoria_id=eq.${paquete.recepcion.categoria_id}&limit=1`);
        if (casoDuplicado && casoDuplicado.length > 0) return { success: false, isDuplicado: true, casoDuplicadoId: casoDuplicado[0].id };
    }

    const tipoDest = paquete.recepcion.tipo_destinatario_id ? parseInt(paquete.recepcion.tipo_destinatario_id) : null;
    const agenteAsignado = (tipoDest === 1 && paquete.recepcion.destino_id) ? String(paquete.recepcion.destino_id) : null;
    const estadoCalculado = agenteAsignado ? 1 : 4; 

    const payloadRec = {
      id: generarIDUnico(10), ciudadano_id: ciudadanoId,
      canal_id: parseInt(paquete.recepcion.canal_id) || 1, categoria_id: parseInt(paquete.recepcion.categoria_id) || 1,
      prioridad_id: parseInt(paquete.recepcion.prioridad_id) || null, reprogramado: paquete.recepcion.reprogramado,
      area_origen_id: parseInt(paquete.area_creadora_id), agente_origen_id: String(paquete.agente_creador_id),
      tipo_destinatario_id: tipoDest, agente_responsable_id: agenteAsignado,
      area_destino_id: tipoDest === 2 ? parseInt(paquete.recepcion.destino_id) : null,
      organismo_destino_id: tipoDest === 3 ? parseInt(paquete.recepcion.destino_id) : null,
      observaciones: paquete.recepcion.observaciones, estado_id: estadoCalculado,
      telefono: paquete.recepcion.telefono || null, email: paquete.recepcion.email || null
    };

    if (paquete.recepcion.reprogramado && paquete.recepcion.fecha_inicio_manual) payloadRec.fecha_inicio = new Date(paquete.recepcion.fecha_inicio_manual).toISOString();

    const resRec = supabaseFetch("recepciones", "POST", payloadRec);
    if (resRec && resRec.length > 0) return { success: true, nuevoId: resRec[0].id };
    throw new Error("No se obtuvo respuesta de inserción.");
  } catch(e) { return { success: false, message: e.message }; }
}

function derivarCasoBackend(payload) {
  try {
    let updatePayload = {
      tipo_destinatario_id: payload.tipo_destinatario_id,
      motivo_derivacion: payload.motivo_derivacion,
      area_destino_id: null,
      organismo_destino_id: null,
      agente_responsable_id: null,
      estado_id: 2 
    };

    if (payload.tipo_destinatario_id === 1) { 
        updatePayload.agente_responsable_id = String(payload.destino_id);
        updatePayload.estado_id = ESTADOS.RECEPCION.ASIGNADO; 
        try {
           const datosAgente = supabaseFetch("agentes", "GET", null, `?id=eq.${payload.destino_id}&select=area_id`);
           if (datosAgente && datosAgente.length > 0) updatePayload.area_destino_id = datosAgente[0].area_id;
        } catch(e) { } 

    } else if (payload.tipo_destinatario_id === 2) { 
        updatePayload.area_destino_id = parseInt(payload.destino_id);
        updatePayload.estado_id = ESTADOS.RECEPCION.PENDIENTE; 
        
    } else if (payload.tipo_destinatario_id === 3) { 
        updatePayload.organismo_destino_id = parseInt(payload.destino_id);
        updatePayload.estado_id = ESTADOS.RECEPCION.DERIVADO; 
    }

    const resPatch = supabaseFetch(DB_MAP.TABLAS.RECEPCIONES, "PATCH", updatePayload, `?id=eq.${payload.recepcion_id}`);
    
    if (resPatch && resPatch.length > 0) {
       const textoAuditoria = `El caso fue derivado a: ${payload.destino_nombre}.\nMotivo indicado: ${payload.motivo_derivacion}`;
       try { supabaseFetch(DB_MAP.TABLAS.INTERACCIONES, "POST", { recepcion_id: payload.recepcion_id, agente_id: payload.agente_origen_id, es_mensaje_sistema: true, observacion: textoAuditoria }); } catch(logError) { }
       return { success: true };
    }
    
    return { success: false, message: "La base de datos rechazó la modificación del estado." };
  } catch(e) { return { success: false, message: e.message }; }
}

function buscarExpedientesBackend(termino) {
  try {
    if (!termino || termino.length < 3) return [];
    const termStr = encodeURIComponent(`*${termino.trim()}*`);
    const data = supabaseFetch("expedientes", "GET", null, `?codigo=ilike.${termStr}&limit=8&select=id,codigo,titulo`);
    return data || [];
  } catch(e) {
    return [];
  }
}

function gestionarAsociacionExpedienteBackend(idCaso, codigoExp, idAgente, accion) {
  try {
    let expId = null;
    let textoAuditoria = "";

    if (accion === 'vincular') {
        const expData = supabaseFetch("expedientes", "GET", null, `?codigo=eq.${encodeURIComponent(codigoExp)}`);
        if (!expData || expData.length === 0) return { success: false, message: "El código ingresado no existe en el sistema. Verifique e intente de nuevo." };
        expId = expData[0].id;
        textoAuditoria = `El caso fue vinculado al Expediente: ${codigoExp}.`;
    } else if (accion === 'desvincular') {
        textoAuditoria = `El caso fue desvinculado de su expediente asociado.`;
    } else {
        return { success: false, message: "Acción no válida." };
    }

    const resPatch = supabaseFetch(DB_MAP.TABLAS.RECEPCIONES, "PATCH", { expediente_id: expId }, `?id=eq.${idCaso}`);
    
    if (resPatch && resPatch.length > 0) {
       try { 
           supabaseFetch(DB_MAP.TABLAS.INTERACCIONES, "POST", { 
               recepcion_id: idCaso, 
               agente_id: idAgente, 
               es_mensaje_sistema: true, 
               observacion: textoAuditoria 
           }); 
       } catch(logError) {}
       return { success: true };
    }
    
    return { success: false, message: "Error interno al intentar modificar el registro del caso." };
  } catch (e) { 
    return { success: false, message: e.message }; 
  }
}

// =========================================================
// NUEVO: ENDPOINT DE CATÁLOGOS EXCLUSIVO PARA EL MÓDULO ATC
// =========================================================
function obtenerDiccionariosATCBackend() {
  try {
    const diccionarios = {};
    diccionarios.canales = supabaseFetch("canales_atencion", "GET", null, "?select=id,nombre&order=nombre.asc");
    diccionarios.categorias = supabaseFetch("categorias", "GET", null, "?select=id,nombre&order=nombre.asc");
    diccionarios.barrios = supabaseFetch("barrios", "GET", null, "?select=id,nombre&order=nombre.asc");
    diccionarios.prioridades = supabaseFetch("tipos_prioridad", "GET", null, "?select=id,nombre,descripcion&order=id.asc");
    diccionarios.tipos_destinatario = supabaseFetch("tipos_destinatario", "GET", null, "?select=id,nombre&order=id.asc");
    diccionarios.organismos = supabaseFetch("organismos_externos", "GET", null, "?select=id,nombre&order=nombre.asc");
    diccionarios.estados_recepcion = supabaseFetch("estados_recepcion", "GET", null, "?select=id,nombre&order=id.asc");
    diccionarios.estados_actuacion = supabaseFetch("estados_actuacion", "GET", null, "?select=id,nombre&order=id.asc");
    diccionarios.estados_expediente = supabaseFetch("estados_expediente", "GET", null, "?select=id,nombre&order=id.asc");
    diccionarios.tramites = supabaseFetch("tramites", "GET", null, "?select=id,nombre,categoria_id&order=nombre.asc");
    diccionarios.tipos_entidad = supabaseFetch("tipos_entidad", "GET", null, "?select=id,nombre&order=id.asc");
    
    return { success: true, data: diccionarios };
  } catch (e) {
    return { success: false, message: e.message };
  }
}