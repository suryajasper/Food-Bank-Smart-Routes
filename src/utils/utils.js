import m from 'mithril';

function POST(url, body) {
  return m.request({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    url, body,
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

export { POST, ldb };