// Dependencies
const { formatResponse, hashString, createRandomString } = require('../lib/helpers');
const { handleErrors, ErrorStrings } = require('../lib/errors');
const dataService = require('../services/data');

// instantiate services
const userService = dataService('users');
const tokenService = dataService('tokens');

const createToken = async ctx => {
	const { body } = ctx.request;

	// Check that all required fills have been sent
	const requestPhone = typeof body.phone === 'string' && body.phone.length > 0 ? body.phone : false;
	const requestPassword =
		typeof body.password === 'string' && body.password.length > 0 ? hashString(body.password) : false;

	if (requestPhone && requestPassword) {
		try {
			const { phone, password } = await userService.read(requestPhone);

			// Check hashed password in request matches hashed password stored
			if (phone === requestPhone && password === requestPassword) {
				// Create the new token
				const tokenId = createRandomString(64);

				const tokenData = {
					id: tokenId,
					phone,
					expires: Date.now() + 1000 * 60 * 60 * 24,
				};

				await tokenService.create(tokenId, tokenData);

				return formatResponse(ctx, [201, 'User authenticated', tokenData]);
			} else {
				return formatResponse(ctx, [201, 'Incorrect phone or password']);
			}
		} catch (err) {
			return handleErrors(ctx, err, 'Token');
		}
	} else {
		return formatResponse(ctx, [400, ErrorStrings.missing_fields]);
	}
};

const getToken = async (ctx) => {
  const { queryStringObject, headers } = ctx.request;

	const id =
		typeof queryStringObject.id === 'string' && queryStringObject.id.length === 16 ? queryStringObject.id : false;

	if (id) {
		try {
			const tokenData = await tokenService.read(id);

			return formatResponse(200, 'Token fetched', tokenData);
		} catch (err) {
			return handleErrors(ctx, err, 'Token');
		}
	} else {
		return formatResponse(400, 'Required fields missing or they were invalid');
	}
};

const updateToken = async (ctx) => {

  const { body, queryStringObject, headers } = ctx.request;

	const id =
		typeof queryStringObject.id === 'string' && typeof body.id === 'undefined' && queryStringObject.id.length === 16
			? queryStringObject.id
			: false;

	const expires = typeof body.expires === 'number' && body.expires.length > 0 ? body.expires : false;

	if (id & expires) {
		return formatResponse(200, 'User', { id, expires });
	} else {
		return formatResponse(400, 'Required fields missing or they were invalid');
	}
};

const deleteToken = async ({ queryStringObject }) => {
	const id =
		typeof queryStringObject.id === 'string' && typeof body.id === 'undefined' && queryStringObject.id.length === 16
			? queryStringObject.id
			: false;

	if (id) {
		try {
			await tokenService.remove(id);
		} catch (err) {
			return handleErrors(ctx, err, 'Token');
		}
		return formatResponse(200, 'Token deleted');
	} else {
		return formatResponse(400, 'Required fields missing or they were invalid');
	}
};

module.exports = {
	post: createToken,
	get: getToken,
	put: updateToken,
	delete: deleteToken,
};
