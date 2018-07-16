/*
 * Library for storing and editing data
 *
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

// Container
const lib = {};

// Base directory
lib.baseDir = path.join(__dirname, '/../.data/');

// Write data to a file
lib.create = (dir, file, data, callback) => {
	// Open the file for writing
	const path = lib.baseDir + dir + '/' + file + '.json';

	return new Promise((resolve, reject) => {
		fs.open(path, 'wx', (err, fileDescriptor) => {
			if (!err && fileDescriptor) {
				// Convert data to string
				const stringData = JSON.stringify(data);

				fs.writeFile(fileDescriptor, stringData, err => {
					if (!err) {
						fs.close(fileDescriptor, err => {
							if (!err) {
								resolve(false);
							} else {
								reject('Error closing new file');
							}
						});
					} else {
						reject('Error writing to new file');
					}
				});
			} else {
				reject('Cound not create new file, it may already exist.');
			}
		});
	});
};

// Read data from a file
lib.read = (dir, file) => {
	const path = lib.baseDir + dir + '/' + file + '.json';

	return new Promise((resolve, reject) => {
		fs.readFile(path, 'utf8', (err, data) => {
			if (!err && data) {
				const parsedData = helpers.parseJSONtoObject(data);
				resolve(parsedData);
			} else {
				reject('Error reading file', err);
			}
		});
	});
};

// Update data inside a file
lib.update = (dir, file, data, callback) => {
	const path = lib.baseDir + dir + '/' + file + '.json';

	return new Promise((resolve, reject) => {
		fs.open(path, 'r+', (err, fileDescriptor) => {
			if (!err && fileDescriptor) {
				// Convert data to string
				const stringData = JSON.stringify(data);

				// Truncate the file
				fs.truncate(fileDescriptor, err => {
					if (!err) {
						// Write to the file and close it
						fs.writeFile(fileDescriptor, stringData, err => {
							if (!err) {
								fs.close(fileDescriptor, err => {
									if (!err) {
										resolve(false);
									} else {
										reject('Error closing new file');
									}
								});
							} else {
								reject('Error writing to new file');
							}
						});
					} else {
						reject('Error truncating file');
					}
				});
			} else {
				reject('Cound not open the file to update');
			}
		});
	});
};

lib.delete = (dir, file) => {
	// Unlink the file
	const path = lib.baseDir + dir + '/' + file + '.json';

	return new Promise((resolve, reject) => {
		fs.unlink(path, err => {
			if (!err) {
				resolve(false);
			} else {
				reject('Error deleting file', err);
			}
		});
	});
};

module.exports = lib;
