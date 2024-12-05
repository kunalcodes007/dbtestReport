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

    if (resdata.method === "summary") {
      const { fromdate, todate, retr_user_id, user_type, uid } = resdata;

      if (!retr_user_id) {
        return res.status(400).json({
          success: false,
          message: "'retr_user_id' is required.",
        });
      }

      if (!fromdate) {
        return res.status(400).json({
          success: false,
          message: "fromdate is required.",
        });
      }
      if (!todate) {
        return res
          .status(400)
          .json({ success: false, message: "todate is required" });
      }
      if (!user_type) {
        return res
          .status(400)
          .json({ success: false, message: "user_type is required" });
      }

      if (!uid) {
        return res
          .status(400)
          .json({ success: false, message: "uid is required" });
      }
      if (new Date(fromdate) >= new Date(todate)) {
        return res.status(400).json({
          success: false,
          message: "'fromdate' must be earlier than 'todate'.",
        });
      }

      const get_parent_userid = async (user_type, parent_id) => {
        const userCheckQuery = `
          SELECT id, user_type 
          FROM db_test.tbl_users 
          WHERE id = ? AND user_type = ?
        `;

        const userCheckResult = await db(userCheckQuery, [
          parent_id,
          user_type,
        ]);

        if (userCheckResult.length === 0) {
          return res.status(400).json({
            success: false,
            message: `User with user_type '${user_type}' and uid '${parent_id}' does not exist.`,
          });
        }

        // const retr_id_check=`
        //   SELECT id, user_type
        //   FROM db_test.tbl_users
        //   WHERE id = ? AND user_type = ?
        // `;
        // const retr_id_result = await db(retr_id_check, [retr_user_id, user_type]);
        // if (retr_id_result.length === 0) {
        //   return res.status(400).json({
        //     success: false,
        //     message: `no data`,
        //   });
        // }

        let query = "";
        if (user_type === "admin") {
          query = `
            SELECT c.id
            FROM db_test.tbl_users c
            JOIN db_test.tbl_users p ON c.parent = p.id
            WHERE c.user_type = 'client' AND (p.user_type = 'emp' OR c.parent = 1);
          `;
        } else if (user_type === "reseller") {
          query = `
            SELECT c.id
            FROM db_test.tbl_users c
            JOIN db_test.tbl_users p ON c.parent = p.id
            WHERE c.user_type = 'client' AND p.id = ? AND p.user_type = 'reseller';
          `;
        } else if (user_type === "emp") {
          query = `
            SELECT c.id
            FROM db_test.tbl_users c
            JOIN db_test.tbl_users p ON c.parent = p.id
            WHERE c.user_type = 'client' AND p.id = ? AND p.user_type = 'emp';
          `;
        } else {
          return res
            .status(400)
            .json({ success: false, message: "Invalid user_type" });
        }

        const results = await db(query, [parent_id]);
        return results.map((row) => row.id);
      };
         
      const validate_reseller_user=async (retr_user_id,uid)=>{
        const validate_query=`select parent from db_test.tbl_users where id = ? `
         
        const validate_result=await db(validate_query,[retr_user_id])
         
        if(validate_result[0].parent !== uid ){
           return res.status(400).json({success:false,message:"no record found"})
        }

      }
      let userFilter = "";
      let userParams = [fromdate, todate];
      if (retr_user_id === "all") {
        let parentIds;
        if (user_type === "admin") {
          parentIds = await get_parent_userid(user_type, 1);
          if (parentIds.length > 0) {
            userFilter = `AND user_id IN (${parentIds
              .map(() => "?")
              .join(",")})`;
            userParams = [...userParams, ...parentIds];
          } else {
            return res.status(200).json({
              success: true,
              data: [],
            });
          }
        } else if (user_type === "emp") {
          parentIds = await get_parent_userid(user_type, uid);
          if (parentIds.length > 0) {
            userFilter = `AND user_id IN (${parentIds
              .map(() => "?")
              .join(",")})`;
            userParams = [...userParams, ...parentIds];
          } else {
            return res.status(200).json({
              success: true,
              data: [],
            });
          }
        } else if (user_type === "reseller") {
          parentIds = await get_parent_userid(user_type, uid);
          if (parentIds.length > 0) {
            userFilter = `AND user_id IN (${parentIds
              .map(() => "?")
              .join(",")})`;
            userParams = [...userParams, ...parentIds];
          } else {
            return res.status(200).json({
              success: true,
              data: [],
            });
          }
        }

        //   if (user_type === "admin" || user_type === "reseller") {
        //     const parentIds = await get_parent_userid(user_type, user_id);
        //     if (parentIds.length > 0) {
        //       userFilter = `AND user_id IN (${parentIds.map(() => "?").join(",")})`;
        //       userParams = [...userParams, ...parentIds];
        //     } else {
        //       return res.status(200).json({
        //         success: true,
        //         data: [],
        //       });
        //     }
        //   }
      } else {
        if (user_type === "admin") {
          userFilter = "AND user_id = ?";
          userParams.push(retr_user_id);
        } else {
          validate_reseller_user(retr_user_id,uid);
          userFilter = "AND user_id = ?";
          userParams.push(retr_user_id);
          
        }
      }

      const smsQuery = `
          SELECT user_id, username,
          SUM(total) AS total_sms_summary
          FROM db_test.tbl_sms_summary
          JOIN db_test.tbl_users ON db_test.tbl_sms_summary.user_id = db_test.tbl_users.id
          WHERE date BETWEEN ? AND ?
          ${userFilter}
          GROUP BY user_id
        `;
      const smsResults = await db(smsQuery, userParams);

      const whatsappBillingQuery = `
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
        ON q1.user_id = q2.user_id;
      `;

      const whatsappBillingParams = [...userParams, ...userParams];
      console.log("WhatsApp Query:", whatsappBillingQuery);
      console.log("WhatsApp Params:", whatsappBillingParams);

      const whatsappBillingResults = await db(
        whatsappBillingQuery,
        whatsappBillingParams
      );

      const voiceQuery = `
          SELECT user_id, username,
          SUM(total) AS total_voice_summary
          FROM db_test.tbl_voice_summary
          JOIN db_test.tbl_users ON db_test.tbl_voice_summary.user_id = db_test.tbl_users.id
          WHERE date BETWEEN ? AND ?
          ${userFilter}
          GROUP BY user_id
        `;
      const voiceResults = await db(voiceQuery, userParams);

      const emailQuery = `
          SELECT user_id, username,
          SUM(delivered + clicked + bounced + sent + opened + submitted) AS total_email_summary
          FROM db_test.tbl_email_summary
          JOIN db_test.tbl_users ON db_test.tbl_email_summary.user_id = db_test.tbl_users.id
          WHERE date BETWEEN ? AND ?
          ${userFilter}
          GROUP BY user_id
        `;
      const emailResults = await db(emailQuery, userParams);

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
      addData(whatsappBillingResults, "grand_total_summary");
      addData(voiceResults, "total_voice_summary");
      addData(emailResults, "total_email_summary");

      const finalData = Object.values(combinedData);

      res.status(200).json({
        success: true,
        data: finalData,
      });
    } else {
      res.status(400).json({ success: false, message: "Invalid method" });
    }
  })
);

module.exports = router;
