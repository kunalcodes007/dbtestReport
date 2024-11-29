const express = require("express");
const app = express();
const database = require("./config/database");

require("dotenv").config({ path: "./config/env" });
const dbtestReport = require("./Controller/dbtestReport");
app.use(express.json());
app.use("/api", dbtestReport);
app.use(express.urlencoded({ extended: true }));

database();

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
