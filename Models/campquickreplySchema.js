const mongoose = require("mongoose");

const tbl_whatsapp_btn_clickreports = new mongoose.Schema(
  {
    user_id: { type: Number, required: true },
    brand_number: { type: String, required: true },
    submit_via: { type: String, required: true },
    camp_id: { type: Number, required: true },
    mobile: { type: String, required: true },
    click_count: { type: Number, default: 0 },
    btn_name:{type:String,required:true},
    createdAt: {
      type: String,
    //   default: () => new Date().toISOString().slice(0, 19).replace("T", " "),
    required:true
    }},
  { collection: "tbl_whatsapp_btn_clickreports" } 
);

module.exports = mongoose.model("tbl_whatsapp_btn_clickreports", tbl_whatsapp_btn_clickreports);
