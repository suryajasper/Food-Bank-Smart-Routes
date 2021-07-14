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

function createIwString(prefaceLabel, info) {
  return `
    <div class = "marker-info-container inline-children">
      ${prefaceLabel} <span class="hide-span"></span>
      <input title = "Modify Address" class="hide-until-focus marker-info-input" value="${info}">
      <div title = "Remove Address" class = "cancel-svg-container">
        <svg viewBox="0 0 24 24" class = "cancel-svg remove-address-button">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path>
        </svg>
      </div>
    </div>
  `;
}

function initMapWithColors({mapName, locMat, colors, prefaceLabels, callbacks}) {
  document.getElementById(mapName).style.display = 'block';

  map = new google.maps.Map(document.getElementById(mapName), {zoom: 4, center: (locMat[0][0] || locMat[1][0]).coord});
  const bounds = new google.maps.LatLngBounds();
  
  socket.off('colorsRes');
  const iw = new google.maps.InfoWindow();

  let activeMarker = {
    marker: null,
    ind: [-1, -1]
  };

  if (callbacks.update) {
    iw.addListener('domready', function() {
      console.log(activeMarker);
  
      const input = document.querySelector('.marker-info-input');
      const hide = input.previousElementSibling;
      const removeButton = input.nextElementSibling.querySelector('.remove-address-button');
  
      const startVal = input.value;
      
      function resize() {
        hide.textContent = input.value;
        input.style.width = `${hide.offsetWidth+10}px`;
      }
      
      function update() {
        input.onblur = null;
        input.blur();
        input.onblur = update;

        if (input.value !== startVal) callbacks.update(activeMarker.marker, input.value, ...activeMarker.ind);
        startVal = input.value;
        // activeMarker.iw.setInfo(createIwString(prefaceLabels, input.value));
      }
      
      input.oninput = resize;
      resize();
  
      input.blur();
      setTimeout(() => input.blur(), 100)
  
      input.onkeydown = e => { if (e.key === 'Enter') update(); }
      input.onblur = update;

      removeButton.onclick = e => callbacks.remove(activeMarker.marker, ...activeMarker.ind);
    })
  }
  
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
        if (prefaceLabels) {
          if (callbacks.update) {
            markObj.info = createIwString(prefaceLabels[j], markObj.info);
          } else {
            markObj.info = `${prefaceLabels[j]} ${markObj.info}`;
          }
        }

        let marker = createMarker(markObj);

        marker.addListener('click', function() { activeMarker = { marker, iw: markObj.iw, ind: [i, j] }; })

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
