const express = require("express");
const router = express.Router();
const db = require("../config/databaseconnection");
const catchAsyncErrors = require("../Middleware/catchAsyncErrors");
const auth = require("../Middleware/mongoAuth");
const urlShortLinkModel = require("../Models/urlShortLinkSchema");
const XLSX = require("xlsx");
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

      const formattedData = data.map((item) => ({
        "Country Code": item.country_code,
        "Brand Number": item.sender,
        Sender: item.sender,
        ClickCount: item.url_clickcount,
        Device: item.url_device,
        "Submit Via": item.submit_via,
        IP: item.ip,
        Created: item.created,
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(formattedData);

      worksheet["!cols"] = [
        { wch: 15 },
        { wch: 15 }, 
        { wch: 15 }, 
        { wch: 10 }, 
        { wch: 10 }, 
        { wch: 15 },
        { wch: 20 }, 
        { wch: 25 }, 
      ];

      XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

      const tempDir = path.join(__dirname, "../ReportFiles",`click_report_camp.xlsx`);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const fileName = `click_report_camp_${camp_id}.xlsx`;
      const filePath = path.join(tempDir, fileName, );

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
