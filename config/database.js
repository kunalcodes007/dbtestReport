const mysql = require("mysql2/promise");
const ErrorHandler = require("../Utils/ErrorHandler");
require("dotenv").config({ path: "./config/.env" });

const database = async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
    });

    console.log("Database connected successfully");
    return connection;
  } catch (error) {
    console.error("Error connecting to the database:", error);

    throw new ErrorHandler(error.message, 500);
  }
};

module.exports = database;
