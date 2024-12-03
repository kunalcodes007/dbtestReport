const mongoose = require("mongoose");
const url_list_fixed = new mongoose.Schema(
  {
    user_id: { type: Number, required: true },
    url: { type: String, required: true },
    key_value: { type: String, required: true },
    main_url: { type: String, required: true },
    created_date: { type: String, required: true },
    channel: { type: String, required: true },
    status: { type: Number, required: true },
  },
  { collection: "url_list_fixed" }
);

module.exports = mongoose.model("url_list_fixed", url_list_fixed);
