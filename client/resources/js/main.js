initializeFirebase();
var socket = io();

var userID;
firebase.auth().onAuthStateChanged(function(user) {
  userID = user.uid;
  socket.emit('bruhAmIAdminOrNot', userID);
  socket.on('youAreNotTheAdmin', function(isAdmin) {
    if (isAdmin) {
      document.getElementById('showIfAdmin').style.display = 'block';
      handleAdmin();
    }
  })
})

String.prototype.replaceAll = function(toReplace, replaceWith) {
  var replaced = this.replace(toReplace, replaceWith);
  while (replaced.includes(toReplace)) {
    replaced = replaced.replace(toReplace, replaceWith);
  }
  return replaced;
}

/*---------------For Debugging only (don't include in final version)------------*/

function updateDatabase(path, data) {
  if (typeof(path) == 'string') {
    path = path.split('/');
  }
  socket.emit('updateDatabase', path, data);
}

function setDatabase(path, data) {
  if (typeof(path) == 'string') {
    path = path.split('/');
  }
  socket.emit('setDatabase', path, data);
}

function getDatabase(path, callback) {
  if (typeof(path) == 'string') {
    path = path.split('/');
  }
  socket.emit('getDatabase', path, callback);
  socket.on('getDatabaseSuccess', function(res) {
    if (callback)
      callback(res);
    else
      console.log(res);
  });
}

/*------------------------------------------------------------------------------*/

var hidePopups = function() {
  document.getElementById('addPatientDiv').style.display = 'none';

  document.getElementById('addVolunteerAddressDiv').style.display = 'none';

  document.getElementById('csvLabel').innerHTML = 'import a .csv file';

  document.getElementById('map').style.display = 'none';

  document.getElementById('calculatePopup').style.display = 'none';

  document.getElementById('columnPopup').style.display = 'none';

  document.getElementById('addBankButton').disabled = false;
}

function createMarkerImage(color) {
  var pinColor = color;

  // Pick your pin (hole or no hole)
  var pinSVGHole = "M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z";
  var pinSVGFilled = "M 12,2 C 8.1340068,2 5,5.1340068 5,9 c 0,5.25 7,13 7,13 0,0 7,-7.75 7,-13 0,-3.8659932 -3.134007,-7 -7,-7 z";

  var markerImage = {  // https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerLabel
      path: pinSVGHole,
      anchor: new google.maps.Point(12,17),
      fillOpacity: 1,
      fillColor: pinColor,
      strokeWeight: 2,
      strokeColor: "black",
      scale: 2
  };

  return markerImage;
}

function createMarker(m) {
  var mapInit = {
    position: m.coord,
    map: m.map
  };
  if ('icon' in m) {
    mapInit.icon = m.icon;
  }
  var marker = new google.maps.Marker(mapInit);
  google.maps.event.addListener(marker, 'click', function() {
    m.iw.setContent(m.info);
    m.iw.open(m.map, marker);
  });
}

function initMapWithInfos(locs, mapname, infos) {
  document.getElementById(mapname).style.display = 'block';
  console.log(locs);
  console.log(infos);
  map = new google.maps.Map(
      document.getElementById(mapname), {zoom: 4, center: locs[0]});
  var iw = new google.maps.InfoWindow();
  for (var i = 0; i < locs.length; i++) {
    var marker = new google.maps.Marker({position: locs[i], map: map});
    google.maps.event.addListener(marker, 'click', (function(marker, i) {
      return function() {
        iw.setContent(infos[i]);
        iw.open(map, marker);
      }
    })(marker, i));
  }
}

function randInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function initMapWithColorsNoOverlap(mapname, locMat, colors, prefaceLabels) {
  map = new google.maps.Map(
      document.getElementById(mapname), {zoom: 4, center: locMat[0][0].coord});
  var iw = new google.maps.InfoWindow();
  for (var j = 0; j < locMat.length; j++) {
    var locs = locMat[j];
    var color;
    if (colors) {
      color = colors[j];
    } else {
      color = 'rgb(' + randInt(30, 220).toString() + ',' + randInt(30, 220).toString() + ',' + randInt(30, 220).toString() + ')';
    }
    for (var i = 0; i < locs.length; i++) {
      var markObj = {
        map: map, 
        iw: iw,
        coord: locs[i].coord,
        info: locs[i].address, 
        icon: createMarkerImage(color)
      }; // '<b><span style = "color: green">Patient:</span></b> ' +
      if (prefaceLabels) {
        markObj.info = prefaceLabels[j] + markObj.info;
      }
      createMarker(markObj);
    }
  }
}

