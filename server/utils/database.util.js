const { Sequelize, DataTypes } = require("sequelize");
const dotenv = require("dotenv").config();

const db = new Sequelize({
    dialect: "postgres",
    host: "database-smark-mark.ch2ss8uqqwt1.us-east-2.rds.amazonaws.com",
    username: "postgres",
    port: "5432",
    password: "17041998",
    database: "smart-mark",
    dbname: "smart-mark",
    user: "postgres",
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
