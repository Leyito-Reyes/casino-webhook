const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// ⚠️ AQUÍ DEBES PONER LOS DATOS QUE TE DIO INFINITYFREE
const dbConfig = {
    host: 'sql123.epizy.com',        // Cambia esto por tu MySQL Host Name
    user: 'epiz_98765432',           // Cambia esto por tu MySQL User
    password: 'TuPasswordDelHosting',// Cambia esto por tu contraseña de InfinityFree
    database: 'epiz_98765432_casino' // Cambia esto por tu nombre de BD en InfinityFree
};

// Ruta del Webhook
app.post('/webhook/pagos', async (req, res) => {
    try {
        const datos = req.body;
        console.log("🔔 ¡NUEVO WEBHOOK RECIBIDO!", datos);

        const idOrden = datos.id_orden_conekta;
        const nuevoEstatus = datos.estatus;

        if (!idOrden || !nuevoEstatus) {
            return res.status(400).json({ error: "Faltan datos" });
        }

        const db = await mysql.createConnection(dbConfig);
        const [resultado] = await db.execute(
            'UPDATE ventas SET estatus_conekta = ? WHERE id_orden_conekta = ?',
            [nuevoEstatus, idOrden]
        );
        await db.end();

        if (resultado.affectedRows > 0) {
            console.log(`✅ Orden ${idOrden} actualizada a ${nuevoEstatus}`);
            res.status(200).json({ mensaje: "BD Actualizada con éxito" });
        } else {
            res.status(404).json({ mensaje: "Orden no encontrada en la BD" });
        }

    } catch (error) {
        console.error("❌ Error en el Webhook:", error);
        res.status(500).send("Error interno");
    }
});

// ESTO SOLUCIONA EL ERROR 1 DE RENDER (El Puerto Dinámico)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor de Webhooks corriendo en el puerto ${PORT}`);
});
