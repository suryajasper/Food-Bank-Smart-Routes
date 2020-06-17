var socket = io();

var email = document.getElementById("email");
var password = document.getElementById("password");
var confirmPassword = document.getElementById('confirmpassword');

var submitButton = document.getElementById("submitButton");

initializeFirebase();

function signUp() {
  firebase.auth().createUserWithEmailAndPassword(email.value, password.value).then(auth => {
    socket.emit('createUser', auth.user.uid, document.getElementById('username').value);
    window.location = 'login.html';
  }).catch(error => {
    alert(error.message);
  })
}

document.getElementById('signupbutton').onclick = function(e) {
  e.preventDefault();
  if (password.value === confirmPassword.value) {
    signUp();
  }
}
