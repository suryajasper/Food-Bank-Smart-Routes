initializeFirebase();
var userID;

var socket = io();

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

function refreshTheme() {
  var theme = Cookies.get('theme');
  if (theme == 'dark') document.body.className = 'darkTheme';
  else document.body.className = '';
}

Mousetrap.bind(['command+shift+d', 'ctrl+shift+d'], function(e) {
  e.preventDefault();
  if (Cookies.get('theme') == 'dark')
    Cookies.set('theme', 'light');
  else
    Cookies.set('theme', 'dark');
  refreshTheme();
});

refreshTheme();

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
  socket.off('getDatabaseSuccess');
  socket.emit('getDatabase', path);
  socket.on('getDatabaseSuccess', function(res) {
    if (callback)
      callback(res);
    else
      console.log(res);
  });
}

socket.on('print', console.log);

socket.on('reporterror', window.alert);

/*------------------------------------------------------------------------------*/

function hidePopups() {
  dom.popups.patients.div.style.display = 'none';
  dom.popups.volunteers.div.style.display = 'none';
  dom.popups.calc.div.style.display = 'none';
  dom.popups.csv.div.style.display = 'none';

  dom.popups.patients.fileInLabel.innerHTML = 'import a .csv file';
  dom.popups.volunteers.fileInLabel.innerHTML = 'import a .csv file';

  dom.popups.patients.map.style.display = 'none';
  dom.popups.volunteers.map.style.display = 'none';

  dom.popups.patients.confirm.disabled = false;
  dom.popups.volunteers.confirm.disabled = false;
}

function randInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
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
  dom.view.div.style.display = 'none';
  dom.lastCalc.routesMap.style.display = 'none';
  dom.lastCalc.div.style.display = 'block';
  dom.lastCalc.droppedMap.style.display = 'block';
  dom.lastCalc.routeSelect.style.display = 'none';

  socket.off('lastCalcRes');
  socket.emit('lastCalc', userID);
  socket.on('lastCalcRes', function(solution) {
    let droppedLocs = [];

    if (!solution.dropped) solution.dropped = [];
    else {
      let ind = 0;
      while (ind < solution.coords.length) {
        if (solution.dropped.includes(solution.coords[ind].address)) {
          let droppedLoc = solution.coords.splice(ind, 1);
          droppedLocs.push(droppedLoc);
        }
        else ind++;
      }
    }
    
    initMapWithColors({
      mapName: 'lastMap',
      locMat: [solution.coords, solution.dropped, [solution.start]],
      colors: ['green', 'red', 'blue'],
      prefaceLabels: ['Success: ', 'Dropped: ', 'Start: '],
    });
  })
}

function deliveryRoutes() {
  socket.off('lastCalcRes');
  dom.view.div.style.display = 'none';
  dom.lastCalc.droppedMap.style.display = 'none';
  dom.lastCalc.routesMap.style.display = 'block';
  dom.lastCalc.div.style.display = 'block';
  dom.lastCalc.routeSelect.style.display = 'block';
  $('#lastSelect').empty();
  socket.emit('lastCalc', userID);
  socket.on('lastCalcRes', function(solution) {
    fillSelect('lastSelect', solution.routes.length);
    function refreshSelect() {
      var newVal = dom.lastCalc.routeSelect.value;
      if (!isNaN(newVal)) { // if it's a number
        initMapWithRoutes(solution.routes[parseInt(newVal)]);
      } else {
        var solClone = solution.routes.map(function(arr) {
          return arr.slice();
        });
        var patientAddToCoord = {};
        patientAddToCoord[solution.addresses[0]] = solution.start;
        for (var patientObj of solution.coords) {
          patientAddToCoord[patientObj.address] = patientObj.coord;
        }
        for (var driver = 0; driver < solClone.length; driver++) {
          for (var address = 0; address < solClone[driver].length; address++) {
            var addressAct = solClone[driver][address];
            solClone[driver][address] = {
              coord: patientAddToCoord[addressAct],
              address: addressAct
            };
          }
        }

        initMapWithColors({
          mapName: 'lastMapRoutes',
          locMat: solClone,
          callbacks: {
            dblclick: function(marker, _, j) {
              dom.lastCalc.routeSelect.value = j+1;
              refreshSelect();
            }
          }
        });
      }
    }
    dom.lastCalc.routeSelect.value = '1';
    dom.lastCalc.routeSelect.oninput = refreshSelect;
    initMapWithRoutes(solution.routes[0]);
  })
}

