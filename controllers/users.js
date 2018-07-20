// Dependencies
const { formatResponse, hashString, makeRandomString } = require('../lib/helpers');
const { handleErrors, ErrorStrings } = require('../lib/errors');
const { verifyToken } = require('../lib/authentication');
const dataService = require('../services/data');

// instantiate services
const userService = dataService('users');
const tokenService = dataService('tokens');

const createUser = async ctx => {
	const { body } = ctx.request;

	// Check that all required fills have been sent
	const firstName =
		typeof body.firstName == 'string' && body.firstName.trim().length > 0 ? body.firstName.trim() : false;
	const lastName = typeof body.lastName == 'string' && body.lastName.trim().length > 0 ? body.lastName.trim() : false;
	const phone = typeof body.phone == 'string' && body.phone.trim().length >= 10 ? body.phone.trim() : false;
	const password = typeof body.password == 'string' && body.password.trim().length > 0 ? body.password.trim() : false;
	const tosAgreement = typeof body.tosAgreement == 'boolean' && body.tosAgreement == true ? true : false;

	if (firstName && lastName && phone && password && tosAgreement) {
		try {
			const hashedPassword = hashString(password);
			const userData = { firstName, lastName, phone, password: hashedPassword, tosAgreement };

			await userService.create(phone, userData);
			delete userData.password;

			return formatResponse(ctx, [201, 'User created', userData]);
		} catch (err) {
			return handleErrors(ctx, err, 'User');
		}
	} else {
		return formatResponse(ctx, [400, ErrorStrings.missing_fields]);
	}
};

const getUser = async ctx => {
	const { queryStringObject, headers } = ctx.request;

	// Check phone number is valid
	const phone =
		typeof queryStringObject.phone == 'string' && queryStringObject.phone.trim().length >= 10
			? queryStringObject.phone.trim()
			: false;
	const token = typeof headers.token === 'string' && headers.token.length === 65 ? headers.token : false;

	if (phone && token) {
		try {
			// check if the token is valid
			await verifyToken(ctx, token, phone);

			const userData = await userService.read(phone);
			delete userData.password;

			return formatResponse(ctx, [200, 'User fetched', userData]);
		} catch (err) {
			return handleErrors(ctx, err, 'User');
		}
	} else if (!token) {
		return formatResponse(ctx, [403, ErrorStrings.unauthorised]);
	} else {
		return formatResponse(ctx, [400, ErrorStrings.missing_fields]);
	}
};

const updateUser = async ctx => {
	const { body, queryStringObject, headers } = ctx.request;

	// Check for required field
	const phone =
		typeof queryStringObject.phone == 'string' && queryStringObject.phone.trim().length >= 10
			? queryStringObject.phone.trim()
			: false;
	const token = typeof headers.token === 'string' && headers.token.length === 65 ? headers.token : false;

	// Check for optional fields
	const firstName =
		typeof body.firstName == 'string' && body.firstName.trim().length > 0 ? body.firstName.trim() : false;
	const lastName = typeof body.lastName == 'string' && body.lastName.trim().length > 0 ? body.lastName.trim() : false;
	const password = typeof body.password == 'string' && body.password.trim().length > 0 ? body.password.trim() : false;

	if (phone && token) {
		if (firstName || lastName || password) {
			try {
				// if the token is invalid, it will throw
				await verifyToken(ctx, token, phone);

				const userData = await userService.read(phone);

				userData.firstName = firstName || userData.firstName;
				userData.lastName = lastName || userData.lastName;
				userData.password = password ? hashString(password) : userData.password;

				await userService.update(phone, userData);
				delete userData.password;

				return formatResponse(ctx, [200, 'User data updated', userData]);
			} catch (err) {
				return handleErrors(ctx, err, 'User');
			}
		} else {
			return formatResponse(ctx, [400, 'Missing fields to update']);
		}
	} else if (!phone) {
		return formatResponse(ctx, [400, 'Phone is required']);
	} else if (!token) {
		return formatResponse(ctx, [400, ErrorStrings.unauthorised]);
	} else {
		return formatResponse(ctx, [400, ErrorStrings.missing_fields]);
	}
};

const deleteUser = async ctx => {
	const { queryStringObject, headers } = ctx.request;

	// Check for required field
	const phone =
		typeof queryStringObject.phone == 'string' && queryStringObject.phone.trim().length >= 10
			? queryStringObject.phone.trim()
			: false;
	const token = typeof headers.token === 'string' && headers.token.length === 65 ? headers.token : false;

	if (phone && token) {
		try {
			// if the token is invalid, it will throw
			await verifyToken(ctx, token, phone);

			// remove all tokens created by user
			const tokens = await tokenService.list();
			// get all tokens associated with the user
			const tokensData = await Promise.all(tokens.map(token => tokenService.read(token)));
			// filter and remove each token
			await Promise.all(
				tokensData.filter(token => token.phone === phone).map(({ id }) => tokenService.remove(id))
			);

			// delete the user
			await userService.remove(phone);

			return formatResponse(ctx, [200, 'User deleted succesfully']);
		} catch (err) {
			return handleErrors(ctx, err, 'User');
		}
	} else if (!token) {
		return formatResponse(ctx, [400, ErrorStrings.unauthorised]);
	} else {
		return formatResponse(ctx, [400, ErrorStrings.missing_fields]);
	}
};

module.exports = {
	post: createUser,
	get: getUser,
	put: updateUser,
	delete: deleteUser,
};
