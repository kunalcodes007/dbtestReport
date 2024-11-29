const express = require("express");
const router = express.Router();
const db = require("../config/databaseconnection");
const catchAsyncErrors = require("../Middleware/catchAsyncErrors");
const auth = require("../Middleware/auth");
router.all(
  "/admin_summary_report",
  auth,
  catchAsyncErrors(async (req, res) => {
    let resdata;
    if (req.method === "GET") {
      resdata = req.query;
    }

    if (req.method === "POST") {
      resdata = req.body;
    }

    if (resdata.method === "date_wise") {
      const { fromdate, todate } = req.body;

      if (new Date(fromdate) >= new Date(todate)) {
        return res.status(400).json({
          success: false,
          message: "'fromdate' must be earlier than 'todate'.",
        });
      }
      try {
        const smsQuery = `
SELECT user_id, username,
SUM(total) AS total_sms_summary
FROM db_test.tbl_sms_summary
JOIN db_test.tbl_users ON db_test.tbl_sms_summary.user_id = db_test.tbl_users.id
WHERE date BETWEEN ? AND ?
GROUP BY user_id
`;
        const smsResults = await db(smsQuery, [fromdate, todate]);
        //         const whatsappQuery = `
        //     SELECT
        //     ws.user_id,
        //     u.username,
        //     SUM(ws.billable_count) + SUM(ws.nonbillable_count) AS total_whatsapp_summary,
        //     COALESCE(SUM(wb.total_count), 0) AS total_billing_summary,
        //     (SUM(ws.billable_count) + SUM(ws.nonbillable_count) + COALESCE(SUM(wb.total_count), 0)) AS grand_total_summary
        // FROM
        //     tbl_users u
        // JOIN
        //     tbl_whatsapp_summary ws ON u.id = ws.user_id
        // LEFT JOIN
        //     tbl_whatsapp_billing_summary wb ON ws.user_id = wb.user_id
        // WHERE
        //     ws.date >= '2024-10-01' AND ws.date <= '2024-10-31'
        // GROUP BY
        //     ws.user_id, u.username`;

        const query3 = `SELECT 
    q1.user_id,
    q1.username,
    COALESCE(q1.total_whatsapp_summary, 0) AS total_whatsapp_summary,
    COALESCE(q2.db_test.total_billing_summary, 0) AS total_billing_summary,
    COALESCE(q1.total_whatsapp_summary, 0) + COALESCE(q2.db_test.total_billing_summary, 0) AS grand_total_summary
FROM 
    (
        SELECT
            ws.user_id,
            u.username,
            SUM(ws.billable_count) + SUM(ws.nonbillable_count) AS total_whatsapp_summary
        FROM
            db_test.tbl_users u
        JOIN
            db_test.tbl_whatsapp_summary ws ON u.id = ws.user_id
        WHERE
            ws.date >= ? AND ws.date <= ?
        GROUP BY
            ws.user_id, u.username
    ) q1
LEFT JOIN 
    (
        SELECT
            wb.user_id,
            u.username,
            COALESCE(SUM(wb.total_count), 0) AS total_billing_summary
        FROM
            db_test.tbl_users u
        LEFT JOIN
            db_test.tbl_whatsapp_billing_summary wb ON u.id = wb.user_id
        WHERE
            wb.submission_date >= ? AND wb.submission_date <= ?
        GROUP BY
            wb.user_id, u.username
    ) q2
ON q1.user_id = q2.user_id
UNION
SELECT 
    q2.user_id,
    q2.username,
    COALESCE(q1.total_whatsapp_summary, 0) AS total_whatsapp_summary,
    COALESCE(q2.db_test.total_billing_summary, 0) AS total_billing_summary,
    COALESCE(q1.total_whatsapp_summary, 0) + COALESCE(q2.db_test.total_billing_summary, 0) AS grand_total_summary
FROM 
    (
        SELECT
            ws.user_id,
            u.username,
            SUM(ws.billable_count) + SUM(ws.nonbillable_count) AS total_whatsapp_summary
        FROM
            db_test.tbl_users u
        JOIN
            db_test.tbl_whatsapp_summary ws ON u.id = ws.user_id
        WHERE
            ws.date >= ? AND ws.date <= ?
        GROUP BY
            ws.user_id, u.username
    ) q1
RIGHT JOIN 
    (
        SELECT
            wb.user_id,
            u.username,
            COALESCE(SUM(wb.total_count), 0) AS total_billing_summary
        FROM
            db_test.tbl_users u
        LEFT JOIN
            db_test.tbl_whatsapp_billing_summary wb ON u.id = wb.user_id
        WHERE
            wb.submission_date >= ? AND wb.submission_date <= ?
        GROUP BY
            wb.user_id, u.username
    ) q2
ON q1.user_id = q2.user_id;
`;

        const temp_result = await db(query3, [
          fromdate,
          todate,
          fromdate,
          todate,
          fromdate,
          todate,
          fromdate,
          todate,
        ]);
        // console.log("xyz", temp_result);

        const voiceQuery = `
SELECT user_id, username,
SUM(total) AS total_voice_summary
FROM db_test.tbl_voice_summary
JOIN db_test.tbl_users ON db_test.tbl_voice_summary.user_id = tbl_users.id
WHERE date BETWEEN ? AND ?
GROUP BY user_id
`;
        const voiceResults = await db(voiceQuery, [fromdate, todate]);

        const emailQuery = `
SELECT user_id, username,
SUM(delivered + clicked + bounced + sent + opened + submitted) AS total_email_summary
db_test.FROM tbl_email_summary
JOIN db_test.tbl_users ON db_test.tbl_email_summary.user_id = tbl_users.id
WHERE date BETWEEN ? AND ?
GROUP BY user_id
`;
        const emailResults = await db(emailQuery, [fromdate, todate]);

        const combinedData = {};
        const addData = (results, summaryField, grandTotalField) => {
          results.forEach((item) => {
            const {
              user_id,
              username,
              [summaryField]: summaryValue = 0,
              [grandTotalField]: grandTotalValue = 0,
            } = item;
            if (!combinedData[user_id]) {
              combinedData[user_id] = {
                user_id: parseInt(user_id),
                username,
                total_sms_summary: 0,
                total_voice_summary: 0,
                total_email_summary: 0,
                grand_total_summary: 0,
              };
            }
            combinedData[user_id][summaryField] += parseInt(summaryValue);
            if (grandTotalField) {
              combinedData[user_id][grandTotalField] +=
                parseInt(grandTotalValue);
            }
          });
        };

        addData(smsResults, "total_sms_summary");
        addData(temp_result, "grand_total_summary");
        addData(voiceResults, "total_voice_summary");
        addData(emailResults, "total_email_summary");

        const finalData = Object.values(combinedData);

        res.status(200).json({
          success: true,
          data: finalData,
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        res.status(400).json({
          success: false,
          message: "Error fetching summary report",
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid method",
      });
    }
  })
);

module.exports = router;
