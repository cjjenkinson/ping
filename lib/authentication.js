const { formatResponse } = require('../lib/helpers');
const { handleErrors, ErrorStrings } = require('../lib/errors');
const dataService = require('../services/data');

const tokenService = dataService('tokens');
const userService = dataService('users');

const verifyToken = async (ctx, tokenId) => {
	const token = typeof tokenId === 'string' && tokenId.length === 65 ? tokenId : false;

	if (token) {
		try {
			const tokenData = await tokenService.read(token);
			const user = await userService.read(tokenData.phone);

			// Verify if the token hasn't expired yet
			if (tokenData.phone === user.phone && tokenData.expires > Date.now()) {
				// attach the user to the context
				if (user) {
					ctx.user = user;
        }
				return ctx;
			} else if (tokenData.phone !== user.phone) {
				return formatResponse(ctx, [403, ErrorStrings.unauthorised]);
			} else {
				return formatResponse(ctx, [403, ErrorStrings.token_expired]);
			}
		} catch (err) {
			switch (err.code) {
				case 'ENOENT':
					return formatResponse(ctx, [403, ErrorStrings.invalid_token]);
				case 'EACCES':
					return formatResponse(ctx, [500, ErrorStrings.permissions]);
				case 'EISDIR':
					return formatResponse(ctx, [500, ErrorStrings.database_corrupted]);
				default:
					return formatResponse(ctx, [err.statusCode || 400, err.message]);
			}
		}
	} else {
		throw new Error(ErrorStrings.unauthorised, 403);
	}
};

module.exports = {
	verifyToken,
};
