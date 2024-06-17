const { Sequelize, DataTypes } = require("sequelize");
const dotenv = require("dotenv").config();

const db = new Sequelize({
    dialect: "postgres",
    host:
        process.env.DB_HOST |
        "database-smark-mark.ch2ss8uqqwt1.us-east-2.rds.amazonaws.com",
    username: process.env.DB_USER | "postgres",
    port: process.env.DB_PORT | "5432",
    password: process.env.DB_PASSWORD | "17041998",
    database: process.env.DB | "smart-mark",
    dbname: process.env.DB | "smart-mark",
    user: process.env.DB_USER | "postgres",
    logging: false,
    dialectOptions:
        process.env.NODE_ENV === "production"
            ? {
                  ssl: {
                      required: true,
                      rejectUnauthorized: false,
                  },
              }
            : {},
});

module.exports = { db, DataTypes };