function initMapWithColors(locs, mapname, dropped, start) {
  map = new google.maps.Map(
      document.getElementById(mapname), {zoom: 4, center: locs[0].coord});
  if (start) {
    var startmarker = new google.maps.Marker({
      position: start,
      icon: {
        url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
      },
      map: map
    });
  }
  var iw = new google.maps.InfoWindow();
  for (var i = 0; i < locs.length; i++) {
    if (dropped.includes(locs[i].address)) {
      var marker = new google.maps.Marker({
        position: locs[i].coord,
        icon: {
          url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
        },
        map: map
      });
    } else {
      var marker = new google.maps.Marker({
        position: locs[i].coord,
        icon: {
          url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
        },
        map: map
      });
    }
    google.maps.event.addListener(marker, 'click', (function(marker, i) {
      return function() {
        iw.setContent(locs[i].address);
        iw.open(map, marker);
      }
    })(marker, i));
  }
}

function initMapWithRoutes(locs) {
  console.log(locs);
  var directionsService = new google.maps.DirectionsService();
  var directionsRenderer = new google.maps.DirectionsRenderer();
  var map = new google.maps.Map(document.getElementById('lastMapRoutes'), {
    zoom: 6
  });
  directionsRenderer.setMap(map);
  calculateAndDisplayRoute(directionsService, directionsRenderer, locs);
  for (var i = 0; i < locs.length; i++) {
    locs[i] = locs[i].replaceAll(' ', '+');
  }
  var url = 'https://www.google.com/maps/dir/?api=1&';
  url += 'origin=' + locs[0] + '&';
  url += 'destination=' + locs[locs.length-1]
  if (locs.length > 2) {
    url += '&travelmode=driving&waypoints=';
    url += locs[1];
    for (var i = 2; i < locs.length-1; i++) {
      url += '%7C' + locs[i];
    }
  };
  document.getElementById('routeUrl').href = url;
  document.getElementById('copyMapUrl').onclick = function() {
    var copyText = document.createElement("input");
    document.body.appendChild(copyText);
    copyText.value = url;
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    document.execCommand("copy");
    copyText.remove();
  }
}
function initMapWithMultipleRoutes(locsArr) {
  var directionsService = new google.maps.DirectionsService();
  var directionsRenderer = new google.maps.DirectionsRenderer();
  var map = new google.maps.Map(document.getElementById('lastMapRoutes'), {
    zoom: 6
  });
  directionsRenderer.setMap(map);
  for (var locs of locsArr)
    calculateAndDisplayRoute(directionsService, directionsRenderer, locs);
}

function calculateAndDisplayRoute(directionsService, directionsRenderer, locs) {
  var start = locs[0];
  var end = locs[locs.length-1];
  var waypts = [];
  for (var i = 1; i < locs.length-1; i++) {
    waypts.push({
      location: locs[i],
      stopover: true
    });
  }

  directionsService.route(
    {
      origin: start,
      destination: end,
      waypoints: waypts,
      optimizeWaypoints: false,
      travelMode: "DRIVING"
    },
    function(response, status) {
      if (status === "OK") {
        directionsRenderer.setDirections(response);
      } else {
        window.alert("Directions request failed due to " + status);
      }
    }
  );
}

var initTheMap = function(locs, mapname) {
  document.getElementById(mapname).style.display = 'block';
  var map = new google.maps.Map(
      document.getElementById(mapname), {zoom: 4, center: locs[0]});
  for (var i = 0; i < locs.length; i++) {
    var marker = new google.maps.Marker({position: locs[i], map: map});
  }
}

function convertToSheetId(link) {
  var startDelimiter = 'spreadsheets/d/';
  return link.substring(link.indexOf(startDelimiter)+startDelimiter.length).split('/')[0];
}

function createRow(arr) {
  var tr = document.createElement('tr');

  for (var el of arr) {
    var td = document.createElement('td');
    td.innerHTML = el;
    tr.appendChild(td);
  }

  return tr;
}

function btr(bool) {
  return bool ? 'yes': 'no';
}

function removeEmptyStrings(arr) {
  var newArr = [];
  for (var el of arr) {
    if (el !== '') newArr.push(el);
  } return newArr;
}

function fillSelect(name, length) {
  $('#' + name).empty();
  var soption = document.createElement('option');
  soption.innerHTML = 'all';
  soption.value = 'all';
  document.getElementById(name).appendChild(soption);
  for (var i = 1; i <= length; i++) {
    var option = document.createElement('option');
    option.innerHTML = i.toString();
    option.value = i.toString();
    document.getElementById(name).appendChild(option);
  }
}

