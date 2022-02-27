import m from 'mithril';

function POST(endpoint, body) {
  return m.request({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }, 
    url: `http://localhost:4002${endpoint}`,
    body,
  })
}

const ldb = {
  set(title, data) {
    if (typeof data === 'object')
      data = JSON.stringify(data);
    
    window.localStorage.setItem(title, data);
  },

  get(title) {
    const stored = window.localStorage.getItem(title);

    try { return JSON.parse(stored); }
    catch { return stored; }
  },
}

function parseSheetsObj(table) {

  let body = [table.headers];

  for (let row of table.body) {
    let newRow = [];
    for (let headerEl of table.headers) {
      newRow.push(row[headerEl] ? row[headerEl] : '');
    }
    body.push(newRow);
  }

  return body;
  
}

export { POST, ldb, parseSheetsObj };