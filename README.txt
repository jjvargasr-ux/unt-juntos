UNT Juntos - versión de interfaz mejorada

Archivos:
- index.html: estructura de pantallas y formularios.
- styles.css: estilos.
- app.js: lógica de la demostración local.

Para probar:
1. Extrae el ZIP.
2. Abre la carpeta en Visual Studio Code.
3. Abre index.html con Live Server.

IMPORTANTE - funciones que requieren backend:
Esta versión conserva el almacenamiento local del prototipo. Los grupos y mensajes NO se comparten entre dispositivos ni usuarios reales. La verificación por código al correo tampoco envía mensajes: para ello se debe integrar un proveedor de autenticación (por ejemplo Supabase Auth o Firebase Authentication) y configurar el dominio/correo institucional.
No se solicita ni se almacena la contraseña del correo UNT.
No uses datos personales reales para pruebas públicas hasta implementar autenticación, base de datos, reglas de acceso y política de privacidad.
