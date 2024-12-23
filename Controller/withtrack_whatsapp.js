const express = require("express");
const router = express.Router();
const auth = require("../Middleware/mongoAuth"); 
const urlShortLinkModel = require("../Models/urlShortLinkSchema"); 

router.all("/api_click_report",auth, async (req, res) => {

   let resdata;
      if (Object.keys(req.body).length > 0) {
        resdata = req.body;
      }
      if (Object.keys(req.query).length > 0) {
        resdata = req.query;
      }
   
    if(resdata.method === "insert_api_wpbtnclick"){

        const {
          phone_number,
          user_id,
          sender,
          main_url,
          short_url,
          urlkey,
          created,
          ip,
          url_clickcount,
          url_city,
          url_device,
          camp_id,
          submit_via,
          country_code,
        } = resdata;
    
        if (
          !phone_number ||
          !user_id ||
          !sender ||
          !main_url ||
          !short_url ||
          !urlkey ||
          !camp_id ||
          !submit_via ||
          !country_code ||
          !created
        )
           if(!phone_number){
            return res.status(400).json({
              success: false,
              message: "phone_number is mandatory",
            });
           }
           if(!user_id){
            return res.status(400).json({
              success: false,
              message: "user_id is mandatory",
            });
           }
           if(!sender){
            return res.status(400).json({
              success: false,
              message: "sender is mandatory",
            });
           }
           if(!main_url){
            return res.status(400).json({
              success: false,
              message: "main_url is mandatory",
            });
           }
           if(!short_url){
            return res.status(400).json({
              success: false,
              message: "short_url is mandatory",
            });
           }
           if(!urlkey){
            return res.status(400).json({
              success: false,
              message: "urlkey is mandatory",
            });
           }
           if(!camp_id){
            return res.status(400).json({
              success: false,
              message: "camp_id is mandatory",
            });
           }
           if(!submit_via){
            return res.status(400).json({
              success: false,
              message: "submit_via is mandatory",
            });
           }
           if(!country_code){
            return res.status(400).json({
              success: false,
              message: "country_code is mandatory",
            });
           }
           if(!created){
            return res.status(400).json({
              success: false,
              message: "created is mandatory",
            });
           }
       
        const urlData = new urlShortLinkModel({
          phone_number,
          user_id,
          sender,
          main_url,
          short_url,
          urlkey,
          ip: ip || null,
          url_clickcount: url_clickcount || 0,
          url_city: url_city || null,
          url_device: url_device || null,
          camp_id,
          submit_via,
          country_code,
          created
        });
    
        const savedData = await urlData.save();
    
        return res.status(200).json({
          success: true,
          message: "Data inserted successfully.",
          data: savedData,
        });
    } else{
        res.status(400).json({success:false,message:"invalid method"})
    }
});

module.exports = router;
