// Dependencies
const server = require('./lib/server');
const { MonitoringWorker } = require('./lib/workers');

const app = {};

// Init
app.init = () => {
	// Start the server
	server.listen();

	// Start the workers
	const monitor = MonitoringWorker();

	monitor.start();
};

app.init();

module.exports = app;
