const express = require("express");
const router = express.Router();
const db = require("../config/databaseconnection");
const catchAsyncErrors = require("../Middleware/catchAsyncErrors");
const auth = require("../Middleware/mongoAuth");
const urlShortLinkModel = require("../Models/urlShortLinkSchema");
const { Parser } = require("json2csv");
const fs = require("fs");
const path = require("path");
router.all(
  "/clickreport_download_camp_csv",
  auth,
  catchAsyncErrors(async (req, res, next) => {
    let resdata;
    if (req.method === "GET") {
      resdata = req.query;
    }

    if (req.method === "POST") {
      resdata = req.body;
    }

    if (resdata.method === "clickreport_download_camp_csv") {
      const { user_id, token, camp_id, submit_via } = resdata;
      if (!user_id || !token || !camp_id || !submit_via) {
        return res.status(400).json({
          success: false,
          message: "All fields are mandatory",
        });
      }
      if (submit_via !== "pannel") {
        return res.status(400).json({
          success: false,
          message: "Invalid submit_via.",
        });
      }

      const data = await urlShortLinkModel.find(
        { camp_id, submit_via, user_id },
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
          message: "No records found for the given camp_id and submit_via",
        });
      }

      const fields = [
        { label: "Country Code", value: "country_code" },
        { label: "Brand Number", value: "sender" },
        { label: "Sender", value: "sender" },
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

      const fileName = `click_report_camp_${camp_id}.csv`;
      const filePath = path.join(__dirname, "../temp", fileName);

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
      res.status(400).json({ success: false, message: "invalid method" });
    }
  })
);

module.exports = router;
