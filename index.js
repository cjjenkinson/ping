/*
 * Primary file for the API
 *
 */

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const config = require('./lib/config');
const fs = require('fs');
const handlers = require('./lib/handlers');
const helpers = require('./lib/helpers');

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

// Server logic
const unifiedServer = (req, res) => {
	// get the URL and parse it
	const parsedUrl = url.parse(req.url, true);

	// get the path
	const path = parsedUrl.pathname;
	const trimmedPath = path.replace(/^\/+|\/+$/g, '');

	// get the query string as an object
	const queryStringObject = parsedUrl.query;

	// get the HTTP method
	const method = req.method.toLowerCase();

	// get the headers as an object
	const headers = req.headers;

	// get the payload, if any
	const decoder = new StringDecoder('utf-8');
	let buffer = '';

	req.on('data', data => {
		buffer += decoder.write(data);
	});

	req.on('end', () => {
		buffer += decoder.end();

		// Route request to handler
		const handler = typeof router[trimmedPath] !== 'undefined' ? router[trimmedPath] : handlers.notFound;

		const parsedBuffer = helpers.parseJSONtoObject(buffer);

		const data = {
			path: trimmedPath,
			query: queryStringObject,
			method: method,
			headers: headers,
			payload: parsedBuffer,
    };

		handler(data)
			.then(response => {
				let { statusCode, payload } = response;

				// use the status code called back by the handler or default to 200
				statusCode = typeof statusCode == 'number' ? statusCode : 200;

				// use the payload called back by the handler or default to empty object
				payload = typeof payload == 'object' ? payload : {};

				// convert the payload to a string
				const payloadString = JSON.stringify(payload);

				// return the response
				res.setHeader('Content-Type', 'application/json');
				res.writeHead(statusCode);
				res.end(payloadString);

				// log the path requested
				console.log('Returning response: ' + statusCode, payloadString);
			})
			.catch(err => {
				console.error(err);
    	});

	});
};

// Define a request router
const router = {
	ping: handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens
};
