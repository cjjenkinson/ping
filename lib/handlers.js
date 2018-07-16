/*
 * Request handlers
 *
 */

//Dependencies
const _data = require('./data');
const helpers = require('./helpers');

// Define the route handlers
const handlers = {};

// Users
handlers.users = data => {
	const acceptableMethods = ['post', 'get', 'put', 'delete'];

	if (acceptableMethods.includes(data.method)) {
		return Promise.resolve(handlers._users[data.method](data));
	} else {
		return Promise.resolve({
			statusCode: 405,
			payload: { Error: 'There was a problem with your request' },
		});
	}
};

handlers._users = {};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
handlers._users.post = data => {
	// Check that all required fills have been sent
	const firstName =
		typeof data.payload.firstName == 'string' && data.payload.firstName.trim().length > 0
			? data.payload.firstName.trim()
			: false;
	const lastName =
		typeof data.payload.lastName == 'string' && data.payload.lastName.trim().length > 0
			? data.payload.lastName.trim()
			: false;
	const phone =
		typeof data.payload.phone == 'string' && data.payload.phone.trim().length >= 10
			? data.payload.phone.trim()
			: false;
	const password =
		typeof data.payload.password == 'string' && data.payload.password.trim().length > 0
			? data.payload.password.trim()
			: false;
	const tosAgreement =
		typeof data.payload.tosAgreement == 'boolean' && data.payload.tosAgreement == true ? true : false;

	if (firstName && lastName && phone && password && tosAgreement) {
		// Hash the password
		const hashedPassword = helpers.hash(password);

		// Create the user object
		const userObject = {
			fistName: firstName,
			lastName: lastName,
			phone: phone,
			password: hashedPassword,
			tosAgreement: true,
		};

		// Store the user
		const result = _data
			.create('users', phone, userObject)
			.then(res => {
				return Promise.resolve({ statusCode: 201, payload: userObject });
			})
			.catch(err => {
				return Promise.resolve({
					statusCode: 400,
					payload: { Error: 'Could not create the new user, it may already exist' },
				});
			});

		return result;
	} else {
		return Promise.resolve({ statusCode: 400, payload: { message: 'Missing required fields' } });
	}
};

// Users - get
// Required data: phone
handlers._users.get = data => {
	// Check phone number is valid
	const phone =
		typeof data.query.phone == 'string' && data.query.phone.trim().length >= 10 ? data.query.phone.trim() : false;

	if (phone) {
		const result = _data
			.read('users', phone)
			.then(user => {
				// Remove hashed password from user before returning it
				delete user.password;

				return Promise.resolve({
					statusCode: 200,
					payload: user,
				});
			})
			.catch(err => {
				console.log(err);

				return Promise.resolve({
					statusCode: 400,
					payload: {},
				});
			});

		return result;
	} else {
		return Promise.resolve({
			statusCode: 400,
			payload: { Error: 'Missing required fields ' },
		});
	}
};

// Users - put
handlers._users.put = data => {
	// Check for required field
	const phone =
		typeof data.payload.phone == 'string' && data.payload.phone.trim().length >= 10
			? data.payload.phone.trim()
			: false;

	// Check for optional fields
	const firstName =
		typeof data.payload.firstName == 'string' && data.payload.firstName.trim().length > 0
			? data.payload.firstName.trim()
			: false;
	const lastName =
		typeof data.payload.lastName == 'string' && data.payload.lastName.trim().length > 0
			? data.payload.lastName.trim()
			: false;
	const password =
		typeof data.payload.password == 'string' && data.payload.password.trim().length > 0
			? data.payload.password.trim()
			: false;

	if (phone) {
		if (firstName || lastName || password) {
			const result = _data
				.read('users', phone)
				.then(userData => {
					if (firstName) {
						userData.firstName = firstName;
					}

					if (lastName) {
						userData.lastName = lastName;
					}

					if (password) {
						userData.password = helpers.hash(password);
					}

					return userData;
				})
				.then(userData => _data.update('users', phone, userData))
				.then(res => {
					return Promise.resolve({
						statusCode: 200,
						payload: {},
					});
				})
				.catch(err => {
					return Promise.resolve({
						statusCode: 400,
						payload: { Error: 'Could not update the user' },
					});
				});

			return result;
		} else {
			// Error if nothing was sent to update
			return Promise.resolve({
				statusCode: 400,
				payload: { Error: 'Missing fields to update' },
			});
		}
	} else {
		return Promise.resolve({
			statusCode: 400,
			payload: { Error: 'Missing required fields ' },
		});
	}
};

// Users - delete
// Required data: phone
handlers._users.delete = (data, callback) => {
	// Check phone number is valid
	const phone =
		typeof data.query.phone == 'string' && data.query.phone.trim().length >= 10 ? data.query.phone.trim() : false;

	if (phone) {
		const result = _data
			.delete('users', phone)
			.then(user => {
				return Promise.resolve({
					statusCode: 200,
					payload: {},
				});
			})
			.catch(err => {
				return Promise.resolve({
					statusCode: 400,
					payload: { Error: 'Could not find the specified user' },
				});
			});

		return result;
	} else {
		return Promise.resolve({
			statusCode: 400,
			payload: { Error: 'Missing required fields ' },
		});
	}
};

// Tokens
handlers.tokens = data => {
	const acceptableMethods = ['post', 'get', 'put', 'delete'];

	if (acceptableMethods.includes(data.method)) {
		return Promise.resolve(handlers._users[data.method](data));
	} else {
		return Promise.resolve({
			statusCode: 405,
			payload: { Error: 'There was a problem with your request' },
		});
	}
};

handlers._tokens = {};

// Ping handler
handlers.ping = data => {
	return Promise.resolve({ statusCode: 200, payload: { message: 'ping OK' } });
};

// Not found handler
handlers.notFound = data => {
	return Promise.resolve({ statusCode: 404, payload: {} });
};

module.exports = handlers;
