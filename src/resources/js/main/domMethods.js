function createRow(arr) {
  var tr = document.createElement('tr');

  for (var el of arr) {
    var td = document.createElement('td');
    td.innerHTML = el;
    tr.appendChild(td);
  }

  return tr;
}

function fillSelect(name, length) {
  $('#' + name).empty();
  var soption = document.createElement('option');
  soption.innerHTML = 'all';
  soption.value = 'all';
  document.getElementById(name).appendChild(soption);
  for (var i = 1; i <= length; i++) {
    var option = document.createElement('option');
    option.innerHTML = i.toString();
    option.value = i.toString();
    document.getElementById(name).appendChild(option);
  }
}

function hidePopups() {
  for (let popup in dom.popups)
    dom.popups[popup].div.style.display = 'none';

  dom.popups.patients.fileInLabel.innerHTML = 'import a .csv file';
  dom.popups.volunteers.fileInLabel.innerHTML = 'import a .csv file';

  dom.popups.patients.map.style.display = 'none';
  dom.popups.volunteers.map.style.display = 'none';

  dom.popups.patients.confirm.disabled = false;
  dom.popups.volunteers.confirm.disabled = false;
}

function setSelected(ind) {
  var div = dom.lastCalc.div;
  var sow = 0;
  for (var i = 0; i < div.children.length; i++) {
    if (div.children[i].tagName === 'BUTTON') {
      if (sow === ind) {
        div.children[i].classList.remove('switchNotActive');
        div.children[i].classList.add('switchActive');
      } else {
        div.children[i].classList.remove('switchActive');
        div.children[i].classList.add('switchNotActive');
      } sow++;
    } else break;
  }
}

function fillTable(tableId, data, header=false) {
  var table = document.getElementById(tableId);
  $(table).empty();
  for (var row of data) {
    var tr = document.createElement('tr');
    for (var el of row) {
      var td = document.createElement(header ? 'th' : 'td');
      td.innerHTML = el;
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
}

hidePopups();
