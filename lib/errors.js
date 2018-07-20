const { formatResponse } = require('./helpers');

const ErrorStrings = {
	permissions: 'Unauthorised permission access',
	unauthorised: 'Not authenticated',
	token_expired: 'Token has expired',
	invalid_token: 'invalid token id',
	database_corrupted: 'Database is corrupted',
	missing_fields: 'Required fields missing or they are invalid',
	maxchecks: 'The user already has the maximum number of checks',
};

const handleErrors = (ctx, err, entity = 'Entity') => {
	switch (err.code) {
		case 'EEXIST':
			return formatResponse(ctx, [400, `${entity} already exists`]);
		case 'EACCES':
			return formatResponse(ctx, [500, ErrorStrings.permissions]);
		case 'EISDIR':
			return formatResponse(ctx, [500, ErrorStrings.database_corrupted]);
		default:
			return formatResponse(ctx, [err.statusCode || 400, err.message]);
	}
};

module.exports = {
	ErrorStrings,
	handleErrors,
};
