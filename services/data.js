// Dependencies
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// Promisfy file handling for the data service
const openFile = promisify(fs.open);
const closeFile = promisify(fs.close);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const readDir = promisify(fs.readdir);
const deleteFile = promisify(fs.unlink);
const getStatus = promisify(fs.stat);
const makeDir = promisify(fs.mkdir);

// Initialize data directory
const initialize = (baseDir, entity) => {
	return getStatus(`${baseDir}`)
		.catch(() => makeDir(`${baseDir}`))
		.then(() => getStatus(`${baseDir}/${entity}`))
		.catch(() => makeDir(`${baseDir}/${entity}`))
		.catch(() => {});
};

// create service wrapper to manipulate different entities
const dataService = entity => {
	// Throw an error if the entity is not a string or length == 0
	if (typeof entity !== 'string' || !entity.length) throw new Error('Invalid entity');

	const baseDir = path.join(__dirname, '../.data');

	const validateFileName = func => async (fileName, ...data) => {
		if (typeof fileName !== 'string' || !fileName.length) throw { code: 'CUSTOM', message: 'Invalid fileName' };

		return func(fileName, ...data);
	};

  initialize(baseDir, entity);

	/**
	 *
	 * Data service methods:
	 * - create
	 * - read
	 * - update
	 * - remove (delete)
	 * Service Errors: [EEXIST, EACCES, EISDIR]
	 */

	const create = async (fileName, data) => {
		// create the file
		const fileDescriptor = await openFile(`${baseDir}/${entity}/${fileName}.json`, 'wx');
		// write the data in JSON format
		await writeFile(fileDescriptor, JSON.stringify(data));
		// close the file
		return closeFile(fileDescriptor);
	};

	const read = async fileName => {
		// read the file
		const fileDescriptor = await openFile(`${baseDir}/${entity}/${fileName}.json`, 'r');
		// read the data
		const fileData = await readFile(fileDescriptor, 'utf8');
		// close the file
		await closeFile(fileDescriptor);
		// return the promise with the file data
		return JSON.parse(fileData);
	};

	const update = async (fileName, data) => {
		// read the file
		const fileDescriptor = await openFile(`${baseDir}/${entity}/${fileName}.json`, 'w');
		// write the data in JSON format
		await writeFile(fileDescriptor, JSON.stringify(data));
		// close the file
		return closeFile(fileDescriptor);
	};

	const remove = async fileName => deleteFile(`${baseDir}/${entity}/${fileName}.json`);

	const list = async () => {
		// read the directory 'Entity'
		const fileList = await readDir(`${baseDir}/${entity}`);
		// remove the extension
		return fileList.map(file => file.trim().replace(/(\..*)$/, ''));
	};

	return {
		create: validateFileName(create),
		read: validateFileName(read),
		update: validateFileName(update),
		remove: validateFileName(remove),
		list,
	};
};

module.exports = dataService;
