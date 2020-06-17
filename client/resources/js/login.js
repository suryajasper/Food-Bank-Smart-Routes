var socket = io();

initializeFirebase();

var email = document.getElementById("email");
var password = document.getElementById("password");
var submitButton = document.getElementById("login");

function logIn() {
  socket.emit('checkRegularUser', email.value, password.value);
  socket.on('userRegistered', function(isRegistered, isAdmin) {
    if (isAdmin) {
      firebase.auth().signInWithEmailAndPassword(email.value, password.value).then(auth => {
        window.location = 'main.html';
      }).catch(error => {
        console.log('incorrect password');
      });
    } else {
      if (isRegistered) {
        firebase.auth().createUserWithEmailAndPassword(email.value, password.value).then(auth => {
          socket.emit('createDeliverer', auth.user.uid, email.value);
          window.location.href = 'main.html';
        });
      } else {
        window.alert('If you are an administrator, you have not created an account yet. Otherwise, please double check with your administrator to make sure you are using the correct email address and whether you have been registered or not.');
      }
    }
  })
}

submitButton.onclick = function(e) {
  e.preventDefault();
  logIn();
}
