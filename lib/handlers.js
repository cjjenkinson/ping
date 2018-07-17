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
			firstName: firstName,
			lastName: lastName,
			phone: phone,
			password: hashedPassword,
			tosAgreement: true,
		};

		// Store the user
		const response = _data
			.create('users', phone, userObject)
			.then(res => {
				return Promise.resolve({ statusCode: 201, payload: userObject });
			})
			.catch(err => {
				console.log(err);

				return Promise.resolve({
					statusCode: 400,
					payload: { Error: 'Could not create the new user, it may already exist' },
				});
			});

		return response;
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
		// Get token from headers
		const token = typeof data.headers.token == 'string' ? data.headers.token : false;

		return handlers._tokens.verifyToken(token, phone).then(tokenValidity => {
			if (tokenValidity) {
				const response = _data
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
							payload: { Error: err },
						});
					});
				return response;
			} else {
				return Promise.resolve({
					statusCode: 404,
					payload: { Error: 'Missing required token in header, or token is invalid' },
				});
			}
		});
	} else {
		return Promise.resolve({
			statusCode: 400,
			payload: { Error: 'Missing required fields' },
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
			// Get token from headers
			const token = typeof data.headers.token == 'string' ? data.headers.token : false;

			return handlers._tokens.verifyToken(token, phone).then(tokenValidity => {
				if (tokenValidity) {
					const response = _data
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
						.then(() => {
							return Promise.resolve({
								statusCode: 200,
								payload: {},
							});
						})
						.catch(err => {
							return Promise.resolve({
								statusCode: 400,
								payload: { Error: err },
							});
						});

					return response;
				} else {
					return Promise.resolve({
						statusCode: 404,
						payload: { Error: 'Missing required token in header, or token is invalid' },
					});
				}
			});
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
handlers._users.delete = (data) => {
	// Check phone number is valid
	const phone =
		typeof data.query.phone == 'string' && data.query.phone.trim().length >= 10 ? data.query.phone.trim() : false;

	if (phone) {
		// Get token from headers
		const token = typeof data.headers.token == 'string' ? data.headers.token : false;

		return handlers._tokens.verifyToken(token, phone).then(tokenValidity => {
			if (tokenValidity) {
				const response = _data
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
							payload: { Error: err },
						});
					});
				return response;
			} else {
				return Promise.resolve({
					statusCode: 404,
					payload: { Error: 'Missing required token in header, or token is invalid' },
				});
			}
		});
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
		return Promise.resolve(handlers._tokens[data.method](data));
	} else {
		return Promise.resolve({
			statusCode: 405,
			payload: { Error: 'There was a problem with your request' },
		});
	}
};

handlers._tokens = {};

// Tokens - post
// Required data: phone, password
handlers._tokens.post = data => {
	const phone =
		typeof data.payload.phone == 'string' && data.payload.phone.trim().length >= 10
			? data.payload.phone.trim()
			: false;
	const password =
		typeof data.payload.password == 'string' && data.payload.password.trim().length > 0
			? data.payload.password.trim()
			: false;

	if (phone && password) {
		// find the user from the phone identifier
		const response = _data
			.read('users', phone)
			.then(userData => {
				const hashedPassword = helpers.hash(password);

				if (hashedPassword == userData.password) {
					const tokenId = helpers.createRandomString(96);
					const expires = Date.now() + 1000 * 60 * 60;
					const token = {
						phone,
						id: tokenId,
						expires,
					};

					return token;
				} else {
					throw new Error("Password did not match the specified user's stored password");
				}
			})
			.then(token => {
				const { id } = token;

				_data.create('tokens', id, token);

				return Promise.resolve({
					statusCode: 200,
					payload: token,
				});
			})
			.catch(err => {
				console.log(err);

				return Promise.resolve({
					statusCode: 400,
					payload: { Error: err.message ? err.message : err },
				});
			});

		return response;
	} else {
		return Promise.resolve({
			statusCode: 400,
			payload: { Error: 'Missing required fields' },
		});
	}
};

// Tokens - get
handlers._tokens.get = data => {
	// Check id is valid
	const id = typeof data.query.id == 'string' && data.query.id.trim().length >= 72 ? data.query.id.trim() : false;

	if (id) {
		const response = _data
			.read('tokens', id)
			.then(token => {
				return Promise.resolve({
					statusCode: 200,
					payload: token,
				});
			})
			.catch(err => {
				console.log(err);

				return Promise.resolve({
					statusCode: 400,
					payload: { Error: err },
				});
			});

		return response;
	} else {
		return Promise.resolve({
			statusCode: 400,
			payload: { Error: 'Missing required field(s) or field(s) are invalid' },
		});
	}
};

// Tokens - put
handlers._tokens.put = data => {
	// Check fields are valid
	const id =
		typeof data.payload.id == 'string' && data.payload.id.trim().length >= 72 ? data.payload.id.trim() : false;
	const extend = typeof data.payload.extend == 'boolean' && data.payload.extend == true ? data.payload.extend : false;

	if (id && extend) {
		const response = _data
			.read('tokens', id)
			.then(token => {
				// Check token isn't already expired
				if (token.expires > Date.now()) {
					// Set the expiration an hour from now
					token.expires = Date.now() + 1000 * 60 * 60;

					return token;
				} else {
					throw new Error('The token has expired and cannot be extended');
				}
			})
			.then(updatedToken => _data.update('tokens', id, updatedToken))
			.then(res => {
				return Promise.resolve({
					statusCode: 200,
					payload: {},
				});
			})
			.catch(err => {
				console.log(err);

				return Promise.resolve({
					statusCode: 400,
					payload: { Error: err.message ? err.message : err },
				});
			});

		return response;
	} else {
		return Promise.resolve({
			statusCode: 400,
			payload: { Error: 'Missing required field(s) or field(s) are invalid' },
		});
	}
};

// Tokens - delete
handlers._tokens.delete = data => {
	// Check id is valid
	const id = typeof data.query.id == 'string' && data.query.id.trim().length >= 72 ? data.query.id.trim() : false;

	if (id) {
		const response = _data
			.delete('tokens', id)
			.then(token => {
				return Promise.resolve({
					statusCode: 200,
					payload: {},
				});
			})
			.catch(err => {
				return Promise.resolve({
					statusCode: 400,
					payload: { Error: err },
				});
			});

		return response;
	} else {
		return Promise.resolve({
			statusCode: 400,
			payload: { Error: 'Missing required field(s) or field(s) are invalid' },
		});
	}
};

// Verify if a given token is currently valid for the given user
handlers._tokens.verifyToken = (id, phone) => {
	return _data
		.read('tokens', id)
		.then(token => {
			if (token) {
				// Check that the token is for the given user and has not expired
				if (token.phone == phone && token.expires > Date.now()) {
					return true;
				} else {
					return false;
				}
			} else {
				return false;
			}
		})
		.catch(err => {
			console.log(err);
		});
};

// Ping handler
handlers.ping = data => {
	return Promise.resolve({ statusCode: 200, payload: { message: 'ping OK' } });
};

// Not found handler
handlers.notFound = data => {
	return Promise.resolve({ statusCode: 404, payload: {} });
};

module.exports = handlers;
