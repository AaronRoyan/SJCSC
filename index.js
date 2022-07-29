if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const mongoose = require('mongoose');
var bodyParser = require('body-parser');
var Razorpay = require('razorpay');
const express = require('express');
const EventUsers = require('./models/eventusers');
const bcrypt = require('bcrypt');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser'); // for reading and writing a cookie see line 51
const app = express();
const port = 8000;
const expressLayouts = require('express-ejs-layouts');
const db = require('./config/mongoose');
const blogRouter = require('./routes/blogs');
const Blog = require('./models/Blog');
const AdminUser = require('./models/adminusers');
// used for session cookie
const session = require('express-session');
const passport = require('passport');
const passportLocal = require('./config/passport-local-strategy');
const passportJWT = require('./config/passport-jwt-strategy');
const passportGoogle = require('./config/passport-google-oauth2-strategy');

const MongoStore = require('connect-mongo')(session);
const sassMiddleware = require('node-sass-middleware');
const flash = require('connect-flash');
const customMware = require('./config/middleware');

// setup the chat server to be used with socket.io and passed the app to it
const chatServer = require('http').Server(app);
const chatSockets = require('./config/chat_sockets').chatSockets(chatServer); //importing and listining in chatserver 5000
chatServer.listen(5000);
console.log('chat server is listening on port 5000');

// const initializePassport = require('./passport-config');
// initializePassport(
//   passport,
//   (email) => users.find((user) => user.email === email),
//   (id) => users.find((user) => user.id === id)
// );

let instance = new Razorpay({
  key_id: 'rzp_live_Ut87OjShlvJMzD', // your `KEY_ID`
  key_secret: '2jXlqylOFyFZMg7bJGPMl1ED', // your `KEY_SECRET`
});

app.use('/web', express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); //telling the app to use the cookie parser
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(
  sassMiddleware({
    src: './assets/scss',
    dest: './assets/css',
    debug: true,
    outputStyle: 'extended',
    prefix: '/css',
  })
);
app.use(express.urlencoded()); //  express.urlencoded() for POST and PUT requests, because in
// both these requests you are sending data (in the form of some data object) to the server
//and you are asking the server to accept or store that
// data (object), which is enclosed in the body (i.e. req.body) of that (POST or PUT) Request

app.use(cookieParser());

app.use(express.static('./assets'));
// make the uploads path available to the browser
app.use('/uploads', express.static(__dirname + '/uploads'));

app.use(expressLayouts);
// extract style and scripts from sub pages into the layout
app.set('layout extractStyles', true);
app.set('layout extractScripts', true);

// set up the view engine
app.set('view engine', 'ejs');
app.set('views', './views');

// mongo store is used to store the session cookie in the db
app.use(
  session({
    name: 'codeial',
    // TODO change the secret before deployment in production mode
    secret: 'blahsomething',
    saveUninitialized: false,
    resave: false,
    cookie: {
      maxAge: 1000 * 60 * 100,
    },
    store: new MongoStore(
      {
        mongooseConnection: db,
        autoRemove: 'disabled',
      },
      function (err) {
        console.log(err || 'connect-mongodb setup ok');
      }
    ),
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(passport.setAuthenticatedUser);

app.use(flash());
app.use(customMware.setFlash);

// use express router
app.use('/', require('./routes'));
app.get('/viewPost', async (req, res) => {
  let blogs = await Blog.find().sort({ timeCreated: 'desc' });
  res.render('viewpost', { blogs: blogs });
});
app.get('/post', checkAuthenticated, async (req, res) => {
  let blogs = await Blog.find().sort({ timeCreated: 'desc' });

  res.render('index', { blogs: blogs });
});

app.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('login.ejs');
});

app.post('/login', checkNotAuthenticated, async (req, res) => {
  AdminUser.findOne({ email: req.body.email }, async function (err, user) {
    if (err) {
      console.log('error in finding user in signing in');
      return;
    }
    // handle user found
    if (user) {
      // handle password which doesn't match
      if (user.password != req.body.password) {
        return res.redirect('back');
      }

      // handle session creation
      let blogs = await Blog.find().sort({ timeCreated: 'desc' });

      res.render('index', { blogs: blogs });
    } else {
      // handle user not found

      return res.redirect('back');
    }
  });
});

app.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('register.ejs');
});

app.post('/register', checkNotAuthenticated, async (req, res) => {
  try {
    AdminUser.findOne({ email: req.body.email }, function (err, user) {
      if (err) {
        console.log('error in  signing up');
        return;
      }
      if (!user) {
        AdminUser.create(req.body, function (err, user) {
          if (err) {
            console.log('error in creating user while signing up');
            return;
          }

          return res.redirect('/register');
        });
      }
    });
  } catch {
    res.redirect('/register');
  }
});
app.post('/event_sign_up', function (req, res) {
  var name = req.body.name;
  var email = req.body.email;
  var event = req.body.event;
  var phone = req.body.phone;

  var data = {
    name: name,
    email: email,
    event: event,
    phone: phone,
  };
  db.collection('EventUsers').insertOne(data, function (err, collection) {
    if (err) throw err;
    console.log('Record inserted Successfully');
  });

  return res.redirect('/web/payment.html');
});
app.post('/api/payment/order', (req, res) => {
  params = req.body;
  instance.orders
    .create(params)
    .then((data) => {
      res.send({ sub: data, status: 'success' });
    })
    .catch((error) => {
      res.send({ sub: error, status: 'failed' });
    });
});

app.post('/api/payment/verify', (req, res) => {
  body = req.body.razorpay_order_id + '|' + req.body.razorpay_payment_id;
  var crypto = require('crypto');
  var expectedSignature = crypto
    .createHmac('sha256', '2jXlqylOFyFZMg7bJGPMl1ED')
    .update(body.toString())
    .digest('hex');
  console.log('sig' + req.body.razorpay_signature);
  console.log('sig' + expectedSignature);
  var response = { status: 'failure' };
  if (expectedSignature === req.body.razorpay_signature)
    response = { status: 'success' };
  res.send(response);
});

app.post('/logout', (req, res) => {
  req.logOut();
  res.redirect('/login');
});

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect('/login');
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/');
  }
  next();
}

app.use(express.static('public'));
app.use('/blogs', blogRouter);

app.listen(port, function (err) {
  if (err) {
    console.log(`Error in running the server: ${err}`);
  }

  console.log(`Server is running on port: ${port}`);
});
