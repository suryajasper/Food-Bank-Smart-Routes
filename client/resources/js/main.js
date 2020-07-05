initializeFirebase();
var socket = io();

var hidePopups = function() {
  document.getElementById('addPatientDiv').style.display = 'none';

  document.getElementById('csvLabel').innerHTML = 'import a .csv file';

  document.getElementById('map').style.display = 'none';

  document.getElementById('calculatePopup').style.display = 'none';
}

function initMapWithInfos(locs, mapname, infos, keys) {
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

function initMapWithColors(locs, mapname, dropped, start) {
  map = new google.maps.Map(
      document.getElementById(mapname), {zoom: 4, center: locs[0].coord});
  var startmarker = new google.maps.Marker({
    position: start,
    icon: {
      url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
    },
    map: map
  });
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
  document.getElementById('view').style.display = 'none';
  document.getElementById('lastMapRoutes').style.display = 'none';
  document.getElementById('lastCalcBody').style.display = 'block';
  document.getElementById('lastMap').style.display = 'block';
  document.getElementById('lastSelect').style.display = 'none';

  socket.emit('getPatients', userID);
  socket.on('patientRes', function(patients) {
    socket.emit('lastCalc', userID);
    socket.on('lastCalcRes', function(solution) {
      initMapWithColors(Object.values(patients), 'lastMap', solution.dropped, solution.start);
    })
  })
}

function deliveryRoutes() {
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
      if (!isNaN(this.value)) {
        initMapWithRoutes(solution.routes[parseInt(this.value)]);
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
    }
  }
}

function handleAdmin() {
  var locations = [];
  var emails = [];

  var addListeners = function(arr) {
    for (var seq of arr) (function(seq) {
      if (seq[5]) {
        document.getElementById('addBankButton').onclick = function(e) {
          e.preventDefault();
          var addressesRaw = document.getElementById(seq[3]).value.split('\n');
          socket.emit('getCoordinatesMult', addressesRaw);
          socket.on('coordinatesMultRes', function(locs, cooked) {
            locations = [];
            for (var i = 0; i < locs.length; i++) {
              locations.push({coord: locs[i], address: cooked[i]});
            }
            socket.emit('addAddresses', userID, locations);
            locations = [];
            hidePopups();
          });
        };
        document.getElementById(seq[4]).onclick = function(e) {
          if (document.getElementById(seq[3]).value !== '') {
            e.preventDefault();
            var addressesRaw = document.getElementById(seq[3]).value.split('\n');
            socket.on('coordinatesMultRes', function(locs, cooked) {
              locations = [];
              for (var i = 0; i < locs.length; i++) {
                locations.push({coord: locs[i], address: cooked[i]});
              }
              initTheMap(locs, seq[2]);
            });
            socket.emit('getCoordinatesMult', addressesRaw);
          }
        };
      }
      document.getElementById(seq[0]).onchange = function(event) {
        document.getElementById(seq[1]).innerHTML = 'selected';
        var file = document.getElementById(seq[0]).files[0];
        Papa.parse(file, {complete: function(results) {
          var arr2 = [];
          if (seq[5]) {
            for (var row of results.data) {arr2.push(row[0])}
            socket.on('coordinatesMultRes', function(locs, cooked) {
              locations = [];
              for (var i = 0; i < locs.length; i++) {
                locations.push({coord: locs[i], address: cooked[i]});
              }
              initTheMap(locs, seq[2]);
              document.getElementById('addBankButton').onclick = function(e) {
                e.preventDefault();
                socket.emit('addAddresses', userID, locations);
                locations = [];
                hidePopups();
              }
            });
            socket.emit('getCoordinatesMult', arr2);
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

  addListeners([['csvInput', 'csvLabel', 'map', 'patientAddresses', 'preview',true]]);

  for (var cancel of document.getElementsByClassName('cancel')) {
    cancel.onclick = function(e) {
      e.preventDefault();
      hidePopups();
    }
  }

  hidePopups();

  document.getElementById('addPatient').onclick = function(e) {
    hidePopups();
    document.getElementById('addPatientDiv').style.display = 'block';
  }
  document.getElementById('viewPatient').onclick = function(e) {
    e.preventDefault();
    document.getElementById('removeAll').onclick = function(e) {
      e.preventDefault();
      socket.emit('removeAllAddresses', userID);
    }
    document.getElementById('view').style.display = 'block';
    document.getElementById('lastCalcBody').style.display = 'none';
    socket.emit('getPatients', userID);
    socket.on('patientRes', function(patients) {
      document.getElementById('mapView').style.display = 'block';
      var locs = [];
      var infos = [];
      var keys = Object.keys(patients);
      for (var key of keys) {
        if (patients[key] !== null) {
          locs.push(patients[key].coord);
          infos.push(patients[key].address);
        }
      }
      initMapWithInfos(locs, 'mapView', infos, keys);
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
  document.getElementById('confirmCalculation').onclick = function(e2){
    e2.preventDefault();
    document.getElementById('confirmCalculation').innerHTML = 'getting distance matrix...';
    document.getElementById('confirmCalculation').disabled = true;
    var tempsawe = document.getElementById('depotAddressIn').value;
    socket.emit('getCoordinates', document.getElementById('depotAddressIn').value);
    socket.on('coordinatesRes', function(start) {
      // get driver locations
      socket.emit('getDistanceMatrix', userID, start);
      socket.on('distanceMatrixRes', function(res) {
        res.formattedAddresses.unshift(tempsawe);
        var opts = {
          spreadsheetid: convertToSheetId(document.getElementById('linkToSpreadsheet').value),
          delivererCount: parseInt(document.getElementById('numDeliv').value),
          formattedAddresses: res.formattedAddresses
        };
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
        socket.emit('vrp', userID, res.times, opts, start);
        document.getElementById('calculatePopup').style.display = 'none';
        document.getElementById('confirmCalculation').innerHTML = 'Calculate';
        document.getElementById('confirmCalculation').disabled = false;
      })
    })
  }
}

hidePopups();

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

socket.on('reporterror', function(msg) {
  window.alert(msg);
})
