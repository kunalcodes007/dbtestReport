const express = require("express");
const router = express.Router();
const catchAsyncErrors = require("../../middleware/catchAsyncErrors");
const {db} = require("../../config/databaseconnection");
const adminAuth = require("../../middleware/adminAuth");


router.all(
  "/listKarix",
  adminAuth,
  catchAsyncErrors(async (req, res, next) => {
   let resdata;
      if (Object.keys(req.body).length > 0) {
        resdata = req.body;
      }
      if (Object.keys(req.query).length > 0) {
        resdata = req.query;
      }

    if (resdata.method === "retrieve_karix_emb_signup") {
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
    } else if (resdata.method === "detail_karix_emb_signup") {
     
      const {  retr_user_id } = req.body;
      if (!retr_user_id) {
        return res
          .status(400)
          .json({ success: false, message: "retr_user_id is required" });
      }
      const karix_token_query = `select user_id,user_name,access_token_temp,access_token_permanent,ip_address,DATE_FORMAT(created, '%Y-%m-%d %H:%i:%s') AS created,remark,status,api_response from db_authkey.tbl_whatsapp_setup_karix_token where id = ? `;

      const karix_token_results = await db(karix_token_query, [
        retr_user_id,
      ]);
      const karix_waba_query = `select user_id,user_name,ip_address,DATE_FORMAT(created, '%Y-%m-%d %H:%i:%s') AS created,remark,status,phone_num_id,waba_id,karix_api_key,per_token ,create_acc_resp,allocate_res_resp,reg_api_resp from db_authkey.tbl_whatsapp_setup_karix_waba where id = ?`;

      const karix_waba_results = await db(karix_waba_query, [
        
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
    } else if (resdata.method === "todaysummary_karix_emb_signup") {
      const today = new Date().toISOString().split("T")[0];
      const { fromdate = today, todate = today } = resdata;
      if (new Date(fromdate) > new Date(todate)) {
        return res.status(400).json({
          success: false,
          message: "'fromdate' must be earlier than 'todate'.",
        });
      }
      const karix_token_count_query = `
          SELECT COUNT(*) AS token_count 
   FROM db_authkey.tbl_whatsapp_setup_karix_token 
   WHERE created BETWEEN ? AND ?`;

      const karix_waba_count_query = `
      SELECT COUNT(*) AS waba_count 
      FROM db_authkey.tbl_whatsapp_setup_karix_waba 
      WHERE created BETWEEN ? AND ?`;

      const [karix_token_result] = await db(karix_token_count_query, [
        fromdate,
        todate,
      ]);
      const [karix_waba_result] = await db(karix_waba_count_query, [
        fromdate,
        todate,
      ]);
      const combineData = {
        karix_token_result,
        karix_waba_result,
      };
       const isAllDataEmpty = Object.values(combineData).every(
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
        data: combineData,
      });
    } else if (resdata.method === "filter_karix_emb_signup") {
      const today = new Date().toISOString().split("T")[0];
      const { fromdate = today, todate = today, status } = resdata;
      if (new Date(fromdate) > new Date(todate)) {
        return res.status(400).json({
          success: false,
          message: "'fromdate' must be earlier than 'todate'.",
        });
      }
      if (!status) {
        return res
          .status(400)
          .json({ success: false, message: "Status is required" });
      }
      if (status === "all") {
        const status_query_token = `select user_id,user_name,access_token_temp,access_token_permanent,ip_address,DATE_FORMAT(created, '%Y-%m-%d %H:%i:%s') AS created,remark,status,api_response from db_authkey.tbl_whatsapp_setup_karix_token where created >= ? and created <= ?`;
        const status_query_waba = `select user_id,user_name,phone_num_id,waba_id,karix_api_key,per_token,create_acc_resp,allocate_res_resp,reg_api_resp,ip_address,DATE_FORMAT(created, '%Y-%m-%d %H:%i:%s') AS created,remark,status from db_authkey.tbl_whatsapp_setup_karix_waba where created >= ? and created <= ?`;
        const token_result = await db(status_query_token, [fromdate, todate]);
        const waba_result = await db(status_query_waba, [fromdate, todate]);
        const combineddata = {
          token_result,
          waba_result,
        };
        return res.status(200).json({ success: true, data: combineddata });
      } else {
        const status_query_token = `select user_id,user_name,access_token_temp,access_token_permanent,ip_address,DATE_FORMAT(created, '%Y-%m-%d %H:%i:%s') AS created,remark,status,api_response from db_authkey.tbl_whatsapp_setup_karix_token where created >= ? and created <= ? and status = ?`;
        const status_query_waba = `select user_id,user_name,phone_num_id,waba_id,karix_api_key,per_token,create_acc_resp,allocate_res_resp,reg_api_resp,ip_address,DATE_FORMAT(created, '%Y-%m-%d %H:%i:%s') AS created,remark,status from db_authkey.tbl_whatsapp_setup_karix_waba where created >= ? and created <= ? and status = ?`;
        const token_result = await db(status_query_token, [
          fromdate,
          todate,
          status,
        ]);
        const waba_result = await db(status_query_waba, [
          fromdate,
          todate,
          status,
        ]);
        const combineData = {
          token_result,
          waba_result,
        };
        const isAllDataEmpty = Object.values(combineData).every(
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
        return res.status(200).json({ success: true, data: combineData });
      }
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Method" });
    }
  })
);

module.exports = router;
