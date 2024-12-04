const express = require("express");
const router = express.Router();
const db = require("../config/databaseconnection");
const catchAsyncErrors = require("../Middleware/catchAsyncErrors");
const auth = require("../Middleware/mongoAuth");
const fixedurlschema = require("../Models/fixedurlschema");

router.all(
  "/fixed_url",
  auth,
  catchAsyncErrors(async (req, res, next) => {
    let resdata;
    if (req.method === "GET") {
      resdata = req.query;
    }
    if (req.method === "POST") {
      resdata = req.body;
    }

    const isValidUrl = (main_url) => {
      const regex =
        /^(https:\/\/)(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+([\/\w\-\.~!$&'()*+,;=:@%]*)?$/;
      return regex.test(main_url);
    };

    const generateUrlAndKeyValue = (brandnumber) => {
      const randomString = Math.random().toString(36).substring(2, 8);
      const url = `https://0kb/${brandnumber}/B${randomString}`;
      const key_value = randomString;
      return { url, key_value };
    };

    if (resdata.method === "create") {
      const { user_id, main_url, created_date, channel, status, brandnumber } =
        resdata;
      if (!user_id) {
        return res
          .status(400)
          .json({ success: false, message: "user_id can't be empty" });
      }

      if (!main_url) {
        return res
          .status(400)
          .json({ success: false, message: "main_url can't be empty" });
      }
      if (!created_date) {
        return res
          .status(400)
          .json({ success: false, message: "created_date can't be empty" });
      }

    //   if (!status) {
    //     return res
    //       .status(400)
    //       .json({ success: false, message: "status can't be empty" });
    //   }
    if(channel === "whatsapp"){
        if (!brandnumber) {
          return res
            .status(400)
            .json({ success: false, message: "brandnumber can't be empty" });
        }
    }
    //   if (!channel) {
    //     return res
    //       .status(400)
    //       .json({ success: false, message: "channel can't be empty" });
    //   }

      if ( !channel || !["sms", "whatsapp"].includes((channel))) {
        return res
          .status(400)
          .json({
            success: false,
            message: "channel must be either 'sms' or 'whatsapp'",
          });
      }

      if (status !== undefined && ![0, 1].includes(Number(status))) {
        return res
          .status(400)
          .json({ success: false, message: "status must be either 0 or 1" });
      }
      const { url, key_value } = generateUrlAndKeyValue(brandnumber);
    
      if (!isValidUrl(main_url)) {
        return res
          .status(400)
          .json({ success: false, message: "not a valid main_url format" });
      }
      const data = new fixedurlschema({
        user_id,
        url,
        key_value,
        main_url,
        created_date,
        channel,
        status,
      });

      const saved_data = await data.save();
      return res.status(200).json({
        success: true,
        message: "data inserted successfully",
        
      });
    } else if (resdata.method === "update") {
      const { _id, main_url, created_date, channel, status } = resdata;

      if (!_id) {
        return res
          .status(400)
          .json({ success: false, message: "_id is required for update" });
      }

      if (main_url && !isValidUrl(main_url)) {
        return res
          .status(400)
          .json({ success: false, message: "not a valid main_url format" });
      }

      if (channel && !["sms", "whatsapp"].includes(channel)) {
        return res
          .status(400)
          .json({
            success: false,
            message: "channel must be either 'sms' or 'whatsapp'",
          });
      }

      if (status !== undefined && ![0, 1].includes(Number(status))) {
        return res
          .status(400)
          .json({ success: false, message: "status must be either 0 or 1" });
      }

      const updateData = {
        main_url,
        created_date,
        channel,
        status,
      };

      const updatedRecord = await fixedurlschema.findByIdAndUpdate(
        _id,
        updateData,
        { new: true }
      );

      if (!updatedRecord) {
        return res.status(404).json({
          success: false,
          message: "Record not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "data updated successfully",
       
      });
    } else if (resdata.method === "delete") {
      const { _id } = resdata;
      if (!_id) {
        return res
          .status(400)
          .json({ success: false, message: "_id is required for delete" });
      }

      const deletedRecord = await fixedurlschema.findByIdAndDelete(_id);

      if (!deletedRecord) {
        return res.status(404).json({
          success: false,
          message: "Record not found",
          
        });
      }

      return res.status(200).json({
        success: true,
        message: "data deleted successfully",
        
      });
    } else if (resdata.method === "retrieve") {
      const retrieve_all = await fixedurlschema.find({});
      return res.status(200).json({
        success: true,
        message: "successfully retrieved",
        data: retrieve_all,
      });
    } else if (resdata.method === "retrieve_id") {
      const { _id } = resdata;
      if (!_id) {
        return res
          .status(400)
          .json({ success: false, message: "_id is required for delete" });
      }
      const retrieve_id = await fixedurlschema.findById(_id);
      if(!_id){
        return res.status(200).json({success:false,message:"id not found"})
      }
      return res.status(200).json({
        success: true,
        message: "successfully retrieved",
        data: retrieve_id,
      });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Method" });
    }
  })
);

module.exports = router;
