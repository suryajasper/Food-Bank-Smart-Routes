var admin = require('firebase-admin');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(express.static(__dirname + '/client'));
app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4002');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');
	next();
});
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 4002;

function replaceAll(orig, toReplace, replaceWith) {
  var replaced = orig.replace(toReplace, replaceWith);
  while (replaced.includes(toReplace)) {
    replaced = replaced.replace(toReplace, replaceWith);
  }
  return replaced;
}

function getCoordinates(address) {
  address = replaceAll(address, ' ', '+');
  var url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + address + '&key=AIzaSyB874rZyp7PmkKpMdfpbQfKXSSLEJwglvM';
  var unirest = require("unirest");
  var req = unirest("GET", url);
  return req;
}

var serviceAccount = require("/Users/suryajasper2004/Downloads/food-bank-smart-routes-service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://food-bank-smart.firebaseio.com"
});

var database = admin.database();
var userInfo = database.ref('userInfo');

io.on('connection', function(socket){
  socket.on('createUser', function(userID, _orgName) {
    userInfo.child(userID).update({orgName: _orgName});
  });
  socket.on('getCoordinates', function(address) {
    var req = getCoordinates(address);
    req.end(function(res) {
      if (res.error) {console.log(res.error);}
      else {
        socket.emit('coordinatesRes', res.body.results[0].geometry.location);
      }
    });
  });
});

http.listen(port, function(){
  console.log('listening on 127.0.0.1/' + port.toString());
});
