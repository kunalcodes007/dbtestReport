const express = require("express");
const router = express.Router();
const db = require("../config/databaseconnection");
const catchAsyncErrors = require("../Middleware/catchAsyncErrors");
const auth = require("../Middleware/auth");

router.all(
  "/detail_billing_report",
  auth,
  catchAsyncErrors(async (req, res, next) => {
    let resdata;
    if (req.method === "GET") {
      resdata = req.query;
    }
    if (req.method === "POST") {
      resdata = req.body;
    }

    if (resdata.method === "detailReport") {
      const { retr_user_id, fromDate, toDate } = req.body;

      if(!retr_user_id){
        return res.status(400).json({success:false,message:"retr_user_id is required"})
      }
       
      if(!fromDate){
        return res.status(400).json({success:false,message:"from date is required"})
      }

      if(!toDate){
        return res.status(400).json({success:false,message:"to date is required"})
      }
      if (new Date(fromDate) >= new Date(toDate)) {
        return res.status(400).json({
          success: false,
          message: "'fromdate' must be earlier than 'todate'.",
        });
      }

      const sms_query = `SELECT 
    country_code,
    SUM(delivered) AS total_delivered,
    SUM(failed) AS total_failed,
    SUM(total) AS total_messages,
    SUM(total_cost) AS total_cost
FROM 
    db_authkey_reports.tbl_sms_summary
WHERE 
    user_id = ? 
    AND date >= ? AND date <= ?
GROUP BY 
    country_code;
`;
      const sms_results = await db(sms_query, [retr_user_id, fromDate, toDate]);

      // console.log("sms", sms_results);

      const email_query = `SELECT 
    SUM(delivered) AS total_delivered,
    SUM(clicked) AS total_clicked,
    SUM(bounced) AS total_bounced,
    SUM(sent) AS total_sent,
    SUM(opened) AS total_opened,
    SUM(submitted) AS total_submitted,
    SUM(total_cost) AS total_cost
FROM 
    db_authkey_reports.tbl_email_summary
WHERE 
    user_id = ? 
    AND date >= ? AND date <= ?
 `;
      const email_results = await db(email_query, [
        retr_user_id,
        fromDate,
        toDate,
      ]);
      
      // console.log("email", email_results);

      const voice_query = `SELECT 
    SUM(success) AS total_success,
    SUM(failed) AS total_failed,
    SUM(total) AS total_sent,
    SUM(submitted) AS total_submitted,
    SUM(total_cost) AS total_cost
FROM 
    db_authkey_reports.tbl_voice_summary
WHERE 
    user_id = ? 
    AND date >= ? AND date <= ?
 `;
      const voice_result = await db(voice_query, [
        retr_user_id,
        fromDate,
        toDate,
      ]);
      // console.log("voice", voice_result);

      const whatsapp_query = `
    SELECT 
        SUM(delivered) AS total_delivered,
        SUM(failed) AS total_failed,
        SUM(sent) AS total_sent,
        SUM(\`read\`) AS total_read, 
        SUM(submitted) AS total_submitted, 
        SUM(billable_cost) AS total_billable_cost,
        SUM(billable_count) AS total_billable_count,
        SUM(nonbillable_count) AS total_non_billable_count,
        SUM(nonbillable_cost) AS total_nonbillable_cost
    FROM db_authkey_reports.tbl_whatsapp_summary 
    WHERE user_id = ? 
        AND date >= ? 
        AND date <= ?
`;

      const whatsapp_result = await db(whatsapp_query, [
        retr_user_id,
        fromDate,
        toDate,
      ]);
      // console.log("whatsapp", whatsapp_result);
      const whatsapp_camp_query = `
      SELECT     
      country_code,
    template_type,
    wp_price as per_wp_price,
    SUM(total_count) AS total_count, 
    SUM(delivered_count) AS total_delivered, 
    SUM(failed_count) AS total_failed,
    SUM(other_count) AS total_other_count
FROM 
    db_authkey_bulk.tbl_whatsapp_billing_summary
WHERE 
    user_id = ? 
    AND submission_date >= ? 
    AND submission_date <= ?
GROUP BY 
    template_type, 
    country_code;
    `;
      const whatsapp_camp_result = await db(whatsapp_camp_query, [
        retr_user_id,
        fromDate,
        toDate,
      ]);

      const combinedData = {
        sms: sms_results,
        email: email_results,
        voice: voice_result,
        whatsapp_api: whatsapp_result,
        whatsapp_campaign: whatsapp_camp_result,
      };

      const isAllDataEmpty = Object.values(combinedData).every(
        (data) =>
          !data ||
          data.length === 0 ||
          (Array.isArray(data) &&
            data.every((row) =>
              Object.values(row).every((val) => val === null)
            ))
      );

      if (isAllDataEmpty) {
        return res.status(404).json({
          success: false,
          message: "No records found for the given userid.",
        });
      }

      return res.status(200).json({
        success: true,
        data: combinedData,
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "invalid method" });
    }
  })
);

module.exports = router;
