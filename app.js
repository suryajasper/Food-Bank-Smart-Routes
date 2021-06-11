var admin = require('firebase-admin');
var express = require('express');
var colorGen = require('iwanthue');
var bodyParser = require('body-parser');
var GoogleSpreadsheet = require('google-spreadsheet');
var {promisify} = require('util');
var app = express();
app.use(express.static(__dirname + '/client', { extensions: ['html'] }));
app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4002');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');
	next();
});
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 4002;

//var node_or_tools = require('node_or_tools');
var util = require('util');

const TerminalColors = {
	BLACK : "\x1b[30m%s\x1b[0m",
	RED : "\x1b[31m%s\x1b[0m",
	GREEN : "\x1b[32m%s\x1b[0m",
	YELLOW : "\x1b[33m%s\x1b[0m",
	BLUE : "\x1b[34m%s\x1b[0m",
	MAGENTA : "\x1b[35m%s\x1b[0m",
	CYAN : "\x1b[36m%s\x1b[0m",
	WHITE : "\x1b[37m%s\x1b[0m"
} // ex: console.log(TerminalColors.RED, 'error');

Object.freeze(TerminalColors);

String.prototype.replaceAll = function(toReplace, replaceWith) {
  var replaced = this.replace(toReplace, replaceWith);
  while (replaced.includes(toReplace)) {
    replaced = replaced.replace(toReplace, replaceWith);
  }
  return replaced;
}

function replaceAll(orig, toReplace, replaceWith) {
  var replaced = orig.replace(toReplace, replaceWith);
  while (replaced.includes(toReplace)) {
    replaced = replaced.replace(toReplace, replaceWith);
  }
  return replaced;
}

function getCoordinates(address) {
  address = replaceAll(address, ' ', '%20');
  // var url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + address + '&key=AIzaSyB874rZyp7PmkKpMdfpbQfKXSSLEJwglvM';
  var url = `http://dev.virtualearth.net/REST/v1/Locations/${address}?o=json&key=AlAZE9FEAcWr3KEvVmUQOgkd_W5OteguhMDuq2mKbrkni9WHwvnGVks1EPzy68sw&maxResults=1`;
  var unirest = require("unirest");
  var req = unirest("GET", url);
  return req;
}

function getCoordinatesGoogle(address) {
  address = replaceAll(address, ' ', '+');
  var url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + address + '&key=AIzaSyB874rZyp7PmkKpMdfpbQfKXSSLEJwglvM';
  // var url = `http://dev.virtualearth.net/REST/v1/Locations/${address}?o=json&key=AlAZE9FEAcWr3KEvVmUQOgkd_W5OteguhMDuq2mKbrkni9WHwvnGVks1EPzy68sw`;
  var unirest = require("unirest");
  var req = unirest("GET", url);
  return req;
}

var serviceAccount = require("../secret/food-bank-smart-routes-service-account.json");
var googleDrive_serviceAccount = require("../secret/googledrivekey.json");
const { Console } = require('console');

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

function getIndividualTimes(_routes, addresses, matrix) {
	var routes = [];
	for (var i = 0; i < _routes.length; i++)
	  routes[i] = _routes[i].slice();
	for (var i = 0; i < routes.length; i++) {
		if (routes[i].length > 1) {
			for (var j = 0; j < routes[i].length-1; j++) {
				routes[i][j] = matrix[addresses.indexOf(routes[i][j])][addresses.indexOf(routes[i][j+1])];
			}
		}
		routes[i].pop();
	}
	return routes;
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
		'key': 'AlAZE9FEAcWr3KEvVmUQOgkd_W5OteguhMDuq2mKbrkni9WHwvnGVks1EPzy68sw',
		'origins': patientAddresses,
		'destinations': patientAddresses2,
		'travelMode': 'driving'
	});

	return req;
}

