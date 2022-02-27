const googleDrive_serviceAccount = require("../../secret/googledrivekey.json");
const GoogleSpreadsheet = require('google-spreadsheet');
const unirest = require('unirest');
const { promisify } = require('util');
const { replaceAll, maxLength, cleanAddress } = require('./utils');

function getCoordinates(address) {
  address = replaceAll(address, ' ', '%20');
  // var url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + address + '&key=AIzaSyB874rZyp7PmkKpMdfpbQfKXSSLEJwglvM';
  const url = `http://dev.virtualearth.net/REST/v1/Locations/${address}?o=json&key=AoU-UkBigtGZIorCXRzwbHH48O4npDlzC2Axe8JxG-fXrYYFxbtaBnNynVTNiZMg&maxResults=1`;
  return unirest("GET", url);
}

function getCoordinatesGoogle(address) {
  address = replaceAll( replaceAll(address, ' ', '+'), '#', '' );
  const url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + address + '&key=AIzaSyB874rZyp7PmkKpMdfpbQfKXSSLEJwglvM';
	console.log(url);
  // var url = `http://dev.virtualearth.net/REST/v1/Locations/${address}?o=json&key=AuF1WYMy__BfekWEqNljvS73rPTAGrzzMslz4xQcQNh_8z8yq9EoeCMVVv5CVt7R `;
  return unirest("GET", url);
}

function getCoordinatesMult(addresses) {
	return new Promise((resolve, reject) => {

		console.log(`--RECEIVED coordinates mult: ${addresses.length} addresses`);
	
		const results = addresses.map(address => 
			new Promise((resolve, reject) => 
				getCoordinates(cleanAddress(address))
					.then(res => {
	
						if (res.error || res.body.resourceSets[0].estimatedTotal === 0) {
							
							getCoordinatesGoogle(cleanAddress(address))
								.then(res => {
									if (res.error || res.body.status === 'ZERO_RESULTS')
										resolve({ err: true, address });
									else
										resolve(res.body.results[0].geometry.location);
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
	
		Promise.all(results).then(resolve);

	});
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

function distanceMatrix(patientAddresses, patientAddresses2) {
	
	const url = 'https://dev.virtualearth.net/REST/v1/Routes/DistanceMatrix?key=AoU-UkBigtGZIorCXRzwbHH48O4npDlzC2Axe8JxG-fXrYYFxbtaBnNynVTNiZMg';

	return unirest
					.post(url)
					.header('Accept', 'application/json')
					.send(JSON.stringify({
						'units': 'imperial',
						'origins': patientAddresses,
						'destinations': patientAddresses2,
						'travelMode': 'driving'
					}));

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
	getCoordinatesMult,
  getIndividualTimes,
  distanceMatrix, 
  distanceMatrix, 
  generateRouteTable, 
  writeToSheet 
};