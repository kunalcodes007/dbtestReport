const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const auth = require("../middleware/auth");
const catchAsyncErrors = require("../Middleware/catchAsyncErrors");
const camp_quick_reply_Schema = require(".../model/campquickreplySchema");
const XLSX = require("xlsx");
router.all(
  "/camp_quick_reply_download",
  auth,
  catchAsyncErrors(async (req, res, next) => {
    let resdata;
    if (req.method === "GET") {
      resdata = req.query;
    }

    if (req.method === "POST") {
      resdata = req.body;
    }

    if (resdata.method === "camp_quick_reply_download") {
      const { user_id, token, fromdate, todate, submit_via } = resdata;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: "user_id is required",
        });
      }
      if (!token) {
        return res.status(400).json({
          success: false,
          message: "token is required",
        });
      }
      if (!fromdate) {
        return res.status(400).json({
          success: false,
          message: "fromdate is required",
        });
      }
      if (!todate) {
        return res.status(400).json({
          success: false,
          message: "todate is required",
        });
      }

      const query = {
        user_id,
        createdAt: { $gte: fromdate, $lte: todate },
      };

      if (submit_via === "PANNEL") {
        query.submit_via="PANNEL";
      } else if (submit_via === "API") {
        query.submit_via = "API";
      }

      const data = await camp_quick_reply_Schema.find(query, {
        btn_name: 1,
        mobile: 1,
        camp_id: 1,
        submit_via: 1,
        user_id: 1,
        brand_number: 1,
        click_count: 1,
        createdAt: 1,
      });

        console.log(data)
      if (!data.length) {
        return res.status(404).json({
          success: false,
          message: "No records found for the given criteria.",
        });
      }

      const formattedData = data.map((item) => ({
        "Mobile Number": item.mobile,
        "User Id": item.user_id,
        "Camp Id": item.camp_id,
        "Button Name": item.btn_name,
        "Brand Number": item.brand_number,
        ClickCount: item.click_count || 0,
        "Submit Via": item.submit_via,
        "Camp Id": item.camp_id,
        Created: item.createdAt,

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

      const tempDir = path.join(
        __dirname,
        "../ReportFiles",
        "camp_quick_reply_download.xlsx"
      );
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const fileName = `camp_quick_reply_download.xlsx`;
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
