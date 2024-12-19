const express = require("express");
const router = express.Router();
const db = require("../config/databaseconnection");
const catchAsyncErrors = require("../Middleware/catchAsyncErrors");
const auth = require("../Middleware/auth");
const tbl_rcs_price = require("../Models/rcsPrice");
const rcs_master_price = require("../Models/rcsMaster");
const todayDateTime = require("../Utils/todayDateTime");
router.all(
  "/rcs_setting",
  auth,
  catchAsyncErrors(async (req, res, next) => {
    let resdata = Object.keys(req.body).length > 0 ? req.body : req.query;

    if (resdata.method === "add_single_country_pricercs") {
      const { bot_id, margin, retr_user_id, country_code } = resdata;

      if (!bot_id) {
        return res
          .status(400)
          .json({ success: false, message: "Bot Id is required" });
      }
      if (!margin) {
        return res
          .status(400)
          .json({ success: false, message: "Margin is required" });
      }
      if (!retr_user_id) {
        return res
          .status(400)
          .json({ success: false, message: "retr_user_id is required" });
      }
      if (!country_code) {
        return res
          .status(400)
          .json({ success: false, message: "country_code is required" });
      }

      const masterPrice = await rcs_master_price.findOne({ country_code });
      if (!masterPrice) {
        return res
          .status(404)
          .json({
            success: false,
            message: "Country not found in master price list",
          });
      }

      const updatedPrices = {
        basic_sms_cost: masterPrice.basic_sms_cost + margin,
        p2a_conv_cost: masterPrice.p2a_conv_cost + margin,
        a2p_conv_cost: masterPrice.a2p_conv_cost + margin,
        a2p_single_sms_cost: masterPrice.a2p_single_sms_cost + margin,
      };

      const existingUserPrice = await tbl_rcs_price.findOne({
        bot_id: bot_id,
        user_id: retr_user_id,
        country_code: country_code,
      });

      if (existingUserPrice) {
        existingUserPrice.basic_sms_cost += margin;
        existingUserPrice.p2a_conv_cost += margin;
        existingUserPrice.a2p_conv_cost += margin;
        existingUserPrice.a2p_single_sms_cost += margin;
        existingUserPrice.updated_date = todayDateTime();

        await existingUserPrice.save();

        return res.status(200).json({
          success: true,
          message:
            "Pricing updated successfully for single country (existing entry)",
        });
      } else {
        const userPriceData = {
          user_id: retr_user_id,
          bot_id: bot_id,
          country_code: country_code,
          is_active: 1,
          is_frozen: 0,
          basic_sms_cost: updatedPrices.basic_sms_cost,
          p2a_conv_cost: updatedPrices.p2a_conv_cost,
          a2p_conv_cost: updatedPrices.a2p_conv_cost,
          a2p_single_sms_cost: updatedPrices.a2p_single_sms_cost,
          created_date: masterPrice.created,
          updated_date: todayDateTime(),
        };

        await tbl_rcs_price.create(userPriceData);

        return res.status(200).json({
          success: true,
          message: "Pricing added successfully for single country (new entry)",
        });
      }
    } else if (resdata.method === "add_all_country_pricercs") {
      const { bot_id, retr_user_id, margin } = resdata;

      if (!bot_id) {
        return res
          .status(400)
          .json({ success: false, message: "Bot Id is required" });
      }
      if (!retr_user_id) {
        return res
          .status(400)
          .json({ success: false, message: "retr_user_id is required" });
      }
      if (!margin) {
        return res
          .status(400)
          .json({ success: false, message: "Margin is required" });
      }

      const masterPrices = await rcs_master_price.find();

      if (!masterPrices.length) {
        return res
          .status(404)
          .json({
            success: false,
            message: "No entries found in master price list",
          });
      }

      const existingEntries = await tbl_rcs_price.find(
        { user_id: retr_user_id },
        { country_code: 1 }
      );
      const existingCountryCodes = existingEntries.map(
        (entry) => entry.country_code
      );

      const newCountries = masterPrices.filter(
        (price) => !existingCountryCodes.includes(price.country_code)
      );

      if (!newCountries.length) {
        return res.status(200).json({
          success: true,
          message: "entries for the user_id already exists.",
        });
      }

      const testData = newCountries.map((price) => ({
        user_id: retr_user_id,
        bot_id: bot_id,
        country_code: price.country_code,
        country_name: price.country_name,
        is_active: 1,
        is_frozen: 0,
        basic_sms_cost: price.basic_sms_cost + margin,
        p2a_conv_cost: price.p2a_conv_cost + margin,
        a2p_conv_cost: price.a2p_conv_cost + margin,
        a2p_single_sms_cost: price.a2p_single_sms_cost + margin,
        created_date: price.created,
        updated_date: todayDateTime(),
      }));

      await tbl_rcs_price.insertMany(testData);

      return res.status(200).json({
        success: true,
        message: "All new countries' pricing added successfully for this user.",
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Method" });
    }
  })
);

module.exports = router;
