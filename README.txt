LA CHURA SNACK V5.3 — MULTIDISPOSITIVO Y CAJA CENTRALIZADA

IMPORTANTE: esta versión requiere publicar el Code.gs incluido como una NUEVA implementación de Apps Script.

Apps Script:
1. Abre tu proyecto.
2. Reemplaza el contenido de Code.gs por el archivo incluido.
3. Ejecuta setup() una vez.
4. Implementar > Nueva implementación > Aplicación web.
5. Ejecutar como: tú.
6. Acceso: cualquier usuario con el enlace.
7. Copia la URL /exec y colócala en script.js en API_URL.

VENTAS:
- La venta de Caja usa createSale: pedido + venta + movimiento de caja se guardan en una sola operación.
- La Caja debe estar ABIERTA para cobrar una venta.
- Si falla, la pantalla muestra el error real (CASH_CLOSED, UNAUTHORIZED, etc.).

SINCRONIZACIÓN:
- Cliente, Cocina, Caja y Admin consultan el mismo servidor cada 2 segundos.
- Los pedidos y ventas ya no dependen de localStorage para sincronizar entre equipos.
- localStorage queda solo como respaldo/preferencias del dispositivo.
