require('dotenv').config();

// exports.connectionParams = {
//     host: "bbc-dev-database.czycak44cf8c.us-east-2.rds.amazonaws.com",
//     port: 5432,
//     user: "postgres",
//     password: "Gr0wb1zDevQasM39kdu4",
//     database: "bbc_db_dev",
//     ssl: { rejectUnauthorized: false } 
// };


exports.connectionParams = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false } 
};