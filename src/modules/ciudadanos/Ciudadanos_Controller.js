// src/modules/ciudadanos/Ciudadanos_Controller.js

function buscarCiudadanoBackend(valorBuscado) {
  try {
    valorBuscado = String(valorBuscado).trim();
    let query = "";

    if (valorBuscado.length === 11 && !isNaN(valorBuscado)) {
        const dniExtraido = valorBuscado.substring(2, 10);
        const dniSinCero = parseInt(dniExtraido, 10).toString();
        query = `?or=(cuil.eq.${valorBuscado},dni.eq.${valorBuscado},dni.eq.${dniExtraido},dni.eq.${dniSinCero})&limit=1`;
    } else {
        query = `?or=(dni.eq.${valorBuscado},cuil.eq.${valorBuscado})&limit=1`;
    }

    const data = supabaseFetch("ciudadanos", "GET", null, query);
    
    if (!data || data.length === 0) {
        return { encontrado: false, datos_externos: null };
    }

    const c = data[0];
    const queryCasos = `?ciudadano_id=eq.${c.id}&order=fecha_inicio.desc`; 
    const casosCrudos = supabaseFetch("vw_detalle_recepcion", "GET", null, queryCasos) || [];

    const casosPrevios = casosCrudos.map(caso => {
      let fechaF = "S/D"; let horaF = "";
      if (caso.fecha_inicio) {
        try {
          const d = new Date(caso.fecha_inicio);
          fechaF = Utilities.formatDate(d, "GMT-3", "dd/MM/yyyy");
          horaF = Utilities.formatDate(d, "GMT-3", "HH:mm");
        } catch(e) {}
      }
      return {
        id: caso.recepcion_id, fecha: fechaF, hora: horaF,
        estado: caso.estado || 'PENDIENTE', categoria: caso.categoria || 'Sin Categoría',
        area: caso.area_destino || caso.area_destino_nombre || 'Sin asignar',
        agente: caso.agente_responsable || caso.agente_responsable_nombre || 'Sin asignar',
        expediente: caso.expediente_codigo || caso.expediente_id || ''
      };
    });

    return { 
      encontrado: true, 
      data: {
        ciudadano_id: c.id, tipo_entidad_id: c.tipo_entidad_id || '', nombre: c.nombre || '',
        apellido: c.apellido || '', cuil: c.cuil || '', dni: c.dni || '', fecha_nacimiento: c.fecha_nacimiento || '',
        genero_id: c.genero_id || '', telefono: c.telefono || '', email: c.email || '', calle: c.calle || '',
        altura: c.altura || '', piso: c.piso || '', dpto: c.dpto || '', barrio_id: c.barrio_id || '',
        casos_previos: casosPrevios 
      }
    };
  } catch(e) { throw new Error("Error en BD REST: " + e.message); }
}

function obtenerFichaCompletaCiudadanoBackend(idCiudadano) {
  try {
    const cData = supabaseFetch("ciudadanos", "GET", null, `?id=eq.${idCiudadano}`);
    if(!cData || cData.length === 0) throw new Error("Ciudadano no encontrado en la base de datos.");
    const c = cData[0];

    const casosCrudos = supabaseFetch("vw_detalle_recepcion", "GET", null, `?ciudadano_id=eq.${idCiudadano}&order=fecha_inicio.desc`) || [];
    
    const historial = casosCrudos.map(caso => {
      let fechaF = "S/D"; let horaF = "";
      if (caso.fecha_inicio) {
        try {
          const d = new Date(caso.fecha_inicio);
          fechaF = Utilities.formatDate(d, "GMT-3", "dd/MM/yyyy");
          horaF = Utilities.formatDate(d, "GMT-3", "HH:mm");
        } catch(e) {}
      }
      return {
        id: caso.recepcion_id,
        fecha: fechaF,
        hora: horaF,
        estado: caso.estado || 'PENDIENTE',
        categoria: caso.categoria || 'Sin Categoría',
        area: caso.area_destino || caso.area_destino_nombre || 'Sin asignar',
        agente: caso.agente_responsable || caso.agente_responsable_nombre || 'Sin asignar',
        expediente: caso.expediente_codigo || caso.expediente_id || ''
      };
    });

    return { success: true, ciudadano: c, historial: historial };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

// NUEVO: Motor de guardado de ediciones en la Ficha In-Situ
function actualizarCiudadanoBackend(payload) {
  try {
    const id = payload.id;
    delete payload.id; // Quitamos el ID del payload para que Supabase no rechace el PATCH
    
    const resPatch = supabaseFetch("ciudadanos", "PATCH", payload, `?id=eq.${id}`);
    
    if (resPatch && resPatch.length > 0) return { success: true };
    return { success: false, message: "La base de datos rechazó la modificación." };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// NUEVO FIX: Motor de Asociación de Expedientes
function vincularExpedienteBackend(idCaso, codigoExp, idAgente) {
  try {
    // 1. Verificar existencia del expediente
    const expData = supabaseFetch("expedientes", "GET", null, `?codigo=eq.${encodeURIComponent(codigoExp)}`);
    
    if (!expData || expData.length === 0) {
        return { success: false, message: "No se encontró ningún expediente registrado con ese código exacto." };
    }
    
    const expId = expData[0].id;

    // 2. Vincular el expediente al caso (recepción)
    const resPatch = supabaseFetch(DB_MAP.TABLAS.RECEPCIONES, "PATCH", { expediente_id: expId }, `?id=eq.${idCaso}`);
    
    if (resPatch && resPatch.length > 0) {
       // 3. Registrar huella de auditoría en la Hoja de Ruta (Timeline)
       const textoAuditoria = `El caso fue vinculado exitosamente al Expediente Físico/Digital: ${codigoExp}.`;
       try { 
           supabaseFetch(DB_MAP.TABLAS.INTERACCIONES, "POST", { 
               recepcion_id: idCaso, 
               agente_id: idAgente, 
               es_mensaje_sistema: true, 
               observacion: textoAuditoria 
           }); 
       } catch(logError) { 
           // Si falla la auditoría, no deshacemos la vinculación.
       }
       
       return { success: true };
    }
    
    return { success: false, message: "Error interno al intentar grabar el expediente en el caso." };
  } catch (e) { 
    return { success: false, message: e.message }; 
  }
}