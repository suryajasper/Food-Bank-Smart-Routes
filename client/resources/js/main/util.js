String.prototype.replaceAll = function(toReplace, replaceWith) {
  var replaced = this.replace(toReplace, replaceWith);
  while (replaced.includes(toReplace)) {
    replaced = replaced.replace(toReplace, replaceWith);
  }
  return replaced;
}

function randInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

function convertToSheetId(link) {
  var startDelimiter = 'spreadsheets/d/';
  return link.substring(link.indexOf(startDelimiter)+startDelimiter.length).split('/')[0];
}

function btr(bool) {
  return bool ? 'yes': 'no';
}

function removeEmptyStrings(arr) {
  var newArr = [];
  for (var el of arr) {
    if (el !== '') newArr.push(el);
  } return newArr;
}