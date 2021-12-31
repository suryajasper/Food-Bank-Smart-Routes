const express = require('express');
const bodyParser = require('body-parser');

const app = express();

const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 4002;

app.use(express.static(__dirname + '/client', { extensions: ['html'] }));
app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4002');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');
	next();
});
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

http.listen(port, function(){
	console.log('listening on 127.0.0.1:' + port.toString());
});

module.exports = { app, io };
