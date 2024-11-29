const express = require("express");
const router = express.Router();
const auth = require("../Middleware/mongoAuth"); 
const urlShortLinkModel = require("../Models/urlShortLinkSchema"); 

router.all("/api_click_report", auth, async (req, res) => {

   let resdata;
    if (req.method === "GET") {
      resdata = req.query;
    }

    if (req.method === "POST") {
      resdata = req.body;
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
          !country_code
        ) {
          return res.status(400).json({
            success: false,
            message: "All fields are mandatory",
          });
        }
    
        const urlData = new urlShortLinkModel({
          phone_number,
          user_id,
          sender,
          main_url,
          short_url,
          urlkey,
          created:  new Date(), 
          ip: ip || null,
          url_clickcount: url_clickcount || 0,
          url_city: url_city || null,
          url_device: url_device || null,
          camp_id,
          submit_via,
          country_code,
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
