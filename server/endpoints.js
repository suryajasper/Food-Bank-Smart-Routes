const colorGen = require('iwanthue');
const unirest = require('unirest');
const { app, io } = require('./app');

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

const mongoose = require('mongoose');
const User = require('../models/user');
const CalcCache = require('../models/calccache');
const {Address} = require('../models/address');

const uri = "mongodb+srv://suryajasper:53n2ZrQrtVEE9VV@fpp-smart-routes.toofc.mongodb.net/users";
mongoose.connect(uri, { useUnifiedTopology: true, useNewUrlParser: true });
let db = mongoose.connection;

const { 
  getCoordinates, 
  getCoordinatesGoogle, 
  getCoordinatesMult,
  getIndividualTimes,
  distanceMatrix,
  generateRouteTable, 
  writeToSheet,
} = require('./apis');

const { cleanAddress, init2D } = require('./utils');

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

	getCoordinatesMult(addresses).then(res.json);

});

app.post('/getColors', (req, res) => {
	res.json(colorGen(parseInt(req.body.count)));
})

app.post('/createUser', (req, res) => {

  console.log('--NEW USER', req.body);

  if (!(req.body && req.body.username && req.body.email && req.body.password)) return res.status(400).send('no data');

  User.findOne({email: req.body.email}, (err, document) => {

    if (err) return res.send(err);
    if (document) return res.status(400).send('email address already taken');

    console.log('passouter', req.body.password);
    console.log('good unique address');

    let user = new User({
      username: req.body.username,
      email: req.body.email,
      hash: req.body.password
    });

    user.save().then(function(newRes) {
      console.log(`${req.body.username} registered with email ${req.body.email}`);
      res.json({uid: newRes._id});
    });

  })
});

app.post('/authenticateUser', (req, res) => {
  console.log('login', req.body);
  if (!(req.body && req.body.password && req.body.email)) return res.status(400).send('no data');
  User.findOne({email: req.body.email}, (err, document) => {
    if (!document || err) {
      console.log('no user found');
      return res.status(401).send('could not find user');
    }
    if (document.isValidPassword(req.body.password)) {
      return res.json({uid: document._id});
    } else {
      console.log('invalid password');
      return res.status(400).send('invalid password');
    }
  })
})

app.post('/addAddresses', async (req, res) => {
  const { uid, addresses } = req.body;

  const addNames = addresses.map(add => add.address);

  const coords = (await getCoordinatesMult(addNames));

  const locs = coords
          .filter(coord => !coord.err)
          .map((loc, i) => {
            return {
              forUser: uid,
              name: addNames[i],
              coord: loc,
              type: addresses[i].type,
            };
          });
          
  for (let loc of locs) {
    const address = new Address(loc);
    await address.save();
  }
  
  res.status(201).json({
    status: `added ${locs.length} addresses`,
    failed: coords
              .filter(coord => coord.err)
              .map(coord => coord.address),
  });
})

app.post('/updateAddress', (req, res) => {
  Address.updateOne({ _id: req.body.addressId }, req.body.update)
    .then(() => res.status(201).json(req.body.update), res.status(400).send);
});

app.post('/deleteAddress', (req, res) => {
  console.log('--REMOVE', req.body.addressId);
  Address.findByIdAndDelete(req.body.addressId)
    .then(() => res.status(201).json({id: req.body.addressId}), res.status(400).send);
})

app.post('/removeAddresses', (req, res) => {

  Address.deleteMany({forUser: req.body.uid})
    .then(delres => res.status(201).send(`deleted ${delres.deletedCount} addresses`), res.status(400).send);

})

app.post('/getAddresses', (req, res) => {
  const { uid } = req.body;

  Address.find({forUser: uid}, (err, docs) => {
    if (err) return res.status(400).send('failed');
    return res.status(200).json(docs);
  });
})

async function getDistanceMatrix({ uid, addresses }) {

  const cachedMatrix = await CalcCache.findOne({forUser: uid}).exec();

  if (cachedMatrix)
    return cachedMatrix;
  
  else {
    
    const coords = addresses.map(add => {
      return {
        latitude  : add.coord.lat,
        longitude : add.coord.lng,
      }
    });

    const STRIDE = 25;
    const N = coords.length;

    const matrix = init2D(N, N);

    for (let rStart = 0; rStart < N; rStart += STRIDE) {
      for (let cStart = 0; cStart < N; cStart += STRIDE) {

        const res = await distanceMatrix(
          coords.slice(rStart, rStart+STRIDE), 
          coords.slice(cStart, cStart+STRIDE)
        );
        const flattened = res.body.resourceSets[0].resources[0].results.map(el => el.travelDuration);

        for (let r = rStart; r < Math.min(N, rStart+STRIDE); r++)
          for (let c = cStart; c < Math.min(N, cStart+STRIDE); c++)
            matrix[r][c] = flattened[r*N+c];

      }
    }

    return matrix;

  }

}

