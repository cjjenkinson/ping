// Dependencies
const usersController = require('../controllers/users');
const tokensController = require('../controllers/tokens');
const checksController = require('../controllers/checks');

const validRequests = [
	{
		path: 'users',
		methods: ['get', 'post', 'put', 'delete'],
	},
	{
		path: 'tokens',
		methods: ['get', 'post', 'put', 'delete'],
	},
	{
		path: 'checks',
		methods: ['get', 'post', 'put', 'delete'],
	},
];

const controllers = {
	users: usersController,
	tokens: tokensController,
	checks: checksController,
};

const isValidRequest = (path, method) => {
	return (
		validRequests.map(req => req.path).includes(path) &&
		validRequests.find(req => req.path === path).methods.includes(method)
	);
};

const isValidPath = path => {};

const router = {
	isValidRequest,
	isValidPath,
	...controllers,
};

module.exports = router;
