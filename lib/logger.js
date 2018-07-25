// Dependencies
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

// Promisfy file handling
const openFile = promisify(fs.open);
const closeFile = promisify(fs.close);
const writeFile = promisify(fs.writeFile);
const appendFile = promisify(fs.appendFile);
const readFile = promisify(fs.readFile);
const readDir = promisify(fs.readdir);
const deleteFile = promisify(fs.unlink);
const getStatus = promisify(fs.stat);
const makeDir = promisify(fs.mkdir);
const truncateFile = promisify(fs.truncate);

// Promisfy zlib
const gzip = promisify(zlib.gzip);
const unzip = promisify(zlib.unzip);

const logger = () => {
	const baseDir = path.join(__dirname, '../.logs');

	/**
	 *
	 * Logger methods:
	 * - append
	 * - list
	 * - compresse
	 * - decompress
	 * - truncate
	 * Errors: [EEXIST, EACCES, EISDIR]
	 */

	// Append a string to a file. Create the file if it does not exist
	const append = async (fileName, str) => {
		// open the file for appending
		const fileDescriptor = await openFile(`${baseDir}/${fileName}.log`, 'a');
		// Append the file
		await appendFile(fileDescriptor, str + '\n');
		// Close the file
		return closeFile(fileDescriptor);
	};

	// List all the logs, and optionally include the compressed logs
	const list = async includeCompressedLogs => {
		// read the directory 'Entity'
		const fileList = await readDir(baseDir);
		// remove the extension
		const fileNames = fileList.filter(file => {
			if (file.indexOf('.log') > -1) {
				return file.replace('.log', '');
			}

			if (file.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
				return file.replace('.gz.b64', '');
			}
		});

		return fileNames;
	};

	// Compress the contents of one .log file into a .gz.b64 file within the same directory
	const compress = async (logId, newFileId) => {
		const sourceFile = logId + '.log';
		const destFile = newFileId + '.gz.b64';

		// Read the source file
		const inputString = await readFile(`${baseDir}/${sourceFile}`);
		// Compress the data using gzip
		const buffer = await gzip(inputString);
		// Send the data to the destination file
		const fileDescriptor = await openFile(`${baseDir}/${destFile}`, 'wx');
		// Write to the destination file
		await writeFile(fileDescriptor, buffer.toString('base64'));
		// Close the file
		return await closeFile(fileDescriptor);
	};

	// Decompress the contents of a .gz file into a string variable
	const decompress = async fileId => {
		const fileName = fileId + '.gz.b64';

		const str = await readFile(`${baseDir}/${fileName}`);
		// Inflate the data
		const inputBuffer = Buffer.from(str, 'base64');
		const outputBuffer = await unzip(inputBuffer);
		return outputBuffer.toString();
	};

	// Truncate a log file
	const truncate = async logId => {
		return await truncateFile(`${baseDir}/${logId}.log`, 0);
	};

	return {
		append,
		list,
		compress,
		decompress,
		truncate,
	};
};

module.exports = logger;
