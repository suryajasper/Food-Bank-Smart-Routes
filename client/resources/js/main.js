var socket = io();

var popup = document.getElementById("popup");
var nameIn = document.getElementById("name");
var thumbIn = document.getElementById('thumbInput');
var foodbankDiv = document.getElementById('foodbankDiv');
var _maxStorage = document.getElementById('maxStorage');

var imageRaw;

initializeFirebase();

document.getElementById('addBank').onclick = function(e) {
  e.preventDefault();
  popup.style.display = "block";
}

function initMap(location) {
  var map = new google.maps.Map(
      document.getElementById('map'), {zoom: 4, center: location});
  var marker = new google.maps.Marker({position: location, map: map});
}

function refreshBanks(userID) {
  $('#foodbankDiv').empty();
  socket.emit('getFoodBanks', userID);
  socket.on('foodBankRes', function(res) {
    for (var key of Object.keys(res)) (function(key) {
      var div = document.createElement('div');
      div.classList.add('bank');

      var img = document.createElement('img');
      img.src = res[key].thumbnail;
      img.width = '200';
      img.height = '130';
      img.style.cursor = 'pointer';
      img.onclick = function() {
        window.location.href = 'viewfoodbank.html?' + key;
      }

      var h3 = document.createElement('h3');
      h3.innerHTML = key;
      h3.style.display = 'block';
      h3.style.textAlign = 'center';

      div.appendChild(img);
      div.appendChild(h3);

      foodbankDiv.appendChild(div);
    })(key);
  })
}

document.getElementById('preview').onclick = function(e) {
  e.preventDefault();
  socket.emit('getCoordinates', document.getElementById('addressIn').value);
  socket.on('coordinatesRes', initMap);
}

document.getElementById('thumbInput').onchange = function(event) {
  var reader = new FileReader();
  reader.onload = function(){
    var innerHTML = '<img id = "thumbPreview" width="50" height="30" src = "' + reader.result + '"></img>Image Selected';
    document.getElementById('thumbInLabel').innerHTML = innerHTML;
    /*document.getElementById('thumbPreview').style.display = 'block';
    document.getElementById('thumbPreview').src = reader.result;*/
    imageRaw = reader.result;
    //serialized.thumbnail = reader.result;
  }
  reader.readAsDataURL(event.target.files[0]);
}

firebase.auth().onAuthStateChanged(user => {
  refreshBanks(user.uid);
  document.getElementById('addBankButton').onclick = function(e) {
    e.preventDefault();
    var data = {name: nameIn.value, thumbnail: imageRaw, maxStorage: parseInt(_maxStorage.value), address: document.getElementById('addressIn').value};
    socket.emit('addFoodBank', user.uid, data);
    popup.style.display = 'none';
    refreshBanks(user.uid);
  }
})
