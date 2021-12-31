function replaceAll(string, search, replace) {
  return string.split(search).join(replace);
}

function maxLength(arr) {
  return Math.max(...arr.map(sub => sub.length));
}

function cleanAddress(address) {
	return replaceAll(replaceAll(address, '#', ''), '/', '')
}

function init2D(rows, cols, val) {
  let arr = [];
  for (let r = 0; r < rows; r++) {
    let sub = [];
    for (let c = 0; c < cols; c++) {
      sub.push(val ? val : 0);
    }
    arr.push(sub);
  }
  return arr;
}

module.exports = { replaceAll, maxLength, cleanAddress, init2D };