const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage"); // Importar Upload
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const archiver = require("archiver");
const stream = require("stream");
const axios = require("axios");
const global_config = require("./config/settings.js");
const { Client } = require("pg");
const connectionParams = global_config.connectionParams;
const client = new Client(connectionParams);


const s3 = new S3Client({ region: "us-east-2" });
const QUERY_PHOTOS = `select * from business.fn_products_get_photo($1);`;

exports.handler = async (event) => {
    const bucket = "dev-my-test-bucket1";
    const zipKey = `zips/fotos-${Date.now()}.zip`;
    console.log(connectionParams)

    console.log("🚀 Iniciando proceso...");

    try {
        let body = JSON.parse(event.body);
        let productId = body.product_id;
        console.log("🔍 Buscando fotos de los productos:", productId);
        await client.connect();
        let result = await client.query(QUERY_PHOTOS, [JSON.stringify(productId)]);
        console.log(result.rows[0].fn_products_get_photo);
        const fileUrls = result.rows[0].fn_products_get_photo;

        const zipStream = new stream.PassThrough();

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


        for (const fileUrl of fileUrls) {
            try {
                const response = await axios.get(fileUrl, { responseType: "stream" });

                const fileName = fileUrl.split("/").pop(); // Extrae el nombre del archivo
                archive.append(response.data, { name: fileName });

            } catch (err) {
                console.error(`Error descargando ${fileUrl}:`, err.message);
            }
        }

        archive.finalize();
        await upload.done();

        const signedUrl = await getSignedUrl(
            s3,
            new GetObjectCommand({ Bucket: bucket, Key: zipKey }),
            { expiresIn: 3600 }
        );

        console.log("🔗 URL Generada:", signedUrl);
        await client.end();
        return {
            statusCode: 200,
            body: signedUrl,
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


let resp = this.handler(
    {
        "body": "{\"product_id\": [\"238011\", \"2452\"]}"
      }
      
  
);

resp.then((data) => {
    console.info("Respuesta del Lambda:" + JSON.stringify(data));
});   