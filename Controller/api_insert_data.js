const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const catchAsyncErrors = require("../Middleware/catchAsyncErrors");
const auth = require("../Middleware/insert_auth");

router.all(
  "/api_insert_data",
  auth,
  catchAsyncErrors(async (req, res, next) => {
    let resdata;
    if (req.method === "GET") {
      resdata = req.query;
    }
    if (req.method === "POST") {
      resdata = req.body;
    }
if(resdata.method === "insert"){

    const { data,collection_name,token } = resdata; 

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        message: "'data' must be a valid array.",
      });
    }
    if(!token){
        return res.status(400).json({
            success: false,
            message: "'data' must be a valid array.",
          });
    }
    if(!collection_name){
        return res.status(400).json({
            success: false,
            message: "'data' must be a valid array.",
          });
    }

      const collection = mongoose.connection.collection(collection_name);
if(!collection){
    return res.status(400).json({success:false,message:"no such collection exists"})
}
      const insertResult = await collection.insertMany(data);

      res.status(200).json({
        success: true,
        message: "Data successfully inserted.",
        // insertedCount: insertResult.insertedCount,
        // insertedIds: insertResult.insertedIds,
      });
      
}
else {
    return res.status(400).json({success:false,message:"Invalid Method"})
}
      
    }
  )
);

module.exports = router;
