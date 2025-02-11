const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage"); // Importar Upload
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const archiver = require("archiver");
const stream = require("stream");
const global_config = require("./config/settings.js");
const { Client } = require("pg");
const connectionParams = global_config.connectionParams;
const client = new Client(connectionParams); 


const s3 = new S3Client({ region: "us-east-2" });

exports.handler = async (event) => {
    const bucket = "dev-my-test-bucket1";
    const folder ="3";
    const zipKey = `zips/${folder}/fotos-${Date.now()}.zip`;

    const files = ["foto1.jpg", "foto2.jpg"].map(file => `${folder}/${file}`);

    console.log(connectionParams)

    console.log("🚀 Iniciando proceso...");

    try {
        await client.connect();

        console.log("🔌 Conectado a PostgreSQL");

        const zipStream = new stream.PassThrough();
        console.log("📤 Creando stream para ZIP...");

        // Usamos `Upload` en lugar de `PutObjectCommand`
        const upload = new Upload({
            client: s3,
            params: {
                Bucket: bucket,
                Key: zipKey,
                Body: zipStream,
                ContentType: "application/zip",
            },
        });

        const archive = archiver("zip", { zlib: { level: 9 } });
        archive.pipe(zipStream);

        console.log("📂 Agregando archivos al ZIP...");

        for (const file of files) {
            console.log(`📥 Descargando: ${file}`);
            const fileParams = { Bucket: bucket, Key: file };
            const { Body } = await s3.send(new GetObjectCommand(fileParams));

            if (!Body) {
                console.error(`❌ Error: El archivo ${file} no existe en el bucket`);
                return {
                    statusCode: 404,
                    body: JSON.stringify({ error: `Archivo no encontrado: ${file}` }),
                };
            }

            archive.append(Body, { name: file });
            console.log(`✅ ${file} agregado al ZIP`);
        }

        await archive.finalize();
        console.log("🎯 ZIP Finalizado!");

        await upload.done(); // Esperamos que el upload termine correctamente
        console.log("📤 ZIP Subido a S3!");

        const signedUrl = await getSignedUrl(
            s3,
            new GetObjectCommand({ Bucket: bucket, Key: zipKey }),
            { expiresIn: 3600 }
        );

        console.log("🔗 URL Generada:", signedUrl);

        return {
            statusCode: 200,
            body: JSON.stringify({ url: signedUrl }),
        };
    } catch (error) {
        console.error("❌ Error en el proceso:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};


/****** TEST LOCAL ******/


let resp = this.handler({
  "body": `{"nombre":"Juan","apellido":"Perez"}`}
);



resp.then((data) => {
  console.info("Respuesta del Lambda:" + JSON.stringify(data));
});   
