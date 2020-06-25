var admin = require('firebase-admin');
var express = require('express');
var bodyParser = require('body-parser');
var GoogleSpreadsheet = require('google-spreadsheet');
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

function maxLength(arr) {
  var max = 0;
    for (var subarr of arr) {
    if (subarr.length > max) {
      max = subarr.length;
    }
  }
  return max;
}

function distanceMatrix(locations1, locations2) {
	var patientAddresses = '';
	var patientAddresses2 = '';

	//var formattedAddresses = [];
	//formattedAddresses.push(addressRaw.address);
	for (var address of locations1) {
		patientAddresses += address.lat.toString() + ',' + address.lng.toString() + ';';
	} patientAddresses = patientAddresses.substring(0, patientAddresses.length-1);
	for (var address of locations2) {
		patientAddresses2 += address.lat.toString() + ',' + address.lng.toString() + ';';
	} patientAddresses2 = patientAddresses2.substring(0, patientAddresses2.length-1);

	var req = require('unirest')("GET", 'https://dev.virtualearth.net/REST/v1/Routes/DistanceMatrix');
	req.query({
		'units': 'imperial',
		'key': 'AuF1WYMy__BfekWEqNljvS73rPTAGrzzMslz4xQcQNh_8z8yq9EoeCMVVv5CVt7R',
		'origins': patientAddresses,
		'destinations': patientAddresses2,
		'travelMode': 'driving'
	});

	return req;
	/*req.end(function(res) {
		res.body.formattedAddresses = formattedAddresses;
		socket.emit('distanceMatrixRes', res.body);
	});*/
}

async function writeToSheet(id, sol) {
	var doc = new GoogleSpreadsheet(id);
	await promisify(doc.useServiceAccountAuth)(googleDrive_serviceAccount);
	var _headers = ['Time'];
	for (var i = 0; i < maxLength(sol.routes); i++) {
		_headers.push('Destination ' + (i+1).toString());
	}

	doc.addWorksheet({headers: _headers}, async function(addWorksheetErr, newSheet) {
	  if (addWorksheetErr) console.error(addWorksheetErr);
	  else {
			for (var i = 0; i < sol.routes.length; i++) {
				var row = {Time: sol.times[i].toString()};
				for (var j = 0; j < sol.routes[i].length; j++) {
					row['Destination ' + (j+1).toString()] = sol.routes[i][j];
				}
				await promisify(newSheet.addRow)(row);
			}
	  }
	});
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
	var reportError = function(msg) {
		socket.emit('reporterror', msg);
	}
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
			var _addresses = [];
			var s = null;
			var ind = -1;
      var content = result.map(function(loc) {
				ind++;
				if (loc.error) {
					reportError('"' + addresses[ind] + '" is badly formatted and was not added. Please try again.');
					return null;
				} else {
					if (s === null) {
						s = loc.body.results[0];
					}
					locations.push(loc.body.results[0].geometry.location);
					_addresses.push(addresses[ind]);
	        return loc.body;
				}
      });
      socket.emit('coordinatesMultRes', locations, _addresses);
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
				var offset = Object.keys(snapshot.val()).length;
        for (var i = 0; i < locs.length; i++) {
          update[offset+i] = locs[i];
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
    adminInfo.child(userID).child('patients').on('value', function(snapshot) {
      if (snapshot.val() !== null) {
        socket.emit('patientRes', snapshot.val());
      }
    })
  })

  socket.on('getDistanceMatrix', function(userID, start) {
    adminInfo.child(userID).child('patients').once('value', function(snapshot) {
			var locations = Object.values(snapshot.val());
			var formattedAddresses = [];
			for (var loc of locations) {
				formattedAddresses.push(loc.address);
			}
			for (var i = 0; i < locations.length; i++) {
				locations[i] = locations[i].coord;
			}
			locations.unshift(start);

			if (locations.length > 25) {
				// get pairs
				var pairs = [];
				for (var i = 0; i < locations.length; i+= 25) {
					var firstPart = locations.slice(i, i+25);
					for (var j = 0; j < locations.length; j+= 25) {
						var secondPart = locations.slice(j, j+25);
						pairs.push([firstPart, secondPart]);
					}
				}

				var results = pairs.map(function(loc) {
					return new Promise(function(resolve, reject) {
						var req = distanceMatrix(loc[0], loc[1]);
						req.end(function(res) {resolve(res); });
						return req;
					});
				});
				Promise.all(results).then(function(result) {
					console.log('started');
					var times = [];
					for (var i = 0; i < locations.length; i++) {
						times.push([]);
					}
					var curr = 0;
					var howMany = 0;
					var content = result.map(function(submatrix) {
						var infos = submatrix.body.resourceSets[0].resources[0].results;
						for (var destination of infos) {
	            times[destination.originIndex+curr].push(parseFloat(destination.travelDuration));
		        } howMany++;
						if (howMany === Math.ceil(locations.length/25)) {
							howMany = 0;
							curr += 25;
						}
						return submatrix.body;
					});
					console.log('returned');
					times[0][0] = 0;
					socket.emit('distanceMatrixRes', {times: times, formattedAddresses: formattedAddresses});
				});
			}

			else {
				var req = distanceMatrix(locations, locations);
				req.end(function(res) {
					var times = {};
					for (var destination of res.body.resourceSets[0].resources[0].results) {
	          if (destination.originIndex in times) {
	            times[destination.originIndex].push(parseFloat(destination.travelDuration));
	          } else {
	            times[destination.originIndex] = [parseFloat(destination.travelDuration)];
	          }
	        } times = Object.values(times);
					socket.emit('distanceMatrixRes', {times: times, formattedAddresses: formattedAddresses});
				})
			}
    });
  })

  socket.on('vrp', function(distanceMatrix, _options) {
		var req = require('unirest')("POST", 'http://35.239.86.72:4003/vrp');
		req.headers({'Accept': 'application/json', 'Content-Type': 'application/json'});
		var toSend = {matrix: distanceMatrix, options: _options};
		req.send(JSON.stringify(toSend));
		req.then((response) => {
			if ('error' in response.body) {
				console.log(response.body.error);
			}
			writeToSheet(_options.spreadsheetid, response.body);
	  })
	});
});

http.listen(port, function(){
  console.log('listening on 127.0.0.1/' + port.toString());
});
