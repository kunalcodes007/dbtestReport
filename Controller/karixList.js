const express = require("express");
const router = express.Router();
const db = require("../config/databaseconnection");
const catchAsyncErrors = require("../Middleware/catchAsyncErrors");
const auth = require("../Middleware/auth");

router.all(
  "/listKarix",
  auth,
  catchAsyncErrors(async (req, res, next) => {
    let resdata;
    if (req.method === "GET") {
      resdata = req.query;
    }
    if (req.method === "POST") {
      resdata = req.body;
    }

    if (resdata.method === "listKarix") {
      const today = new Date().toISOString().split("T")[0];
      const { fromdate = today, todate = today } = req.body;
      if (new Date(fromdate) > new Date(todate)) {
        return res.status(400).json({
          success: false,
          message: "'fromdate' must be earlier than 'todate'.",
        });
      }
      const karix_token_query = `select user_id,user_name,access_token_temp,access_token_permanent,ip_address,  DATE_FORMAT(created, '%Y-%m-%d %H:%i:%s') AS created,remark,status from db_authkey.tbl_whatsapp_setup_karix_token where created >= ? and created <= ? `;

      const karix_token_results = await db(karix_token_query, [
        fromdate,
        todate,
      ]);

      const karix_waba_query = `select user_id,user_name,ip_address,DATE_FORMAT(created, '%Y-%m-%d %H:%i:%s') AS created,remark,status,phone_num_id,waba_id,karix_api_key,per_token from db_authkey.tbl_whatsapp_setup_karix_waba where created >= ? and created <= ? `;

      const karix_waba_result = await db(karix_waba_query, [fromdate, todate]);

      const combinedData = {
        karix_token: karix_token_results,
        karix_waba: karix_waba_result,
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
          message: "No records found ",
        });
      }

      return res.status(200).json({
        success: true,
        data: combinedData,
      });
    } else if (resdata.method === "detailKarix") {
      const today = new Date().toISOString().split("T")[0];
      const { fromdate = today, todate = today, retr_user_id } = req.body;
      if (!retr_user_id) {
        return res
          .status(400)
          .json({ success: false, message: "retr_user_id is required" });
      }
      const karix_token_query = `select user_id,user_name,access_token_temp,access_token_permanent,ip_address,DATE_FORMAT(created, '%Y-%m-%d %H:%i:%s') AS created,remark,status,api_response from db_authkey.tbl_whatsapp_setup_karix_token where created >= ? and created <= ? and user_id = ? `;

      const karix_token_results = await db(karix_token_query, [
        fromdate,
        todate,
        retr_user_id,
      ]);

      const karix_waba_query = `select user_id,user_name,ip_address,DATE_FORMAT(created, '%Y-%m-%d %H:%i:%s') AS created,remark,status,phone_num_id,waba_id,karix_api_key,per_token ,create_acc_resp,allocate_res_resp,reg_api_resp from db_authkey.tbl_whatsapp_setup_karix_waba where created >= ? and created <= ?  and user_id = ?`;

      const karix_waba_results = await db(karix_waba_query, [
        fromdate,
        todate,
        retr_user_id,
      ]);

      const combinedData = {
        karix_token: karix_token_results,
        karix_waba: karix_waba_results,
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
          message: "No records found ",
        });
      }

      return res.status(200).json({
        success: true,
        data: combinedData,
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Method" });
    }
  })
);

module.exports = router;
