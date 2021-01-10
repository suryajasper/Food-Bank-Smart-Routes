function initializeFirebase() {
  var firebaseConfig = {
    apiKey: "AIzaSyA1cFEJ566k4p_pWofCN7qv3MZF59Rcji4",
    authDomain: "food-bank-smart.firebaseapp.com",
    databaseURL: "https://food-bank-smart.firebaseio.com",
    projectId: "food-bank-smart",
    storageBucket: "food-bank-smart.appspot.com",
    messagingSenderId: "246596067753",
    appId: "1:246596067753:web:ee06e3a5b373bccd65e4b8",
    measurementId: "G-F58ZY70FD2"
  };
  firebase.initializeApp(firebaseConfig);
};