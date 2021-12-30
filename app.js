const admin = require('firebase-admin');
const express = require('express');
const colorGen = require('iwanthue');
const GoogleSpreadsheet = require('google-spreadsheet');
const {promisify} = require('util');
const unirest = require('unirest');

const app = express();
app.use(express.static(__dirname + '/client', { extensions: ['html'] }));
app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4002');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');
	next();
});
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 4002;

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
  var url = `http://dev.virtualearth.net/REST/v1/Locations/${address}?o=json&key=AoU-UkBigtGZIorCXRzwbHH48O4npDlzC2Axe8JxG-fXrYYFxbtaBnNynVTNiZMg &maxResults=1`;
  var unirest = require("unirest");
  var req = unirest("GET", url);
  return req;
}

function getCoordinatesGoogle(address) {
  address = replaceAll(address, ' ', '+');
  var url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + address + '&key=AIzaSyB874rZyp7PmkKpMdfpbQfKXSSLEJwglvM';
  // var url = `http://dev.virtualearth.net/REST/v1/Locations/${address}?o=json&key=AuF1WYMy__BfekWEqNljvS73rPTAGrzzMslz4xQcQNh_8z8yq9EoeCMVVv5CVt7R `;
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
  return Math.max(...arr.map(sub => sub.length));
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
		'key': 'AoU-UkBigtGZIorCXRzwbHH48O4npDlzC2Axe8JxG-fXrYYFxbtaBnNynVTNiZMg ',
		'origins': patientAddresses,
		'destinations': patientAddresses2,
		'travelMode': 'driving'
	});

	return req;
}

function generateRouteTable(sol, shouldGenerateTravelTimes) {
	let headers = ['Time'];

	let maxDest = maxLength(sol.routes);

	for (let i = 0; i < maxDest; i++) {
		headers.push(`Destination ${i+1}`);
		if (shouldGenerateTravelTimes) {
			headers.push(`Travel Time ${i+1}-${i+2}`);
		}
	}
	headers.push('Dropped');

	let droppedTracker = 0;

	let indTimes = getIndividualTimes(sol.routes, sol.addresses, sol.matrix);
	
	let body = [];

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
		
		body.push(row);
	}

	return { headers, body };
}

async function writeToSheet(id, table) {

	console.log(table);

	var doc = new GoogleSpreadsheet(id);

	await promisify(doc.useServiceAccountAuth)(googleDrive_serviceAccount);

	doc.addWorksheet({headers: table.headers}, async function(addWorksheetErr, newSheet) {
	  if (addWorksheetErr) console.error(addWorksheetErr);
	  else for (var row of table.body) await promisify(newSheet.addRow)(row);
	});
}

function cleanAddress(address) {
	return replaceAll(replaceAll(address, '#', ''), '/', '')
}

const database = admin.database();
const adminInfo = database.ref('adminInfo');
const deliverInfo = database.ref('deliverInfo');
const lastCalc = database.ref('lastCalc');
const matrixSave = database.ref('matrix');

const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

app.post('/getCoordinates', (req, res) => {
	console.log(req.body.address);
	getCoordinatesGoogle(cleanAddress(req.body.address))
    .end(gRes => {
      if (gRes.error) console.log(gRes.error);
      else res.json(gRes.body.results[0].geometry.location);
    });
})

app.post('/getCoordinatesMult', (req, res) => {

	// test: {"addresses": ["213 Denver Avenue Durham NC 27704", "2920 Chapel Hill Road, Apt 53B, Durham, NC 27707", "2413 Southern Dr. Durham NC 27703", "1705 Gunter St, APT A, Durham", "5010 Glenn Road Durham NC 27704", "1210 Midland Terrace, Durham 27704", "209 North Guthrie Ave, Durham, 27703", "514 N Guthrie Ave, Durham NC 27703", "4001 Meriwether Dr., Apt J12 Durham NC 27704", "3627 Dearborn Drive, Durham, NC 27704", "800 E C St., lot #15, Butner, NC", "545 Liberty Street, Apt. 23, Durham NC 27701", "407 Virginia Cates Road Hillsborough, NC 27278", "3010 Firth Rd Durham NC 27704", "4931 Howe St Durham", "202 N Briggs Ave Durham NC 27703", "1321 newcastle rd apt d19 Durham, NC 27704"]}

	const addresses = req.body.addresses;

	console.log(`--RECEIVED coordinates mult: ${addresses.length} addresses`);

	const results = addresses.map(address => 
		new Promise((resolve, reject) => 
			getCoordinates(cleanAddress(address))
				.then(res => {

					if (res.error || res.body.resourceSets[0].estimatedTotal === 0) {
						console.log('bing fucked up');
						getCoordinatesGoogle(cleanAddress(address))
							.then(res => {
								if (res.error || res.body.status === 'ZERO_RESULTS')
									resolve(null);
								else
									resolve(loc.body.results[0].geometry.location);
							})

					} else {

						const geocodeRes = res.body.resourceSets[0].resources[0];
						resolve({
							lat: geocodeRes.point.coordinates[0],
							lng: geocodeRes.point.coordinates[1]
						});

					}
				})
		)
	);

	Promise.all(results).then(geoRes => 
		res.json( 
			geoRes.map(loc => loc ? loc : 'failed') 
		)
	);

});