function setSelected(ind) {
  var div = dom.lastCalc.div;
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
  dom.popups.csv.div.style.display ='block';
  dom.popups.csv.table.innerHTML = '';
  fillTable('columnPopupTable', data);
  var table = dom.popups.csv.table;
  var selected = {row: -1, col: -1};
  var range = [];
  dom.popups.csv.confirm.disabled = true;
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
          dom.popups.csv.confirm.disabled = false;
          dom.popups.csv.confirm.onclick = function() {
            callback(range);
            dom.popups.csv.div.style.display ='none';
          };
        }
      }
    })(col);
  })(row);
  dom.popups.csv.clear.onclick = function() {
    selected = {row: -1, col: -1};
    range = [];
    for (var row = 0; row < table.childElementCount; row++) {
      for (var col = 0; col < table.children[row].childElementCount; col++) {
        var td = table.children[row].children[col];
        td.style.backgroundColor = 'white';
      }
    }
    dom.popups.csv.confirm.disabled = true;
  }
}

function viewAddresses() {
  dom.view.removeAll.onclick = function(e) {
    e.preventDefault();
    socket.emit('removeAllAddresses', userID, 'patients');
    socket.emit('removeAllAddresses', userID, 'volunteers');
    viewAddresses();
  }
  dom.view.removePatients.onclick = function(e) {
    e.preventDefault();
    socket.emit('removeAllAddresses', userID, 'patients');
    viewAddresses();
  }
  dom.view.removeVolunteers.onclick = function(e) {
    e.preventDefault();
    socket.emit('removeAllAddresses', userID, 'volunteers');
    viewAddresses();
  }
  socket.off('volunteerRes');
  socket.off('patientRes');
  dom.view.div.style.display = 'block';
  dom.lastCalc.div.style.display = 'none';
  socket.emit('getPatients', userID);
  socket.on('patientRes', function(patients) {
    socket.emit('getVolunteers', userID);
    socket.once('volunteerRes', function(volunteers) {
      dom.view.map.style.display = 'block';

      function rightClickCorrect(marker, ind, type) {
        socket.off('coordinatesRes');
        var locs = (type == 'patients') ? patients : volunteers;
        socket.emit('getCoordinates', locs[ind].address);
        socket.on('coordinatesRes', function(res) {
          marker.setPosition(res);
          locs[ind].coord = res;
          socket.emit('updateAddress', userID, type, locs[ind].address, {coord: res});
        })
      }
      
      if (patients && volunteers) {

        var types = ['patients', 'volunteers'];

        dom.view.patientCount.innerHTML = patients.length.toString() + ' Patient Addresses';
        dom.view.volunteerCount.innerHTML = volunteers.length.toString() + ' Volunteer Addresses';
        
        initMapWithColors({
          mapName: 'mapView',
          locMat: [patients, volunteers],
          colors: ['green', 'blue'],
          prefaceLabels: ['<b><span style = "color: green">Patient:</span></b> ', '<b><span style = "color: blue">Driver:</span></b> '],
          callbacks: {
            rightclick: (marker, ind, type) => rightClickCorrect(marker, ind, types[type])
          }
        })

      } else if (patients) {

        dom.view.patientCount.innerHTML = patients.length.toString() + ' Patient Addresses';
        dom.view.volunteerCount.innerHTML = '0 Volunteer Addresses';

        initMapWithColors({
          mapName: 'mapView',
          locMat: [patients],
          colors: ['green'],
          prefaceLabels: ['<b><span style = "color: green">Patient:</span></b> '],
          callbacks: {
            rightclick: (marker, ind, _) => rightClickCorrect(marker, ind, 'patients')
          }
        })

      } else if (volunteers) {

        dom.view.patientCount.innerHTML = '0 Patient Addresses';
        dom.view.volunteerCount.innerHTML = volunteers.length.toString() + ' Volunteer Addresses';

        initMapWithColors({
          mapName: 'mapView',
          locMat: [volunteers],
          colors: ['blue'],
          prefaceLabels: ['<b><span style = "color: blue">Driver:</span></b> '],
          callbacks: {
            rightclick: (marker, ind, _) => rightClickCorrect(marker, ind, 'volunteers')
          }
        })

      }
    })
  })
}

