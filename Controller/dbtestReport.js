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
      const { fromdate, todate, retr_user_id } = resdata;

      if (!retr_user_id) {
        return res.status(400).json({
          success: false,
          message: "'retr_user_id' is required.",
        });
      }

      if (!fromdate || !todate) {
        return res
          .status(400)
          .json({
            success: false,
            message: "fromdate and todate are required",
          });
      }

      if (new Date(fromdate) >= new Date(todate)) {
        return res.status(400).json({
          success: false,
          message: "'fromdate' must be earlier than 'todate'.",
        });
      }

      const userFilter = retr_user_id === "all" ? "" : "AND user_id = ?";

      const smsQuery = `
      SELECT user_id, username,
      SUM(total) AS total_sms_summary
      FROM db_test.tbl_sms_summary
      JOIN db_test.tbl_users ON db_test.tbl_sms_summary.user_id = db_test.tbl_users.id
      WHERE date BETWEEN ? AND ?
      ${userFilter}
      GROUP BY user_id
    `;
      const smsParams =
        retr_user_id === "all"
          ? [fromdate, todate]
          : [fromdate, todate, retr_user_id];
      const smsResults = await db(smsQuery, smsParams);

      const query3 = `
      SELECT 
          q1.user_id,
          q1.username,
          COALESCE(q1.total_whatsapp_summary, 0) AS total_whatsapp_summary,
          COALESCE(q2.total_billing_summary, 0) AS total_billing_summary,
          COALESCE(q1.total_whatsapp_summary, 0) + COALESCE(q2.total_billing_summary, 0) AS grand_total_summary
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
                  ws.date BETWEEN ? AND ?
                  ${userFilter}
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
                  wb.submission_date BETWEEN ? AND ?
                  ${userFilter}
              GROUP BY
                  wb.user_id, u.username
          ) q2
      ON q1.user_id = q2.user_id
      UNION
      SELECT 
          q2.user_id,
          q2.username,
          COALESCE(q1.total_whatsapp_summary, 0) AS total_whatsapp_summary,
          COALESCE(q2.total_billing_summary, 0) AS total_billing_summary,
          COALESCE(q1.total_whatsapp_summary, 0) + COALESCE(q2.total_billing_summary, 0) AS grand_total_summary
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
                  ws.date BETWEEN ? AND ?
                  ${userFilter}
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
                  wb.submission_date BETWEEN ? AND ?
                  ${userFilter}
              GROUP BY
                  wb.user_id, u.username
          ) q2
      ON q1.user_id = q2.user_id;
    `;
      const tempParams =
        retr_user_id === "all"
          ? [
              fromdate,
              todate,
              fromdate,
              todate,
              fromdate,
              todate,
              fromdate,
              todate,
            ]
          : [
              fromdate,
              todate,
              retr_user_id,
              fromdate,
              todate,
              retr_user_id,
              fromdate,
              todate,
              retr_user_id,
              fromdate,
              todate,
              retr_user_id,
            ];
      const temp_result = await db(query3, tempParams);

      const voiceQuery = `
      SELECT user_id, username,
      SUM(total) AS total_voice_summary
      FROM db_test.tbl_voice_summary
      JOIN db_test.tbl_users ON db_test.tbl_voice_summary.user_id = db_test.tbl_users.id
      WHERE date BETWEEN ? AND ?
      ${userFilter}
      GROUP BY user_id
    `;
      const voiceParams =
        retr_user_id === "all"
          ? [fromdate, todate]
          : [fromdate, todate, retr_user_id];

      const voiceResults = await db(voiceQuery, voiceParams);

      const emailQuery = `
      SELECT user_id, username,
      SUM(delivered + clicked + bounced + sent + opened + submitted) AS total_email_summary
      FROM db_test.tbl_email_summary
      JOIN db_test.tbl_users ON db_test.tbl_email_summary.user_id = db_test.tbl_users.id
      WHERE date BETWEEN ? AND ?
      ${userFilter}
      GROUP BY user_id
    `;
      const emailParams =
        retr_user_id === "all"
          ? [fromdate, todate]
          : [fromdate, todate, retr_user_id];
      const emailResults = await db(emailQuery, emailParams);

      const combinedData = {};
      const addData = (results, summaryField) => {
        results.forEach((item) => {
          const { user_id, username } = item;
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
          combinedData[user_id][summaryField] += parseInt(
            item[summaryField] || 0
          );
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
    } else {
      res.status(400).json({ success: false, message: "invalid method" });
    }
  })
);

module.exports = router;
