const db = require("../config/databaseconnection");
const ErrorHandler = require("../Utils/ErrorHandler");

const auth = async (req, res, next) => {
  try {
    const resdata = { ...req.query, ...req.body };

    if (!resdata.user_id || !resdata.token) {
      return next(new ErrorHandler("Missing User ID and Token", 400));
    }

    if (resdata.user_id !== "1") {
      return next(new ErrorHandler("This API is only for admin", 400));
    }

    const authData = await db(
      "SELECT token FROM db_authkey.tbl_users WHERE id = ?",
      ["1"]
    );

    if (!authData.length || authData[0].token !== resdata.token) {
      return next(new ErrorHandler("Authentication Failed", 401));
    }

    req.user = authData[0];
    next();
  } catch (error) {
    console.error("Error in Auth Middleware:", error);
    return next(new ErrorHandler(error.message, 500));
  }
};

module.exports = auth;
