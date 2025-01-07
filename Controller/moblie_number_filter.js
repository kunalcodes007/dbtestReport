const express = require("express");
const router = express.Router();
const {db} = require("../config/databaseconnection");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const auth = require("../middleware/auth");

router.all("/mobile_number_filter", auth, catchAsyncErrors(async (req, res, next) => {
    let resdata;
    if (Object.keys(req.body).length > 0) {
        resdata = req.body;
    }
    if (Object.keys(req.query).length > 0) {
        resdata = req.query;
    }

    if (resdata.method === "number_search_whatsapp") {
        const { fromdate, todate, user_id, token, mobile_number } = resdata;

        // Validate input data
        if (!fromdate) {
            return res.status(400).json({ success: false, message: "Fromdate is required" });
        }
        if (!todate) {
            return res.status(400).json({ success: false, message: "Todate is required" });
        }
        if (!user_id) {
            return res.status(400).json({ success: false, message: "Userid is required" });
        }
        if (!token) {
            return res.status(400).json({ success: false, message: "Token is required" });
        }
        if (!mobile_number) {
            return res.status(400).json({ success: false, message: "Mobile Number is required" });
        }

        const get_first_alpha = `SELECT username FROM db_authkey.tbl_users WHERE id = ?`;
        const get_first_alpha_result = await db(get_first_alpha, [user_id]);

        if (get_first_alpha_result && get_first_alpha_result.length > 0) {
            const username = get_first_alpha_result[0].username;

            const firstAlphaMatch = username.match(/[a-zA-Z]/);
            if (firstAlphaMatch) {
                const firstAlpha = firstAlphaMatch[0].toLowerCase(); 
                
                const tableName = `tbl_whatsapp_report_${firstAlpha}`;
                const reportName=`tbl_wp_reports_${firstAlpha}`;
                const mobileWithPrefix = "91" + mobile_number;

                const bulk_query = `SELECT mobile,template_id,parameter,status,DATE_FORMAT(deliver_time,  '%Y:%m:%d %H:%i:%s') AS deliver_time,DATE_FORMAT(n24htime,  '%Y:%m:%d %H:%i:%s') AS n24htime,dlr_reponse,message_type,  DATE_FORMAT(created_date, '%Y:%m:%d %H:%i:%s') AS created_date FROM db_authkey_bulk.${tableName} WHERE user_id = ? AND mobile = ? and created_date >= ? and created_date <= ? order by created_date ASC `;
                const report_query = `SELECT mobile,template_id,status,DATE_FORMAT(delivered_on,  '%Y:%m:%d %H:%i:%s') AS delivered_on,DATE_FORMAT(n24htime,  '%Y:%m:%d %H:%i:%s') AS n24htime,dlr_reponse,message_type,  DATE_FORMAT(created, '%Y:%m:%d %H:%i:%s') AS created_date  FROM db_authkey_reports.${reportName} WHERE user_id = ? AND mobile = ? and created >= ? and created <= ? order by created ASC `;
              
                const bulkData = await db(bulk_query, [user_id, mobileWithPrefix, fromdate, todate]);
                const reportData = await db(report_query, [user_id, mobileWithPrefix, fromdate, todate]);

                if (bulkData && bulkData.length > 0) {
                    bulkData.forEach(record => {
                        record.submit_via = "camp";
                    });
                }
                
                if (reportData && reportData.length > 0) {
                    reportData.forEach(record => {
                        record.submit_via = "api";
                    });
                }

                let combinedData = [...bulkData, ...reportData];

                combinedData.sort((a, b) => {
                    const dateA = convertToValidDate(a.created_date);
                    const dateB = convertToValidDate(b.created_date);
                    return dateA - dateB;  
                });

                if (combinedData.length > 0) {
                    return res.status(200).json({
                        success: true,
                        message: "Report found",
                        data: combinedData,
                    });
                } else if (!bulkData || bulkData.length === 0) {
                    return res.status(200).json({
                        success: true,
                        message: "No bulkData report found",
                    });
                } else if (!reportData || reportData.length === 0) {
                    return res.status(200).json({
                        success: true,
                        message: "No reportData report found",
                    });
                }
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Please enter a valid number"
                });
            }
        } else {
            return res.status(404).json({
                success: false,
                message: "No user found with the given  number"
            });
        }
    } else {
        return res.status(400).json({ success: false, message: "Invalid Method" });
    }
}));

function convertToValidDate(dateString) {
    const parts = dateString.split(" ");
    const dateParts = parts[0].split(":");
    const timeParts = parts[1].split(":");
    
    const validDateString = `${dateParts[0]}-${dateParts[1]}-${dateParts[2]} ${timeParts[0]}:${timeParts[1]}:${timeParts[2]}`;
    
    return new Date(validDateString); 
}

module.exports = router;
