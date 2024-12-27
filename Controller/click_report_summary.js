const express = require("express");
const router = express.Router();
const catchAsyncErrors = require("../Middleware/catchAsyncErrors");
const auth = require("../Middleware/auth");
const urlShortLinkSchema=require("../Models/urlShortLinkSchema")

router.all("/click_report_summary",auth,catchAsyncErrors(async(req,res,next)=>{
    let resdata;
    if (Object.keys(req.body).length > 0) {
      resdata = req.body;
    }
    if (Object.keys(req.query).length > 0) {
      resdata = req.query;
    }

    if(resdata.method === "click_api_report_summary"){
       const {fromdate,todate,retr_user_id,submit_via}=resdata;
       if(!fromdate){
        return res.status(400).json({success:false,message:"fromdate is required"})
       }
       if(!todate){
        return res.status(400).json({success:false,message:"todate is required"})
       }
       if(!retr_user_id){
        return res.status(400).json({success:false,message:"retr_user_id is required"})
       }
       if(!submit_via){
        return res.status(400).json({success:false,message:"submit_via is required"})
       }

       const api_result = await urlShortLinkSchema.aggregate([
        {
            $match: {
                user_id: parseInt(retr_user_id),
                submit_via: submit_via,
                created: {
                    $gte: fromdate,
                    $lte: todate
                }
            }
        },
        {
            $group: {
              _id: "$user_id",
                total_count: { $sum: "$url_clickcount" }
            }
        }
    ]);
    return res.status(200).json({
      success: true,
      data: api_result.length > 0 ? api_result[0] : { total_count: 0 }
  });

    
    }else if(resdata.method === "click_camp_report_summary"){
      const {fromdate,todate,retr_user_id,camp_id}=resdata;
      if(!fromdate){
        return res.status(400).json({success:false,message:"fromdate is required"})
       }
       if(!todate){
        return res.status(400).json({success:false,message:"todate is required"})
       }
       if(!retr_user_id){
        return res.status(400).json({success:false,message:"retr_user_id is required"})
       }
       if(!camp_id){
        return res.status(400).json({success:false,message:"camp_id is required"})
       }

       const api_result = await urlShortLinkSchema.aggregate([
         {
             $match: {
                 user_id: parseInt(retr_user_id),
                 camp_id: camp_id,
                 created: {
                     $gte: fromdate,
                     $lte: todate
                 }
             }
         },
         {
             $group: {
               _id: "$camp_id",
                 total_count: { $sum: "$url_clickcount" }
             }
         }
     ]);
     return res.status(200).json({
       success: true,
       data: api_result.length > 0 ? api_result[0] : { total_count: 0 }
   });
    }
    else {
        return res.status(400).json({success:false,message:"Invalid Method"})
    }

}))


module.exports=router;