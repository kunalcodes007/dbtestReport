const express = require("express");
const app = express();
const database = require("./config/database");
const mongoconnection=require("./config/mongoconnection")
require("dotenv").config({ path: "./config/env" });
const admin_billing_report = require("./Controller/admin_billing_report");
const detail_billing_report=require("./Controller/detail_billing_report")
const withtrack_whatsapp=require("./Controller/withtrack_whatsapp")
const clickreport_download_camp=require("./Controller/clickreport_download_camp")
const clickreport_download_api=require("./Controller/clickreport_download_api")
const fixed_url=require("./Controller/fixed_url")
const url_fixed_track=require("./Controller/url_fixed_track")
const api_insert_data=require("./Controller/api_insert_data")
const camp_quick_reply_download=require("./Controller/camp_quick_reply_download")

const vendor_summary=require("./Controller/vendor_summary")
const listKarix=require("./Controller/karixList")

// const admin_billing_report=require("./Controller/admin_billing_report")
app.use(express.json());
app.use("/api", admin_billing_report);
app.use("/api",detail_billing_report)
app.use("/api",withtrack_whatsapp)
app.use("/api",clickreport_download_camp)
app.use("/api",clickreport_download_api)
app.use("/api",fixed_url)
app.use("/api",url_fixed_track)
app.use("/api",api_insert_data)
app.use("/api",camp_quick_reply_download)
app.use("/api",vendor_summary)
app.use("/api",listKarix)

// app.use("/api",admin_billing_report)

app.use(express.urlencoded({ extended: true }));

database();
mongoconnection();
const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
