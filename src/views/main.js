import m from 'mithril';
import Papa from 'papaparse';

import { CSVSelector, TableView } from './csvselector';
import Map from './map';
import IconButton from './icon-button';
import { icons } from './icons';
import RouteGenPopup from './route-generation-popup';

import Cookies from '../utils/cookies';
import { POST, ldb, parseSheetsObj } from '../utils/utils';

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
    this.routes = {
      active: false,
      matrix: null,
    };

    this.routegenactive = false;
    this.addresses = [];
  }

  fetchAddresses() {
    POST('/getAddresses', { uid: this.uid })
      .then(res => {
        this.addresses = res;
        m.redraw();
      })
      .catch(console.log);
  }

  addAddresses(addresses) {
    console.log('selected', addresses);
    POST('/addAddresses', { uid: this.uid, addresses })
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

    POST('/deleteAddress', { addressId: id })
      .then(_ => {
        this.addresses.splice(this.findById(id), 1);
        m.redraw();
      })
      .catch(console.log)

  }

  removeAllAddresses() {

    console.log('--REMOVE ALL ADDRESSES');

    POST('/removeAddresses', { uid: this.uid })
      .then(_ => {
        this.addresses = [];
        m.redraw();
      })
      .catch(console.log)

  }

  changeAddress(id, newAdd, callback) {

    console.log('---UPDATE', id, newAdd);

    POST('/getCoordinates', { address: newAdd })
      .then(coord => {

        POST('/updateAddress', { 
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

    /*this.routes.matrix = parseSheetsObj(ldb.get('vrpSave'));
    this.routes.active = true;*/

    this.uid = Cookies.get('uid');
    if (!this.uid) window.location.href = '/';

    this.fetchAddresses();

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

        m('div', {'class': `address-view ${this.addresses.length > 0 ? 'hidden' : ''} ${this.drop.active ? 'active' : ''} ${this.drop.failed ? 'failed' : ''}`}, 
          m("div", {

            class: `drag-area`,
  
            ondragover  : this.handleDragOver  .bind(this),
            ondragleave : this.handleDragLeave .bind(this),
            ondrop      : this.handleDrop      .bind(this),
  
          }, [
            m("div", {"class":"icon"}, m("i", {"class":"fas fa-cloud-upload-alt"}) ),
            m("header", "No Addresses Stored"),
            m("span", m.trust("Drag & Drop <b><i>CSV</i></b> OR")),

            m("button", {class: 'drag-drop-button', onclick: e => {
              document.querySelector('input#csvIn').click();
            }}, this.addresses.length > 0 ? icons.upload : "Browse"),

            m("input", {"type":"file","id":"csvIn", "hidden":"hidden", onchange: e => {
              this.drop.active = true;
              this.uploadCsv(e.target.files[0]);
            }})
          ])
        ),

        m('div', {class: `page-title-container w3-center ${this.addresses.length == 0 ? '' : 'hidden'}`}, [
          m('h1', {class: 'page-title'}, 'Route Creation Service (V2)'),
        ]),

        m('div', {class: 'map-overlay'}, [
          m('div', {class: `tool-group ${this.addresses.length > 0 ? '' : 'hidden'}`}, [

            m(IconButton, {icon: 'upload', title: 'Upload More Addresses', onclick: e => {
              document.querySelector('#csvIn').click();
            }}),
            m(IconButton, {icon: 'trash', title: 'Clear All Addresses', onclick: e => {
              this.removeAllAddresses();
            }}),
            m(IconButton, {icon: 'build', title: 'Generate Routes', onclick: e => {
              this.routegenactive = true;
            }}),

          ])
        ]),      

      ]),

      m(RouteGenPopup, {
        active: this.routegenactive,

        status: (res, params) => {
          this.routegenactive = false;

          if (res === 'success') {
            console.log('got', params);

            POST('/vrp', { uid: this.uid, params })
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

      m(TableView, {
        active: this.routes.active,
        matrix: this.routes.matrix,

        status: res => {
          console.log(res);
        }
      })

    ]
  }
}
