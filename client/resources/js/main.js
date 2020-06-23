initializeFirebase();

var hidePopups = function() {
  document.getElementById('addPatientDiv').style.display = 'none';
  document.getElementById('deliveryPersonnelPopup').style.display = 'none';
  //document.getElementById('view').style.display = 'none';

  document.getElementById('csvLabelDelivery').innerHTML = 'import a .csv file';
  document.getElementById('csvLabel').innerHTML = 'import a .csv file';

  document.getElementById('map').style.display = 'none';
}

var initTheMap = function(locs, mapname) {
  console.log(mapname);
  console.log(locs);
  document.getElementById(mapname).style.display = 'block';
  var map = new google.maps.Map(
      document.getElementById(mapname), {zoom: 4, center: locs[0]});
  for (var i = 0; i < locs.length; i++) {
    var marker = new google.maps.Marker({position: locs[i], map: map});
  }
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

function dictToArr() {

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
          socket.on('coordinatesMultRes', function(locs) {
            console.log('add Button event');
            locations = [];
            for (var i = 0; i < locs.length; i++) {
              locations.push({coord: locs[i], address: addressesRaw[i]});
            }
            console.log(locations);
            socket.emit('addAddresses', userID, locations);
            locations = [];
            hidePopups();
          });
        };
        document.getElementById(seq[4]).onclick = function(e) {
          if (document.getElementById(seq[3]).value !== '') {
            e.preventDefault();
            var addressesRaw = document.getElementById(seq[3]).value.split('\n');
            socket.on('coordinatesMultRes', function(locs) {
              locations = [];
              for (var i = 0; i < locs.length; i++) {
                locations.push({coord: locs[i], address: addressesRaw[i]});
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
            console.log('hi');
            socket.on('coordinatesMultRes', function(locs) {
              locations = [];
              for (var i = 0; i < locs.length; i++) {
                locations.push({coord: locs[i], address: arr2[i]});
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
            console.log(results.data);
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

  addListeners([['csvInput', 'csvLabel', 'map', 'patientAddresses', 'preview',true],['csvInputDelivery', 'csvLabelDelivery', 'mapDelivery', 'deliveryAddresses', 'previewDelivery',false]]);

  document.getElementById('addDeliveryPersonnel').onclick = function(e) {
    console.log(emails);
    e.preventDefault();
    if (emails.length === 0) {
      emails = document.getElementById('deliveryAddresses').value.split('\n');
    }
    var allAddresses = [];
    for (var i = 0; i < emails.length; i++) {
      allAddresses.push(emails[i].split(':')[1]);
    }
    var update = {};
    socket.emit('getCoordinatesMult', allAddresses);
    socket.on('coordinatesMultRes', function(locs) {
      for (var i = 0; i < emails.length; i++) {
        update[emails[i].split(':')[0].replaceAll('.', '_period293847293_')] = locs[i];
      }
      socket.emit('addDeliveryPeople', userID, update);
      emails = [];
      hidePopups();
    })
  }

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
  document.getElementById('addDeliveryPerson').onclick = function(e) {
    hidePopups();
    document.getElementById('deliveryPersonnelPopup').style.display = 'block';
  }

  document.getElementById('viewDeliveryPerson').onclick = function(e) {
    e.preventDefault();
    document.getElementById('removeAll').onclick = function(e) {
      e.preventDefault();
      socket.emit('removeAllDeliveryPeople', userID);
    }
    document.getElementById('view').style.display = 'block';
    document.getElementById('deliveryTableTable').style.display = 'none';
    document.getElementById('mapView').style.display = 'block';
    socket.emit('getDeliverersInfo', userID);
    socket.on('delivererInfoRes', function(res) {
      console.log(res);
      initTheMap(res, 'mapView')
      /*
      for (var deliverer of Object.keys(res)) {
        var button = '<button style = "margin: 0px; background-color: rgb(217, 101, 101)">Remove</button>';
        var tr = createRow([deliverer, btr(res[deliverer] !== null), btr(res[deliverer] !== null && 'location' in res[deliverer]), btr(!(res[deliverer] !== null && 'pending' in res[deliverer] && Object.keys(res[deliverer].pending).length === 0) && (res[deliverer] !== null && 'pending' in res[deliverer])), button]);
        document.getElementById('deliveryTableBody').appendChild(tr);
      }*/
    });
  }
  document.getElementById('viewPatient').onclick = function(e) {
    e.preventDefault();
    document.getElementById('removeAll').onclick = function(e) {
      e.preventDefault();
      socket.emit('removeAllAddresses', userID);
    }
    document.getElementById('view').style.display = 'block';
    document.getElementById('deliveryTableTable').style.display = 'none';
    socket.emit('getPatients', userID);
    socket.on('patientRes', function(patients) {
      document.getElementById('mapView').style.display = 'block';
      var locs = [];
      for (var patient of patients) {
        locs.push(patient.coord);
      }
      initTheMap(locs, 'mapView');
    })
  }
}

function handleDelivery() {
  socket.emit('getDeliveries', userID);
  socket.on('deliveryRes', function(pendingDeliveries) {
    document.getElementById('deliverStuff').style.display = 'block';
    if (pendingDeliveries === null) {
      document.getElementById('markAsDone').style.display = 'none';
      document.getElementById('noDeliveries').style.display = 'block';
    } else if (pendingDeliveries === 'no address' ){
      document.getElementById('giveLocation').style.display = 'block';
      document.getElementById('giveLocation').onclick = function(e) {
        e.preventDefault();
        document.getElementById('confirmAddress').style.display = 'block';
        document.getElementById('confirmAddressPreview').onclick = function(e2) {
          e2.preventDefault();
          socket.emit('getCoordinates', document.getElementById('confirmAddressIn').value);
          socket.on('coordinatesRes', function(loc) {
            initTheMap([loc], 'confirmAddressMap');
          })
        }
        document.getElementById('confirmAddressConfirm').onclick = function(e2) {
          e2.preventDefault();
          socket.emit('getCoordinates', document.getElementById('confirmAddressIn').value);
          socket.on('coordinatesRes', function(loc) {
            socket.emit('confirmDeliveryAddress', userID, loc);
            document.getElementById('confirmAddress').style.display = 'none';
          })
        }
      }
    } else {
      document.getElementById('markAsDone').style.display = 'block';
      document.getElementById('noDeliveries').style.display = 'none';
    }
  })
}

document.getElementById('routes').onclick = function(e) {
  e.preventDefault();
  document.getElementById('calculatePopup').style.display = 'block';
  document.getElementById('confirmCalculation').onclick = function(e2){
    e2.preventDefault();
    socket.emit('getCoordinates', document.getElementById('depotAddressIn').value);
    socket.on('coordinatesRes', function(start) {
      socket.emit('getDeliverersInfo', userID);
      socket.on('delivererInfoRes', function(deliverers) {
        // get driver locations
        if (window.localStorage.getItem('times') === null) {
          socket.emit('getDistanceMatrix', userID, start);
          socket.on('distanceMatrixRes', function(res) {
            console.log(res);
            var times = {};

            for (var destination of res.resourceSets[0].resources[0].results) {
              if (destination.originIndex in times) {
                times[destination.originIndex].push(parseFloat(destination.travelDuration));
              } else {
                times[destination.originIndex] = [parseFloat(destination.travelDuration)];
              }
            } times = Object.values(times);
            console.log(times);
            window.localStorage.setItem('times', JSON.stringify(times));
            socket.emit('vrp', times, {
              timelimit: document.getElementById('timeLimit').value,
              delivererCount: deliverers.length
            });
          })
        } else {
          console.log(JSON.parse(window.localStorage.getItem('times')));
          socket.emit('vrp', JSON.parse(window.localStorage.getItem('times')), {
            timelimit: document.getElementById('timeLimit').value,
            delivererCount: deliverers.length
          });
        }

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
    else {
      handleDelivery();
    }
  })
})

var socket = io();