async function writeToSheet(id, sol, shouldGenerateTravelTimes) {
	var doc = new GoogleSpreadsheet(id);
	await promisify(doc.useServiceAccountAuth)(googleDrive_serviceAccount);
	var _headers = ['Time'];

	let maxDest = maxLength(sol.routes);

	for (var i = 0; i < maxDest; i++) {
		_headers.push(`Destination ${i+1}`);
		if (shouldGenerateTravelTimes) {
			_headers.push(`Travel Time ${i+1}-${i+2}`);
		}
	}
	_headers.push('Dropped');

	var droppedTracker = 0;

	var indTimes = getIndividualTimes(sol.routes, sol.addresses, sol.matrix);
	doc.addWorksheet({headers: _headers}, async function(addWorksheetErr, newSheet) {
	  if (addWorksheetErr) console.error(addWorksheetErr);
	  else {
			for (var i = 0; i < sol.routes.length; i++) {
				var row = {Time: sol.times[i].toString()};

				for (var j = 0; j < sol.routes[i].length; j++)
					row[`Destination ${j+1}`] = sol.routes[i][j].trim();
				
				if (shouldGenerateTravelTimes)
					for (var j = 0; j < indTimes[i].length; j++)
						row[`Travel Time ${j+1}-${j+2}`] = indTimes[i][j];
				
				if (droppedTracker < sol.dropped.length)
					row['Dropped'] = sol.dropped[droppedTracker];
				
				droppedTracker++;
				await promisify(newSheet.addRow)(row);
			}
	  }
	});
}

var database = admin.database();
var adminInfo = database.ref('adminInfo');
var deliverInfo = database.ref('deliverInfo');
var lastCalc = database.ref('lastCalc');
var matrixSave = database.ref('matrix');

