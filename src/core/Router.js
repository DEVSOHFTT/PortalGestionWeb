// src/core/Router.js

/**
 * Renderiza la interfaz principal del Portal.
 */
function doGet(e) {
  try {
    // IMPORTANTE: Referencia la ruta completa definida por la carpeta
    const template = HtmlService.createTemplateFromFile('src/ui/shared/Layout_Main');
    return template.evaluate()
        .setTitle('Portal de Gestión - Defensoría')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    return HtmlService.createHtmlOutput(`<h2>Error Crítico de Arranque: ${error.message}</h2>`);
  }
}

/**
 * Inyector de sub-plantillas (CSS, JS, Vistas).
 * @param {string} path - Ruta del archivo (ej: 'src/ui/css/Styles_Global')
 */
function include(path) {
  try {
    return HtmlService.createHtmlOutputFromFile(path).getContent();
  } catch (error) {
    // Alerta visual en desarrollo si falta un archivo
    return `<div style="background:#dc2626; color:white; padding:10px; border-radius:8px; margin:5px; font-family:sans-serif;">
              🚨 <b>Error de Inyección:</b> No se encontró el archivo en la ruta: <br> 
              <code style="background:rgba(0,0,0,0.2); padding:2px 5px;">${path}</code>
            </div>`;
  }
}

/**
 * Devuelve el contenido HTML de una vista para carga dinámica.
 */
function obtenerVista(path) {
  try {
    return HtmlService.createTemplateFromFile(path).evaluate().getContent();
  } catch (error) {
    throw new Error(`No se pudo cargar la vista en: ${path}. Verifique la ruta.`);
  }
}