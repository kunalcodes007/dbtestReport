const express = require("express");
const router = express.Router();
const ErrorHandler = require("../../utils/ErrorHandler");
const catchAsyncErrors = require("../../middleware/catchAsyncErrors");
const Auth = require("../../middleware/auth");
const tbl_rcs_price = require("../../model/rcsPrice");
const rcs_master_price = require("../../model/rcsMaster");
const todayDateTime = require("../../utils/todayDateTime");
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
        // console.log("parent", check_parent_result)
        if (check_parent_result[0].parent != user_id) {
          return res.status(400).json({ success: false, message: `Invalid retr_user_id` })
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

            return res.status(200).json({
              success: true,
              message: "Pricing updated successfully for single country (existing entry)",
            });
          }
        } else {
          return res.status(400).json({ success: false, message: "Country code for given user_id doesn't exists" })
        }
      }
    } else if (resdata.method === "add_all_country_pricercs") {
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

          return res.status(400).json({ success: false, message: `Invalid retr_user_id` })

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
          return res.status(400).json({ success: false, message: `Invalid retr_user_id` })
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

        return res.status(200).json({
          success: true,
          message: `All entries for parent user_id: ${user_id} have been added for child user_id: ${retr_user_id}`,
        });
      }

    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Method" });
    }
  }
  ));

module.exports = router;
