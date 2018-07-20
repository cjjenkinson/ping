const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const config = require('./config');
const router = require('./lib/router');

const StringDecoder = require('string_decoder').StringDecoder;
const decoder = new StringDecoder('utf-8');

const { sendTwilioSms } = require('./services/twilio');
const sendMessage = async () => {
	try {
		const res = await sendTwilioSms('07950934843', 'Alert! test');
		console.log('RESPONSE FROM TWILIO', res);
	} catch (err) {
		console.log('ERROR RESPONSE FROM TWILIO', err);
	}
};
sendMessage();

// Server logic
const unifiedServer = (req, res) => {
  // instantiate the context
  const ctx = {};

	const start = process.hrtime();

	// get the URL and parse it
	const { pathname, query: queryStringObject } = url.parse(req.url, true);

	// get the path
	const path = pathname.replace(/^\/+|\/+$/g, '');

	// get the HTTP method
	const method = req.method.toLowerCase();

	// get the headers as an object
	const headers = req.headers;

	// get the payload, if any
	let buffer = '';

	req.on('data', data => {
		buffer += decoder.write(data);
	});

	req.on('end', async () => {
		buffer += decoder.end();

		const isValidRequest = router.isValidRequest(path, method);

		const controller = isValidRequest ? router[path] : false;

		ctx.request = {
			headers,
			method,
			queryStringObject,
			body: buffer ? JSON.parse(buffer) : {},
		};

		const { response } = controller
			? await controller[method](ctx)
			: {
					statusCode: router.isValidPath(path) ? 405 : 404,
					message: router.isValidPath(path) ? 'Method not allowed' : 'Not found',
			  };

		res.setHeader('Content-Type', 'application/json');
		res.writeHead(response.statusCode);

		// log the response
		console.log(method.toUpperCase(), path, response.statusCode, `${process.hrtime(start)[1] / 100000} ms`);

		res.end(JSON.stringify(response));
	});
};

// instantiate the HTTP server
const httpServer = http.createServer((req, res) => {
	unifiedServer(req, res);
});

// start the HTTP server
httpServer.listen(config.httpPort, () => {
	console.log(`HTTP Server is listening on port ${config.httpPort}`);
});

// intantiate the HTTPs server
const httpsServerOptions = {
	key: fs.readFileSync('./https/key.pem'),
	cert: fs.readFileSync('./https/cert.pem'),
};

const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
	unifiedServer(req, res);
});

// start the HTTPs server
httpsServer.listen(config.httpsPort, () => {
	console.log(`HTTPs Server is listening on port ${config.httpsPort}`);
});
