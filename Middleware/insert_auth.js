const ErrorHandler = require("../Utils/ErrorHandler");

const auth = async (req, res, next) => {
  try {
    const resdata = { ...req.query, ...req.body };

    if (!resdata.user_id ) {
      return next(new ErrorHandler("Missing User ID ", 400));
    }
    if(!resdata.token){
        return next(new ErrorHandler("Missing  Token", 400));

    }

    if (resdata.user_id !== "1" && resdata.token != "d83f806710653506") {
      return next(new ErrorHandler("can't execute", 400));
    }

  } catch (error) {
    console.error("Error in Auth Middleware:", error);
    return next(new ErrorHandler(error.message, 500));
  }
};

module.exports = auth;