app.post('/updateCalcCache', (req, res) => {
  const { uid, update } = req.body;

  CalcCache.updateOne({forUser: uid}, update);
})

app.post('/getCalcCache', (req, res) => {
  CalcCache.findOne({forUser: req.body.uid})
    .then(res.status(201).json, res.status(400).send);
})

app.post('/vrp', async (req, res) => {

  let { uid, params } = req.body;

  /* get addresses */
  
  let coord = await getCoordinatesGoogle(params.depotAddress);
  coord = coord.body.results[0].geometry.location;
  
  const start = { 
    name: params.depotAddress, 
    coord,
  };
  
  let addresses = [start].concat(
    await Address.find({forUser: uid, type: 'patients'}).exec()
  );
  
  let formattedAddresses = addresses.map(add => add.name);

  /* clean & verify parameters */

  let matrix = await CalcCache.findOne({forUser: uid}).exec();

  console.log(matrix ? '--USING CACHED MATRIX' : '--GENERATING DISTANCE MATRIX');

  if (matrix)
    matrix = JSON.parse(Buffer.from(matrix.matrix, 'base64').toString('ascii'));

  else {
    
    matrix = await getDistanceMatrix({uid, addresses});

    const matrixSave = new CalcCache({ 
      forUser: uid,
      matrix: Buffer.from(JSON.stringify(matrix)).toString('base64'),
    });
    await matrixSave.save();
    
  }

  if (req.body.params.useDriversStored) {
    params.numDeliv = await Address.countDocuments({ forUser: uid, type: 'volunteers' }).exec();
    if (params.numDeliv == 0) return res.status(400).send('failed'); 
  }

  /* send vrp request */

  console.log('--GET VRP request');

  const vrpReq = unirest("POST", 'http://104.198.222.54:4003/vrp');
  vrpReq.headers({'Accept': 'application/json', 'Content-Type': 'application/json'});
  vrpReq.send(
    JSON.stringify({ 
      matrix, 
      options: Object.assign(params, { formattedAddresses }) 
    })
  );

  vrpReq.then(response => {
    if (response.body.error) {
      console.log(TerminalColors.RED, 'VRP failed: ' + response.body.error);
      return res.status(400).send('VRP failed');
    }

    console.log(TerminalColors.GREEN, '--SENDING VRP SUCCESS');

    let table = generateRouteTable(response.body, false);
    return res.status(200).json(table);
  })

})


async function vrp(body) {

  let { uid, params } = body;

  /* clean & verify parameters */

  let matrix = await CalcCache.findOne({forUser: uid}).exec();

  console.log(matrix ? '--USING CACHED MATRIX' : '--GENERATING DISTANCE MATRIX');

  if (!matrix) {
    let coord = await getCoordinatesGoogle(params.depotAddress);
    coord = coord.body.results[0].geometry.location;

    const start = { 
      name: params.depotAddress, 
      coord,
    };
    
    matrix = await getDistanceMatrix({uid, start});
    console.log('matrix', matrix);
  }

  if (req.body.params.useDriversStored) {
    params.numDeliv = Address.countDocuments({ forUser: uid, type: 'volunteers' }).exec();
    if (params.numDeliv == 0) return 'drivers failed'; //res.status(400).send('failed'); 
  }

  /* send vrp request */

  const vrpReq = unirest("POST", 'http://104.198.222.54:4003/vrp');
  console.log('--GET VRP request');

  vrpReq.headers({'Accept': 'application/json', 'Content-Type': 'application/json'});
  vrpReq.send(JSON.stringify({ matrix, options: params }));
  vrpReq.then(response => {
    if (response.body.error)
      console.log(TerminalColors.RED, 'VRP failed: ' + response.body.error);

    let table = generateRouteTable(response.body, false);
    console.log(table);
    return table; //res.status(200).json(table);
  })
}
/*
vrp({
  uid: '61cd3d7d42f74ef8ad1f3114', 
  params: {
    "depotAddress": "1 Dr Carlton B Goodlett Pl #168, San Francisco, CA 94102",
    "maxTravelTime": "89",
    "maxDestinations": "10",
    "numDeliv": "10",
    "useDriversStored": true
  }
}).then(console.log).catch(console.error);*/

io.on('connection', function(socket) {
	
	socket.on('removeMatrixSave', function(userID) {
		matrixSave.child(userID).remove();
		console.log('--REMOVE_DATABASE matrix save');
  });
	
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