function droppedLocations() {
  socket.off('lastCalcRes');
  document.getElementById('view').style.display = 'none';
  document.getElementById('lastMapRoutes').style.display = 'none';
  document.getElementById('lastCalcBody').style.display = 'block';
  document.getElementById('lastMap').style.display = 'block';
  document.getElementById('lastSelect').style.display = 'none';
  socket.emit('lastCalc', userID);
  socket.on('lastCalcRes', function(solution) {
    var addresses = Object.values(solution.addresses);
    addresses.shift();
    console.log(addresses.length);
    initMapWithColors(Object.values(solution.coords), 'lastMap', solution.dropped, solution.start);
  })
}

function deliveryRoutes() {
  socket.off('lastCalcRes');
  document.getElementById('view').style.display = 'none';
  document.getElementById('lastMap').style.display = 'none';
  document.getElementById('lastMapRoutes').style.display = 'block';
  document.getElementById('lastCalcBody').style.display = 'block';
  document.getElementById('lastSelect').style.display = 'block';
  $('#lastSelect').empty();
  socket.emit('lastCalc', userID);
  socket.on('lastCalcRes', function(solution) {
    fillSelect('lastSelect', solution.routes.length);
    document.getElementById('lastSelect').value = '1';
    document.getElementById('lastSelect').oninput = function() {
      if (!isNaN(this.value)) { // if it's a number
        initMapWithRoutes(solution.routes[parseInt(this.value)]);
      } else {
        var solClone = Object.assign({}, solution);
        var patientAddToCoord = {};
        patientAddToCoord[solClone.addresses[0]] = solClone.start;
        for (var patientObj of solClone.coords) {
          patientAddToCoord[patientObj.address] = patientObj.coord;
        }
        for (var driver = 0; driver < solClone.routes.length; driver++) {
          for (var address = 0; address < solClone.routes[driver].length; address++) {
            var addressAct = solClone.routes[driver][address];
            solClone.routes[driver][address] = {
              coord: patientAddToCoord[addressAct],
              address: addressAct
            };
          }
        }
        console.log(solClone.routes);
        initMapWithColorsNoOverlap('lastMapRoutes', solution.routes);
      }
    }
    initMapWithRoutes(solution.routes[0]);
  })
}

function setSelected(ind) {
  var div = document.getElementById('lastCalcBody');
  var sow = 0;
  for (var i = 0; i < div.children.length; i++) {
    if (div.children[i].tagName === 'BUTTON') {
      if (sow === ind) {
        div.children[i].classList.remove('switchNotActive');
        div.children[i].classList.add('switchActive');
      } else {
        div.children[i].classList.remove('switchActive');
        div.children[i].classList.add('switchNotActive');
      } sow++;
    } else break;
  }
}