function handleAdmin() {
  var locations = [];
  var emails = [];

  function addListeners(arr) {
    for (var seq of arr) (function(seq) {
      if (seq.idekWhatThisParameterDoesButImTooScaredToRemoveIt) {
        socket.off('displayMessageInPopup');
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
          socket.on('displayMessageInPopup', function(message) {
            seq.addressIn.value = message;
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

              initMapWithColors({
                mapName: seq.map,
                locMat: [locations],
                colors: ['yellow'],
                callbacks: {
                  rightclick: function(marker, ind, j) {
                    socket.off('coordinatesRes');
                    socket.emit('getCoordinates', cooked[ind]);
                    socket.on('coordinatesRes', function(res) {
                      marker.setPosition(res);
                      locations[ind].coord = res;
                    })
                  }
                }
              })

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
          var arr2 = [];
          if (seq.idekWhatThisParameterDoesButImTooScaredToRemoveIt) {
            extractRange(results.data, function (res) {
              arr2 = res;
              socket.on('coordinatesMultRes', function(locs, cooked) {
                locations = [];
                for (var i = 0; i < locs.length; i++) {
                  locations.push({coord: locs[i], address: cooked[i]});
                }

                initMapWithColors({
                  mapName: seq.map,
                  locMat: [locations],
                  colors: ['yellow'],
                  callbacks: {
                    rightclick: function(marker, ind, j) {
                      socket.off('coordinatesRes');
                      socket.emit('getCoordinates', cooked[ind]);
                      socket.on('coordinatesRes', function(res) {
                        marker.setPosition(res);
                        locations[ind].coord = res;
                      })
                    }
                  }
                })

                document.getElementById(seq.previewButton).disabled = true;
                seq.addAddressesButton.disabled = false;
                seq.addAddressesButton.onclick = function(e) {
                  e.preventDefault();
                  socket.off('addAddressesSuccess');
                  socket.emit('addAddresses', userID, locations, seq.addressType);
                  socket.on('addAddressesSuccess', viewAddresses);
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
      addAddressesButton: dom.popups.patients.confirm,
      addressType: 'patients',
      idekWhatThisParameterDoesButImTooScaredToRemoveIt: true
    },
    {
      csvInput: 'csvInputVolunteer',
      csvLabel: 'csvLabelVolunteer',
      map: 'mapVolunteer',
      addressIn: 'volunteerAddresses',
      previewButton: 'previewVolunteer',
      addAddressesButton: dom.popups.volunteers.confirm,
      addressType: 'volunteers',
      idekWhatThisParameterDoesButImTooScaredToRemoveIt: true
    }
  ]);

  for (var cancel of document.getElementsByClassName('cancel')) {
    cancel.onclick = function(e) {
      e.preventDefault();
      hidePopups();
    }
  }

  hidePopups();

  dom.tools.addPatients.onclick = function(e) {
    hidePopups();
    dom.popups.patients.previewButton.disabled = false;
    dom.popups.patients.confirm.disabled = true;
    dom.popups.patients.div.style.display = 'block';
  }

  dom.tools.addVolunteers.onclick = function(e) {
    hidePopups();
    dom.popups.volunteers.previewButton.disabled = false;
    dom.popups.volunteers.confirm.disabled = true;
    dom.popups.volunteers.div.style.display = 'block';
  }

  dom.tools.viewAddresses.onclick = viewAddresses;

  dom.tools.lastCalc.onclick = function(e) {
    e.preventDefault();
    droppedLocations();
    setSelected(0);
    dom.lastCalc.droppedSwitch.onclick = function(e2) {
      e2.preventDefault();
      setSelected(0);
      droppedLocations();
    }
    dom.lastCalc.routesSwitch.onclick = function(e2) {
      e2.preventDefault();
      setSelected(1);
      deliveryRoutes();
    }
  }
}

dom.tools.calcRoutes.onclick = function(e) {
  e.preventDefault();
  dom.popups.calc.div.style.display = 'block';
  socket.emit('getCalcCache', userID);
  socket.on('calcCacheRes', function(res) {
    for (var inputID of Object.keys(res)) {
      document.getElementById(inputID).value = res[inputID];
    }
  })
  function updateInputField() {
    dom.popups.calc.numDeliv.disabled = dom.popups.calc.autofillVolunteers.checked;
  } updateInputField();
  dom.popups.calc.autofillVolunteers.oninput = updateInputField;
  dom.popups.calc.confirm.onclick = function(e2){
    e2.preventDefault();

    socket.off('coordinatesRes');
    socket.off('distanceMatrixRes');
    socket.off('patientRes');

    var inputs = ['depotAddressIn', 'maxTime', 'maxDest', 'numDeliv', 'linkToSpreadsheet'];

    // cache it
    socket.emit('updateCalcCache', userID, {
      depotAddressIn: dom.popups.calc.startIn.value,
      maxTime: dom.popups.calc.maxTime.value,
      numDeliv: dom.popups.calc.numDeliv.value
    });

    var allGood = true;/*
    for (var inp of inputs) {
      if (document.getElementById(inp).value === '') {
        allGood = false;
      }
    }*/
    if (allGood) {
      dom.popups.calc.confirm.innerHTML = 'getting distance matrix...';
      dom.popups.calc.confirm.disabled = true;
      var tempsawe = dom.popups.calc.startIn.value;
      socket.emit('getCoordinates', dom.popups.calc.startIn.value);
      socket.on('coordinatesRes', function(start) {
        // get driver locations
        socket.emit('getDistanceMatrix', userID, start);
        socket.on('distanceMatrixRes', function(res) {
          socket.emit('getPatients', userID);
          socket.on('patientRes', function(addresses) {
            res.formattedAddresses.unshift(tempsawe);
            var opts = {
              spreadsheetid: convertToSheetId(dom.popups.calc.spreadsheetLink.value),
              delivererCount: parseInt(dom.popups.calc.numDeliv.value),
              formattedAddresses: res.formattedAddresses
            };
            if (dom.popups.calc.autofillVolunteers.checked) {
              opts.delivererCount = -1;
            }
            if (dom.popups.calc.maxTime.value !== '') {
              opts.maxTime = parseInt(dom.popups.calc.maxTime.value);
            } else {
              opts.maxTime = -1;
            }
            if (dom.popups.calc.maxDest.value !== '') {
              opts.maxDest = parseInt(dom.popups.calc.maxDest.value);
            } else {
              opts.maxDest = -1;
            }
            opts.shouldGenerateTravelTimes = !!dom.popups.calc.genTravelTimes?.checked;
            // console.log(userID, res.times, opts, start, addresses);
            socket.emit('vrp', userID, res.times, opts, start, addresses);
            dom.popups.calc.div.style.display = 'none';
            dom.popups.calc.confirm.innerHTML = 'Calculate';
            dom.popups.calc.confirm.disabled = false;
          });
        })
      })
    }
  }
}

hidePopups();
