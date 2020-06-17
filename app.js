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
var adminInfo = database.ref('adminInfo');
var deliverInfo = database.ref('deliverInfo');

io.on('connection', function(socket){
  socket.on('createAdmin', function(userID, _email, _accountPassword) {
    adminInfo.child(userID).update({email: _email, accountPassword: _accountPassword});
  });
  socket.on('createDeliverer', function(userID, _email) {
    deliverInfo.child(userID).set({email: _email});
  })
  socket.on('bruhAmIAdminOrNot', function(userID) {
    adminInfo.once('value', function(snapshot) {
      socket.emit('youAreNotTheAdmin', Object.keys(snapshot.val()).includes(userID));
    })
  })
  socket.on('checkRegularUser', function(email, password) {
    adminInfo.once('value', function(snapshot) {
      var admins = snapshot.val();
      var isAdmin = false;
      for (var adminUser of Object.values(admins)) {
        if (email === adminUser.email) {
          isAdmin = true;
        }
      }
      var good = false;
      for (key of Object.keys(admins)) {
        if (admins[key].accountPassword === password && 'confirmedUsers' in admins[key] && admins[key].confirmedUsers.includes(email)) {
          good = true;
          break;
        }
      }
      socket.emit('userRegistered', good, isAdmin);
    })
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
  socket.on('getCoordinatesMult', function(addresses) {
    var unirest = require("unirest");
    var results = addresses.map(function(address) {
      return new Promise(function(resolve, reject) {
        var req = getCoordinates(address);
        req.end(function(res) {resolve(res); });
        return req;
      });
    });
    Promise.all(results).then(function(result) {
      var locations = [];
      var content = result.map(function(loc) {
        locations.push(loc.body.results[0].geometry.location);
        return loc.body;
      });
      socket.emit('coordinatesMultRes', locations);
    });
  });
  socket.on('addAddresses', function(userID, locs) {
    adminInfo.child(userID).child('patients').once('value', function(snapshot) {
      var update = {};
      if (snapshot.val() === null) {
        for (var i = 0; i < locs.length; i++) {
          update[i] = locs[i];
        } adminInfo.child(userID).child('patients').update(update);
      } else {
        for (var i = 0; i < locs.length; i++) {
          update[Object.keys(snapshot.val()).length+i] = locs[i];
        } adminInfo.child(userID).child('patients').update(update);
      }
    })
  });
  socket.on('addDeliveryPeople', function(userID, locs) {
    adminInfo.child(userID).child('confirmedUsers').once('value', function(snapshot) {
      var update = {};
      if (snapshot.val() === null) {
        for (var i = 0; i < locs.length; i++) {
          update[i] = locs[i];
        } adminInfo.child(userID).child('confirmedUsers').update(update);
      } else {
        for (var i = 0; i < locs.length; i++) {
          update[Object.keys(snapshot.val()).length+i] = locs[i];
        } adminInfo.child(userID).child('confirmedUsers').update(update);
      }
    })
  });
  socket.on('removeAllAddresses', function(userID) {
    adminInfo.child(userID).child('patients').remove();
  });
  socket.on('removeAllDeliveryPeople', function(userID) {
    adminInfo.child(userID).child('confirmedUsers').remove();
  })
  socket.on('getDeliverersInfo', function(userID) {
    adminInfo.child(userID).child('confirmedUsers').once('value', function(snapshot) {
      var emails = Object.values(snapshot.val());
      deliverInfo.once('value', function(delivererSnapshot) {
        del = delivererSnapshot.val();
        var toReturn = {};
        for (var email of emails) {
          var foundUser = false;
          for (var deliver of Object.values(del)) {
            if (deliverer.email == email) {
              foundUser = true;
              toReturn[email] = deliverer;
              break;
            }
          } if (!foundUser) {
            toReturn[email] = null;
          }
        }
        socket.emit('delivererInfoRes', toReturn);
      })
    })
  })

  socket.on('getDeliveries', function(userID) {
    deliverInfo.child(userID).once('value', function(snapshot) {
      if ('pending' in snapshot.val() && Object.keys(snapshot.val().pending).length > 0) {
        socket.emit('deliveryRes', snapshot.val().pending);
      } else if (!('location' in snapshot.val())) {
        socket.emit('deliveryRes', 'no address');
      } else {
        socket.emit('deliveryRes', null);
      }
    })
  })
  socket.on('confirmDeliveryAddress', function(userID, loc) {
    deliverInfo.child(userID).update({location: loc});
  })
});

http.listen(port, function(){
  console.log('listening on 127.0.0.1/' + port.toString());
});
