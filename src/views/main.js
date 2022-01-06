import m from 'mithril';
import Papa from 'papaparse';

import CSVSelector from './csvselector';
import Map from './map';

import Cookies from '../utils/cookies';

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
    this.addresses = [];
  }

  fetchAddresses() {
    const uid = this.uid;

    m.request({
      method: 'POST',
      url: 'http://localhost:4002/getAddresses',
      headers: { 'Content-Type': 'application/json' },
      body: { uid },
    })
      .then(res => {
        console.log('addresses', res);
        this.addresses = res;
        m.redraw();
      })
      .catch(err => {
        window.alert('none');
      })
  }

  addAddresses(addresses) {
    console.log('selected', addresses);
    m.request({
      method: 'POST',
      url: 'http://localhost:4002/addAddresses',
      headers: { 'Content-Type': 'application/json' },
      body: { uid: this.uid, addresses },
    })
      .then(this.fetchAddresses.bind(this))
      .catch(err => {
        console.error(err);
      })
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
        m('div', {class: 'w3-bar w3-border'}, [
          m('button', {class: 'w3-bar w3-button', onclick: e => { this.fetchAddresses(); }}, 'Get Shit'),
        ])
      ]),

      m('div', { 'class': 'map' }, [

        m(Map, { 
          addresses: this.addresses,
          handlers: {
            ondragover  : this.handleDragOver  .bind(this),
            ondragleave : this.handleDragLeave .bind(this),
            ondrop      : this.handleDrop      .bind(this),
          }
        }),  

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
            m("span", "Drag & Drop OR"),
            m("button", {class: 'drag-drop-button', onclick: e => {
              document.querySelector('input#csvIn').click();
            }}, "Upload CSV"),
            m("input", {"type":"file","id":"csvIn", "hidden":"hidden", onchange: e => {
              this.drop.active = true;
              this.uploadCsv(e.target.files[0]);
            }})
          ])
        ),      
        
      ]),

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
