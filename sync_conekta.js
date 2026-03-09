const mysql = require('mysql2/promise');
const axios = require('axios');

// --- 1. CONFIGURACIÓN ---
// Reemplaza con tu llave privada real de Conekta
const CONEKTA_PRIVATE_KEY = 'key_ueDout9YZYdoZlC3UN7kQZT'; 

const dbConfig = {
    host: 'sql104.infinityfree.com',
    user: 'if0_41341417',
    password: 'E2006oire',
    database: 'if0_41341417_casino'
};

// Variable para llevar el registro del contador (memoria del ciclo)
let ultimoContadorMovimientos = -1;

async function procesarMovimientos() {
    try {
        // 2. CONSULTAR A CONEKTA (API REST)
        // Autenticación en Base64 para Conekta
        const authBase64 = Buffer.from(CONEKTA_PRIVATE_KEY + ':').toString('base64');

        const respuesta = await axios.get('https://api.conekta.io/orders', {
            headers: {
                'Accept': 'application/vnd.conekta-v2.0.0+json',
                'Authorization': `Basic ${authBase64}`
            }
        });

        const ordenes = respuesta.data.data; // Lista de órdenes
        const contadorActual = ordenes.length; // Número de movimientos

        // 3. VALIDAR SI EL CONTADOR CAMBIÓ
        if (contadorActual === ultimoContadorMovimientos) {
            // El contador no varió. No ejecutamos la acción.
            console.log(`[${new Date().toLocaleTimeString()}] Sin cambios. Contador: ${contadorActual}. Esperando...`);
            return; 
        }

        // 4. SI EL CONTADOR VARIÓ, EJECUTAR LA ACCIÓN
        console.log(`🚨 Cambio detectado: De ${ultimoContadorMovimientos} a ${contadorActual} movimientos. Actualizando BD...`);
        ultimoContadorMovimientos = contadorActual;

        // Conectar a BD
        const db = await mysql.createConnection(dbConfig);

        // Recorrer los movimientos para actualizar estatus
        for (let orden of ordenes) {
            const idConekta = orden.id; // Ej: ord_2tU...
            const estatusConekta = orden.payment_status; // 'paid', 'declined', etc.

            // Traducir el estatus de Conekta a lo que pides
            let estatusFinal = 'Pendiente';
            if (estatusConekta === 'paid') {
                estatusFinal = 'Aceptado';
            } else if (estatusConekta === 'declined' || estatusConekta === 'failed' || estatusConekta === 'chargeback') {
                estatusFinal = 'Rechazado';
            }

            // Actualizar en la tabla de ventas
            await db.execute(
                'UPDATE ventas SET estatus_conekta = ? WHERE id_orden_conekta = ?',
                [estatusFinal, idConekta]
            );
        }

        await db.end();
        console.log('✅ Base de datos actualizada correctamente con los nuevos estatus.\n');

    } catch (error) {
        console.error('❌ Error al verificar movimientos:', error.response ? error.response.data : error.message);
    }
}

// 5. CICLO QUE SE REPITE CADA 5 SEGUNDOS (5000 ms)
console.log('Iniciando validador de Conekta cada 5 segundos...');
setInterval(procesarMovimientos, 5000);

// Ejecución inmediata la primera vez
procesarMovimientos();
