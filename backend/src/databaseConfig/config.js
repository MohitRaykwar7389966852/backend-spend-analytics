require("dotenv").config();

const config = {
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASS,
    server: process.env.DATABASE_SERVER,
    port: Number(process.env.DATABASE_PORT),
    database: process.env.DATABASE_NAME,
    authentication: {
        type: "default",
    },
    options: {
        encrypt: true,
        // trustedConnection: true,
      },
    requestTimeout: 0,
};
console.log("starting...");

module.exports = config;
