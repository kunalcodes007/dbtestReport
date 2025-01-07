const mongoose = require("mongoose");
const todayDateTime = require("../Utils/todayDateTime");
const { mongodb_authkey_0kb } = require('../config/mongoconnection');

const urlShortLinkSchema = new mongoose.Schema(
  {
    phone_number: { type: String, required: true },
    user_id: { type: Number, required: true },
    sender: { type: String, required: true },
    main_url: { type: String, required: true },
    short_url: { type: String, required: true },
    urlkey: { type: String, required: true },
    ip: { type: String },
    url_clickcount: { type: Number, default: 0 },
    url_city: { type: String },
    url_device: { type: String },
    camp_id: { type: String, required: true },
    submit_via: { type: String, required: true },
    country_code: { type: String, required: true },
    created: {
      type: String,
      // default: todayDateTime(),
    
    }},
  { collection: "url_short_link_withtrack_whatsapp" } 
);


module.exports = mongodb_authkey_0kb.model("url_short_link_withtrack_whatsapp", urlShortLinkSchema);
