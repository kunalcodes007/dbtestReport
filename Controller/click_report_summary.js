const express = require("express");
const router = express.Router();
const {db} = require("../config/databaseconnection");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const auth = require("../middleware/auth");
const urlShortLinkModel = require("../model/urlShortLinkSchema");


router.all("/click_report_summary",auth,catchAsyncErrors(async(req,res,next)=>{
  let resdata;
  if (Object.keys(req.body).length > 0) {
    resdata = req.body;
  }
  if (Object.keys(req.query).length > 0) {
    resdata = req.query;
  }

  if(resdata.method === "click_api_report_summary"){
    const {fromdate,todate,user_id,submit_via}=resdata;
    if(!fromdate){
     return res.status(400).json({success:false,message:"fromdate is required"})
    }
    if(!todate){
     return res.status(400).json({success:false,message:"todate is required"})
    }
    if(!user_id){
     return res.status(400).json({success:false,message:"user_id is required"})
    }
    if(!submit_via){
     return res.status(400).json({success:false,message:"submit_via is required"})
    }

    const api_result = await urlShortLinkSchema.aggregate([
      {
          $addFields: {
              createdDate: { 
                  $dateFromString: { dateString: "$created" } 
              }
          }
      },
      {
          $match: {
              user_id: parseInt(user_id),
              submit_via: submit_via,
              createdDate: {
                  $gte: new Date(fromdate),
                  $lte: new Date(todate)
              }
          }
      },
      {
          $group: {
              _id: {
                  date: {
                      $dateToString: { format: "%Y-%m-%d", date: "$createdDate" }
                  },
                  total_count: { $sum: "$url_clickcount" }
              },
          }
      },
      {
          $sort: { "_id.date": 1 } 
      }
  ]);

 return res.status(200).json({
   success: true,
   data: api_result.length > 0 ? api_result[0] : { total_count: 0 }
});

 }else if(resdata.method === "click_camp_report_summary"){
    const {fromdate,todate,user_id,submit_via}=resdata;
    if(!fromdate){
      return res.status(400).json({success:false,message:"fromdate is required"})
     }
     if(!todate){
      return res.status(400).json({success:false,message:"todate is required"})
     }
     if(!user_id){
      return res.status(400).json({success:false,message:"user_id is required"})
     }
     if(!submit_via){
      return res.status(400).json({success:false,message:"submit_via is required"})
     }
   const Fromdate=`${fromdate}00:00:00`
   const Todate=`${todate}23:59:59`
  //    const api_result = await urlShortLinkSchema.aggregate([
  //      {
  //          $match: {
  //              user_id: parseInt(user_id),
  //              submit_via: String(submit_via),
  //              created: {
  //                $lte: Todate,
  //                  $gte: Fromdate,
  //              }
  //          }
  //      },
  //      {
  //          $group: {
  //            _id: "$camp_id",
  //              click_count: { $sum: "$url_clickcount" }
  //          }
  //      }
  //  ]);
  //  console.log(api_result)
  //  console.log("fromdate",typeof Fromdate)  
  //  console.log("todate",typeof Todate)
  //  console.log("submit_via",typeof submit_via)
  //  console.log("user",typeof user_id)
  const api_result = await urlShortLinkSchema.aggregate([
    {
      $match: {
        user_id: parseInt(user_id),
        submit_via: resdata.submit_via,
        url_clickcount:{$gt:0},
        created: {
          $gte: `${resdata.fromdate} 00:00:00`,
          $lte: `${resdata.todate} 23:59:59`,
        },
      },
    },
    {
      $group: {
        _id: "$camp_id",
        click_count: { $sum: "$url_clickcount" },
      },
    },
  ]);
 
  if(!api_result || api_result.length == 0){
    return res.status(400).json({success:false,message:"no record found"})
  }
    return res.status(200).json({
     success: true,
     data: api_result 
 });
  }
  else {
      return res.status(400).json({success:false,message:"Invalid Method"})
  }
}))


module.exports=router;
