const mongoose = require("mongoose");
require("dotenv").config({ path: "./config/.env" });


const mongodb_authkey_0kb=mongoose.createConnection(
  process.env.MONGODB_URI_AUTHKEY_RCS
)
const mongodb_authkey_bulk = mongoose.createConnection(
  process.env.MONGODB_URI_AUTHKEY_BULK
);

module.exports = {  mongodb_authkey_bulk,mongodb_authkey_0kb };
