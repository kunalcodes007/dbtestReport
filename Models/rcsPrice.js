const mongoose = require("mongoose");
const { mongodb_authkey_0kb } = require("../config/mongoconnection");
const todayDateTime = require("../Utils/todayDateTime");
const rcsPriceSchema = new mongoose.Schema({
  user_id: {
    type: Number,
    required: [true, "Please enter user_id"],
  },
  country_code: {
    type: Number,
    required: [true, "Please enter country_code"],
  },
  is_active: {
    type: Number,
    required: [true, "Please enter is_active"],
  },
  is_frozen: {
    type: Number,
    required: [true, "Please enter is_frozen"],
  },
  bot_id: {
    type: String,
    required: [true, "Please enter bot_id"],
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
  updated_date: {
    type: String,
    default: todayDateTime(),
  },
  created_date: {
    type: String,
    default: todayDateTime(),
  },
});

const rcsPriceList = mongodb_authkey_0kb.model("user_rcs_pricelist", rcsPriceSchema,'user_rcs_pricelist');

module.exports = rcsPriceList;
