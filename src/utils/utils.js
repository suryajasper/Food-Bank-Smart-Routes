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

function isWhole(val) {
  return parseInt(val) == val && val > 0;
}

class Vector2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(val) {
    if (val instanceof Vector2)
      return new Vector2(this.x + val.x, this.y + val.y);
    else if (typeof val === 'number')
      return new Vector2(this.x + val, this.y + val);
  }
  sub(val) {
    if (val instanceof Vector2)
      return new Vector2(this.x - val.x, this.y - val.y);
    else if (typeof val === 'number')
      return new Vector2(this.x - val, this.y - val);
  }
  mult(val) {
    if (val instanceof Vector2)
      return new Vector2(this.x * val.x, this.y * val.y);
    else if (typeof val === 'number')
      return new Vector2(this.x * val, this.y * val);
  }
  div(val) {
    if (val instanceof Vector2)
      return new Vector2(this.x / val.x, this.y / val.y);
    else if (typeof val === 'number')
      return new Vector2(this.x / val, this.y / val);
  }
  dot(vec) {
    return this.x * vec.x + this.y + vec.y;
  }

  get xToY() {
    return this.x / this.y;
  }
  get yToX() {
    return this.y / this.x;
  }
  get length() {
    return Math.sqrt(this.dot(this, this));
  }
}

export { POST, ldb, parseSheetsObj, Vector2, isWhole };