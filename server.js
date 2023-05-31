const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const multer = require('multer');

const app = express();
const port = 3000;


app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public/'));

const db = mysql.createConnection({
  host: 'localhost',
  user: 'ayub',
  password: '1',
  database: 'forum'
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to database!');
});

app.use(session({
  secret: 'mysecretkey',
  resave: false,
  saveUninitialized: false
}));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix);
  }
});

const upload = multer({ storage });

app.get('/', (req, res) => {
  const sql = 'SELECT * FROM posts ORDER BY created_at DESC';

   db.query(sql, (err, result) => {
  if (err) throw err;

  console.log (req.session)
  console.log (req.session.user)

   if (req.session.isLoggedIn === true) {
    console.log('logged in!')
    // User is logged in
    //next();
    res.render('index', { posts: result, isLoggedIn: req.session.loggedIn, user: req.session.user });

   } else {
    // User is not logged in
    console.log('not logged in')

    res.redirect('/login');
  }

  });
});



// Register function
app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // Hash the password using bcrypt
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Save the user to the database
  const sql = 'INSERT INTO users (username, password) VALUES (?,?)';
  db.query(sql, [username, hashedPassword], (err, result) => {
    if (err) throw err;

    res.redirect('/login');
  });
});

app.get('/login', (req, res) => {
  res.render('login', { errorMessage: null });
});


// login function
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Find user in database
  const sql = 'SELECT * FROM users WHERE username = ?';
  db.query(sql, [username], (err, result) => {
    if (err) throw err;

    if (result.length === 0) {
      res.render('login', { errorMessage: 'Username or password incorrect' });
      return;
    }

    // Check password
    const user = result[0];
    bcrypt.compare(password, user.password, (err, passwordMatch) => {
      if (err) throw err;

      if (!passwordMatch) {
        res.render('login', { errorMessage: 'Username or password incorrect' });
        return;
      }

      // Create session and redirect to home page
      req.session.isLoggedIn = true;
      req.session.user = username; // Set the username property of the session
      res.redirect('/');
    });
  });
});

//NEW POSTS
app.get('/newpost', (req, res) => {
  res.render('newpost');
});

app.post('/newpost', upload.single('image'), (req, res) => {
  const { title, body, author } = req.body;
  const imageFilename = req.file ? req.file.filename : null; // Get the uploaded image filename

  let imageUrl = null;
  if (req.file) {
    imageUrl = '/uploads/' + req.file.filename;
  }

  const sql = 'INSERT INTO posts (title, body, author, image_url) VALUES (?, ?, ?, ?)';
  db.query(sql, [title, body, author, imageFilename], (err, result) => {
    if (err) throw err;

    res.redirect('/');
  });
});


//LOGOUT
app.get("/logout", function (req, res) {
  req.session.destroy(function (err) {
    if (err) {
      throw err;
    } else {
      res.redirect("/login");
    }
  });
});

//comments code
app.get('/post/:id', (req, res) => {
  const postId = req.params.id;
  const postSql = 'SELECT * FROM posts WHERE id = ?';
  const commentsSql = 'SELECT * FROM comments WHERE post_id = ?';

  db.query(postSql, [postId], (err, postResult) => {
    if (err) throw err;

    const post = postResult[0];

    db.query(commentsSql, [postId], (err, commentsResult) => {
      if (err) throw err;

      const comments = commentsResult;

      post.comments = comments; // Add comments to the post object

      res.render('post', { post: post }); // Pass the post object to the template
    });
  });
});



app.post('/comment', (req, res) => {
  const { postId, author, content } = req.body;
  const sql = 'INSERT INTO comments (post_id, author, content) VALUES (?, ?, ?)';

  db.query(sql, [postId, author, content], (err, result) => {
    if (err) throw err;

    res.redirect(`/post/${postId}`);
  });
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${3000}`);
});