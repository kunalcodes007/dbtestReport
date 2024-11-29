const database = require("../config/database");
const ErrorHandler = require("../Utils/ErrorHandler");

const db = async (query, value) => {
  let connection;
  try {
    connection = await database();

    const [rows] = await connection.execute(query, value);
    return rows;
  } catch (error) {
    console.error("Error executing query:", error);
    throw new ErrorHandler(error.message, 500);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};

module.exports = db;
