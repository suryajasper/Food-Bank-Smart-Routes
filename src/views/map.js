import m from 'mithril';

import {Loader, LoaderOptions} from 'google-maps';
const colorGen = require('iwanthue');

export default class Map {
  constructor(vnode) {

    // initialize google maps api
    this.google = null;

    const loader = new Loader('AIzaSyB874rZyp7PmkKpMdfpbQfKXSSLEJwglvM', {});
    loader.load().then(gl => {
      this.google = gl; 
      this.iw = new this.google.maps.InfoWindow();
      m.redraw();
    });

    this.map = null;

    this.update = vnode.attrs.update;
    this.handlers = vnode.attrs.handlers;
    this.addCache = this.objectify([]);
    
  }

  objectify(addresses) {
    let obj = {};
    this.cacheLength = 0;
    addresses.forEach(add => { obj[add._id] = add; this.cacheLength++; })
    return obj;
  }

  createIwString(prefaceLabel, info) {
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

  createMarkerImage(color, fill=false) {
    let pinColor = color;
    
    let pinSVGHole = "M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z";
    let pinSVGFilled = "M 12,2 C 8.1340068,2 5,5.1340068 5,9 c 0,5.25 7,13 7,13 0,0 7,-7.75 7,-13 0,-3.8659932 -3.134007,-7 -7,-7 z";
  
    let markerImage = {  // https://developers.google.com/maps/documentation/javascript/reference/marker#MarkerLabel
      path: fill ? pinSVGFilled : pinSVGHole,
      anchor: new this.google.maps.Point(12,17),
      fillOpacity: 1,
      fillColor: pinColor,
      strokeWeight: 2,
      strokeColor: "black",
      scale: 2
    };
  
    return markerImage;
  }
  
  createMarker({ coord, map, color, info }) {
    let mapInit = {
      position: coord,
      map: map,
      icon: this.createMarkerImage(color),
    };
    
    const marker = new this.google.maps.Marker(mapInit);

    this.google.maps.event.addListener(marker, 'click', () => {
      this.iw.setContent(info);
      this.iw.open(map, marker);
    });

    return marker;
  }

  reloadMap(vnode) {

    const { addresses, editable } = vnode.attrs;

    console.log('reloading the map', document.querySelector('#shit'));

    this.map = new this.google.maps.Map(document.querySelector('#shit'), {
      center: addresses[0].coord,
      zoom: 4,
    });

    const bounds = new google.maps.LatLngBounds();

    const colors = colorGen(addresses.length);

    addresses.forEach(add => {

      const marker = this.createMarker({ coord: add.coord, map: this.map, color: add.type === 'patients' ? 'red' : 'green', info: add.name });

      bounds.extend(add.coord);

    })

    this.map.fitBounds(bounds);

    this.addCache = this.objectify(addresses);

  }

  view(vnode) {
    let { addresses } = vnode.attrs;

    if (this.google && addresses.length > 0 && addresses.length != this.cacheLength)
      this.reloadMap(vnode);
    
    return m('div', Object.assign(
      { class: 'map', id: 'shit' },
      this.handlers,
    ));
  }
}