const googleDrive_serviceAccount = require("../../secret/googledrivekey.json");
const GoogleSpreadsheet = require('google-spreadsheet');
const unirest = require('unirest');
const { promisify } = require('util');
const { replaceAll, maxLength, cleanAddress } = require('./utils');

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

function distanceMatrix(pLoc, vLoc) {

	const parseLocs = locs => locs.map(loc => `${loc.lat},${loc.lng}`).join(';');

	const req = unirest("GET", 'https://dev.virtualearth.net/REST/v1/Routes/DistanceMatrix');
	req.body({
		'units': 'imperial',
		'key': 'AoU-UkBigtGZIorCXRzwbHH48O4npDlzC2Axe8JxG-fXrYYFxbtaBnNynVTNiZMg ',
		'origins': parseLocs(patientAddresses),
		'destinations': parseLocs(patientAddresses2),
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

module.exports = { 
  getCoordinates, 
  getCoordinatesGoogle, 
  getIndividualTimes,
  distanceMatrix, 
  distanceMatrix, 
  generateRouteTable, 
  writeToSheet 
};