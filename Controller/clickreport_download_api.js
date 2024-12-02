const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { Parser } = require("json2csv");
const auth = require("../Middleware/mongoAuth");
const catchAsyncErrors = require("../Middleware/catchAsyncErrors");
const urlShortLinkModel = require("../Models/urlShortLinkSchema");

router.all(
  "/clickreport_download_api_csv",
  auth,
  catchAsyncErrors(async (req, res, next) => {
    let resdata;
    if (req.method === "GET") {
      resdata = req.query;
    }

    if (req.method === "POST") {
      resdata = req.body;
    }

    if (resdata.method === "clickreport_download_api_csv") {
      const { user_id, token, fromdate, todate, submit_via } = resdata;

      if (!user_id || !token || !fromdate || !todate || !submit_via) {
        return res.status(400).json({
          success: false,
          message: "All fields are mandatory",
        });
      }

      if (submit_via !== "api") {
        return res.status(400).json({
          success: false,
          message: "Invalid submit_via.",
        });
      }

      //   const fromDateParsed = new Date(fromdate);
      //   const toDateParsed = new Date(todate);

      //   if (isNaN(fromDateParsed) || isNaN(toDateParsed)) {
      //     return res.status(400).json({
      //       success: false,
      //       message: "Invalid date format for fromdate or todate.",
      //     });
      //   }

      const data = await urlShortLinkModel.find(
        {
          user_id,
          submit_via,
          created: { $gte: fromdate, $lte: todate },
        },
        {
          phone_number: 1,
          sender: 1,
          created: 1,
          url_clickcount: 1,
          url_device: 1,
          submit_via: 1,
          country_code: 1,
          ip: 1,
        }
      );

      if (!data.length) {
        return res.status(404).json({
          success: false,
          message: "No records found for the given criteria.",
        });
      }

      const fields = [
        { label: "Country Code", value: "country_code" },
        { label: "Mobile Number", value: "phone_number" },
        { label: "Brand Number", value: "sender" },
        { label: "ClickCount", value: "url_clickcount" },
        { label: "Device", value: "url_device" },
        { label: "Submit Via", value: "submit_via" },
        { label: "IP", value: "ip" },
        "created",
      ];
      const opts = { fields };
      const parser = new Parser(opts);
      const csv = parser.parse(data);

      const tempDir = path.join(__dirname, "../temp");
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const fileName = `click_report_api.csv`;
      const filePath = path.join(tempDir, fileName);

      fs.writeFileSync(filePath, csv);

      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error("Error sending file:", err);
          return res
            .status(400)
            .json({ success: false, message: "File download failed" });
        }

        // fs.unlinkSync(filePath);
      });
    } else {
      res.status(400).json({ success: false, message: "Invalid method" });
    }
  })
);

module.exports = router;
