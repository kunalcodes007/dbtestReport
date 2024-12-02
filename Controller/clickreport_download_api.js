const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const auth = require("../Middleware/mongoAuth");
const catchAsyncErrors = require("../Middleware/catchAsyncErrors");
const urlShortLinkModel = require("../Models/urlShortLinkSchema");
const XLSX = require("xlsx");

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

      const formattedData = data.map((item) => ({
        "Country Code": item.country_code ,
        "Mobile Number": item.phone_number ,
        "Brand Number": item.sender ,
        ClickCount: item.url_clickcount || 0,
        Device: item.url_device ,
        "Submit Via": item.submit_via ,
        IP: item.ip ,
        Created: item.created ,
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(formattedData);

      worksheet["!cols"] = [
        { wch: 15 }, 
        { wch: 20 }, 
        { wch: 20 }, 
        { wch: 12 }, 
        { wch: 15 }, 
        { wch: 15 }, 
        { wch: 15 },
        { wch: 25 }, 
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

      const tempDir = path.join(__dirname, "/ReportFiles",'click_report_api.xlsx');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const fileName = `click_report_api.xlsx`;
      const filePath = path.join(tempDir, fileName);

      XLSX.writeFile(workbook, filePath);

      res.download(filePath, fileName, (err) => {
        if (err) {
          console.error("Error sending file:", err);
          return res
            .status(400)
            .json({ success: false, message: "File download failed" });
        }

        fs.unlinkSync(filePath);
      });
    } else {
      res.status(400).json({ success: false, message: "Invalid method" });
    }
  })
);

module.exports = router;
