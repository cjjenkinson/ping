// Dependencies
const usersController = require('../controllers/users');
const tokensController = require('../controllers/tokens');
const checksController = require('../controllers/checks');

const validRequests = [
	{
		path: '',
		methods: ['get'],
	},
	{
		path: 'account/create',
		methods: ['get', 'post'],
	},
	{
		path: 'api/users',
		methods: ['get', 'post', 'put', 'delete'],
	},
	{
		path: 'api/tokens',
		methods: ['get', 'post', 'put', 'delete'],
	},
	{
		path: 'api/checks',
		methods: ['get', 'post', 'put', 'delete'],
	},
];

const controllers = {
	'api/users': usersController,
	'api/tokens': tokensController,
	'api/checks': checksController,
};

const isValidRequest = (path, method) => {
	return (
		validRequests.map(req => req.path).includes(path) &&
		validRequests.find(req => req.path === path).methods.includes(method)
	);
};

const isValidPath = path => validRequests.map(req => req.path).includes(path);

const router = {
	isValidRequest,
	isValidPath,
	...controllers,
};

module.exports = router;
