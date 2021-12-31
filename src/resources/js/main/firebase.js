initializeFirebase();

var userID;

var socket = io();

firebase.auth().onAuthStateChanged(function(user) {
  userID = user.uid;
  socket.emit('bruhAmIAdminOrNot', userID);
  socket.on('youAreNotTheAdmin', function(isAdmin) {
    if (isAdmin) {
      document.getElementById('showIfAdmin').style.display = 'block';
      handleAdmin();
    }
  })
})

/*---------------For Debugging only (don't include in final version)------------*/

function updateDatabase(path, data) {
  if (typeof(path) == 'string') {
    path = path.split('/');
  }
  socket.emit('updateDatabase', path, data);
}

function setDatabase(path, data) {
  if (typeof(path) == 'string') {
    path = path.split('/');
  }
  socket.emit('setDatabase', path, data);
}

function getDatabase(path, callback) {
  if (typeof(path) == 'string') {
    path = path.split('/');
  }
  socket.off('getDatabaseSuccess');
  socket.emit('getDatabase', path);
  socket.on('getDatabaseSuccess', function(res) {
    if (callback)
      callback(res);
    else
      console.log(res);
  });
}

socket.on('print', console.log);

socket.on('reporterror', window.alert);

/*------------------------------------------------------------------------------*/
