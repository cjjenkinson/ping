/*
 * Helpers for tasks
 *
 */

// Dependencies
const crypto = require('crypto');
const config = require('./config');

const helpers = {};

// Create a SHA256 hash
helpers.hash = (str) => {
  if (typeof str == 'string' && str.length > 0 ) {
    const hash = crypto.createHmac('sha256', config.secret).update(str).digest('hex');
    return hash
  } else {
    return false;
  }
};

// Parse a JSON string to an object in all cases, without throwing
helpers.parseJSONtoObject = (str) => {
  try {
    const obj = JSON.parse(str);
    return obj;
  } catch (err) {
    return {};
  }
}

// Create a string of random alphanumeric characters
helpers.createRandomString = (strLength) => {
  strLength = typeof(strLength) == 'number' && strLength > 0 ? strLength : 64;

  const chars = 'abcdefghiklmnopqrstuvwxyz0123456789';
  let randomStr = '';

  for (let i = 0; i <= strLength; i++) {
    let randomChar = chars[Math.floor(Math.random() * chars.length)]
    randomStr += randomChar
  }

  return randomStr;
}



module.exports = helpers;