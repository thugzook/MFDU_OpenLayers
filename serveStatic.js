//nodemon serveStatic.js

// How to create a hosted ftp server
/*const serveIndex = require('serve-index');
app.use('/geoJson', express.static('public/geoJson'), serveIndex('public/geoJson', {'icons' : true}));
app.listen(3000);*/

const cors = require('cors');
const express = require('express')
const allowedOrigins = ["http://localhost:1234", "http://localhost:8080"];

const app = express();
const port = 3000;

app.use(
  cors()
);

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.use(express.static('public'));

// enable CORS for localhost

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})