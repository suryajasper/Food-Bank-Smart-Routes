var socket = io();

var email = document.getElementById("email");
var password = document.getElementById("password");
var confirmPassword = document.getElementById('confirmpassword');
var accountPassword = document.getElementById("accountpassword");
var confirmAccountPassword = document.getElementById('confirmaccountpassword');

var submitButton = document.getElementById("submitButton");

initializeFirebase();

function signUp() {
  firebase.auth().createUserWithEmailAndPassword(email.value, password.value).then(auth => {
    socket.emit('createAdmin', auth.user.uid, email.value, accountPassword.value);
    window.location = 'login.html';
  }).catch(error => {
    alert(error.message);
  })
}

document.getElementById('signupbutton').onclick = function(e) {
  e.preventDefault();
  if (password.value === confirmPassword.value && accountpassword.value === confirmaccountpassword.value) {
    signUp();
  }
}
