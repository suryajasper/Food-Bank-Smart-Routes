import m from 'mithril';

import Cookies from '../utils/cookies';

import '../resources/css/login.css';
import '../resources/css/loginforeign.css';

export default class Login {
  constructor(vnode) {
    this.status = vnode.attrs.status;
    this.params = {
      username: '',
      email: '',
      password: '',
    };
  }

  oninit(vnode) {
    if (Cookies.get('uid')) {
      this.status('success');
    }
  }

  authenticateUser() {
    console.log(this.params);
    m.request({
      method: 'POST',
      url: 'http://localhost:4002/authenticateUser',
      headers: {
        'Content-Type': 'application/json',
      },
      body: this.params,
    }).then(res => {
      console.log(res);
      Cookies.set('uid', res.uid, 3);
      this.status('success');
    }).catch(err => {
      window.alert('incorrect');
    })
  }

  view(vnode) {
    return m("div", {"class":"modal", "style": `display: ${vnode.attrs.active ? "block" : "none"}`},
      m("form", {"class":"modal-content animate","id":"loginform"},
        [
          m("div", {"class":"container"},
            [
              m("label", {"for":"email"}, m("b", "Email")),

              m("input", {
                id: "email",
                type: "text",
                name: "email",
                placeholder: "email address",
                required: "required",
                oninput: e => {
                  this.params.email = e.target.value;
                },
              }),

              m("label", {"for":"psw"}, m("b", "Password")),

              m("input", {
                id: "password",
                type: "password",
                placeholder: "password",
                name: "psw",
                oninput: e => {
                  this.params.password = e.target.value;
                },
              }),

              m("br"),
              m("input", {"class":"button","type":"button","value":"Log in", onclick: e => { this.authenticateUser(); }}),
              m("br"),
            ]
          ),
          m("div", {"class":"container","style":{"background-color":"#f1f1f1"}}, 
            m("button", {"class":"cancelbtn","type":"button", onclick: e => {
              this.status('cancelled');
            }}, "Cancel")
          )
        ]
      )
    )
  }
}
