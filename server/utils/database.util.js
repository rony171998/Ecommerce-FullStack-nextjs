const { Sequelize, DataTypes } = require("sequelize");
const dotenv = require("dotenv").config();

const db = new Sequelize({
    dialect: "postgres",
    host: process.env.DB_HOST,
    username: process.env.DB_USER,
    port: process.env.DB_PORT,
    password: process.env.DB_PASSWORD,
    database: process.env.DB,
    dbname: process.env.DB,
    user: process.env.DB_USER,
    logging: false,
    dialectOptions: {
        ssl: {
            required: true,
            rejectUnauthorized: false,
        },
    },
});

module.exports = { db, DataTypes };
