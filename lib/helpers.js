const crypto = require('crypto');
const config = require('../config');

// Create a SHA256 hash
const hashString = str => {
	if (typeof str == 'string' && str.length > 0) {
		return crypto
			.createHmac('sha256', config.hashSecret)
			.update(str)
			.digest('hex');
	} else {
		return false;
	}
};

// Create a string of random alphanumeric characters
const createRandomString = strLength => {
	strLength = typeof strLength == 'number' && strLength > 0 ? strLength : 64;

	const chars = 'abcdefghiklmnopqrstuvwxyz0123456789';
	let randomStr = '';

	for (let i = 0; i <= strLength; i++) {
		let randomChar = chars[Math.floor(Math.random() * chars.length)];
		randomStr += randomChar;
	}

	return randomStr;
};

// Attach the response to the context
const formatResponse = (ctx, [statusCode, message = '', data = {}]) => {
	ctx.response = {
		statusCode,
		message,
		data,
	};

	return ctx;
};

module.exports = {
	hashString,
	createRandomString,
	formatResponse,
};
