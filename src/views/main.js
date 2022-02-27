import m from 'mithril';
import Papa from 'papaparse';

import CSVSelector from './csvselector';
import Map from './map';
import IconButton from './icon-button';
import RouteGenPopup from './route-generation-popup';

import Cookies from '../utils/cookies';
import { POST } from '../utils/utils';

import '../resources/css/main.css';
import '../resources/css/loginforeign.css';

export default class Main {
  constructor(vnode) {
    this.drop = {
      active: false,
      failed: false,
      hidden: false,
    };
    this.csv = {
      active: false,
      matrix: null,
    };
    this.routegenactive = false;
    this.addresses = [];
  }

  fetchAddresses() {
    POST('http://localhost:4002/getAddresses', { uid: this.uid })
      .then(res => {
        this.addresses = res;
        m.redraw();
      })
      .catch(console.log);
  }

  addAddresses(addresses) {
    console.log('selected', addresses);
    POST('http://localhost:4002/addAddresses', { uid: this.uid, addresses })
      .then(res => {
        console.log(res);
        this.fetchAddresses();
      })
      .catch(console.error)
  }

  findById(id) {
    for (let i = 0; i < this.addresses.length; i++)
      if (this.addresses[i]._id === id)
        return i;
  }

  removeAddress(id) {

    console.log('---DELETE', id);

    POST('http://localhost:4002/deleteAddress', { addressId: id })
      .then(_ => {
        this.addresses.splice(this.findById(id), 1);
        m.redraw();
      })
      .catch(console.log)

  }

  changeAddress(id, newAdd, callback) {

    console.log('---UPDATE', id, newAdd);

    POST('http://localhost:4002/getCoordinates', { address: newAdd })
      .then(coord => {

        POST('http://localhost:4002/updateAddress', { 
          uid: this.uid,
          addressId: id, 
          update: { name: newAdd, coord } 
        })
          .then(updated => {
            const ind = this.findById(id);
            this.addresses[ind] = Object.assign(this.addresses[ind], updated);
            callback(updated.coord);
          })
          .catch(console.log)

      })
      .catch(console.log)
  }

  uploadCsv(file) {
    this.drop.active = false;
    if (file.type !== 'application/vnd.ms-excel') {
      this.drop.failed = true;
      return;
    }

    Papa.parse(file, {
      complete: e => {
        console.log(e.data);

        this.csv.matrix = e.data.filter(row => row.join('').length > 0);
        this.csv.active = true;

        window.localStorage.setItem('csv', JSON.stringify(this.csv));
      }
    });
  }

  oninit(vnode) {
    this.uid = Cookies.get('uid');
    if (!this.uid) window.location.href = '/';

    this.fetchAddresses();

    // let shit = window.localStorage.getItem('csv');
    // if (shit) this.csv = JSON.parse(shit);
  }

  handleDragOver(e) {
    e.preventDefault();
    this.drop.active = true; 
    this.drop.failed = false;
  }

  handleDragLeave(e) {
    console.log('leave');
    this.drop.active = false;
  }

  handleDrop(e) {
    e.preventDefault();
    this.uploadCsv(e.dataTransfer.files[0]);
  }

  view(vnode) {
    return [
      m('div', {class: "w3-panel w3-center w3-opacity", style: "padding:12px 16px"}, [
        m('h1', 'Route Creation Service (V2)'),
        /*m('div', {class: 'w3-bar w3-border'}, [
          m('button', {class: 'w3-bar w3-button', onclick: e => { this.fetchAddresses(); }}, 'Get Shit'),
        ])*/
      ]),

      m('div', { 'class': 'map', /*style: {backgroundColor: 'gray'}*/ }, [

        m(Map, { 
          addresses: this.addresses,
          handlers: {
            ondragover  : this.handleDragOver  .bind(this),
            ondragleave : this.handleDragLeave .bind(this),
            ondrop      : this.handleDrop      .bind(this),
          },

          updates: {
            change      : this.changeAddress   .bind(this),
            remove      : this.removeAddress   .bind(this),
          }
        }),

        m('div', {class: 'map-overlay'}, [
          m('div', {class: `tool-group ${this.addresses.length > 0 ? '' : 'hidden'}`}, [
            m(IconButton, {icon: 'build', title: 'Generate Routes', onclick: e => {
              this.routegenactive = true;
            }}),
          ])
        ]),

        m('div', {'class': `address-view ${this.addresses.length > 0 ? 'hidden' : ''} ${this.drop.active ? 'active' : ''} ${this.drop.failed ? 'failed' : ''}`}, 
          m("div", {
            class: `drag-area`,
  
            ondragover  : this.handleDragOver  .bind(this),
            ondragleave : this.handleDragLeave .bind(this),
            ondrop      : this.handleDrop      .bind(this),
  
          }, [
            m("div", {"class":"icon"}, 
              m("i", {"class":"fas fa-cloud-upload-alt"})
            ),
            m("header", "No Addresses Stored"),
            m("span", m.trust("Drag & Drop <b><i>CSV</i></b> OR")),
            m("button", {class: 'drag-drop-button', onclick: e => {
              document.querySelector('input#csvIn').click();
            }}, this.addresses.length > 0 ? "Upload More" : "Browse"),
            m("input", {"type":"file","id":"csvIn", "hidden":"hidden", onchange: e => {
              this.drop.active = true;
              this.uploadCsv(e.target.files[0]);
            }})
          ])
        ),      

      ]),

      m(RouteGenPopup, {
        active: this.routegenactive,

        status: (res, params) => {
          this.routegenactive = false;

          if (res === 'success') {
            console.log('got', params);

            POST('http://localhost:4002/vrp', { uid: this.uid, params })
              .then(res => {
                console.log(res);
              })
              .catch(console.error)
          }
        }
      }),

      m(CSVSelector, {
        active: this.csv.active,
        matrix: this.csv.matrix,

        status: (res, params) => {
          this.csv.active = false;
          this.csv.matrix = null;
  
          if (res === 'success')
            this.addAddresses(params);
        },
      }),

    ]
  }
}
