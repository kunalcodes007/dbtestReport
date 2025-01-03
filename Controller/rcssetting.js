const express = require("express");
const router = express.Router();
const ErrorHandler = require("../../utils/ErrorHandler");
const catchAsyncErrors = require("../../middleware/catchAsyncErrors");
const Auth = require("../../middleware/auth");
const tbl_rcs_price = require("../../model/rcsPrice");
const rcs_master_price = require("../../model/rcsMaster");
const todayDateTime = require("../../utils/todayDateTime");
const {db} = require("../../config/databaseconnection");
const HistorySchema = require("../Models/price_update_history_all");

router.all(
  "/rcs_setting",
  Auth,
  catchAsyncErrors(async (req, res, next) => {
    let resdata;
    if (Object.keys(req.body).length > 0) {
      resdata = req.body;
    }
    if (Object.keys(req.query).length > 0) {
      resdata = req.query;
    }
    //method :: add_single_country_pricercs
    if (resdata.method === "add_single_country_pricercs") {
      const { bot_id, margin, country_code, parent_type, client_type, user_id } = resdata;

      if (!bot_id) {
        return res.status(400).json({ success: false, message: "Bot Id is required" });
      }
      if (!margin) {
        return res.status(400).json({ success: false, message: "Margin is required" });
      }
      // if (!retr_user_id) {
      //   return res.status(400).json({ success: false, message: "retr_user_id is required" });
      // }
      if (!country_code) {
        return res.status(400).json({ success: false, message: "country_code is required" });
      }
      if (!parent_type) {
        return res.status(400).json({ success: false, message: "parent type is required" });
      }
      if (!client_type) {
        return res.status(400).json({ success: false, message: "client type is required" });
      }
      if (parent_type === 'admin' && client_type === "client") {
        if (margin < 0) {
          return res.status(400).json({ success: false, messaage: "margin can't be reduced" })
        }
        const masterPrice = await rcs_master_price.findOne({ country_code });
        if (!masterPrice) {
          return res.status(400).json({ success: false, message: "country code not found in masterPrice " })
        }
        const { retr_user_id } = resdata;
        if (!retr_user_id) {
          return res.status(400).json({ success: false, message: "retr_user_id is required" })
        }
        const check_reseller_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const check_reseller_result = await db(check_reseller_query, [retr_user_id]);

        // console.log("Result:", check_reseller_result);

        if (!check_reseller_result || check_reseller_result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No user found with the provided user_id",
          });
        }

        if (check_reseller_result[0].user_type != 'client') {
          return res.status(400).json({
            success: false,
            message: "The provided user_id is not of type 'client'",
          });
        }

        const updatedPrices = {
          basic_sms_cost: masterPrice.basic_sms_cost + margin,
          p2a_conv_cost: masterPrice.p2a_conv_cost + margin,
          a2p_conv_cost: masterPrice.a2p_conv_cost + margin,
          a2p_single_sms_cost: masterPrice.a2p_single_sms_cost + margin,
        };

        const existingUserPrice = await tbl_rcs_price.findOne({
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
          await HistorySchema.create({
            user_id: retr_user_id,
            country_code: country_code,
            basic_sms_cost:existingUserPrice.basic_sms_cost,
            p2a_conv_cost:existingUserPrice.p2a_conv_cost, 
            a2p_conv_cost: existingUserPrice.a2p_conv_cost, 
            a2p_single_sms_cost: existingUserPrice.a2p_single_sms_cost ,  
            channel: "Rcs",
            action: "update",
            updated_date: todayDateTime()
        });
          return res.status(200).json({
            success: true,
            message: "Pricing updated successfully for single country (existing entry)",
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
          await HistorySchema.create({
            user_id: retr_user_id,
            country_code: country_code,
            basic_sms_cost: updatedPrices.basic_sms_cost,
            p2a_conv_cost: updatedPrices.p2a_conv_cost, 
            a2p_conv_cost: updatedPrices.a2p_conv_cost, 
            a2p_single_sms_cost:updatedPrices.a2p_single_sms_cost,  
            channel: "RCS",
            action: "Insert",
            updated_date: todayDateTime()
        });
          return res.status(200).json({
            success: true,
            message: "Pricing added successfully for single country (new entry)",
          });
        }
      } else if (parent_type === 'admin' && client_type === "reseller") {

        if (margin < 0) {
          return res.status(400).json({ success: false, messaage: "margin can't be reduced" })
        }
        const masterPrice = await rcs_master_price.findOne({ country_code });
        const { retr_user_id } = resdata;
        if (!retr_user_id) {
          return res.status(400).json({ success: false, message: "retr_user_id is required" })
        }
        const check_reseller_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const check_reseller_result = await db(check_reseller_query, [retr_user_id]);

        // console.log("Result:", check_reseller_result);

        if (!check_reseller_result || check_reseller_result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No user found with the provided user_id",
          });
        }

        if (check_reseller_result[0].user_type != 'reseller') {
          return res.status(400).json({
            success: false,
            message: "The provided user_id is not of type 'reseller'",
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
          await HistorySchema.create({
            user_id: retr_user_id,
            country_code: country_code,
            basic_sms_cost:existingUserPrice.basic_sms_cost || null,
            p2a_conv_cost:existingUserPrice.p2a_conv_cost, 
            a2p_conv_cost: existingUserPrice.a2p_conv_cost, 
            a2p_single_sms_cost: existingUserPrice.a2p_single_sms_cost ,  
            channel: "RCS",
            action: "update",
            updated_date: todayDateTime()
        });
          return res.status(200).json({
            success: true,
            message: "Pricing updated successfully for single country (existing entry)",
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
          await HistorySchema.create({
            user_id: retr_user_id,
            country_code: country_code,
            basic_sms_cost: updatedPrices.basic_sms_cost,
            p2a_conv_cost: updatedPrices.p2a_conv_cost, 
            a2p_conv_cost: updatedPrices.a2p_conv_cost, 
            a2p_single_sms_cost:updatedPrices.a2p_single_sms_cost,  
            channel: "RCS",
            action: "Insert",
            updated_date: todayDateTime()
        });
          return res.status(200).json({
            success: true,
            message: "Pricing added successfully for single country (new entry)",
          });
        }
      }
      else if (parent_type === 'reseller' && client_type === 'client') {

        if (margin < 0) {
          return res.status(400).json({ success: false, message: "Cannot add pricing. Master price values would get lower than the final cost" })
        }
        const { retr_user_id } = resdata;
        if (!retr_user_id) {
          return res.status(400).json({ success: false, message: "retr_user_id is required" })
        }
        const check_parent_query = `select parent from db_authkey.tbl_users where id = ?`

        const check_parent_result = await db(check_parent_query, [retr_user_id]);
        console.log("parent", check_parent_result)
        if (check_parent_result[0].parent != user_id) {
          return res.status(400).json({ success: false, message: `user_id is not a parent of retr_user_id` })
        }
        const check_reseller_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const check_reseller_result = await db(check_reseller_query, [user_id]);

        // console.log("Result:", check_reseller_result);

        if (!check_reseller_result || check_reseller_result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No user found with the provided user_id",
          });
        }

        if (check_reseller_result[0].user_type != 'reseller') {
          return res.status(400).json({
            success: false,
            message: "The provided user_id is not of type 'reseller'",
          });
        }
        const check_reseller_client_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const check_reseller_client_result = await db(check_reseller_client_query, [retr_user_id]);

        // console.log("Result:", check_reseller_result);

        if (!check_reseller_client_result || check_reseller_client_result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No user found with the provided user_id",
          });
        }

        if (check_reseller_client_result[0].user_type != 'client') {
          return res.status(400).json({
            success: false,
            message: "The provided retr_user_id is not of type 'client'",
          });
        }

        const existingUserPrice = await tbl_rcs_price.findOne({
          user_id: user_id,
          country_code: country_code,
        });

        // const updatedPrice = {
        //   basic_sms_cost: existingUserPrice.basic_sms_cost + margin,
        //   p2a_conv_cost: existingUserPrice.p2a_conv_cost + margin,
        //   a2p_conv_cost: existingUserPrice.a2p_conv_cost + margin,
        //   a2p_single_sms_cost: existingUserPrice.a2p_single_sms_cost + margin,
        // };
        if (existingUserPrice) {
          existingUserPrice.basic_sms_cost += margin;
          existingUserPrice.p2a_conv_cost += margin;
          existingUserPrice.a2p_conv_cost += margin;
          existingUserPrice.a2p_single_sms_cost += margin;
          existingUserPrice.updated_date = todayDateTime();

          const existingRetrUserPrice = await tbl_rcs_price.findOne({
            user_id: retr_user_id,
            country_code: country_code,
          });

          if (existingRetrUserPrice) {
            existingRetrUserPrice.basic_sms_cost += margin;
            existingRetrUserPrice.p2a_conv_cost += margin;
            existingRetrUserPrice.a2p_conv_cost += margin;
            existingRetrUserPrice.a2p_single_sms_cost += margin;
            existingRetrUserPrice.updated_date = todayDateTime();

            await existingRetrUserPrice.save();
            await HistorySchema.create({
              user_id: retr_user_id,
              country_code: country_code,
              basic_sms_cost: existingRetrUserPrice.basic_sms_cost,
              p2a_conv_cost: existingRetrUserPrice.p2a_conv_cost, 
              a2p_conv_cost:  existingRetrUserPrice.a2p_conv_cost, 
              a2p_single_sms_cost: existingRetrUserPrice.a2p_single_sms_cost ,  
              channel: "RCS",
              action: "update",
              updated_date: todayDateTime()
          });
            return res.status(200).json({
              success: true,
              message: "Pricing updated for user_id and retr_user_id (existing entry)",
            });
          } else {
            const newPriceData = {
              user_id: retr_user_id,
              country_code: country_code,
              basic_sms_cost: existingUserPrice.basic_sms_cost,
              p2a_conv_cost: existingUserPrice.p2a_conv_cost,
              a2p_conv_cost: existingUserPrice.a2p_conv_cost,
              a2p_single_sms_cost: existingUserPrice.a2p_single_sms_cost,
              is_active: 1,
              bot_id: bot_id,
              is_frozen: 0,
              created_date: existingUserPrice.created,
              updated_date: todayDateTime(),
            };

            await tbl_rcs_price.create(newPriceData);
            await HistorySchema.create({
              user_id: retr_user_id,
              country_code: country_code,
              basic_sms_cost: existingUserPrice.basic_sms_cost,
              p2a_conv_cost: existingUserPrice.p2a_conv_cost, 
              a2p_conv_cost: existingUserPrice.a2p_conv_cost, 
              a2p_single_sms_cost: existingUserPrice.a2p_single_sms_cost ,  
              channel: "RCS",
              action: "update",
              updated_date: todayDateTime()
          });
            return res.status(200).json({
              success: true,
              message: "Pricing updated successfully for single country (existing entry)",
            });
          }
        }
        else {
          return res.status(404).json({ success: false, message: "Country code not found in tbl price list" });
        }
      } else if (parent_type === 'reseller' && client_type === 'reseller') {
        if (margin < 0) {
          return res.status(400).json({ success: false, message: "Cannot add pricing. Master price values are lower than the final cost" })
        }
        const { retr_user_id } = resdata;
        if (!retr_user_id) {
          return res.status(400).json({ success: false, message: "retr_user_id is required" })
        }
        const check_reseller_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const check_reseller_result = await db(check_reseller_query, [user_id]);

        // console.log("Result:", check_reseller_result);

        if (!check_reseller_result || check_reseller_result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No user found with the provided user_id",
          });
        }

        if (check_reseller_result[0].user_type != 'reseller') {
          return res.status(400).json({
            success: false,
            message: "The provided user_id is not of type 'reseller'",
          });
        }
        const check_reseller_client_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const check_reseller_client_result = await db(check_reseller_client_query, [retr_user_id]);

        // console.log("Result client:", check_reseller_client_result);

        if (!check_reseller_client_result || check_reseller_client_result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No user found with the provided user_id",
          });
        }

        if (check_reseller_client_result[0].user_type != 'reseller') {
          return res.status(400).json({
            success: false,
            message: "The provided retr_user_id is not of type 'reseller'",
          });
        }
        const check_parent_result = await db(check_parent_query, [retr_user_id]);
        console.log("parent", check_parent_result)
        if (check_parent_result[0].parent != user_id) {
          return res.status(400).json({ success: false, message: `user_id is not a parent of retr_user_id` })
        }
        const masterPrice = await rcs_master_price.findOne({ country_code });
        if (!masterPrice) {
          return res.status(404).json({ success: false, message: "Country not found in master price list" });
        }

        const updatedPrices = {
          basic_sms_cost: masterPrice.basic_sms_cost + margin,
          p2a_conv_cost: masterPrice.p2a_conv_cost + margin,
          a2p_conv_cost: masterPrice.a2p_conv_cost + margin,
          a2p_single_sms_cost: masterPrice.a2p_single_sms_cost + margin,
        };

        if (
          masterPrice.basic_sms_cost >= updatedPrices.basic_sms_cost ||
          masterPrice.p2a_conv_cost >= updatedPrices.p2a_conv_cost ||
          masterPrice.a2p_conv_cost >= updatedPrices.a2p_conv_cost ||
          masterPrice.a2p_single_sms_cost >= updatedPrices.a2p_single_sms_cost
        ) {
          return res.status(400).json({
            success: false,
            message: "Cannot add pricing. Master price values are lower than the final cost",
          });
        }

        const existingUserPrice = await tbl_rcs_price.findOne({
          user_id: user_id,
          country_code: country_code,
        });

        if (existingUserPrice) {
          // existingUserPrice.basic_sms_cost += margin;
          // existingUserPrice.p2a_conv_cost += margin;
          // existingUserPrice.a2p_conv_cost += margin;
          // existingUserPrice.a2p_single_sms_cost += margin;
          // existingUserPrice.updated_date = todayDateTime();

          const existingRetrUserPrice = await tbl_rcs_price.findOne({
            user_id: retr_user_id,
            country_code: country_code,
          });

          if (existingRetrUserPrice) {
            existingRetrUserPrice.basic_sms_cost += margin;
            existingRetrUserPrice.p2a_conv_cost += margin;
            existingRetrUserPrice.a2p_conv_cost += margin;
            existingRetrUserPrice.a2p_single_sms_cost += margin;
            existingRetrUserPrice.updated_date = todayDateTime();

            await existingRetrUserPrice.save();
            await HistorySchema.create({
              user_id: retr_user_id,
              country_code: country_code,
              basic_sms_cost:  existingRetrUserPrice.basic_sms_cost,
              p2a_conv_cost: existingRetrUserPrice.p2a_conv_cost, 
              a2p_conv_cost: existingRetrUserPrice.a2p_conv_cost, 
              a2p_single_sms_cost:  existingRetrUserPrice.a2p_single_sms_cost ,  
              channel: "RCS",
              action: "update",
              updated_date: todayDateTime()
          });
            return res.status(200).json({
              success: true,
              message: "Pricing updated for user_id and retr_user_id (existing entry)",
            });
          } else {
            const newPriceData = {
              user_id: retr_user_id,
              country_code: country_code,
              basic_sms_cost: updatedPrices.basic_sms_cost,
              p2a_conv_cost: updatedPrices.p2a_conv_cost,
              a2p_conv_cost: updatedPrices.a2p_conv_cost,
              a2p_single_sms_cost: updatedPrices.a2p_single_sms_cost,
              is_active: 1,
              is_frozen: 0,
              bot_id: bot_id,
              created_date: masterPrice.created,
              updated_date: todayDateTime(),
            };

            await tbl_rcs_price.create(newPriceData);
            await HistorySchema.create({
              user_id: retr_user_id,
              country_code: country_code,
              basic_sms_cost: updatedPrices.basic_sms_cost,
              p2a_conv_cost: updatedPrices.p2a_conv_cost, 
              a2p_conv_cost: updatedPrices.a2p_conv_cost, 
              a2p_single_sms_cost: updatedPrices.a2p_single_sms_cost,  
              channel: "RCS",
              action: "Insert",
              updated_date: todayDateTime()
          });
            return res.status(200).json({
              success: true,
              message: "Pricing updated successfully for single country (existing entry)",
            });
          }
        } else {
          return res.status(400).json({ success: false, message: "Country code for given user_id doesn't exists" })
        }
      }
    } //method ::  add_all_country_pricercs
    else if (resdata.method === "add_all_country_pricercs") {
      const { bot_id, retr_user_id, margin, parent_type, client_type, user_id } = resdata;

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

      if (parent_type === 'admin' && client_type === 'client') {
        const masterPrice = await rcs_master_price.findOne({ country_code });
        if (!masterPrice) {
          return res.status(400).json({ success: false, message: "country code not found in masterPrice " })
        }
        const { retr_user_id } = resdata;
        if (!retr_user_id) {
          return res.status(400).json({ success: false, message: "retr_user_id is required" })
        }
        const check_reseller_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const check_reseller_result = await db(check_reseller_query, [retr_user_id]);

        if (!check_reseller_result || check_reseller_result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No user found with the provided user_id",
          });
        }

        if (check_reseller_result[0].user_type != 'client') {
          return res.status(400).json({
            success: false,
            message: "The provided user_id is not of type 'client'",
          });
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
          { user_id },
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
        const historyData = newCountries.map((price) => ({
          user_id: retr_user_id,
          bot_id: bot_id,
          country_code: price.country_code,
          basic_sms_cost: price.basic_sms_cost + margin,
          p2a_conv_cost: price.p2a_conv_cost + margin,
          a2p_conv_cost: price.a2p_conv_cost + margin,
          a2p_single_sms_cost: price.a2p_single_sms_cost + margin,
          channel: "RCS",
          action: "Insert",
          updated_date: todayDateTime(),
        }));
        await HistorySchema.insertMany(historyData);

        return res.status(200).json({
          success: true,
          message: "All new countries' pricing added successfully for this user.",
        });
      } else if (parent_type === 'admin' && client_type === 'reseller') {
        const masterPrice = await rcs_master_price.findOne({ country_code });
        if (!masterPrice) {
          return res.status(400).json({ success: false, message: "country code not found in masterPrice " })
        }
        const { retr_user_id } = resdata;
        if (!retr_user_id) {
          return res.status(400).json({ success: false, message: "retr_user_id is required" })
        }
        const check_reseller_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const check_reseller_result = await db(check_reseller_query, [retr_user_id]);

        if (!check_reseller_result || check_reseller_result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No user found with the provided user_id",
          });
        }

        if (check_reseller_result[0].user_type != 'client') {
          return res.status(400).json({
            success: false,
            message: "The provided user_id is not of type 'client'",
          });
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
          { user_id },
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
        const historyData = newCountries.map((price) => ({
          user_id: retr_user_id,
          bot_id: bot_id,
          country_code: price.country_code,
          basic_sms_cost: price.basic_sms_cost + margin,
          p2a_conv_cost: price.p2a_conv_cost + margin,
          a2p_conv_cost: price.a2p_conv_cost + margin,
          a2p_single_sms_cost: price.a2p_single_sms_cost + margin,
          channel: "RCS",
          action: "Insert",
          updated_date: todayDateTime(),
        }));
        await HistorySchema.insertMany(historyData);

        return res.status(200).json({
          success: true,
          message: "All new countries' pricing added successfully for this user.",
        });

      } else if ((parent_type === 'reseller' || parent_type === 'emp') && client_type === 'client') {

        const { retr_user_id } = resdata;

        if (!retr_user_id) {
          return res.status(400).json({ success: false, message: "retr_user_id is required" })
        }

        const check_parent_query = `select parent from db_authkey.tbl_users where id = ?`

        const check_parent_result = await db(check_parent_query, [retr_user_id]);

        // console.log("parent",check_parent_result)

        if (check_parent_result[0].parent != user_id) {

          return res.status(400).json({ success: false, message: `user_id is not a parent of retr_user_id` })

        }
        const check_reseller_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;

        const check_reseller_result = await db(check_reseller_query, [user_id]);

        if (!check_reseller_result || check_reseller_result.length === 0) {

          return res.status(404).json({
            success: false,
            message: "No user found with the provided user_id",
          });
        }

        if (check_reseller_result[0].user_type != 'reseller' || check_reseller_result[0].user_type != 'emp') {

          return res.status(400).json({
            success: false,
            message: "The provided user_id is not of type 'reseller or emp'",
          });

        }
        const check_reseller_client_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;

        const check_reseller_client_result = await db(check_reseller_client_query, [retr_user_id]);

        if (!check_reseller_client_result || check_reseller_client_result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No user found with the provided user_id",
          });
        }

        if (check_reseller_client_result[0].user_type != 'client') {
          return res.status(400).json({
            success: false,
            message: "The provided retr_user_id is not of type 'client'",
          });
        }

        const parentEntries = await tbl_rcs_price.find({ user_id });

        if (!parentEntries.length) {
          return res.status(404).json({
            success: false,
            message: `No entries found for parent user_id: ${user_id}`,
          });
        }

        const childEntries = parentEntries.map((entry) => ({
          user_id: retr_user_id,
          bot_id: bot_id,
          country_code: entry.country_code,
          country_name: entry.country_name,
          is_active: 1,
          is_frozen: 0,
          basic_sms_cost: entry.basic_sms_cost + margin,
          p2a_conv_cost: entry.p2a_conv_cost + margin,
          a2p_conv_cost: entry.a2p_conv_cost + margin,
          a2p_single_sms_cost: entry.a2p_single_sms_cost + margin,
          created_date: entry.created_date || todayDateTime(),
          updated_date: todayDateTime(),
        }));

        await tbl_rcs_price.insertMany(childEntries);
        const historyData = parentEntries.map((price) => ({
          user_id: retr_user_id,
          bot_id: bot_id,
          country_code: price.country_code,
          basic_sms_cost: price.basic_sms_cost + margin,
          p2a_conv_cost: price.p2a_conv_cost + margin,
          a2p_conv_cost: price.a2p_conv_cost + margin,
          a2p_single_sms_cost: price.a2p_single_sms_cost + margin,
          channel: "RCS",
          action: "Insert",
          updated_date: todayDateTime(),
        }));
        await HistorySchema.insertMany(historyData);
        return res.status(200).json({
          success: true,
          message: `All entries for parent user_id: ${user_id} have been added for child user_id: ${retr_user_id}`,
        });
      } else if ((parent_type === 'reseller' || parent_type === 'emp') && client_type === 'reseller') {
        const { retr_user_id } = resdata;
        if (!retr_user_id) {
          return res.status(400).json({ success: false, message: "retr_user_id is required" })
        }
        const check_parent_query = `select parent from db_authkey.tbl_users where id = ?`

        const check_parent_result = await db(check_parent_query, [retr_user_id]);
        // console.log("parent",check_parent_result)
        if (check_parent_result[0].parent != user_id) {
          return res.status(400).json({ success: false, message: `retr_user_id is not a parent of user_id` })
        }
        const check_reseller_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const check_reseller_result = await db(check_reseller_query, [user_id]);

        if (!check_reseller_result || check_reseller_result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No user found with the provided user_id",
          });
        }

        if (check_reseller_result[0].user_type != 'reseller' || check_reseller_result[0].user_type != 'emp') {
          return res.status(400).json({
            success: false,
            message: "The provided user_id is not of type 'reseller or emp",
          });
        }
        const check_reseller_client_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const check_reseller_client_result = await db(check_reseller_client_query, [retr_user_id]);

        if (!check_reseller_client_result || check_reseller_client_result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No user found with the provided user_id",
          });
        }

        if (check_reseller_client_result[0].user_type != 'reseller') {
          return res.status(400).json({
            success: false,
            message: "The provided retr_user_id is not of type 'reseller'",
          });
        }
        const childEntries = parentEntries.map((entry) => ({
          user_id: retr_user_id,
          bot_id: bot_id,
          country_code: entry.country_code,
          country_name: entry.country_name,
          is_active: 1,
          is_frozen: 0,
          basic_sms_cost: entry.basic_sms_cost + margin,
          p2a_conv_cost: entry.p2a_conv_cost + margin,
          a2p_conv_cost: entry.a2p_conv_cost + margin,
          a2p_single_sms_cost: entry.a2p_single_sms_cost + margin,
          created_date: entry.created_date || todayDateTime(),
          updated_date: todayDateTime(),
        }));

        await tbl_rcs_price.insertMany(childEntries);
        const historyData = parentEntries.map((price) => ({
          user_id: retr_user_id,
          bot_id: bot_id,
          country_code: price.country_code,
          basic_sms_cost: price.basic_sms_cost + margin,
          p2a_conv_cost: price.p2a_conv_cost + margin,
          a2p_conv_cost: price.a2p_conv_cost + margin,
          a2p_single_sms_cost: price.a2p_single_sms_cost + margin,
          channel: "RCS",
          action: "Insert",
          updated_date: todayDateTime(),
        }));
        await HistorySchema.insertMany(historyData);
        return res.status(200).json({
          success: true,
          message: `All entries for parent user_id: ${user_id} have been added for child user_id: ${retr_user_id}`,
        });
      }

    } //method :: single_country_pricercs
    else if (resdata.method === "single_country_pricercs") {
      const { margin, country_code, parent_type, client_type, user_id } = resdata;

      if (!margin) {
        return res.status(400).json({ success: false, message: "Margin is required" });
      }
      // if (!retr_user_id) {
      //   return res.status(400).json({ success: false, message: "retr_user_id is required" });
      // }
      if (!country_code) {
        return res.status(400).json({ success: false, message: "country_code is required" });
      }
      if (!parent_type) {
        return res.status(400).json({ success: false, message: "parent type is required" });
      }
      if (!client_type) {
        return res.status(400).json({ success: false, message: "client type is required" });
      }
      if (parent_type === 'admin' && client_type === "client") {
        if (margin < 0) {
          return res.status(400).json({ success: false, messaage: "margin can't be reduced" })
        }
        // const country_code_query = `select country_code from db_authkey.tbl_route_pricelist_copy where country_code = ? `
        // const country_code_result = await db(country_code_query, [country_code])
        // if (!country_code_result) {
        //   return res.status(400).json({ success: false, message: "No Country Code Found" })
        // }
        //  const voice_query = `select country_code from db_authkey.tbl_route_pricelist_copy where country_code = ?`
        //  const voice_result = await db(voice_query,[country_code])
        //  if(voice_query.country_code != 91 || voice_result.length == 0 ){
        //   return res.status(400).json({success:false,message:"No Record Found for voice"})
        //  }
        const { retr_user_id } = resdata;
        if (!retr_user_id) {
          return res.status(400).json({ success: false, message: "retr_user_id is required" })
        }
        // const check_parent_query = `select parent from db_authkey.tbl_users where id = ?`
        // const check_parent_result = await db(check_parent_query, [retr_user_id]);
        // console.log("parent", check_parent_result)
        // if (check_parent_result[0].parent != user_id) {
        //   return res.status(400).json({ success: false, message: ` user_id is not a parent of retr_user_id` })
        // }
        const check_reseller_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const check_reseller_result = await db(check_reseller_query, [retr_user_id]);

        if (!check_reseller_result || check_reseller_result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No user found with the provided retr_user_id",
          });
        }

        if (check_reseller_result[0].user_type != 'client') {
          return res.status(400).json({
            success: false,
            message: "The provided retr_user_id is not of type 'client'",
          });
        }

        const add_margin_query = `
        SELECT country_code, (MAX(cost) + ?) AS margin_cost 
        FROM db_authkey.tbl_route_pricelist_copy 
        WHERE routeid = CASE 
                          WHEN country_code = 91 THEN 5 
                          ELSE 16 
                        END 
          AND country_code = ?;
      `;
        const add_margin_result = await db(add_margin_query, [margin, country_code])

        const margin_cost = add_margin_result[0].margin_cost;
        console.log("sms cost", margin_cost)
        const voice_margin_query = `select country_code, (MAX(cost) + ?) AS margin_voice_cost 
        FROM db_authkey.tbl_route_pricelist_copy 
        WHERE routeid = 4
          AND country_code = ?;`

        const voice_query_result = await db(voice_margin_query, [margin, country_code])
        const margin_voice_cost = voice_query_result[0].margin_voice_cost;
        console.log("voice_cost", margin_voice_cost)
        // const check_global = `select id,country_code from db_authkey.tbl_route_pricelist_copy where country_code = ? and id = ? `

        // const global_result = await db(check_global, [country_code, retr_user_id])
        // if (!global_result || global_result.length == 0) {
        //   return res.status(400).json({ success: false, message: "no country_code found for the given retr_user_id" })
        // }
        const check_exists = `select user_id from db_authkey.tbl_user_pricelist_copy where country_code = ? and user_id = ?`
        const exists_result = await db(check_exists, [country_code, retr_user_id])
        console.log("exist", exists_result)
        if (exists_result.length === 0) {

          const insert_query = `
          INSERT INTO db_authkey.tbl_user_pricelist_copy ( user_id,country_code, sms_cost,voice_cost ) 
          VALUES ( ?,?,?,?);
        `;
      
          //   const insert_voice_query = `
          //   INSERT INTO db_authkey.tbl_user_pricelist_copy ( country_code, voice_cost ) 
          //   VALUES ( ?,?);
          // `;
          const insert_result = await db(insert_query, [retr_user_id, country_code, margin_cost, margin_voice_cost])
          // const insert_voice_result = await db(insert_voice_query,[country_code,margin_voice_cost])
          if(insert_result){
            await HistorySchema.create({
              user_id: retr_user_id,
              country_code: country_code,
              sms_cost: margin_cost || null,
              voice_cost: margin_voice_cost || null,
              channel: "sms , voice",
              action: "Insert",
              updated_date: todayDateTime()
          });
          }
          return res.status(200).json({ success: true, data: insert_result })
        } else {
          const update_query = `
  UPDATE db_authkey.tbl_user_pricelist_copy 
  SET sms_cost = sms_cost + ?, 
      voice_cost = voice_cost + ?
  WHERE country_code = ? AND user_id = ?;
        `;
          // const update_voice_query = `
          //   UPDATE db_authkey.tbl_user_pricelist_copy 
          //   SET voice_cost = voice_cost + ? 
          //   WHERE country_code = ? and id = ?;
          // `;
          const update_result = await db(update_query, [margin_cost, margin_voice_cost, country_code, retr_user_id])
          // const update_voice_result = await db(update_voice_query,[margin_cost,country_code,retr_user_id])
          if(update_result){
            await HistorySchema.create({
              user_id: retr_user_id,
              country_code: country_code,
              sms_cost: margin_cost || null,
              voice_cost: margin_voice_cost || null,
              channel: "sms , voice",
              action: "Update",
              updated_date: todayDateTime()
          });
          }
          return res.status(200).json({ success: true, data: update_result, })

        }

      } else if (parent_type === 'admin' && client_type === "reseller") {

        if (margin < 0) {
          return res.status(400).json({ success: false, messaage: "margin can't be reduced" })
        }
        // const country_code_query = `select country_code from db_authkey.tbl_route_pricelist_copy where country_code = ? `
        // const country_code_result = await db(country_code_query, [country_code])
        // if (!country_code_result) {
        //   return res.status(400).json({ success: false, message: "No Country Code Found" })
        // }
        const { retr_user_id } = resdata;
        if (!retr_user_id) {
          return res.status(400).json({ success: false, message: "retr_user_id is required" })
        }
        const check_reseller_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const check_reseller_result = await db(check_reseller_query, [retr_user_id]);

        if (!check_reseller_result || check_reseller_result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No user found with the provided user_id",
          });
        }

        if (check_reseller_result[0].user_type != 'reseller') {
          return res.status(400).json({
            success: false,
            message: "The provided user_id is not of type 'reseller'",
          });
        }

        const add_margin_query = `
        SELECT country_code, (MAX(cost) + ?) AS margin_cost 
        FROM db_authkey.tbl_route_pricelist_copy 
        WHERE routeid = CASE 
                          WHEN country_code = 91 THEN 5 
                          ELSE 16 
                        END 
          AND country_code = ?;
      `;
        const add_margin_result = await db(add_margin_query, [margin, country_code])
        if (!add_margin_result) {
          return res.status(400).json({ success: false, message: "no country_code with provided routeid found" })
        }
        const margin_cost = add_margin_result[0].margin_cost;
        const voice_margin_query = `select country_code, (MAX(cost) + ?) AS margin_voice_cost 
        FROM db_authkey.tbl_route_pricelist_copy 
        WHERE routeid = 4
          AND country_code = ?;`

        const voice_query_result = await db(voice_margin_query, [margin, country_code])
        const margin_voice_cost = voice_query_result[0].margin_voice_cost;
        console.log("voice_cost", margin_voice_cost)
        // const check_global = `select id,country_code from db_authkey.tbl_route_pricelist_copy where country_code = ? and id = ? `

        // const global_result = await db(check_global, [country_code, retr_user_id])
        // if (!global_result || global_result.length == 0) {
        //   return res.status(400).json({ success: false, message: "no country_code found for the given retr_user_id" })
        // }
        const check_exists = `select user_id from db_authkey.tbl_user_pricelist_copy where country_code = ? and user_id = ?`
        const exists_result = await db(check_exists, [country_code, retr_user_id])
        if (exists_result.length === 0) {

          const insert_query = `
          INSERT INTO db_authkey.tbl_user_pricelist_copy ( user_id,country_code, sms_cost,voice_cost ) 
          VALUES ( ?,?,?,?)  
        `;

          const insert_result = await db(insert_query, [retr_user_id, country_code, margin_cost, margin_voice_cost])
          if(insert_result){
            await HistorySchema.create({
              user_id: retr_user_id,
              country_code: country_code,
              sms_cost: margin_cost || null,
              voice_cost: margin_voice_cost || null,
              channel: "sms , voice",
              action: "Insert",
              updated_date: todayDateTime()
          });
          }
          return res.status(200).json({ success: true, data: insert_result })
        } else {
          const update_query = `
          UPDATE db_authkey.tbl_user_pricelist_copy 
          SET sms_cost = sms_cost + ?, 
              voice_cost = voice_cost + ?
          WHERE country_code = ? AND user_id = ?;
        `;
          const update_result = await db(update_query, [margin_cost, margin_voice_cost, country_code, retr_user_id])
          if(update_result){
            await HistorySchema.create({
              user_id: retr_user_id,
              country_code: country_code,
              sms_cost: margin_cost || null,
              voice_cost: margin_voice_cost || null,
              channel: "sms , voice",
              action: "Update",
              updated_date: todayDateTime()
          });
          }
          return res.status(200).json({ success: true, data: update_result })

        }
      }
      else if (parent_type === 'reseller' && client_type === 'client') {

        if (margin < 0) {
          return res.status(400).json({ success: false, message: "Cannot add pricing. Master price values would get lower than the final cost" })
        }
        // const country_code_query = `select country_code from db_authkey.tbl_route_pricelist_copy where country_code = ? `
        // const country_code_result = await db(country_code_query, [country_code])
        // if (!country_code_result) {
        //   return res.status(400).json({ success: false, message: "No Country Code Found" })
        // }
        const { retr_user_id } = resdata;
        if (!retr_user_id) {
          return res.status(400).json({ success: false, message: "retr_user_id is required" })
        }
        const check_parent_query = `select parent from db_authkey.tbl_users where id = ?`

        const check_parent_result = await db(check_parent_query, [retr_user_id]);
        console.log("parent", check_parent_result)
        if (check_parent_result[0].parent != user_id) {
          return res.status(400).json({ success: false, message: ` user_id is not a parent of retr_user_id` })
        }
        const check_reseller_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const check_reseller_result = await db(check_reseller_query, [user_id]);

        // console.log("Result:", check_reseller_result);

        if (!check_reseller_result || check_reseller_result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No user found with the provided user_id",
          });
        }

        if (check_reseller_result[0].user_type != 'reseller') {
          return res.status(400).json({
            success: false,
            message: "The provided user_id is not of type 'reseller'",
          });
        }
        const check_reseller_client_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const check_reseller_client_result = await db(check_reseller_client_query, [retr_user_id]);

        // console.log("Result:", check_reseller_result);

        if (!check_reseller_client_result || check_reseller_client_result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No user found with the provided user_id",
          });
        }

        if (check_reseller_client_result[0].user_type != 'client') {
          return res.status(400).json({
            success: false,
            message: "The provided retr_user_id is not of type 'client'",
          });
        }

        const add_margin_query = `
        SELECT country_code, (MAX(cost) + ?) AS margin_cost 
        FROM db_authkey.tbl_route_pricelist_copy 
        WHERE routeid = CASE 
                          WHEN country_code = 91 THEN 5 
                          ELSE 16 
                        END 
          AND country_code = ?;
      `;
        const add_margin_result = await db(add_margin_query, [margin, country_code])
        if (!add_margin_result) {
          return res.status(400).json({ success: false, message: "no country_code with provided routeid found" })
        }
        const margin_cost = add_margin_result[0].margin_cost;
        const voice_margin_query = `select country_code, (MAX(cost) + ?) AS margin_voice_cost 
      FROM db_authkey.tbl_route_pricelist_copy 
      WHERE routeid = 4
        AND country_code = ?;`

        const voice_query_result = await db(voice_margin_query, [margin, country_code])
        const margin_voice_cost = voice_query_result[0].margin_voice_cost;
        console.log("voice_cost", margin_voice_cost)
        // const check_global = `select id,country_code from db_authkey.tbl_route_pricelist_copy where country_code = ? and id = ? `

        // const global_result = await db(check_global, [country_code, retr_user_id])
        // if (!global_result || global_result.length == 0) {
        //   return res.status(400).json({ success: false, message: "no country_code found for the given retr_user_id" })
        // }

        const check_parent_exist = `select id,country_code from db_authkey.tbl_user_pricelist_copy where id = ? and country_code = ?`;
        const parent_result = await db(check_parent_exist, [user_id, country_code]);
        if (!parent_result || parent_result.length == 0) {
          return res.status(400).json({ success: false, message: "no record for parent found" })
        }

        const check_exists = `select user_id from db_authkey.tbl_user_pricelist_copy where country_code = ? and user_id = ?`
        const exists_result = await db(check_exists, [country_code, retr_user_id])
        if (exists_result.length === 0) {

          const insert_query = `
          INSERT INTO db_authkey.tbl_user_pricelist_copy ( user_id,country_code, sms_cost,voice_cost ) 
          VALUES ( ?,?,?,?);
        `;
          const insert_result = await db(insert_query, [retr_user_id, country_code, margin_cost, margin_voice_cost])
          if(insert_result){
            await HistorySchema.create({
              user_id: retr_user_id,
              country_code: country_code,
              sms_cost: margin_cost || null,
              voice_cost: margin_voice_cost || null,
              channel: "sms , voice",
              action: "Insert",
              updated_date: todayDateTime()
          });
          }
          return res.status(200).json({ success: true, data: insert_result })
        } else {
          const update_query = `
          UPDATE db_authkey.tbl_user_pricelist_copy 
          SET sms_cost = sms_cost + ?, 
              voice_cost = voice_cost + ?
          WHERE country_code = ? AND id = ?;
        `;
          const update_result = await db(update_query, [margin_cost, margin_voice_cost, country_code, retr_user_id])
          if(update_result){
            await HistorySchema.create({
              user_id: retr_user_id,
              country_code: country_code,
              sms_cost: margin_cost || null,
              voice_cost: margin_voice_cost || null,
              channel: "sms , voice",
              action: "Update",
              updated_date: todayDateTime()
          });
          }
          return res.status(200).json({ success: true, data: update_result })

        }

      } else if ((parent_type === 'reseller' || parent_type === "emp") && client_type === 'reseller') {
        if (margin < 0) {
          return res.status(400).json({ success: false, message: "Cannot add pricing. Master price values are lower than the final cost" })
        }
        // const country_code_query = `select country_code from db_authkey.tbl_route_pricelist_copy where country_code = ? `
        // const country_code_result = await db(country_code_query, [country_code])
        // if (!country_code_result) {
        //   return res.status(400).json({ success: false, message: "No Country Code Found" })
        // }
        const { retr_user_id } = resdata;
        if (!retr_user_id) {
          return res.status(400).json({ success: false, message: "retr_user_id is required" })
        }
        const check_reseller_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const check_reseller_result = await db(check_reseller_query, [user_id]);

        if (!check_reseller_result || check_reseller_result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No user found with the provided user_id",
          });
        }

        if (check_reseller_result[0].user_type != 'reseller' && check_reseller_result[0].user_type != "emp") {
          return res.status(400).json({
            success: false,
            message: "The provided user_id is not of type 'reseller' or 'emp' ",
          });
        }
        const check_parent_query = `select reseller from db_authkey.tbl_users where id = ?`

        const check_parent_result = await db(check_parent_query, [retr_user_id]);
        console.log("parent", check_parent_result)
        if (check_parent_result[0].reseller != user_id) {
          return res.status(400).json({ success: false, message: ` user_id is not a parent of retr_user_id` })
        }
        const check_reseller_client_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const check_reseller_client_result = await db(check_reseller_client_query, [retr_user_id]);

        if (!check_reseller_client_result || check_reseller_client_result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No user found with the provided user_id",
          });
        }

        if (check_reseller_client_result[0].user_type != 'reseller') {
          return res.status(400).json({
            success: false,
            message: "The provided retr_user_id is not of type 'reseller'",
          });
        }
        const add_margin_query = `
        SELECT country_code, (MAX(cost) + ?) AS margin_cost 
        FROM db_authkey.tbl_route_pricelist_copy 
        WHERE routeid = CASE 
                          WHEN country_code = 91 THEN 5 
                          ELSE 16 
                        END 
          AND country_code = ?;
      `;
        const add_margin_result = await db(add_margin_query, [margin, country_code])
        if (!add_margin_result) {
          return res.status(400).json({ success: false, message: "no country_code with provided routeid found" })
        }
        const margin_cost = add_margin_result[0].margin_cost;
        const voice_margin_query = `select country_code, (MAX(cost) + ?) AS margin_voice_cost 
        FROM db_authkey.tbl_route_pricelist_copy 
        WHERE routeid = 4
          AND country_code = ?;`

        const voice_query_result = await db(voice_margin_query, [margin, country_code])
        const margin_voice_cost = voice_query_result[0].margin_voice_cost;
        console.log("voice_cost", margin_voice_cost)
        // const check_global = `select id,country_code from db_authkey.tbl_route_pricelist_copy where country_code = ? and id = ? `

        // const global_result = await db(check_global, [country_code, retr_user_id])
        // if (!global_result || global_result.length == 0) {
        //   return res.status(400).json({ success: false, message: "no country_code found for the given retr_user_id" })
        // }
        const check_parent_exist = `select id,country_code from db_authkey.tbl_user_pricelist_copy where id = ? and country_code = ?`;
        const parent_result = await db(check_parent_exist, [user_id, country_code]);
        if (!parent_result || parent_result.length == 0) {
          return res.status(400).json({ success: false, message: "no record for parent found" })
        }
        const check_exists = `select user_id from db_authkey.tbl_user_pricelist_copy where country_code = ? and user_id = ?`
        const exists_result = await db(check_exists, [country_code, retr_user_id])
        if (exists_result.length === 0) {

          const insert_query = `
          INSERT INTO db_authkey.tbl_user_pricelist_copy ( user_id,country_code, sms_cost,voice_cost ) 
          VALUES ( ?,?,?,?);
        `;
          const insert_result = await db(insert_query, [retr_user_id, country_code, margin_cost, margin_voice_cost])
          if(insert_result){
            await HistorySchema.create({
              user_id: retr_user_id,
              country_code: country_code,
              sms_cost: margin_cost || null,
              voice_cost: margin_voice_cost || null,
              channel: "sms , voice",
              action: "Insert",
              updated_date: todayDateTime()
          });
          }
          return res.status(200).json({ success: true, data: insert_result })
        } else {
          const update_query = `
          UPDATE db_authkey.tbl_user_pricelist_copy 
          SET sms_cost = sms_cost + ?, 
              voice_cost = voice_cost + ?
          WHERE country_code = ? AND id = ?;
        `;
          const update_result = await db(update_query, [margin_cost, margin_voice_cost, country_code, retr_user_id])
          if(update_result){
            await HistorySchema.create({
              user_id: retr_user_id,
              country_code: country_code,
              sms_cost: margin_cost || null,
              voice_cost: margin_voice_cost || null,
              channel: "sms , voice",
              action: "update_result",
              updated_date: todayDateTime()
          });
          }
          return res.status(200).json({ success: true, data: update_result })

        }
      }
    } //method :: bulk_country_pricercs
    else if (resdata.method === "bulk_country_pricercs") {
      const { margin, country_code, parent_type, client_type, user_id } = resdata;

      if (!margin) {
        return res.status(400).json({ success: false, message: "Margin is required" });
      }
      if (!user_id) {
        return res.status(400).json({ success: false, message: "user_id is required" });
      }
      if (!country_code) {
        return res.status(400).json({ success: false, message: "country_code is required" });
      }
      if (!parent_type) {
        return res.status(400).json({ success: false, message: "parent type is required" });
      }
      if (!client_type) {
        return res.status(400).json({ success: false, message: "client type is required" });
      }

      if (parent_type == "admin" && client_type == "client") {
        const { retr_user_id } = resdata;
        const checkResellerQuery = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const checkResellerResult = await db(checkResellerQuery, [retr_user_id]);

        if (!checkResellerResult || checkResellerResult.length === 0) {
          return res.status(404).json({ success: false, message: "No user found with the provided user_id" });
        }

        if (checkResellerResult[0].user_type !== 'client') {
          return res.status(400).json({ success: false, message: "The provided user_id is not of type 'client'" });
        }
        const countryCodeQuery = `
   SELECT * 
FROM db_authkey.tbl_route_pricelist_copy 
WHERE (routeid = CASE
                  WHEN country_code = 91 THEN 5 
                  ELSE 16
                END)
                or (routeid = 4 AND country_code = 91)
  AND country_code = ? 
  AND id = ?;
`;
        const countryCodeResult = await db(countryCodeQuery, [country_code, retr_user_id]);

        if (!countryCodeResult || countryCodeResult.length === 0) {
          return res.status(400).json({ success: false, message: "No data found for the given country_code and user_id in tbl_route_pricelist_copy" });
        }
        const insertData = countryCodeResult.map(entry => ({
          id: entry.id,
          country: entry.country,
          country_code: entry.country_code,
          cost: entry.cost + margin,
          created_date: entry.created,
        }));
        const values = insertData.map(entry => [
          entry.id,
          entry.country_code,
          entry.cost,
          entry.created_date,

        ]);

        const insertQuery = `
        INSERT INTO db_authkey.tbl_user_pricelist_copy 
        (user_id, country_code, sms_cost, created) 
        VALUES ${values.map(() => '(?, ?, ?, ?)').join(', ')}
        ON DUPLICATE KEY UPDATE 
          sms_cost = VALUES(sms_cost),
          created = VALUES(created),
          user_id = VALUES(user_id);
      `;
        console.log(values)
        const flattenedValues = values.flat();

        const final_result = await db(insertQuery, flattenedValues);
        if (!final_result) {
          return res.status(400).json({ success: false, message: "No record found" })
        }
        const historyData = countryCodeResult.map((price) => ({
          user_id: retr_user_id,
          bot_id: bot_id,
          country_code: price.country_code,
          sms_cost:price.cost,
          channel: "sms,voice",
          action: "Insert",
          updated_date: todayDateTime(),
        }));
      
        // Insert history data into the HistorySchema
        await HistorySchema.insertMany(historyData);
        return res.status(200).json({
          success: true,
          message: `Pricing data for country_code: ${country_code} successfully added to tbl_user_pricelist_copy for user_id: ${retr_user_id}`
        });
      } else if (parent_type == "admin" && client_type == "reseller") {
        const { retr_user_id } = resdata;
        const checkResellerQuery = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const checkResellerResult = await db(checkResellerQuery, [retr_user_id]);

        if (!checkResellerResult || checkResellerResult.length === 0) {
          return res.status(404).json({ success: false, message: "No user found with the provided user_id" });
        }

        if (checkResellerResult[0].user_type !== 'reseller') {
          return res.status(400).json({ success: false, message: "The provided user_id is not of type 'reseller'" });
        }
        const countryCodeQuery = `
   SELECT * 
FROM db_authkey.tbl_route_pricelist_copy 
WHERE (routeid = CASE
                  WHEN country_code = 91 THEN 5 
                  ELSE 16
                END)
                or (routeid = 4 AND country_code = 91)
  AND country_code = ? 
  AND id = ?;
`;
        const countryCodeResult = await db(countryCodeQuery, [country_code, retr_user_id]);

        if (!countryCodeResult || countryCodeResult.length === 0) {
          return res.status(400).json({ success: false, message: "No data found for the given country_code and user_id in tbl_route_pricelist_copy" });
        }
        const insertData = countryCodeResult.map(entry => ({
          id: entry.id,
          country: entry.country,
          country_code: entry.country_code,
          cost: entry.cost + margin,
          created_date: entry.created,
        }));
        const values = insertData.map(entry => [
          entry.id,
          entry.country_code,
          entry.cost,
          entry.created_date,
        ]);

        const insertQuery = `
        INSERT INTO db_authkey.tbl_user_pricelist_copy 
        (user_id, country_code, sms_cost, created) 
        VALUES ${values.map(() => '(?, ?, ?, ?)').join(', ')}
        ON DUPLICATE KEY UPDATE 
          sms_cost = VALUES(sms_cost),
          created = VALUES(created),
          user_id = VALUES(user_id);
      `;
        console.log(values)
        // Flatten the values array
        const flattenedValues = values.flat();

        const final_result = await db(insertQuery, flattenedValues);
        if (!final_result) {
          return res.status(400).json({ success: false, message: "No record found" })
        }
        const historyData = countryCodeResult.map((price) => ({
          user_id: retr_user_id,
          bot_id: bot_id,
          country_code: price.country_code,
          sms_cost:price.cost,
          channel: "sms,voice",
          action: "Insert",
          updated_date: todayDateTime(),
        }));
      
        // Insert history data into the HistorySchema
        await HistorySchema.insertMany(historyData);
        return res.status(200).json({
          success: true,

          message: `Pricing data for country_code: ${country_code} successfully added to tbl_user_pricelist_copy for user_id: ${retr_user_id}`
        });
      } else if ((parent_type == "reseller" || parent_type == "emp") && client_type == "client") {
        const { retr_user_id } = resdata;
        const parent_query = `select user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const parent_result = await db(parent_query, [user_id])

        if (parent_result[0].user_type != "reseller") {
          return res.status(400).json({ succcess: false, message: "The provided user_id is not of type 'reseller'" })
        }

        const checkResellerQuery = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const checkResellerResult = await db(checkResellerQuery, [retr_user_id]);

        if (!checkResellerResult || checkResellerResult.length === 0) {
          return res.status(404).json({ success: false, message: "No user found with the provided user_id" });
        }

        if (checkResellerResult[0].user_type !== 'client') {
          return res.status(400).json({ success: false, message: "The provided retr_user_id is not of type 'client'" });
        }
        const check_parent_query = `select parent from db_authkey.tbl_users where id = ?`

        const check_parent_result = await db(check_parent_query, [retr_user_id]);
        console.log("parent", check_parent_result)
        if (check_parent_result[0].parent != user_id) {
          return res.status(400).json({ success: false, message: `user_id is not a parent of retr_user_id` })
        }

        const parentEntriesQuery = `
        SELECT user_id,country_code,sms_cost,created
        FROM db_authkey.tbl_user_pricelist_copy 
        WHERE user_id = ?;
      `;

        const parentEntries = await db(parentEntriesQuery, [user_id]);
        console.log("PARENT", parentEntries)
        if (!parentEntries || parentEntries.length == 0) {
          return res.status(404).json({
            success: false,
            message: `No entries found for parent user_id: ${user_id}`,
          });
        }

        //         const countryCodeQuery = `
        //    SELECT * 
        // FROM db_authkey.tbl_route_pricelist_copy 
        // WHERE (routeid = CASE
        //                   WHEN country_code = 91 THEN 5 
        //                   ELSE 16
        //                 END)
        //                 or (routeid = 4 AND country_code = 91)
        //   AND country_code = ? 
        //   AND id = ?;
        // `;
        //         const countryCodeResult = await db(countryCodeQuery, [country_code, user_id]);

        //         if (!countryCodeResult || countryCodeResult.length === 0) {
        //           return res.status(400).json({ success: false, message: "No data found for the given country_code and user_id in tbl_route_pricelist_copy" });
        //         }
        const insertData = parentEntries.map(entry => ({
          user_id: entry.user_id,
          country: entry.country,
          country_code: entry.country_code,
          cost: entry.sms_cost + margin,
          created_date: entry.created,
        }));
        console.log("insertData", insertData)
        const values = insertData.map(entry => [
          retr_user_id,
          entry.country_code,
          entry.cost,
          entry.created_date,
        ]);

        const insertQuery = `
        INSERT INTO db_authkey.tbl_user_pricelist_copy 
        (user_id, country_code, sms_cost, created) 
        VALUES ${values.map(() => '(?, ?, ?, ?)').join(', ')}
        ON DUPLICATE KEY UPDATE 
          sms_cost = VALUES(sms_cost),
          created = VALUES(created);
      `;
        console.log(values)
        // Flatten the values array
        const flattenedValues = values.flat();

        const final_result = await db(insertQuery, flattenedValues);
        if (!final_result) {
          return res.status(400).json({ success: false, message: "No record found" })
        }
        const historyData = parentEntries.map((price) => ({
          user_id: retr_user_id,
          bot_id: bot_id,
          country_code: price.country_code,
          sms_cost:price.cost,
          channel: "sms,voice",
          action: "Insert",
          updated_date: todayDateTime(),
        }));
      
        // Insert history data into the HistorySchema
        await HistorySchema.insertMany(historyData);
        return res.status(200).json({
          success: true,
          message: `Pricing data for country_code: ${country_code} successfully added to tbl_user_pricelist_copy for user_id: ${retr_user_id}`
        });
      } else if ((parent_type == "reseller" || parent_type == "emp") && client_type == "reseller") {
        const { retr_user_id } = resdata;
        const parent_query = `select user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const parent_result = await db(parent_query, [user_id])


        if (parent_result[0].user_type != "reseller" && parent_result[0].user_type != "emp") {
          return res.status(400).json({ succcess: false, message: "The provided user_id is not of type 'reseller' or 'emp' " })
        }

        const checkResellerQuery = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const checkResellerResult = await db(checkResellerQuery, [retr_user_id]);

        if (!checkResellerResult || checkResellerResult.length === 0) {
          return res.status(404).json({ success: false, message: "No user found with the provided user_id" });
        }

        if (checkResellerResult[0].user_type !== 'reseller') {
          return res.status(400).json({ success: false, message: "The provided retr_user_id is not of type 'reseller'" });
        }
        const check_parent_query = `select parent from db_authkey.tbl_users where id = ?`

        const check_parent_result = await db(check_parent_query, [retr_user_id]);
        console.log("parent", check_parent_result)
        if (check_parent_result[0].parent != user_id) {
          return res.status(400).json({ success: false, message: `user_id is not a parent of retr_user_id` })
        }
        const countryCodeQuery = `
   SELECT * 
FROM db_authkey.tbl_route_pricelist_copy 
WHERE (routeid = CASE
                  WHEN country_code = 91 THEN 5 
                  ELSE 16
                END)
                or (routeid = 4 AND country_code = 91)
  AND country_code = ? 
  AND id = ?;
`;
        const countryCodeResult = await db(countryCodeQuery, [country_code, retr_user_id]);

        if (!countryCodeResult || countryCodeResult.length === 0) {
          return res.status(400).json({ success: false, message: "No data found for the given country_code and user_id in tbl_route_pricelist_copy" });
        }
        const insertData = countryCodeResult.map(entry => ({
          user_id: entry.user_id,
          country: entry.country,
          country_code: entry.country_code,
          cost: entry.cost + margin,
          created_date: entry.created,
        }));
        const values = insertData.map(entry => [
          entry.id,
          entry.country_code,
          entry.cost,
          entry.created_date,
        ]);

        const insertQuery = `
           INSERT INTO db_authkey.tbl_user_pricelist_copy 
           (user_id, country_code, sms_cost, created) 
           VALUES ${values.map(() => '(?, ?, ?, ?)').join(', ')};
         `;
        console.log(values)
        // Flatten the values array
        const flattenedValues = values.flat();

        const final_result = await db(insertQuery, flattenedValues);
        if (!final_result) {
          return res.status(400).json({ success: false, message: "No record found" })
        }
        const historyData = parentEntries.map((price) => ({
          user_id: retr_user_id,
          bot_id: bot_id,
          country_code: price.country_code,
          sms_cost:price.cost,
          channel: "sms,voice",
          action: "Insert",
          updated_date: todayDateTime(),
        }));
        return res.status(200).json({
          success: true,
          message: `Pricing data for country_code: ${country_code} successfully added to tbl_user_pricelist_copy for user_id: ${retr_user_id}`
        });
      }
    } else if (resdata.method === "update_rcsprice") {
      const { user_id, country_code, basic_sms_cost, p2a_conv_cost, a2p_conv_cost, a2p_single_sms_cost, parent_type, client_type } = resdata;
      const {retr_user_id}=resdata;
      if (!retr_user_id) {
        return res.status(400).json({ success: false, message: "retr_user_id is required" })
      }
      if (!user_id) {
        return res.status(400).json({ success: false, message: "user_id is required" })
      }
      if (!country_code) {
        return res.status(400).json({ success: false, message: "country_code is required" })
      }
      if ((parent_type == "admin" && client_type == "client") || (parent_type == "admin" && client_type == "reseller") || (parent_type == "reseller" && client_type == "client")) {

        const check_parent_query = `select parent from db_authkey.tbl_users where id = ?`

        const check_parent_result = await db(check_parent_query, [retr_user_id]);
        // console.log("parent", check_parent_result)
        if (check_parent_result[0].parent != user_id) {
          return res.status(400).json({ success: false, message: ` user_id is not a parent of retr_user_id` })
        }
        const check_reseller_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const check_reseller_result = await db(check_reseller_query, [user_id]);

        // console.log("Result:", check_reseller_result);

        if (!check_reseller_result || check_reseller_result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No user found with the provided user_id",
          });
        }

        if (check_reseller_result[0].user_type != 'reseller' && check_reseller_result[0].user_type != 'admin') {
          return res.status(400).json({
            success: false,
            message: "The provided user_id is not of type 'admin' or 'reseller' ",
          });
        }


        const check_reseller_client_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const check_reseller_client_result = await db(check_reseller_client_query, [retr_user_id]);

        // console.log("Result:", check_reseller_result);

        if (!check_reseller_client_result || check_reseller_client_result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No user found with the provided retr_user_id",
          });
        }

        if (check_reseller_client_result[0].user_type != 'client' && check_reseller_client_result[0].user_type != 'reseller') {
          return res.status(400).json({
            success: false,
            message: "The provided retr_user_id is not of type 'client' or 'reseller' ",
          });
        }
      
        const updateQuery = await tbl_rcs_price.findOne({ user_id: retr_user_id, country_code: country_code });
        if (updateQuery) {
  
          if (basic_sms_cost !== undefined) {
            updateQuery.basic_sms_cost = basic_sms_cost;
          }
          if (p2a_conv_cost !== undefined) {
            updateQuery.p2a_conv_cost = p2a_conv_cost;
          }
          if (a2p_conv_cost !== undefined) {
            updateQuery.a2p_conv_cost = a2p_conv_cost;
          }
          if (a2p_single_sms_cost !== undefined) {
            updateQuery.a2p_single_sms_cost = a2p_single_sms_cost;
          }
          updateQuery.updated_date = todayDateTime();
          await updateQuery.save();
         const historyinsert = await HistorySchema.create({user_id:retr_user_id,country_code:country_code,basic_sms_cost:updateQuery.basic_sms_cost,p2a_conv_cost: updateQuery.p2a_conv_cost,a2p_conv_cost:updateQuery.a2p_conv_cost,a2p_single_sms_cost:updateQuery.a2p_single_sms_cost,channel:"whatsapp",action:"update",})
         await historyinsert.save();
          return res.status(200).json({ success: true, message: "pricing updated successfully" })
        }
  
      }else if(parent_type == "reseller" && client_type == "reseller"){
        const check_parent_query = `select parent from db_authkey.tbl_users where id = ?`

        const check_parent_result = await db(check_parent_query, [retr_user_id]);
        // console.log("parent", check_parent_result)
        if (check_parent_result[0].parent != user_id) {
          return res.status(400).json({ success: false, message: ` user_id is not a parent of retr_user_id` })
        }
        const check_reseller_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const check_reseller_result = await db(check_reseller_query, [user_id]);

        // console.log("Result:", check_reseller_result);

        if (!check_reseller_result || check_reseller_result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No user found with the provided user_id",
          });
        }

        if (check_reseller_result[0].user_type != 'reseller' ) {
          return res.status(400).json({
            success: false,
            message: "The provided user_id is not of type 'reseller' ",
          });
        }

        const check_reseller_client_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
        const check_reseller_client_result = await db(check_reseller_client_query, [retr_user_id]);

        // console.log("Result:", check_reseller_result);

        if (!check_reseller_client_result || check_reseller_client_result.length === 0) {
          return res.status(404).json({
            success: false,
            message: "No user found with the provided retr_user_id",
          });
        }

        if (check_reseller_client_result[0].user_type != 'reseller') {
          return res.status(400).json({
            success: false,
            message: "The provided retr_user_id is not of type 'reseller' ",
          });
        }
        const check_parent_costs = await tbl_rcs_price.findOne({ user_id: user_id, country_code: country_code });

        if (!check_parent_costs) {
            return res.status(404).json({
                success: false,
                message: "Parent's costs not found in tbl_rcs_price collection",
            });
        }
    
        const parent_sms_cost = check_parent_costs.sms_cost;
        const parent_voice_cost = check_parent_costs.voice_cost;
        const parent_a2p_conv_cost = check_parent_costs.a2p_conv_cost;
        const parent_p2a_conv_cost = check_parent_costs.p2a_conv_cost;
    
        const check_child_costs = await tbl_rcs_price.findOne({ user_id: retr_user_id, country_code: country_code });
    
        if (!check_child_costs) {
            return res.status(404).json({
                success: false,
                message: "Child's costs not found in tbl_rcs_price collection",
            });
        }
    
        const child_sms_cost = check_child_costs.sms_cost;
        const child_voice_cost = check_child_costs.voice_cost;
        const child_a2p_conv_cost = check_child_costs.a2p_conv_cost;
        const child_p2a_conv_cost = check_child_costs.p2a_conv_cost;
    
        if (
            (basic_sms_cost && basic_sms_cost > parent_sms_cost) ||
            (p2a_conv_cost && p2a_conv_cost > parent_p2a_conv_cost) ||
            (a2p_conv_cost && a2p_conv_cost > parent_a2p_conv_cost) ||
            (a2p_single_sms_cost && a2p_single_sms_cost > parent_a2p_conv_cost)
        ) {
            return res.status(400).json({
                success: false,
                message: "Child's cost cannot be greater than the parent's cost",
            });
        }
    
        const update_child_costs = {};
    
        if (basic_sms_cost !== undefined) {
            update_child_costs.sms_cost = basic_sms_cost;
        }
        if (p2a_conv_cost !== undefined) {
            update_child_costs.p2a_conv_cost = p2a_conv_cost;
        }
        if (a2p_conv_cost !== undefined) {
            update_child_costs.a2p_conv_cost = a2p_conv_cost;
        }
        if (a2p_single_sms_cost !== undefined) {
            update_child_costs.a2p_single_sms_cost = a2p_single_sms_cost;
        }
    
        update_child_costs.updated_date = todayDateTime();
    
        const updateResult = await tbl_rcs_price.updateOne(
            { user_id: retr_user_id, country_code: country_code },
            { $set: update_child_costs }
        );
        const historyinsert = await HistorySchema.create({user_id:retr_user_id,country_code:country_code,basic_sms_cost:update_child_costs.sms_cost,p2a_conv_cost: update_child_costs.p2a_conv_cost,a2p_conv_cost: update_child_costs.a2p_conv_cost,a2p_single_sms_cost:  update_child_costs.a2p_single_sms_cost,channel:"whatsapp",action:"update",})
        await historyinsert.save();
        if (updateResult.modifiedCount > 0) {
            return res.status(200).json({
                success: true,
                message: " costs updated successfully",
            });
        } else {
            return res.status(400).json({
                success: false,
                message: "Failed to update costs",
            });
        }
      }
  

    }else if(resdata.method === "update_user_rcs_price"){
    const {user_id,sms_cost,voice_cost,parent_type,client_type,retr_user_id,country_code} = resdata
     if(!user_id){
      return res.status(400).json({success:false,message:"user_id is required"})
     }
     if(!retr_user_id){
      return res.status(400).json({success:false,message:"retr_user_id is required"})
     }
    //  if(!sms_cost){
    //   return res.status(400).json({success:false,message:"sms_cost is required"})
    //  }
    //  if(!voice_cost){
    //   return res.status(400).json({success:false,message:"voice_cost"})
    //  }

     if((parent_type == "admin" && client_type == "client") || (parent_type == "admin" && client_type == "reseller") || (parent_type == "reseller" && client_type == "client")){
      const check_parent_query = `select parent from db_authkey.tbl_users where id = ?`

      const check_parent_result = await db(check_parent_query, [retr_user_id]);
      // console.log("parent", check_parent_result)
      if (check_parent_result[0].parent != user_id) {
        return res.status(400).json({ success: false, message: ` user_id is not a parent of retr_user_id` })
      }
      const check_reseller_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
      const check_reseller_result = await db(check_reseller_query, [user_id]);

      // console.log("Result:", check_reseller_result);

      if (!check_reseller_result || check_reseller_result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No user found with the provided user_id",
        });
      }

      if (check_reseller_result[0].user_type != 'reseller' && check_reseller_result[0].user_type != 'admin') {
        return res.status(400).json({
          success: false,
          message: "The provided user_id is not of type 'admin' or 'reseller' ",
        });
      }


      const check_reseller_client_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
      const check_reseller_client_result = await db(check_reseller_client_query, [retr_user_id]);

      // console.log("Result:", check_reseller_result);

      if (!check_reseller_client_result || check_reseller_client_result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No user found with the provided retr_user_id",
        });
      }

      if (check_reseller_client_result[0].user_type != 'client' && check_reseller_client_result[0].user_type != 'reseller') {
        return res.status(400).json({
          success: false,
          message: "The provided retr_user_id is not of type 'client' or 'reseller' ",
        });
      }

      const sqlUpdateQuery = `
      UPDATE db_authkey.tbl_user_pricelist_copy
      SET 
        sms_cost = CASE WHEN ? IS NOT NULL THEN ? ELSE sms_cost END,
        voice_cost = CASE WHEN ? IS NOT NULL THEN ? ELSE voice_cost END
      WHERE user_id = ? AND country_code = ?;
    `;
    const sql_query_result = await db(sqlUpdateQuery,[
      sms_cost || null, sms_cost || null,
      voice_cost || null, voice_cost || null,
      retr_user_id, country_code
    ])
    console.log(sql_query_result)
    if(sql_query_result){
        await HistorySchema.create({
          user_id: retr_user_id,
          country_code: country_code,
          sms_cost: sms_cost || null,
          voice_cost: voice_cost || null,
          channel: "sms , voice",
          action: "update",
          updated_date: todayDateTime()
      });
      return res.status(200).json({success:true,message:"pricing updated successfully"})
    }
 
     }else if(parent_type == "reseller" && client_type == "reseller"){
      const check_parent_query = `select parent from db_authkey.tbl_users where id = ?`

      const check_parent_result = await db(check_parent_query, [retr_user_id]);
      if (check_parent_result[0].parent != user_id) {
        return res.status(400).json({ success: false, message: ` user_id is not a parent of retr_user_id` })
      }
      const check_reseller_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
      const check_reseller_result = await db(check_reseller_query, [user_id]);

      if (!check_reseller_result || check_reseller_result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No user found with the provided user_id",
        });
      }

      if (check_reseller_result[0].user_type != 'reseller' ) {
        return res.status(400).json({
          success: false,
          message: "The provided user_id is not of type 'reseller' ",
        });
      }
      const check_reseller_client_query = `SELECT user_type FROM db_authkey.tbl_users WHERE id = ?`;
      const check_reseller_client_result = await db(check_reseller_client_query, [retr_user_id]);


      if (!check_reseller_client_result || check_reseller_client_result.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No user found with the provided retr_user_id",
        });
      }

      if (check_reseller_client_result[0].user_type != 'reseller') {
        return res.status(400).json({
          success: false,
          message: "The provided retr_user_id is not of type 'reseller' ",
        });
      }

      const selectQuery = `
      SELECT sms_cost, voice_cost 
      FROM db_authkey.tbl_user_pricelist_copy 
      WHERE user_id = ? AND country_code = ?
    `;
    const [userPricing] = await db(selectQuery, [retr_user_id, country_code]);

    if (!userPricing) {
      return res.status(404).json({ success: false, message: " pricing data not found" });
    }

    const { sms_cost: currentSmsCost, voice_cost: currentVoiceCost } = userPricing;

    if (sms_cost && sms_cost <= currentSmsCost) {
      return res.status(400).json({ 
        success: false, 
        message: `New sms_cost (${sms_cost}) must be greater than the current sms_cost (${currentSmsCost})` 
      });
    }

    if (voice_cost && voice_cost <= currentVoiceCost) {
      return res.status(400).json({ 
        success: false, 
        message: `New voice_cost (${voice_cost}) must be greater than the current voice_cost (${currentVoiceCost})` 
      });
    }
    const updateQuery = `
    UPDATE db_authkey.tbl_user_pricelist_copy 
    SET sms_cost = ?, voice_cost = ?, 
    WHERE user_id = ? AND country_code = ?
  `;
  await db(updateQuery, [sms_cost, voice_cost, retr_user_id, country_code]);
  await HistorySchema.create({
    user_id: retr_user_id,
    country_code: country_code,
    sms_cost: sms_cost || null,
    voice_cost: voice_cost || null,
    channel: "sms , voice",
    action: "update",
    updated_date: todayDateTime()
});
  return res.status(200).json({
    success: true,
    message: "Pricing updated successfully "
  });
     }

    }else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Method" });
    }
  }
  ));

module.exports = router;
