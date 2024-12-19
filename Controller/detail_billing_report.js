const express = require("express");
const router = express.Router();
const {db} = require("../../config/databaseconnection");
const catchAsyncErrors = require("../../middleware/catchAsyncErrors");
const adminAuth = require("../../middleware/adminAuth");

router.all(
  "/billing_report",
  adminAuth,
  catchAsyncErrors(async (req, res, next) => {
    let resdata;
      if (Object.keys(req.body).length > 0) {
        resdata = req.body;
      }
      if (Object.keys(req.query).length > 0) {
        resdata = req.query;
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
const voice_cost_query=`select sum(voice_cost) as voice_cost from db_authkey.tbl_user_pricelist where user_id = ? and created >= ? and created <= ? `
const voice_cost_result=await db(voice_cost_query,[  retr_user_id,
  fromDate,
  toDate,])
      const whatsapp_query = `
    SELECT 
    message_type,
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
      const agent_query = `
      SELECT 
        allow_agent,
        peragent_cost
      FROM db_authkey.tbl_users 
      WHERE created >= ? 
        AND created <= ? 
        AND id = ?
    `;
    const agent_results = await db(agent_query, [
      fromDate,
      toDate,
      retr_user_id,
    ]);

    const agent_count_query = `
      SELECT 
        COUNT(*) AS number_of_agents
      FROM db_authkey.tbl_agents
      WHERE user_id = ?
    `;
    const agent_count_result = await db(agent_count_query, [retr_user_id]);

    const combinedData = {
      sms: sms_results,
      email: email_results,
      voice: voice_result,
      voice_cost:voice_cost_result,
      whatsapp_api: whatsapp_result,
      whatsapp_campaign: whatsapp_camp_result,
      agent_details: agent_results,
      agent_count: agent_count_result[0]?.number_of_agents || 0,
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
