LA CHURA SNACK V5
==================

Esta versión está planteada como una app de restaurante moderna, inspirada en patrones de apps móviles de pedidos:
- Home visual.
- Menú por categorías.
- Búsqueda.
- Carrito del cliente.
- Pedido desde celular.
- Pedido creado por cajero.
- Pantalla KDS para cocina.
- Seguimiento de pedido.
- Centro administrativo.
- Productos y precios.
- Caja básica.
- PWA.
- Backend Google Apps Script + Sheets.
- Sincronización automática cada 3 segundos.

INSTALACIÓN
1) Abre Google Sheets y crea una hoja.
2) Extensiones > Apps Script.
3) Pega Code.gs.
4) Ejecuta setup() una vez y acepta permisos.
5) Implementa como aplicación web, ejecutando como tú y con acceso para quienes tengan el enlace.
6) Copia la URL /exec en script.js. Ya está configurada con la URL que entregó el usuario.
7) Publica index.html, style.css, script.js y manifest.json en el hosting.

NOTA SOBRE TIEMPO REAL
Apps Script no ofrece WebSockets nativos. V5 utiliza sincronización automática cada 3 segundos. Para tiempo real push de nivel superior, la siguiente arquitectura recomendada es Supabase Realtime/Firebase para PEDIDOS, manteniendo Sheets para reportes si se desea.

V1 NO incluye delivery a domicilio. El modelo queda preparado para añadirlo después.
