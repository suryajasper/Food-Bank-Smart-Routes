var admin = require('firebase-admin');
var express = require('express');
var bodyParser = require('body-parser');
var {promisify} = require('util');
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

var node_or_tools = require('node_or_tools');
var util = require('util');

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
var googleDrive_serviceAccount = require("/Users/suryajasper2004/Downloads/googledrivekey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://food-bank-smart.firebaseio.com"
});

async function writeToSheet(id, sol) {
	var doc = new GoogleSpreadsheet(id);
	await promisify(doc.useServiceAccountAuth)(googleDrive_serviceAccount);
	var info = await promisify(doc.getInfo)();
	var sheet = info.worksheets[0];

	for (var i = 0; i < sol.routes.length; i++) {
		var row = {time: sol.times[i].toString()};
		for (var j = 0; i < sol.routes[i].length; j++) {
			row['Dest ' + (j+1).toString()] = sol.routes[i][j];
		}
		await promisify(sheet.addRow)(row);
	}
}

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
    var req = getCoordinates(replaceAll(replaceAll(address, '#', ''), '/', ''));
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
        var req = getCoordinates(replaceAll(replaceAll(address, '#', ''), '/', ''));
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
    adminInfo.child(userID).child('confirmedUsers').update(locs);
  });
  socket.on('removeAllAddresses', function(userID) {
    adminInfo.child(userID).child('patients').remove();
  });
  socket.on('removeAllDeliveryPeople', function(userID) {
    adminInfo.child(userID).child('confirmedUsers').remove();
  })
  socket.on('getDeliverersInfo', function(userID) {
    adminInfo.child(userID).child('confirmedUsers').once('value', function(snapshot) {
			if (snapshot.val() !== null)
      	socket.emit('delivererInfoRes', Object.values(snapshot.val()));
    })
  })

  socket.on('confirmDeliveryAddress', function(userID, loc) {
    deliverInfo.child(userID).update({location: loc});
  })

  socket.on('getPatients', function(userID) {
    adminInfo.child(userID).child('patients').once('value', function(snapshot) {
      if (snapshot.val() !== null) {
        socket.emit('patientRes', Object.values(snapshot.val()));
      }
    })
  })

  socket.on('getDistanceMatrix', function(userID, start) {
    adminInfo.child(userID).child('patients').once('value', function(snapshot) {/*
      var patientAddresses = start.lat.toString() + ',' + start.lng.toString() + '|';

      for (var addressRaw of Object.values(snapshot.val())) {
        var address = addressRaw.coord;
        patientAddresses += address.lat.toString() + ',' + address.lng.toString() + '|';
      } patientAddresses = patientAddresses.substring(0, patientAddresses.length-1);

      var req = require('unirest')("GET", 'https://maps.googleapis.com/maps/api/distancematrix/json');
      req.query({
        'units': 'imperial',
        'key': 'AIzaSyB874rZyp7PmkKpMdfpbQfKXSSLEJwglvM',
        'origins': patientAddresses,
        'destinations': patientAddresses
      });
      req.end(function(res) {
        socket.emit('distanceMatrixRes', res.body);
      });*/
      var patientAddresses = start.lat.toString() + ',' + start.lng.toString() + ';';

			var formattedAddresses = [];
      for (var addressRaw of Object.values(snapshot.val())) {
				formattedAddresses.push(addressRaw.address);
        var address = addressRaw.coord;
        patientAddresses += address.lat.toString() + ',' + address.lng.toString() + ';';
      } patientAddresses = patientAddresses.substring(0, patientAddresses.length-1);

      var req = require('unirest')("GET", 'https://dev.virtualearth.net/REST/v1/Routes/DistanceMatrix');
      req.query({
        'units': 'imperial',
        'key': 'AuF1WYMy__BfekWEqNljvS73rPTAGrzzMslz4xQcQNh_8z8yq9EoeCMVVv5CVt7R',
        'origins': patientAddresses,
        'destinations': patientAddresses,
        'travelMode': 'driving'
      });
      req.end(function(res) {
				res.body.formattedAddresses = formattedAddresses;
        socket.emit('distanceMatrixRes', res.body);
      });
    });
  })

  socket.on('vrp', function(distanceMatrix, _options) {
		var req = require('unirest')("POST", 'http://35.239.86.72:4003/vrp');
		req.headers({'Accept': 'application/json', 'Content-Type': 'application/json'});
		var toSend = {matrix: distanceMatrix, options: _options};
		req.send(JSON.stringify(toSend));
		req.then((response) => {
	    console.log(response.body);
			writeToSheet(_options.spreadsheetid, response.body);
	  })
	});
});

http.listen(port, function(){
  console.log('listening on 127.0.0.1/' + port.toString());
});
