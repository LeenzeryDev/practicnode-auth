const express = require('express');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const adminRouter = require('./routes/admin');
const productRouter = require('./routes/product');

let app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }
}));

app.use('/', indexRouter);
app.use('/', productRouter);
app.use('/admin', adminRouter);

app.use((req, res, next) => {
    const user = req.session.user || null;
    res.status(404).render('error-404', { user });
});

app.listen(process.env.PORT || 3000, () => {})

module.exports = app;
