const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const db = require("../config/databaseconnection");
const auth = require("../Middleware/mongoAuth");
const catchAsyncErrors = require("../Middleware/catchAsyncErrors");
const urlfixedtrack = require("../Models/urlfixedtrack");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

router.all(
  "/url_fixed_track",
  auth,
  catchAsyncErrors(async (req, res) => {
    let resdata;
    if (req.method === "GET") {
      resdata = req.query;
    }
    if (req.method === "POST") {
      resdata = req.body;
    }

    if (resdata.method === "fixed_url_summary") {
      const { user_id, fromdate, todate, channel } = resdata;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: "user_id is required",
        });
      }

      if (!fromdate) {
        return res.status(400).json({
          success: false,
          message: "fromdate is required",
        });
      }
      if (!channel) {
        return res.status(400).json({
          success: false,
          message: "channel is required",
        });
      }
      const validChannels = ["sms", "whatsapp", "rcs"];
      if (!validChannels.includes(channel.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: "Invalid channel. Valid options are sms, whatsapp, or rcs.",
        });
      }
      const urlData = await urlfixedtrack.aggregate([
        {
          $match: {
            user_id: Number(user_id),
            created: {
              $gte: fromdate,
              $lte: todate,
            },
            channel: channel,
          },
        },
        {
          $group: {
            _id: "$short_url",
            count: { $sum: 1 },
          },
        },
      ]);
      if (!urlData || urlData.length === 0) {
        return res.status(400).json({ success: false, message: "no record " });
      }
      const result = urlData.map((row) => ({
        user_id,
        short_url: row._id,
        count: row.count,
        created: `${fromdate} to ${todate}`,
      }));

      return res.status(200).json({ success: true, data: result });
    } else if (resdata.method === "fixed_url_detail") {
      const { user_id, short_url, fromdate, todate, channel } = resdata;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: "user_id is required",
        });
      }

      if (!short_url) {
        return res.status(400).json({
          success: false,
          message: "short_url is required",
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

      if (!channel) {
        return res.status(400).json({
          success: false,
          message: "channel is required",
        });
      }
      const validChannels = ["sms", "whatsapp", "rcs"];
      if (!validChannels.includes(channel.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: "Invalid channel. Valid options are sms, whatsapp, or rcs.",
        });
      }
      const urlDetails = await urlfixedtrack.find({
        short_url,
        channel: channel,
        user_id,
        created: {
          $gte: fromdate,
          $lte: todate,
        },
      });

      if (!urlDetails || urlDetails.length === 0) {
        return res.status(400).json({ success: false, message: "no record" });
      }
      return res.status(200).json({
        success: true,
        data: urlDetails,
      });
    } else if (resdata.method === "fixed_url_download_summary") {
      const { user_id, short_url, fromdate, todate, channel } = resdata;
      if (!user_id) {
        return res.status(400).json({
          success: false,
          message: "user_id is required",
        });
      }

      if (!short_url) {
        return res.status(400).json({
          success: false,
          message: "short_url is required",
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

      if (!channel) {
        return res.status(400).json({
          success: false,
          message: "channel is required",
        });
      }
      const validChannels = ["sms", "whatsapp", "rcs"];
      if (!validChannels.includes(channel.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: "Invalid channel. Valid options are sms, whatsapp, or rcs.",
        });
      }

      const urlDataForDownload = await urlfixedtrack.find({
        user_id,
        short_url,
        channel: channel.toLowerCase(),
        created: {
          $gte: fromdate,
          $lte: todate,
        },
      });

      if (!urlDataForDownload || urlDataForDownload.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No URL data found for the given criteria",
        });
      }

      const data = urlDataForDownload.map((row) => ({
        user_id: row.user_id,
        short_url: row.short_url,
        channel: row.channel,
        created: row.created,
        ip:row.ip,
        city:row.url_city,
        device:row.url_device
        // count: row.count,
      }));
    //   console.log("data", data);
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);
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

      const tempDir = path.join(
        __dirname,
        "../ReportFiles",
        `url_summary_report.xlsx`
      );
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const fileName = `url_summary_report_${user_id}.xlsx`;
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
      return res
        .status(400)
        .json({ success: false, message: "Invalid method" });
    }
  })
);

module.exports = router;
