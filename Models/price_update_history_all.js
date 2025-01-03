const mongoose = require("mongoose");
const { mongodb_authkey } = require("../config/mongoconnection");
const todayDateTime = require("../Utils/todayDateTime");
const historySchema = new mongoose.Schema({
    channel: {
    type: String,
    required: [true, "Please enter channel"],
  },
  action: {
    type: String,
    required: [true, "Please enter action"],
  },
  country_code: {
    type: Number,
    required: [true, "Please enter country_code"],
  },
  user_id: {
    type: Number,
    required: [true, "Please enter user_id"],
  },
  sms_cost: {
    type: Number,
  
  },
  a2p_single_sms_cost: {
    type: Number,
  },
  a2p_conv_cost: {
    type: Number,

  },
  p2a_conv_cost: {
    type: Number,
 
  },
 basic_sms_cost: {
    type: Number,
   
  },
  sms_cost:{
    type:Number,
  
  },
  voice_cost:{
  type:Number
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

const HistorySchema = mongodb_authkey.model("price_update_history_all", historySchema,'price_update_history_all');

module.exports = HistorySchema;
