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
      confirmPass: '',
    };
    this.MIN_USERNAME_LEN = 6;
  }

  oninit(vnode) {
    if (Cookies.get('uid')) {
      this.status('success');
    }
    else if (Cookies.get('logged out')) {
      Cookies.erase('logged out');
      window.location.reload();
    }
  }

  authenticateUser(vnode) {
    if (this.password !== this.confirmPass) {
      window.alert('Passwords don\'t match');
      return;
    }

    m.request({
      method: 'POST',
      url: `http://localhost:4002${vnode.attrs.signup ? '/createUser' : '/authenticateUser'}`,
      headers: {
        'Content-Type': 'application/json',
      },
      body: this.params,
    })
      .then(res => {
        Cookies.set('uid', res.uid, 3);
        this.status('success');
      })
      .catch(err => {
        window.alert('incorrect username or password');
      })
  }

  validateInputs(vnode) {
    const p = this.params;

    const splitEmail = p.email.split('@');

    return ( splitEmail[1] && splitEmail[1].includes('.') ) &&
           ( !vnode.attrs.signup || (p.password === p.confirmPass && p.username.length >= this.MIN_USERNAME_LEN) );
  }

  view(vnode) {
    return m("div", {"class":"modal", "style": `display: ${vnode.attrs.active ? "block" : "none"}`},
      m("form", { class: "modal-content animate", id: "loginform" }, [

        m("div", {"class":"container"}, [
          
          vnode.attrs.signup ? [

            m("label", {"for":"username"}, m("b", "Username")),

            m("input", {
              type: "text",
              placeholder: `Username (${this.MIN_USERNAME_LEN}+ characters)`,
              name: 'username',
              required: "required",
              oninput: e => {
                this.params.username = e.target.value;
              },
            }),

          ] : '',

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

          m("label", m("b", "Password")),

          m("input", {
            type: "password",
            placeholder: "password",
            oninput: e => {
              this.params.password = e.target.value;
            },
          }),

          vnode.attrs.signup ? [
            m("label", m("b", "Confirm Password")),
  
            m('input', {
              type: 'password',
              placeholder: 'Re-enter Password',
              oninput: e => {
                this.params.confirmPass = e.target.value;
              },
            }),
          ] : '',
          
          m("button", {
            class: "nobuttoncss", 
            onclick: e => { e.preventDefault(); this.authenticateUser(vnode); }, 
            disabled: !this.validateInputs(vnode),
          }, vnode.attrs.signup ? 'Sign Up' : 'Log In'),

        ]),

        m("div", {"class":"container highlight"}, 
          m("button", {"class":"cancelbtn nobuttoncss","type":"button", onclick: e => {
            this.status('cancelled');
          }}, "Cancel")
        )
      ])
    )
  }
}
