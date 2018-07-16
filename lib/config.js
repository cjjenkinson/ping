/*
 * Create and export configuration variables
 *
 */

// Container for all environments
const environments = {};

// Staging (default) environment
environments.staging = {
	httpPort: 3000,
	httpsPort: 3001,
	envName: 'staging',
	secret: 'hash-secret',
};

// Production environment
environments.production = {
	httpPort: 5000,
	httpsPort: 5001,
	envName: 'production',
	secret: 'hash-secret',
};

// Determine which env to export from command-line args
const currentEnvironment = typeof process.env.NODE_ENV == 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that the current environment is one of the environments above, if not, default to staging
const environmentToExport =
	typeof environments[currentEnvironment] == 'object' ? environments[currentEnvironment] : environments.staging;

module.exports = environmentToExport;
