const gei = id => document.getElementById(id);

const dom = {
  tools: {
    addPatients: gei('addPatient'),
    addVolunteers: gei('addVolunteer'),
    viewAddresses: gei('viewPatient'),
    calcRoutes: gei('routes'),
    lastCalc: gei('lastCalc'),
  },

  popups: {
    patients: {
      div: gei('addPatientDiv'),

      textIn: gei('patientAddresses'),
      fileIn: gei('csvInput'),
      fileInLabel: gei('csvLabel'),

      previewButton: gei('preview'),
      map: gei('map'),

      confirm: gei('addBankButton'),
    },

    volunteers: {
      div: gei('addVolunteerAddressDiv'),

      textIn: gei('volunteerAddresses'),
      fileIn: gei('csvInputVolunteer'),
      fileInLabel: gei('csvLabelVolunteer'),

      previewButton: gei('previewVolunteer'),
      map: gei('mapVolunteer'),

      confirm: gei('addVolunteerAddress'),
    },

    csv: {
      div: gei('columnPopup'),

      table: gei('columnPopupTable'),

      clear: gei('clearColumnSelection'),
      confirm: gei('confirmExtraction'),
    },

    calc: {
      div: gei('calculatePopup'),

      startIn: gei('depotAddressIn'),

      maxTime: gei('maxTime'),
      maxDest: gei('maxDest'),
      numDeliv: gei('numDeliv'),

      autofillVolunteers: gei('driverNumberAuto'),
      volunteerAddressLast: gei('driverAddressLast'),
      genTravelTimes: gei('travelTimesCheckbox'),
      spreadsheetLink: gei('linkToSpreadsheet'),
      
      confirm: gei('confirmCalculation'),
    }
  },

  view: {
    div: gei('view'),

    removeAll: gei('removeAll'),
    removePatients: gei('removePatients'),
    removeVolunteers: gei('removeVolunteers'),

    patientCount: gei('patientCount'),
    volunteerCount: gei('volunteerCount'),

    map: gei('mapView'),
  },

  lastCalc: {
    div: gei('lastCalcBody'),

    droppedSwitch: gei('droppedButton'),
    routesSwitch: gei('deliveryRoutesButton'),

    droppedMap: gei('lastMap'),
    routesMap: gei('lastMapRoutes'),

    routeSelect: gei('lastSelect'),

    routeLink: gei('routeUrl'),
    routeLinkCopy: gei('copyMapUrl')
  }
}

Object.freeze(dom);