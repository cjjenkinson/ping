const config = {};

if (process.env.NODE_ENV === 'production') {
	config.httpPort = 5000;
	config.httpsPort = 5001;
	config.hashSecret = 'hash-secret-token';
	config.maxChecks = 5;
	config.twilio = {
		accountSid: 'ACb32d411ad7fe886aac54c665d25e5c5d',
		authToken: '9455e3eb3109edc12e3d8c92768f7a67',
		fromPhone: '+15005550006',
	};
} else {
	config.httpPort = 3000;
	config.httpsPort = 3001;
	config.hashSecret = 'hash-secret-token';
	config.maxChecks = 10;
	config.twilio = {
		accountSid: 'ACb32d411ad7fe886aac54c665d25e5c5d',
		authToken: '9455e3eb3109edc12e3d8c92768f7a67',
		fromPhone: '+15005550006',
	};
}

module.exports = config;