io.on('connection', function(socket){
	socket.on('updateDatabase', function(path, data) {
		var curr = database.ref(path[0]);
		for (var i = 1; i < path.length; i++) {
			curr = curr.child(path[i]);
		}
		curr.update(data);
	})
	socket.on('setDatabase', function(path, data) {
		var curr = database.ref(path[0]);
		for (var i = 1; i < path.length; i++) {
			curr = curr.child(path[i]);
		}
		curr.set(data);
	})
	socket.on('getDatabase', function(path) {
		var curr = database.ref(path[0]);
		for (var i = 1; i < path.length; i++) {
			curr = curr.child(path[i]);
		}
		curr.on('value', function(snap) {
			if (snap.val()) {
				socket.emit('getDatabaseSuccess', snap.val());
			}
		});
	})

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
    var req = getCoordinatesGoogle(replaceAll(replaceAll(address, '#', ''), '/', ''));
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
		console.log('--RECEIVED coordinates mult: ' + addresses.length.toString() + ' addresses');

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
      var failedAddresses = [];
      var confidences = {};
			var s = null;
			var ind = -1;
      result.map(function(loc) {
				ind++;
				if (loc.error || loc.body.resourceSets[0].estimatedTotal === 0) {
          failedAddresses.push(addresses[ind]);
					return null;
				} else {
          var geocodeRes = loc.body.resourceSets[0].resources[0];
          if (!confidences[geocodeRes.confidence]) {
            confidences[geocodeRes.confidence] = 0;
          } confidences[geocodeRes.confidence]++;
					if (s === null) {
						s = geocodeRes;
					}
					locations.push({
            lat: geocodeRes.point.coordinates[0],
            lng: geocodeRes.point.coordinates[1]
          });
					_addresses.push(addresses[ind]);
	        return loc.body;
				}
			});
      console.log('confidence', confidences);
      if (failedAddresses.length == 0) {
        console.log(TerminalColors.GREEN, '--API coordinates mult Success');
        socket.emit('coordinatesMultRes', locations, _addresses);
        console.log('--SEND coordinates mult: ' + locations.length.toString() + ' locations and ' + _addresses.length.toString() + ' addresses');
      } else {
        console.log(TerminalColors.YELLOW, `--API coordinates mult Bing API Failed ${_addresses.length}/${addresses.length} returned. Trying Google API`);
        var googleResults = failedAddresses.map(function(address) {
          return new Promise(function(resolve, reject) {
            var req = getCoordinatesGoogle(replaceAll(replaceAll(address, '#', ''), '/', ''));
            req.end(function(res) {resolve(res); });
            return req;
          });
        });
        Promise.all(googleResults).then(function(gresult) {
					ind = -1;
          let failedAddressesGoogle = [];
          gresult.map(function(loc) {
            ind++;
            if (loc.error || loc.body.status === 'ZERO_RESULTS') {
              failedAddressesGoogle.push(failedAddresses[ind]);
              return null;
            } else {
              locations.push(loc.body.results[0].geometry.location);
              _addresses.push(failedAddresses[ind]);
              return loc.body;
            }
          });
          if (failedAddressesGoogle.length == 0) {
            console.log(TerminalColors.GREEN, '--API coordinates mult Success Google API');
            console.log('--SEND coordinates mult: ' + locations.length.toString() + ' locations and ' + _addresses.length.toString() + ' addresses');
          } else {
            console.log(TerminalColors.RED, `--API coordinates mult Failed Google API ${_addresses.length}/${addresses.length} returned`);
            socket.emit('displayMessageInPopup', `could not get the following addresses: ${failedAddressesGoogle.join('\n')}`);
          }
          socket.emit('coordinatesMultRes', locations, _addresses);
        });
      }
    });
  });
  socket.on('addAddresses', function(userID, locs, type) {
		if (!type) type = 'patients';
		console.log('--RECEIVED patient addresses: ' + locs.length.toString() + ' locations');
    adminInfo.child(userID).child(type).once('value', function(snapshot) {
			var update = {};
      if (snapshot.val() === null) {
				for (var i = 0; i < locs.length; i++)
					update[i] = locs[i];
      } else {
				var offset = Object.keys(snapshot.val()).length;
        for (var i = 0; i < locs.length; i++)
					update[offset+i] = locs[i];
			}
			adminInfo.child(userID).child(type).update(update).then(function() {
				console.log(TerminalColors.GREEN, '--UPDATE_DATABASE ' + type + ' addresses SUCCESS');
				socket.emit('addAddressesSuccess');
			}).catch(function(error) {
				console.log(TerminalColors.RED, '--UPDATE_DATABASE ' + type + ' addresses FAILED');
			});
    })
  });

  socket.on('updateAddress', function(userID, type, addressOld, update) {
    var typeRef = adminInfo.child(userID).child(type);
    typeRef.once('value', function(snapshot) {
      var objs = snapshot.val();
      for (var key of Object.keys(objs)) {
        if (objs[key].address == addressOld) {
          typeRef.child(key).update(update);
          break;
        }
      }
    })
  });

  socket.on('deleteAddress', function(userID, type, addressOld) {
    var typeRef = adminInfo.child(userID).child(type);
    typeRef.once('value', function(snapshot) {
      var objs = snapshot.val();
      for (var key of Object.keys(objs)) {
        if (objs[key].address == addressOld) {
          typeRef.child(key).remove();
          break;
        }
      }
    })
  });

  socket.on('removeAllAddresses', function(userID, type) {
	  if (!type) type = 'patients';
    adminInfo.child(userID).child(type).remove();
		matrixSave.child(userID).remove();
		console.log('--REMOVE_DATABASE ' + type + ' addresses');
	});
	
	socket.on('removeMatrixSave', function(userID) {
		matrixSave.child(userID).remove();
		console.log('--REMOVE_DATABASE matrix save');
  });

  socket.on('getPatients', function(userID) {
		console.log('--REQUEST patients');
    adminInfo.child(userID).child('patients').once('value', function(snapshot) {
			if (snapshot.val() !== null) {
				console.log(TerminalColors.GREEN, '--SEND patients SUCCESS');
        socket.emit('patientRes', snapshot.val());
      } else {
				console.log(TerminalColors.RED, '--SEND patients  (no patients)');
				socket.emit('patientRes', null);
			}
    })
  })

  socket.on('getVolunteers', function(userID) {
		console.log('--REQUEST volunteers');
    adminInfo.child(userID).child('volunteers').once('value', function(snapshot) {
      if (snapshot.val() !== null) {
				console.log(TerminalColors.GREEN, '--SEND volunteers SUCCESS');
        socket.emit('volunteerRes', snapshot.val());
      } else {
				console.log(TerminalColors.RED, '--SEND volunteers NULL (no volunteers)');
				socket.emit('volunteerRes', null);
			}
    })
	})
	
	socket.on('getColors', function(count) {
		socket.emit('colorsRes', colorGen(count));
	})

  socket.on('getDistanceMatrix', function(userID, start) {
		matrixSave.child(userID).once('value', function(bigsnapshot) {
			if (bigsnapshot.val() !== null) {
				socket.emit('distanceMatrixRes', bigsnapshot.val());
				console.log('--SEND previous distance matrix');
			} else {
				adminInfo.child(userID).child('patients').once('value', function(snapshot) {
					let raw_locs = snapshot.val();

					let formattedAddresses = raw_locs.map(loc => loc.address);

					let locations = raw_locs.map(loc => loc.coord);
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
							result.map(submatrix => {
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
							console.log('--SEND distance matrix (25+)');
							console.log('sent')
							matrixSave.child(userID).set({times: times, formattedAddresses: formattedAddresses});
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
							matrixSave.child(userID).set({times: times, formattedAddresses: formattedAddresses});
							console.log('--SEND distance matrix (<25)');
						})
					}
		    });
			}
		})
  })

	socket.on('lastCalc', function(userID) {
		lastCalc.child(userID).once('value', function(snapshot) {
			if (snapshot.val()) {
				socket.emit('lastCalcRes', snapshot.val());
				console.log(TerminalColors.GREEN, '--SEND lastCalc succeeded');
			} else {
				console.log(TerminalColors.RED, '--SEND lastCalc failed');
			}
		})
	})
	
	socket.on('updateCalcCache', function(userID, cacheData) {
		adminInfo.child(userID).child('calcCache').set(cacheData);
	})

	socket.on('getCalcCache', function(userID) {
		adminInfo.child(userID).child('calcCache').once('value', function(snapshot) {
			if (snapshot.val()) {
				socket.emit('calcCacheRes', snapshot.val());
			}
		})
	})
	
	socket.on('vrp', function(userID, distanceMatrix, _options, start, locs) {
		var req = require('unirest')("POST", 'http://localhost:4003/vrp');
		req.headers({'Accept': 'application/json', 'Content-Type': 'application/json'});
		
		console.log('--GET VRP request');
		
		var afterAutoFill = function(opts) {
			var toSend = {matrix: distanceMatrix, options: opts};
			req.send(JSON.stringify(toSend));
			req.then((response) => {
				if ('error' in response.body) {
					console.log(TerminalColors.RED, 'VRP failed: ' + response.body.error);
				}
				var update = {};
				response.body.start = start;
				update[userID] = response.body;
				update[userID].coords = locs;
				lastCalc.update(update);
				console.log(TerminalColors.GREEN, '--WRITE VRP to sheet: ' + 'https://docs.google.com/spreadsheets/d/' + opts.spreadsheetid);
				writeToSheet(opts.spreadsheetid, response.body, opts.shouldGenerateTravelTimes);
			})
		}
		
		if (_options.delivererCount < 0) {
			adminInfo.child(userID).child('volunteers').once('value', function(snap) {
				if (snap.val() !== null) {
					_options.delivererCount = snap.val().length;
					afterAutoFill(_options);
				}
			})
		} else {
			afterAutoFill(_options);
		}
	});
});

http.listen(port, function(){
	console.log('listening on 127.0.0.1:' + port.toString());
});
