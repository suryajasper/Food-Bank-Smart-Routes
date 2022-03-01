import m from 'mithril';

import Login from './login';

import '../resources/css/login.css';
import '../resources/css/loginforeign.css';

export default class Landing {
  constructor(vnode) {
    this.popup = {
      active: false,
      signup: false,
    };
  }

  handleLogin(status) {
    if (status === 'cancelled') this.popup.active = false;
    else if (status === 'success') window.location.href = '/#!/main/';
  }

  view(vnode) {
    return [
      m('div', {"class": 'image-fill-container'}, [
        
        m(Login, {
          active: this.popup.active,
          signup: this.popup.signup,
          status: this.handleLogin.bind(this),
        }),
  
        m("footer", {"class":"w3-container w3-padding-32 w3-center w3-large"}, [
          m('div', {class: 'login-button-container'}, [
            m('div', { onclick: () => {
              this.popup = { active: true, signup: false };
            } }, 'Log In'),
            m('div',  { onclick: () => {
              this.popup = { active: true, signup: true };
            } }, 'Sign up'),
          ]),
          m("p", [ "Created by ",
            m("a", {"class":"w3-hover-text-green","href":"http://suryajasper.com/","target":"_blank"}, 
              "Surya Jasper"
            )
          ])
        ])

      ])
    ];
  }
}
