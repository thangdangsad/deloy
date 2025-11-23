require("dotenv").config();

module.exports = {
    development: {
        dialect: "mssql",
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialectOptions: {
            options: {
                encrypt: process.env.DB_SSL === "true",
                trustServerCertificate: true
            }
        }
    },
    production: {
        dialect: "mssql",
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialectOptions: {
            options: {
                encrypt: process.env.DB_SSL === "true",
                trustServerCertificate: true
            }
        }
    }
};
