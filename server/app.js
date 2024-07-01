const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const cors = require('cors');

const { usersRouter } = require('./routes/users.routes');
const { productsRouter } = require('./routes/products.routes');
const { cartRouter } = require('./routes/cart.routes');
const { purchaseRouter } = require('./routes/purchase.routes');

// Global err controller
const { globalErrorHandler } = require('./controllers/error.controller');

// Utils
const { AppError } = require('./utils/appError.util');

const app = express();

app.use(express.json()) 

// Limit the number of requests that can be accepted to our server
const limiter = rateLimit({
	max: 10000,
	windowMs: 60 * 60 * 1000, // 1 hr
	message: 'Number of requests have been exceeded',
});

app.use(limiter);

// Add security headers
app.use(helmet());

// Compress responses
app.use(compression());

if (process.env.NODE_ENV === 'development') {
	app.use(morgan('dev'));
}else{
	app.use(morgan('tiny'));
}

// Lista blanca de orígenes permitidos
const whitelist = ['https://smart-marked.netlify.app', 'http://localhost:3000'];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  }
};

app.use(cors(corsOptions));

app.use('/api/v1/users', usersRouter);
app.use('/api/v1/products', productsRouter); 
app.use('/api/v1/cart', cartRouter);
app.use('/api/v1/purchases', purchaseRouter);
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});
app.get('/', (req, res) => {
    res.status(200).send('OK');
});

//Handle incoming unknown routes to the server
app.all('*', (req, res, next) => {
	next(
		new AppError(
			`${req.method} ${req.originalUrl} not found in this server`,
			404
		)
	);
});

app.use(globalErrorHandler);

module.exports = { app };