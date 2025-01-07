const express = require("express");
const router = express.Router();
const {db} = require("../config/databaseconnection");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const auth = require("../middleware/auth");
const urlShortLinkModel = require("../model/urlShortLinkSchema");
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
      const { user_id, token, submit_via,fromdate,todate } = resdata;
      if (!user_id || !token || !submit_via) {
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

      const data = await urlShortLinkModel.aggregate([
        {
          $match: {
            submit_via,        
            url_clickcount:{$gt:0},
            user_id: parseInt(user_id),
            created: {
              $gte: `${resdata.fromdate} 00:00:00`,
              $lte: `${resdata.todate} 23:59:59`,
            },
          },
        },
        {
          $group: {
            _id: "$camp_id",
            records: {
              $push: {
                phone_number: "$phone_number",
                sender: "$sender",
                created: "$created",
                url_clickcount: "$url_clickcount",
                url_device: "$url_device",
                submit_via: "$submit_via",
                country_code: "$country_code",
                ip: "$ip",
              },
            },
          },
        },
      ]);

      if (!data.length) {
        return res.status(404).json({
          success: false,
          message: "No records found for the given user_id and submit_via",
        });
      }

      const formattedData = [];

      data.forEach((group) => {
        group.records.forEach((item) => {
          formattedData.push({
            "Camp ID": group._id,
            "Country Code": item.country_code,
            "Brand Number": item.sender,
            Sender: item.sender,
            ClickCount: item.url_clickcount,
            Device: item.url_device,
            "Submit Via": item.submit_via,
            IP: item.ip,
            Created: item.created,
          });
        });
      });

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

      const tempDir = path.join(__dirname, "../ReportFiles", `click_report_camp.xlsx`);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const fileName = `click_report_camp.xlsx`;
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