app.post('/getColors', (req, res) => {
	res.json(colorGen(parseInt(req.body.count)));
})

io.on('connection', function(socket){

  socket.on('createAdmin', function(userID, _email, _accountPassword) {
    adminInfo.child(userID).update({email: _email, accountPassword: _accountPassword});
	});

  socket.on('createDeliverer', function(userID, _email) {
    deliverInfo.child(userID).set({email: _email});
  })

  socket.on('addAddresses', function(userID, locs, type) {
		if (!type) type = 'patients';
		console.log('--RECEIVED patient addresses: ' + locs.length.toString() + ' locations');
    adminInfo.child(userID).child(type).once('value', function(snapshot) {
			var update = {};
      if (snapshot.val() === null) {
				for (var i = 0; i < locs.length; i++)
					update[i] = locs[i];
      } else {
				var offset = Math.max(...Object.keys(snapshot.val()))+1;
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
		matrixSave.child(userID).remove();
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
		matrixSave.child(userID).remove();
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
        socket.emit('patientRes', Object.values(snapshot.val()));
      } else {
				console.log(TerminalColors.RED, '--SEND patients (no patients)');
				socket.emit('patientRes', null);
			}
    })
  })

  socket.on('getVolunteers', function(userID) {
		console.log('--REQUEST volunteers');
    adminInfo.child(userID).child('volunteers').once('value', function(snapshot) {
      if (snapshot.val() !== null) {
				console.log(TerminalColors.GREEN, '--SEND volunteers SUCCESS');
        socket.emit('volunteerRes', Object.values(snapshot.val()));
      } else {
				console.log(TerminalColors.RED, '--SEND volunteers NULL (no volunteers)');
				socket.emit('volunteerRes', null);
			}
    })
	})

  socket.on('getDistanceMatrix', function(userID, start) {
		matrixSave.child(userID).once('value', function(bigsnapshot) {
			if (bigsnapshot.val() !== null) {
				socket.emit('distanceMatrixRes', bigsnapshot.val());
				console.log('--SEND previous distance matrix');
			} else {
				adminInfo.child(userID).child('patients').once('value', function(snapshot) {
					let raw_locs = Object.values(snapshot.val());

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
								console.log('submatrix', submatrix.body);
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
		console.log(distanceMatrix[0].length, _options.formattedAddresses.length);
		var req = require('unirest')("POST", 'http://104.198.222.54:4003/vrp');
		req.headers({'Accept': 'application/json', 'Content-Type': 'application/json'});
		
		console.log('--GET VRP request');
		
		function afterAutoFill(opts) {
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

				socket.emit('vrpTable', generateRouteTable(response.body, opts.shouldGenerateTravelTimes));

				// console.log(TerminalColors.GREEN, '--WRITE VRP to sheet: ' + 'https://docs.google.com/spreadsheets/d/' + opts.spreadsheetid);
				// writeToSheet(opts.spreadsheetid, response.body, opts.shouldGenerateTravelTimes);
			})
		}
		
		if (_options.delivererCount < 0) {
			adminInfo.child(userID).child('volunteers').once('value', function(snap) {
				if (snap.val()) {
					_options.delivererCount = Object.values(snap.val()).length;
					afterAutoFill(_options);
				}
			})
		} else {
			afterAutoFill(_options);
		}
	});

	socket.on('uploadToSpreadsheet', function(spreadsheetid, content) {
		console.log(`--WRITE VRP to sheet (https://docs.google.com/spreadsheets/d/${spreadsheetid})`);
		writeToSheet(spreadsheetid, content);
	})
});

http.listen(port, function(){
	console.log('listening on 127.0.0.1:' + port.toString());
});
