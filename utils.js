function replaceAll(string, search, replace) {
  return string.split(search).join(replace);
}

function maxLength(arr) {
  return Math.max(...arr.map(sub => sub.length));
}

function cleanAddress(address) {
	return replaceAll(replaceAll(address, '#', ''), '/', '')
}

module.exports = { replaceAll, maxLength, cleanAddress };