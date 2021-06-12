function createMarkerImage(color, fill=false) {
  let pinColor = color;

  // Pick your pin (hole or no hole)
  let pinSVGHole = "M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z";
  let pinSVGFilled = "M 12,2 C 8.1340068,2 5,5.1340068 5,9 c 0,5.25 7,13 7,13 0,0 7,-7.75 7,-13 0,-3.8659932 -3.134007,-7 -7,-7 z";

  let markerImage = {  // https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerLabel
    path: fill ? pinSVGFilled : pinSVGHole,
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
  let mapInit = {
    position: m.coord,
    map: m.map
  };
  if ('icon' in m) {
    mapInit.icon = m.icon;
  }
  let marker = new google.maps.Marker(mapInit);
  google.maps.event.addListener(marker, 'click', function() {
    m.iw.setContent(m.info);
    m.iw.open(m.map, marker);
  });
  return marker;
}

function initMapWithColors({mapName, locMat, colors, prefaceLabels, callbacks}) {
  document.getElementById(mapName).style.display = 'block';

  map = new google.maps.Map(document.getElementById(mapName), {zoom: 4, center: locMat[0][0].coord});
  const iw = new google.maps.InfoWindow();
  const bounds = new google.maps.LatLngBounds();

  socket.off('colorsRes');

  function render(_colors) {
    for (let j = 0; j < locMat.length; j++) (function(j) {

      let locs = locMat[j];
      let color = _colors[j];

      for (let i = 0; i < locs.length; i++) {

        // init marker
        let markObj = {
          map: map, 
          iw: iw,
          coord: locs[i].coord,
          info: locs[i].address, 
          icon: createMarkerImage(color)
        };
        if (prefaceLabels)
          markObj.info = prefaceLabels[j] + markObj.info;
        let marker = createMarker(markObj);

        // setup callbacks
        if (callbacks) {
          Object.entries(callbacks).forEach(([cbName, cbFunc]) => {
            google.maps.event.addListener(marker, cbName, (function(marker, i, j) {
              return function() { cbFunc(marker, i, j); }
            })(marker, i, j))
          })
        }

        // change bounding box for map view
        bounds.extend(locs[i].coord);
      }
    })(j)

    map.fitBounds(bounds);
  }
  
  // colors specified
  if (colors) render(colors);

  else {
    // randomize colors
    socket.emit('getColors', locMat.length);
    socket.on('colorsRes', render);
  }
}

function initMapWithRoutes(_locs) {
  let locs = _locs.map(function(arr) {
    return arr.slice();
  });
  let directionsService = new google.maps.DirectionsService();
  let directionsRenderer = new google.maps.DirectionsRenderer();
  let map = new google.maps.Map(dom.lastCalc.routesMap, {
    zoom: 6
  });
  directionsRenderer.setMap(map);
  calculateAndDisplayRoute(directionsService, directionsRenderer, locs);
  for (let i = 0; i < locs.length; i++) {
    locs[i] = locs[i].replaceAll(' ', '+');
  }
  let url = 'https://www.google.com/maps/dir/?api=1&';
  url += 'origin=' + locs[0] + '&';
  url += 'destination=' + locs[locs.length-1]
  if (locs.length > 2) {
    url += '&travelmode=driving&waypoints=';
    url += locs[1];
    for (let i = 2; i < locs.length-1; i++) {
      url += '%7C' + locs[i];
    }
  };
  dom.lastCalc.routeLink.href = url;
  dom.lastCalc.routeLinkCopy.onclick = function() {
    let copyText = document.createElement("input");
    document.body.appendChild(copyText);
    copyText.value = url;
    copyText.select();
    copyText.setSelectionRange(0, 99999);
    document.execCommand("copy");
    copyText.remove();
  }
}

function calculateAndDisplayRoute(directionsService, directionsRenderer, locs) {
  let start = locs[0];
  let end = locs[locs.length-1];
  let waypts = [];
  for (let i = 1; i < locs.length-1; i++) {
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
