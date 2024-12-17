const express = require("express");
const router = express.Router();
const db = require("../config/databaseconnection");
const catchAsyncErrors = require("../Middleware/catchAsyncErrors");
const auth = require("../Middleware/auth");

router.all(
  "/vendor_summary",
  auth,
  catchAsyncErrors(async (req, res, next) => {
    let resdata;
    if (req.method === "GET") {
      resdata = req.query;
    }
    if (req.method === "POST") {
      resdata = req.body;
    }

    if (resdata.method === "vendor_summary") {
      const { fromdate, todate, routeid } = resdata;

      if (!fromdate) {
        return res
          .status(400)
          .json({ success: false, message: "fromdate is required" });
      }
      if (!todate) {
        return res
          .status(400)
          .json({ success: false, message: "todate is required" });
      }
      if (!routeid) {
        return res
          .status(400)
          .json({ success: false, message: "routeid is required" });
      }
      if (new Date(fromdate) >= new Date(todate)) {
        return res.status(400).json({
          success: false,
          message: "'fromdate' must be earlier than 'todate'.",
        });
      }

      const route_user_query = `
        SELECT userid 
        FROM db_authkey.tbl_user_assign_routes 
        where routeid = ? and channel='whatsapp'`;

      const route_user_result = await db(route_user_query, [routeid]);
    //   console.log("number of ids", route_user_result.length);
    //   console.log(route_user_result);

      const userids = route_user_result.map((row) => row.userid);

      if (userids.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No user IDs found for the route.",
        });
      }
      const placeholders = userids.map(() => "?").join(",");
      const whatsapp_billing_query = `
     SELECT 
  DATE_FORMAT(submission_date, '%Y-%m-%d') AS date,
  JSON_OBJECT(
    'total_count', SUM(total_count),
    'delivered_count', SUM(delivered_count),
    'failed_count', SUM(failed_count),
    'other_count', SUM(other_count),
    'template_type', template_type,
    'total_wp_price', SUM(wp_price)
  ) AS data
FROM (
  SELECT
    submission_date,
    user_id,
    country_code,
    total_count,
    delivered_count,
    failed_count,
    other_count,
    template_type,
    wp_price
  FROM db_authkey_bulk.tbl_whatsapp_billing_summary
  WHERE user_id IN (${placeholders})
    AND submission_date >= ? 
    AND submission_date <= ?
) AS summary_data
GROUP BY DATE_FORMAT(submission_date, '%Y-%m-%d'), template_type;
`;
      const whatsapp_billing_result = await db(whatsapp_billing_query, [
        ...userids,
        fromdate,
        todate,
      ]);

    //   console.log("whatsapp api,", whatsapp_billing_result.length);

    if(whatsapp_billing_result.length === 0){
        whatsapp_billing_result.push({
            date: "No data",
            data: {
              total_count: 0,
              delivered_count: 0,
              failed_count: 0,
              other_count: 0,
              template_type: null,
              total_wp_price: 0,
            },
          });
    }

    const whatsapp_api_query = `
    SELECT 
      DATE_FORMAT(date, '%Y-%m-%d') AS date,
      JSON_OBJECT(
        'total_sent', SUM(total_sent),
        'total_delivered', SUM(total_delivered),
        'total_failed', SUM(total_failed),
        'total_read', SUM(\`read\`),
        'total_submitted', SUM(total_submitted),
        'total_optout', SUM(total_optout),
        'total_billable_cost', SUM(total_billable_cost),
        'total_billable_count', SUM(total_billable_count),
        'total_nonbillable_count', SUM(total_nonbillable_count),
        'total_nonbillable_cost', SUM(total_nonbillable_cost),
        'message_type', message_type
      ) AS data
    FROM (
      SELECT
        DATE_FORMAT(created, '%Y-%m-%d') AS date,
        user_id,
        country_code,
        sent AS total_sent,
        delivered AS total_delivered,
        \`read\`,
        failed AS total_failed,
        submitted AS total_submitted,
        optout AS total_optout,
        billable_cost AS total_billable_cost,
        billable_count AS total_billable_count,
        nonbillable_count AS total_nonbillable_count,
        nonbillable_cost AS total_nonbillable_cost,
        message_type
      FROM db_authkey_reports.tbl_whatsapp_summary
      WHERE user_id IN (${placeholders})
        AND created >= ? 
        AND created <= ?
    ) AS aggregated_data
    GROUP BY date, message_type;
`;
      const whatsapp_api_result = await db(whatsapp_api_query, [
        ...userids,
        fromdate,
        todate,
      ]);
      if(whatsapp_api_result.length === 0){
        whatsapp_api_result.push({
            date: "No data",
            data: {
              total_sent: 0,
              total_delivered: 0,
              total_failed: 0,
              total_read: 0,
              total_submitted: null,
              total_optout: 0,
              total_billable_cost:0,
              total_billable_count:0,
              total_nonbillable_count:0,
              total_nonbillable_cost:0
            },
          });
    }
      const combineddata = {
        whatsapp_billing: whatsapp_billing_result,
        whatsapp_api: whatsapp_api_result,
      };

      return res.status(200).json({
        success: true,
        data: combineddata,
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Method" });
    }
  })
);

module.exports = router;