function fillTable(tableId, data) {
  var table = document.getElementById(tableId);
  for (var row of data) {
    var tr = document.createElement('tr');
    for (var el of row) {
      var td = document.createElement('td');
      td.innerHTML = el;
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
}

function extractRange(data, callback) {
  document.getElementById('columnPopup').style.display ='block';
  document.getElementById('columnPopupTable').innerHTML = '';
  fillTable('columnPopupTable', data);
  var table = document.getElementById('columnPopupTable');
  var selected = {row: -1, col: -1};
  var range = [];
  document.getElementById('confirmExtraction').disabled = true;
  for (var row = 0; row < table.childElementCount; row++) (function(row) {
    for (var col = 0; col < table.children[row].childElementCount; col++) (function(col) {
      var td = table.children[row].children[col];
      td.onclick = function() {
        if (selected.row < 0) {
          td.style.backgroundColor = '#00c700';
          selected.row = row;
          selected.col = col;
        } else if (col == selected.col) {
          var topRow = Math.min(selected.row, row);
          var bottomRow = Math.max(selected.row, row);
          for (var toFillRow = topRow; toFillRow <= bottomRow; toFillRow++) {
            var thisRow = table.children[toFillRow].children[col];
            thisRow.style.backgroundColor = '#00c700';
            range.push(thisRow.innerHTML);
          }
          selected.row = -1;
          document.getElementById('confirmExtraction').disabled = false;
          document.getElementById('confirmExtraction').onclick = function() {
            callback(range);
            document.getElementById('columnPopup').style.display ='none';
          };
        }
      }
    })(col);
  })(row);
  document.getElementById('clearColumnSelection').onclick = function() {
    selected = {row: -1, col: -1};
    range = [];
    for (var row = 0; row < table.childElementCount; row++) {
      for (var col = 0; col < table.children[row].childElementCount; col++) {
        var td = table.children[row].children[col];
        td.style.backgroundColor = 'white';
      }
    }
    document.getElementById('confirmExtraction').disabled = true;
  }
}

function handleAdmin() {
  var locations = [];
  var emails = [];

  var addListeners = function(arr) {
    for (var seq of arr) (function(seq) {
      if (seq.idekWhatThisParameterDoesButImTooScaredToRemoveIt) {
        seq.addAddressesButton.onclick = function(e) {
          e.preventDefault();
          var addressesRaw = document.getElementById(seq.addressIn).value.split('\n');
          socket.emit('getCoordinatesMult', addressesRaw);
          socket.on('coordinatesMultRes', function(locs, cooked) {
            locations = [];
            for (var i = 0; i < locs.length; i++) {
              locations.push({coord: locs[i], address: cooked[i]});
            }
            socket.emit('addAddresses', userID, locations, seq.addressType);
            locations = [];
            hidePopups();
          });
        };
        document.getElementById(seq.previewButton).onclick = function(e) {
          e.preventDefault();
          if (document.getElementById(seq.addressIn).value !== '') {
            var addressesRaw = document.getElementById(seq.addressIn).value.split('\n');
            socket.on('coordinatesMultRes', function(locs, cooked) {
              locations = [];
              for (var i = 0; i < locs.length; i++) {
                locations.push({coord: locs[i], address: cooked[i]});
              }
              initMapWithInfos(locs, seq.map, cooked);
              seq.addAddressesButton.disabled = false;
            });
            socket.emit('getCoordinatesMult', addressesRaw);
          }
        };
      }
      document.getElementById(seq.csvInput).onchange = function(event) {
        document.getElementById(seq.csvLabel).innerHTML = 'selected';
        var file = document.getElementById(seq.csvInput).files[0];
        Papa.parse(file, {complete: function(results) {
          console.log('csv', results.data);
          var arr2 = [];
          if (seq.idekWhatThisParameterDoesButImTooScaredToRemoveIt) {
            extractRange(results.data, function (res) {
              arr2 = res;
              socket.on('coordinatesMultRes', function(locs, cooked) {
                locations = [];
                for (var i = 0; i < locs.length; i++) {
                  locations.push({coord: locs[i], address: cooked[i]});
                }
                initMapWithInfos(locs, seq.map, cooked);
                document.getElementById(seq.previewButton).disabled = true;
                seq.addAddressesButton.disabled = false;
                seq.addAddressesButton.onclick = function(e) {
                  e.preventDefault();
                  socket.emit('addAddresses', userID, locations, seq.addressType);
                  locations = [];
                  hidePopups();
                }
              });
              socket.emit('getCoordinatesMult', arr2);
            });
          } else {
            for (var row of results.data) {
              s = removeEmptyStrings(row);
              arr2.push(s[0] + ':' + s[1]);
            }
            emails = arr2;
          }
        }});
      };
    })(seq)
  }

  addListeners([
  {
    csvInput: 'csvInput',
    csvLabel: 'csvLabel',
    map: 'map',
    addressIn: 'patientAddresses',
    previewButton: 'preview',
    addAddressesButton: document.getElementById('addBankButton'),
    addressType: 'patients',
    idekWhatThisParameterDoesButImTooScaredToRemoveIt: true
  },
  {
    csvInput: 'csvInputVolunteer',
    csvLabel: 'csvLabelVolunteer',
    map: 'mapVolunteer',
    addressIn: 'volunteerAddresses',
    previewButton: 'previewVolunteer',
    addAddressesButton: document.getElementById('addVolunteerAddress'),
    addressType: 'volunteers',
    idekWhatThisParameterDoesButImTooScaredToRemoveIt: true
  }]);

  for (var cancel of document.getElementsByClassName('cancel')) {
    cancel.onclick = function(e) {
      e.preventDefault();
      hidePopups();
    }
  }

  hidePopups();

  document.getElementById('addPatient').onclick = function(e) {
    hidePopups();
    document.getElementById('preview').disabled = false;
    document.getElementById('addBankButton').disabled = true;
    document.getElementById('addPatientDiv').style.display = 'block';
  }
  document.getElementById('addVolunteer').onclick = function(e) {
    hidePopups();
    document.getElementById('previewVolunteer').disabled = false;
    document.getElementById('addVolunteerAddress').disabled = true;
    document.getElementById('addVolunteerAddressDiv').style.display = 'block';
  }
  document.getElementById('viewPatient').onclick = function(e) {
    e.preventDefault();
    document.getElementById('removeAll').onclick = function(e) {
      e.preventDefault();
      socket.emit('removeAllAddresses', userID);
    }
    socket.off('volunteerRes');
    socket.off('patientRes');
    document.getElementById('view').style.display = 'block';
    document.getElementById('lastCalcBody').style.display = 'none';
    socket.emit('getPatients', userID);
    socket.on('patientRes', function(patients) {
      console.log(patients);
      socket.emit('getVolunteers', userID);
      socket.once('volunteerRes', function(volunteers) {
        console.log(volunteers);
        document.getElementById('mapView').style.display = 'block';
        //console.log(locs, locsVolunteer);
        initMapWithColorsNoOverlap('mapView', [patients, volunteers], ['green', 'blue'], ['<b><span style = "color: green">Patient:</span></b> ', '<b><span style = "color: blue">Driver:</span></b> '] );
      })
    })
  }
  document.getElementById('lastCalc').onclick = function(e) {
    e.preventDefault();
    droppedLocations();
    setSelected(0);
    document.getElementById('droppedButton').onclick = function(e2) {
      e2.preventDefault();
      setSelected(0);
      droppedLocations();
    }
    document.getElementById('deliveryRoutesButton').onclick = function(e2) {
      e2.preventDefault();
      setSelected(1);
      deliveryRoutes();
    }
  }
}

document.getElementById('routes').onclick = function(e) {
  e.preventDefault();
  document.getElementById('calculatePopup').style.display = 'block';
  socket.emit('getCalcCache', userID);
  socket.on('calcCacheRes', function(res) {
    for (var inputID of Object.keys(res)) {
      document.getElementById(inputID).value = res[inputID];
    }
  })
  function updateInputField() {
    document.getElementById('numDeliv').disabled = document.getElementById('driverNumberAuto').checked;
  } updateInputField();
  document.getElementById('driverNumberAuto').oninput = updateInputField;
  document.getElementById('confirmCalculation').onclick = function(e2){
    e2.preventDefault();

    socket.off('coordinatesRes');
    socket.off('distanceMatrixRes');
    socket.off('patientRes');

    var inputs = ['depotAddressIn', 'maxTime', 'maxDest', 'numDeliv', 'linkToSpreadsheet'];

    // cache it
    socket.emit('updateCalcCache', userID, {
      depotAddressIn: document.getElementById('depotAddressIn').value,
      maxTime: document.getElementById('maxTime').value,
      numDeliv: document.getElementById('numDeliv').value
    });

    var allGood = true;
    for (var inp of inputs) {
      if (document.getElementById(inp).value === '') {
        allGood = false;
      }
    }
    if (allGood) {
      document.getElementById('confirmCalculation').innerHTML = 'getting distance matrix...';
      document.getElementById('confirmCalculation').disabled = true;
      var tempsawe = document.getElementById('depotAddressIn').value;
      socket.emit('getCoordinates', document.getElementById('depotAddressIn').value);
      socket.on('coordinatesRes', function(start) {
        // get driver locations
        socket.emit('getDistanceMatrix', userID, start);
        socket.on('distanceMatrixRes', function(res) {
          socket.emit('getPatients', userID);
          socket.on('patientRes', function(addresses) {
            res.formattedAddresses.unshift(tempsawe);
            var opts = {
              spreadsheetid: convertToSheetId(document.getElementById('linkToSpreadsheet').value),
              delivererCount: parseInt(document.getElementById('numDeliv').value),
              formattedAddresses: res.formattedAddresses
            };
            if (document.getElementById('driverNumberAuto').checked) {
              opts.delivererCount = -1;
            }
            if (document.getElementById('maxTime').value !== '') {
              opts.maxTime = parseInt(document.getElementById('maxTime').value);
            } else {
              opts.maxTime = -1;
            }
            if (document.getElementById('maxDest').value !== '') {
              opts.maxDest = parseInt(document.getElementById('maxDest').value);
            } else {
              opts.maxDest = -1;
            }
            opts.shouldGenerateTravelTimes = !!document.getElementById('travelTimesCheckbox')?.checked;
            socket.emit('vrp', userID, res.times, opts, start, addresses);
            document.getElementById('calculatePopup').style.display = 'none';
            document.getElementById('confirmCalculation').innerHTML = 'Calculate';
            document.getElementById('confirmCalculation').disabled = false;
          });
        })
      })
    }
  }
}

hidePopups();

socket.on('reporterror', function(msg) {
  window.alert(msg);
})
