const express = require("express");
const app = express();
const database = require("./config/database");
const mongoconnection=require("./config/mongoconnection")
require("dotenv").config({ path: "./config/env" });
const dbtestReport = require("./Controller/dbtestReport");
const userSummaryReport=require("./Controller/userSummaryReport")
const withtrack_whatsapp=require("./Controller/withtrack_whatsapp")
const clickreport_download_camp=require("./Controller/clickreport_download_camp")
const clickreport_download_api=require("./Controller/clickreport_download_api")
app.use(express.json());
app.use("/api", dbtestReport);
app.use("/api",userSummaryReport)
app.use("/api",withtrack_whatsapp)
app.use("/api",clickreport_download_camp)
app.use("/api",clickreport_download_api)
app.use(express.urlencoded({ extended: true }));

database();
mongoconnection();
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
