// Dependencies
const { formatResponse, hashString, createRandomString } = require('../lib/helpers');
const { handleErrors, ErrorStrings } = require('../lib/errors');
const { verifyToken } = require('../lib/authentication');
const dataService = require('../services/data');
const config = require('../config');

// instantiate services
const userService = dataService('users');
const tokenService = dataService('tokens');
const checkService = dataService('checks');

const createCheck = async ctx => {
	const { body, headers } = ctx.request;

	const token = typeof headers.token === 'string' && headers.token.length === 65 ? headers.token : false;

	// Check that all required fills have been sent
	const protocol =
		typeof body.protocol == 'string' && ['https', 'http'].indexOf(body.protocol) > -1 ? body.protocol : false;
	const url = typeof body.url == 'string' && body.url.trim().length > 0 ? body.url.trim() : false;
	const method =
		typeof body.method == 'string' && ['post', 'get', 'put', 'delete'].indexOf(body.method) > -1
			? body.method
			: false;
	const successCodes =
		typeof body.successCodes == 'object' && body.successCodes instanceof Array && body.successCodes.length > 0
			? body.successCodes
			: false;
	const timeoutSeconds =
		typeof body.timeoutSeconds == 'number' &&
		body.timeoutSeconds % 1 === 0 &&
		body.timeoutSeconds >= 1 &&
		body.timeoutSeconds <= 5
			? body.timeoutSeconds
			: false;

	if (protocol && url && method && successCodes && timeoutSeconds) {
		try {
			// Check if the token is valid
			await verifyToken(ctx, token);

			const allChecks =
				ctx.user.checks instanceof Array && ctx.user.checks.length > 0 ? [...ctx.user.checks] : [];

			if (allChecks.length < config.maxChecks) {
				// Create the new ping check
				const checkId = createRandomString(24);

				const check = {
					id: checkId,
					createdAt: Date.now(),
					userId: ctx.user.phone,
					protocol,
					url,
					method,
					successCodes,
					timeoutSeconds,
				};

				// Save the check entity
				await checkService.create(checkId, check);

				// Update the user with the new check
				allChecks.push(checkId);
				ctx.user.checks = allChecks;
				await userService.update(ctx.user.phone, ctx.user);

				return formatResponse(ctx, [201, 'Check created', check]);
			} else {
				return formatResponse(ctx, [400, ErrorStrings.maxchecks]);
			}
		} catch (err) {
			return handleErrors(ctx, err, 'Check');
		}
	} else {
		return formatResponse(ctx, [400, ErrorStrings.missing_fields]);
	}
};

const getCheck = async ctx => {
	const { queryStringObject, headers } = ctx.request;

	// Check id number is valid
	const id =
		typeof queryStringObject.id == 'string' && queryStringObject.id.trim().length >= 10
			? queryStringObject.id.trim()
			: false;
	const token = typeof headers.token === 'string' && headers.token.length === 65 ? headers.token : false;

	if (id && token) {
		try {
			// check if the token is valid
			await verifyToken(ctx, token, id);

			const checkData = await checkService.read(id);

			return formatResponse(ctx, [200, 'Check fetched', checkData]);
		} catch (err) {
			return handleErrors(ctx, err, 'Check');
		}
	} else if (!token) {
		return formatResponse(ctx, [403, ErrorStrings.unauthorised]);
	} else {
		return formatResponse(ctx, [400, ErrorStrings.missing_fields]);
	}
};

const updateCheck = async ctx => {
	const { body, queryStringObject, headers } = ctx.request;

	// Check id number is valid
	const id =
		typeof queryStringObject.id == 'string' && queryStringObject.id.trim().length >= 10
			? queryStringObject.id.trim()
			: false;
	const token = typeof headers.token === 'string' && headers.token.length === 65 ? headers.token : false;

	// Check for optional fields
	const protocol =
		typeof body.protocol == 'string' && ['https', 'http'].indexOf(body.protocol) > -1 ? body.protocol : false;
	const url = typeof body.url == 'string' && body.url.trim().length > 0 ? body.url.trim() : false;
	const method =
		typeof body.method == 'string' && ['post', 'get', 'put', 'delete'].indexOf(body.method) > -1
			? body.method
			: false;
	const successCodes =
		typeof body.successCodes == 'object' && body.successCodes instanceof Array && body.successCodes.length > 0
			? body.successCodes
			: false;
	const timeoutSeconds =
		typeof body.timeoutSeconds == 'number' &&
		body.timeoutSeconds % 1 === 0 &&
		body.timeoutSeconds >= 1 &&
		body.timeoutSeconds <= 5
			? body.timeoutSeconds
			: false;

	if (id && token) {
		if (protocol || url || method || successCodes || timeoutSeconds) {
			try {
				// if the token is invalid, it will throw
				await verifyToken(ctx, token, id);

				const checkData = await checkService.read(id);

				checkData.protocol = protocol || checkData.protocol;
				checkData.url = url || checkData.url;
				checkData.method = method || checkData.method;
				checkData.successCodes = successCodes || checkData.successCodes;
				checkData.timeoutSeconds = timeoutSeconds || checkData.timeoutSeconds;

				await checkService.update(id, checkData);

				return formatResponse(ctx, [200, 'Check updated', checkData]);
			} catch (err) {
				return handleErrors(ctx, err, 'Check');
			}
		} else {
			return formatResponse(ctx, [400, 'Missing fields to update']);
		}
	} else if (!id) {
		return formatResponse(ctx, [400, 'id is required']);
	} else if (!token) {
		return formatResponse(ctx, [400, ErrorStrings.unauthorised]);
	} else {
		return formatResponse(ctx, [400, ErrorStrings.missing_fields]);
	}
};

const deleteCheck = async ctx => {
	const { queryStringObject, headers } = ctx.request;

	// Check for required field
	const id =
		typeof queryStringObject.id == 'string' && queryStringObject.id.trim().length >= 10
			? queryStringObject.id.trim()
			: false;
	const token = typeof headers.token === 'string' && headers.token.length === 65 ? headers.token : false;

	if (id && token) {
		try {
			// if the token is invalid, it will throw
			await verifyToken(ctx, token, id);

			// remove the deleted check from user checks
			const checkData = await checkService.read(id);

			if (ctx.user.checks.includes(id)) {
        const indexToDelete = ctx.user.checks.indexOf(id);
        // remove the check from users checks
        console.log(ctx.user.checks);
				// update the users checks
				await userService.update(ctx.user.phone, ctx.user);
			}

			// delete the check
			await checkService.remove(id);

			return formatResponse(ctx, [200, 'Check deleted succesfully']);
		} catch (err) {
			return handleErrors(ctx, err, 'Check');
		}
	} else if (!token) {
		return formatResponse(ctx, [400, ErrorStrings.unauthorised]);
	} else {
		return formatResponse(ctx, [400, ErrorStrings.missing_fields]);
	}
};

module.exports = {
	post: createCheck,
	get: getCheck,
	put: updateCheck,
	delete: deleteCheck,
};
