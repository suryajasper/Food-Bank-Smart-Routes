import m from 'mithril';

import Cookies from '../utils/cookies';

import '../resources/css/main.css';
import '../resources/css/loginforeign.css';

export default class Main {
  constructor(vnode) {
    
  }

  fetchAddresses() {
    m.request({
      method: 'POST',
      url: 'http://localhost:4002/getAddresses',
      headers: { 'Content-Type': 'application/json' },
      body: { uid: this.uid },
    }).then(res => {
      console.log('addresses', res);
    }).catch(err => {
      window.alert('none');
    })
  }

  oninit(vnode) {
    this.uid = Cookies.get('uid');
    if (!this.uid) window.location.href = '/';
  }

  view(vnode) {
    return [
      m('div', {class: "w3-panel w3-center w3-opacity", style: "padding:12px 16px"}, [
        m('h1', 'Route Creation Service (V2)'),
        m('div', {class: 'w3-bar w3-border'}, [
          m('button', {class: 'w3-bar w3-button', onclick: e => { this.fetchAddresses(); }}, 'Add Addresses'),
          m('button', {class: 'w3-bar w3-button'}, 'Add Addresses'),
          m('button', {class: 'w3-bar w3-button'}, 'Add Addresses'),
        ])
      ])
    ]
  }
}
