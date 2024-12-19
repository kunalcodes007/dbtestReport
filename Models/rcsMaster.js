const mongoose = require("mongoose");
const { mongodb_authkey_rcs } = require("../config/mongoconnection");
const todayDateTime = require("../Utils/todayDateTime");
const rcs_master_price_list = new mongoose.Schema({
    country_name: {
    type: String,
    required: [true, "Please enter country_name"],
  },
  country_code: {
    type: Number,
    required: [true, "Please enter country_code"],
  },
  a2p_single_sms_cost: {
    type: Number,
    required: [true, "Please enter a2p_single_sms_cost"],
  },
  a2p_conv_cost: {
    type: Number,
    required: [true, "Please enter a2p_conv_cost"],
  },
  p2a_conv_cost: {
    type: Number,
    required: [true, "Please enter p2a_conv_cost"],
  },
  basic_sms_cost: {
    type: Number,
    required: [true, "Please enter basic_sms_cost"],
  },
  updated: {
    type: String,
    default: todayDateTime(),
  },
  created: {
    type: String,
    default: todayDateTime(),
  },
});

const rcs_master_price = mongodb_authkey_rcs.model("rcs_master_price_list", rcs_master_price_list,'rcs_master_price_list');

module.exports = rcs_master_price;
