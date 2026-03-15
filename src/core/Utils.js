/**
 * Genera un ID único alfanumérico (Mayúsculas, Minúsculas y Números).
 * @param {number} longitud - Cantidad de caracteres (recomendado 10 o 12).
 * @return {string}
 */
function generarIDUnico(longitud = 10) {
  const charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let resultado = "";
  for (let i = 0; i < longitud; i++) {
    resultado += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return resultado;
}
