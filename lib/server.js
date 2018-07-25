const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');
const fs = require('fs');
const util = require('util');
const debug = util.debuglog('server');

const config = require('../config');
const router = require('./router');

const StringDecoder = require('string_decoder').StringDecoder;
const decoder = new StringDecoder('utf-8');

const server = {};

// Server logic
server.requestHandler = (req, res) => {
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
		const responseLog = `${method.toUpperCase()} ${response.statusCode} /${path} - ${process.hrtime(start)[1] /
			100000} ms`;
		if (response.statusCode === 200) {
			debug('\x1b[32m%s\x1b[0m', responseLog);
		} else {
			debug('\x1b[31m%s\x1b[0m', responseLog);
		}

		res.end(JSON.stringify(response));
	});
};

server.listen = () => {
	// instantiate the HTTP server
	const httpServer = http.createServer((req, res) => server.requestHandler(req, res));

	// start the HTTP server
	httpServer.listen(config.httpPort, () => {
		console.log('\x1b[36m%s\x1b[0m', `HTTP Server is listening on port ${config.httpPort}`);
	});

	// intantiate the HTTPs server
	const httpsServerOptions = {
		key: fs.readFileSync(path.join(__dirname + '/../https/key.pem')),
		cert: fs.readFileSync(path.join(__dirname + '/../https/cert.pem')),
	};

	const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
		server.requestHandler(req, res);
	});

	// start the HTTPs server
	httpsServer.listen(config.httpsPort, () => {
		console.log('\x1b[35m%s\x1b[0m', `HTTPs Server is listening on port ${config.httpsPort}`);
	});
};

module.exports = server;
