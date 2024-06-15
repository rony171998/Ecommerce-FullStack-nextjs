const { app } = require("./app");
const { initModels } = require("./models/initModels");
// const path = require("path");
// const dotenv = require("dotenv");
// // Determine el entorno actual
// const env = process.env.NODE_ENV || "development";

// // Cargar variables de entorno según el entorno actual
// const envPath = env === "production" ? ".env.production" : ".env";
// dotenv.config({ path: path.resolve(process.cwd(), envPath) });

// Utils
const { db } = require("./utils/database.util");

db.authenticate()
    .then(() => console.log("Db authenticated"))
    .catch(err => console.log(err));

// Establish model's relations
initModels();

db.sync()
    .then(() => console.log("Db synced"))
    .catch(err => console.log(err));

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "localhost";
app.listen(PORT, HOST, () => {
    console.log(
        "Express app running!! on port " +
            PORT +
            " on host " +
            HOST +
            " NODE: " +
            process.env.NODE_ENV
    );
});
