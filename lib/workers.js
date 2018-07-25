// Dependencies
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const url = require('url');
const util = require('util');
const debug = util.debuglog('workers');

const helpers = require('./helpers');
const dataService = require('../services/data');
const logger = require('./logger');
const { sendTwilioSms } = require('../services/twilio');

const checksService = dataService('checks');
const checkLogger = logger();

MonitoringWorker = () => {
	let _monitoringIntervalId;
	let _monitoringInterval = 1000 * 60; // 1 minute
	let _loggerIntervalId;
	let _loggerInterval = 1000 * 60 * 60 * 24; // 24 hours

	// Set the interval for checks to be monitored
	const monitorChecks = async () => {
		_monitoringintervalId = setInterval(() => {
			gatherAllChecks();
		}, _monitoringInterval);
	};

	const logsOnRotation = async () => {
		_loggerIntervalId = setInterval(() => {
			rotateLogs();
		}, _loggerInterval);
	};

	// Execute all the checks immediately
	const gatherAllChecks = async () => {
		try {
			const checks = await checksService.list();

			const checksData = await Promise.all(checks.map(check => checksService.read(check)));

			// Validate each check
			checksData.forEach(check => {
				validateCheckData(check);
			});
		} catch (err) {
			console.error(err);
		}
	};

	const validateCheckData = async check => {
		check = typeof check == 'object' && check !== null ? check : {};
		check.id = typeof check.id == 'string' && check.id.trim().length == 25 ? check.id.trim() : false;
		check.userId =
			typeof check.userId == 'string' && check.userId.trim().length >= 10 ? check.userId.trim() : false;
		check.protocol =
			typeof check.protocol == 'string' && ['http', 'https'].indexOf(check.protocol) > -1
				? check.protocol
				: false;
		check.url = typeof check.url == 'string' && check.url.trim().length > 0 ? check.url.trim() : false;
		check.method =
			typeof check.method == 'string' && ['post', 'get', 'put', 'delete'].indexOf(check.method) > -1
				? check.method
				: false;
		check.successCodes =
			typeof check.successCodes == 'object' &&
			check.successCodes instanceof Array &&
			check.successCodes.length > 0
				? check.successCodes
				: false;
		check.timeoutSeconds =
			typeof check.timeoutSeconds == 'number' &&
			check.timeoutSeconds % 1 === 0 &&
			check.timeoutSeconds >= 1 &&
			check.timeoutSeconds <= 5
				? check.timeoutSeconds
				: false;

		// Set the keys that may not be set (if the workers have never seen this check before)
		check.state = typeof check.state == 'string' && ['up', 'down'].indexOf(check.state) > -1 ? check.state : 'down';
		check.lastChecked = typeof check.lastChecked == 'number' && check.lastChecked > 0 ? check.lastChecked : false;

		// If all checks pass, pass the data along to the next step in the process
		if (
			check.id &&
			check.userId &&
			check.protocol &&
			check.url &&
			check.method &&
			check.successCodes &&
			check.timeoutSeconds
		) {
			try {
        await performCheck(check);

        debug(`Check complete for: ${check.id}`)
			} catch (err) {
				debug(err);
			}
		} else {
			// If checks fail, log the error and fail silently
			debug('Error: one of the checks is not properly formatted. Skipping.');
		}
	};

	const performCheck = check => {
		// Prepare the initial check outcome
		const checkOutcome = {
			error: false,
			responseCode: false,
		};

		// Mark that the outcome has not been sent yet
		let outcomeSent = false;

		// Parse the hostname and path out of the check url
		const parsedUrl = url.parse(`${check.protocol}://${check.url}}`, true);
		const hostname = parsedUrl.hostname;
		const path = parsedUrl.path; // Using path not pathname because we want the query string

		// Construct the request
		const params = {
			protocol: check.protocol + ':',
			hostname,
			method: check.method.toUpperCase(),
			path: '/',
			timeout: check.timeoutSeconds * 1000,
		};

		const _moduleToUse = check.protocol === 'http' ? http : https;

		return new Promise((resolve, reject) => {
			const req = _moduleToUse.request(params, res => {
				// Get the status of the request
				const status = res.statusCode;

				// Update the checkOutcome and pass the data
				checkOutcome.responseCode = status;

				if (!outcomeSent) {
					processCheckOutcome(check, checkOutcome);
					outcomeSent = true;
				}

				resolve();
			});

			// Bind to the error event
			req.on('error', err => {
				// Update the checkOutcome and pass the data along
				checkOutcome.error = { error: true, value: err };

				if (!outcomeSent) {
					processCheckOutcome(check, checkOutcome);
					outcomeSent = true;
				}

				reject(err);
			});

			// Bind to the timeout event
			req.on('timeout', () => {
				// Update the checkOutcome and pass the data along
				checkOutcome.error = { error: true, value: 'timeout' };

				if (!outcomeSent) {
					processCheckOutcome(check, checkOutcome);
					outcomeSent = true;
				}

				reject('The request timedout');
			});

			// End the request
			req.end();
		});
	};

	// Process the check outcome, update the check data as needed, trigger an alert if needed
	// Special logic for accomodating a check that has never been tested before
	const processCheckOutcome = async (check, checkOutcome) => {
		// Decide if the check is consiered up or down
		const state =
			!checkOutcome.error &&
			checkOutcome.responseCode &&
			check.successCodes.indexOf(checkOutcome.responseCode) > -1
				? 'up'
				: 'down';

		// Decide if an alert is required
		const alertRequired = check.lastChecked && check.state !== state ? true : false;

		// Log the check data and outcome details to its own file
		const timeOfCheck = Date.now();
		log(check, checkOutcome, state, alertRequired, timeOfCheck);

		// Update the check
		const updatedCheck = check;
		updatedCheck.state = state;
		updatedCheck.lastChecked = timeOfCheck;

		// Save the updates
		try {
			await checksService.update(updatedCheck.id, updatedCheck);

			if (alertRequired) {
				await alertUserToStatusChange(updatedCheck);
			} else {
				debug('Check outcome has not changed, no alert needed');
			}
		} catch (err) {
			debug(err);
		}
	};

	const alertUserToStatusChange = async check => {
		try {
			const msg = `Alert: Your check for
        ${check.method.toUpperCase()}${check.protocol}://${check.url} is currently ${check.state}`;

			debug('Sending alert: ', msg);
			// await sendTwilioSms(check.userId, msg);
		} catch (err) {
			debug(err);
		}
	};

	const log = async (check, checkOutcome, state, alertRequired, timeOfCheck) => {
		const logData = {
			check,
			checkOutcome,
			state,
			alertRequired,
			timeOfCheck,
		};

		// Determine the name of the log file
		const logFileName = logData.check.id;

		// Convert data to a string
		const logString = JSON.stringify(logData);

		try {
			// Append log to file
      await checkLogger.append(logFileName, logString);
      debug('Logging to file succeeded');
		} catch (err) {
			debug(`Logging to file failed: ${err.message}`);
		}
	};

	rotateLogs = async () => {
		// List all the (non compressed) log files
    const logs = await checkLogger.list(false);

		try {
			for (const log of logs) {
				const logId = log.replace('.log', '');
				const newFileId = `${logId}-${Date.now()}`;
				// Compress the data to a different file
				await checkLogger.compress(logId, newFileId);
				// Truncate the log
				await checkLogger.truncate(logId);
      }

      debug('Daily log files compressed');
		} catch (err) {
			debug(err);
		}
	};

	const stop = () => clearInterval(_intervalId);

	return {
		start: () => {
			// Send to console, in yellow
			console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');

			// Execute all the checks immediately
			gatherAllChecks();
			// Compress all the logs immediately
			rotateLogs();

			// Monitor checks every minute
			monitorChecks();
			// Call the compression loop every 24 hours
			logsOnRotation();
		},
		set interval(interval) {
			_monitoringInterval = interval;
		},
		get interval() {
			return _monitoringInterval;
		},
	};
};

module.exports = {
	MonitoringWorker,
};
