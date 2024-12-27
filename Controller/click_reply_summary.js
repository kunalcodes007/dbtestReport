const express = require("express");
const router = express.Router();
const ErrorHandler = require("../../utils/ErrorHandler");
const catchAsyncErrors = require("../../middleware/catchAsyncErrors");
const adminAuth = require("../../middleware/adminAuth");
const campquickreplySchema = require("../../Models/campquickreplySchema")

router.all("/click_reply_summary", adminAuth, catchAsyncErrors(async (req, res, next) => {

    let resdata;
    if (Object.keys(req.body).length > 0) {
        resdata = req.body;
    }
    if (Object.keys(req.query).length > 0) {
        resdata = req.query;
    }
    if (resdata.method === "api_quickreply_summary") {
        const { fromdate, todate, submit_via, retr_user_id } = resdata;
        if (!fromdate) {
            return res.status(400).json({ success: false, message: "fromdate is required" })
        }
        if (!todate) {
            return res.status(400).json({ success: false, message: "todate is required" })
        }
        if (!submit_via) {
            return res.status(400).json({ success: false, message: "submit_via is required" })
        }
        if (!retr_user_id) {
            return res.status(400).json({ success: false, message: "retr_user_id is required" })
        }
        const api_result = await campquickreplySchema.aggregate([
            {
                $match: {
                    user_id: parseInt(retr_user_id),
                    submit_via: submit_via,
                    createdAt: {
                        $gt: fromdate,
                        $lt: todate,
                    },
                },
            },
            {
                $group: {
                    _id: { user_id: "$user_id", btn_name: "$btn_name" }, 
                    total_count: { $sum: "$click_count" },
                },
            },
            {
                $project: {
                    user_id: "$_id.user_id",   
                    btn_name: "$_id.btn_name",  
                    total_count: 1,            
                    _id: 0                     
                },
            },
        ]);
        
        const result = api_result.length > 0 ? api_result : [];
        
        return res.status(200).json({
            success: true,
            data: result,  
        });
        
        // return res.status(200).json({success:true,data:api_result.length > 0 ? api_result[0] : { total_count: 0 }})
    }else if (resdata.method === "camp_quickreply_summary") {
        const { fromdate, todate, camp_id, retr_user_id } = resdata;
        if (!fromdate) {
            return res.status(400).json({ success: false, message: "fromdate is required" })
        }
        if (!todate) {
            return res.status(400).json({ success: false, message: "todate is required" })
        }
        if (!camp_id) {
            return res.status(400).json({ success: false, message: "camp_id is required" })
        }
        if (!retr_user_id) {
            return res.status(400).json({ success: false, message: "retr_user_id is required" })
        }
        const api_result = await campquickreplySchema.aggregate([
            {
                $match: {
                    user_id: parseInt(retr_user_id),
                    camp_id: parseInt(camp_id),
                    createdAt: {
                        $gt: fromdate,
                        $lt: todate,
                    },
                },
            },
            {
                $group: {
                    _id: { user_id: "$user_id", btn_name: "$btn_name" }, 
                    total_count: { $sum: "$click_count" },
                },
            },
            {
                $project: {
                    user_id: "$_id.user_id",   
                    btn_name: "$_id.btn_name",  
                    camp_id:"$_id.camp_id",
                    total_count: 1,            
                    _id: 0                     
                },
            },
        ]);
        
        const result = api_result.length > 0 ? api_result : [];
      
        return res.status(200).json({
            success: true,
            data: result,  
        });
    }else {
        return res.status(400).json({ success: false, message: "Invalid Method" })
    }

}))


module.exports = router;
