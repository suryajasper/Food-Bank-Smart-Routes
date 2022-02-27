import m from 'mithril';

import Login from './login';

import '../resources/css/login.css';
import '../resources/css/loginforeign.css';

export default class Landing {
  constructor(vnode) {
    this.popupActive = false;
  }

  handleLogin(status) {
    if (status === 'cancelled') this.popupActive = false;
    else if (status === 'success') window.location.href = '/#!/main/';
  }

  view(vnode) {
    return [
      m("header", {"class": "w3-panel w3-center w3-opacity","style":{"padding":"128px 16px"}},
        [
          m("h1", {"class":"w3-xlarge"}, 
            "Fresh Produce Program Smart Routes"
          ),
          m("div", {"class":"w3-padding-32"}, 
            m("div", {"class":"w3-bar w3-border"}, 
              m("button", {"class":"w3-bar-item w3-button", onclick: e => {
                this.popupActive = true;
              }}, "Login")
            )
          )
        ]
      ), 
      
      m(Login, {
        active: this.popupActive,
        status: this.handleLogin.bind(this),
      }),

      m("footer", {"class":"w3-container w3-padding-32 w3-center w3-large"}, 
        m("p",
          [
            "Created by ",
            m("a", {"class":"w3-hover-text-green","href":"http://suryajasper.com/","target":"_blank"}, 
              "Surya Jasper"
            )
          ]
        )
      )
    ];
  }
}
