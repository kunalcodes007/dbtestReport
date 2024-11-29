const mongoose = require("mongoose");
require("dotenv").config({ path: "./config/.env" });
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI_AUTHKEY_RCS;
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
};
module.exports = connectDB;