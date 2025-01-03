const express = require("express");
const app = express();
const database = require("./config/database");
require("dotenv").config({ path: "./config/env" });
const admin_billing_report = require("./Controller/admin_billing_report");
const detail_billing_report=require("./Controller/detail_billing_report")
const withtrack_whatsapp=require("./Controller/withtrack_whatsapp")
const click_report_summary=require("./Controller/click_report_summary")
const click_reply_summary=require("./Controller/click_reply_summary")
const clickreport_download_camp=require("./Controller/clickreport_download_camp")
const clickreport_download_api=require("./Controller/clickreport_download_api")
const fixed_url=require("./Controller/fixed_url")
const url_fixed_track=require("./Controller/url_fixed_track")
const api_insert_data=require("./Controller/api_insert_data")
const camp_quick_reply_download=require("./Controller/camp_quick_reply_download")
const vendor_summary=require("./Controller/vendor_summary")
const listKarix=require("./Controller/karixList")
const rcs_setting=require("./Controller/rcssetting")
// const admin_billing_report=require("./Controller/admin_billing_report")
const {
  mongodb_authkey_0kb ,mongodb_authkey_bulk,mongodb_authkey
} = require("./config/mongoconnection");
app.use(express.json());
app.use("/api", admin_billing_report);
app.use("/api",detail_billing_report)
app.use("/api",withtrack_whatsapp)
app.use("/api",click_report_summary)
app.use("/api",click_reply_summary)
app.use("/api",clickreport_download_camp)
app.use("/api",clickreport_download_api)
app.use("/api",fixed_url)
app.use("/api",url_fixed_track)
app.use("/api",api_insert_data)
app.use("/api",camp_quick_reply_download)
app.use("/api",vendor_summary)
// app.use("/api",admin_billing_report)
app.use("/api",listKarix)
app.use("/api",rcs_setting)
app.use(express.urlencoded({ extended: true }));
database();
mongodb_authkey_bulk.on("connected", () => {
  console.log("Connected to db_authkey_bulk");
});

mongodb_authkey_bulk.on("error", (error) => {
  console.error("Error connecting to db_authkey_bulk:", error.message);
});
mongodb_authkey_0kb.on("connected", () => {
  console.log("Connected to db_authkey_0kb");
});
mongodb_authkey_0kb.on("error", (error) => {
  console.error("Error connecting to db_authkey_0kb:", error.message);
});
mongodb_authkey.on("connected", () => {
  console.log("Connected to db_authkey");
});
mongodb_authkey.on("error", (error) => {
  console.error("Error connecting to db_authkey:", error.message);
});
// mongodb_authkey_0kb.on("connected", () => {
//   console.log("Connected to db_authkey_0kb");
// });
const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
