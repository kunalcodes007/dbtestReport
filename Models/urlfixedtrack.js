const mongoose = require("mongoose");
const url_list_fixed_track= new mongoose.Schema(
  {
    user_id: { type: Number, required: true },
    short_url: { type: String, required: true },
    main_url: { type: String, required: true },
    created: { type: String, required: true },
    ip: { type: String, required: true },
    url_city: { type: String, required: true },
    url_device: { type: String, required: true },
   channel: { type: String, required: true },

  },
  { collection: "url_list_fixed_track" }
);

module.exports = mongoose.model("url_list_fixed_track", url_list_fixed_track);
