const db = require("../config/db");

const executeQuery = (query, params) => {
  return new Promise((resolve, reject) => {
    db.execute(query, params, (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
};

module.exports = { executeQuery };
