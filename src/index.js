import Aedes from 'aedes';
import { createServer } from 'net';
import mysql from 'mysql2/promise';

// Configuración de la base de datos
const db = mysql.createPool({
    host: 'localhost',
    user: 'mantox',
    password: 'tu_contraseña',
    database: 'sensor_data',
});

// Crear servidor MQTT
const aedes = Aedes();
const server = createServer(aedes.handle);

server.listen(1883, () => {
    console.log('Servidor MQTT escuchando en el puerto 1883');
});

// Manejo de publicaciones
aedes.on('publish', async (packet, client) => {
    console.log('Mensaje publicado en el topic:', packet.topic);

    if (packet.topic === 'accelerometer/data') {
        try {
            const data = JSON.parse(packet.payload.toString());
            const { device_id, timestamp, samples } = data;

            if (!device_id || !timestamp || !samples || !Array.isArray(samples)) {
                console.error('Datos inválidos recibidos');
                return;
            }

            // Insertar datos en la base de datos
            const values = samples.map(sample => [device_id, timestamp, sample.axis, sample.sample_index, sample.value]);
            const query = `
                INSERT INTO accelerometer_readings (device_id, timestamp, axis, sample_index, value)
                VALUES ?;
            `;

            try {
                await db.query(query, [values]);
                console.log('Datos almacenados con éxito');
            } catch (err) {
                console.error('Error al insertar en la base de datos:', err);
            }
        } catch (error) {
            console.error('Error procesando los datos:', error);
        }
    }
});
