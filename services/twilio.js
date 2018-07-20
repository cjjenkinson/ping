const https = require('https');
const querystring = require('querystring');
const config = require('../config');

const StringDecoder = require('string_decoder').StringDecoder;
const decoder = new StringDecoder('utf-8');

const sendTwilioSms = (phone, msg) => {
	// Validate parameters
	phone = typeof phone == 'string' && phone.trim().length >= 10 ? phone.trim() : false;
	msg = typeof msg == 'string' && msg.trim().length > 0 && msg.trim().length <= 1600 ? msg.trim() : false;

	if (phone && msg) {
		// Configure the request payload
		const payload = {
			From: config.twilio.fromPhone,
			To: '+44' + phone,
			Body: msg,
		};

		const stringPayload = querystring.stringify(payload);

		// Configure the request details
		const params = {
			protocol: 'https:',
			hostname: 'api.twilio.com',
			method: 'POST',
			path: '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
			auth: config.twilio.accountSid + ':' + config.twilio.authToken,
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(stringPayload),
			},
		};

		return new Promise((resolve, reject) => {
			var req = https.request(params, res => {
				// Grab the status of the sent request
				const status = res.statusCode;

				let buffer = '';

				res.on('data', data => {
					buffer += decoder.write(data);
				});

				buffer += decoder.end();

				res.on('end', () => {
					buffer += decoder.end();

					if (status == 200 || status == 201) {
						resolve(buffer);
					} else {
						reject(buffer);
					}
				});
			});

			// on request error, reject
			req.on('error', function(e) {
				reject(e);
			});

			// Add the payload
			req.write(stringPayload);

			// End the request
			req.end();
		});
	} else {
		throw new Error('Given parameters were missing or invalid');
	}
};

module.exports = {
	sendTwilioSms,
};
