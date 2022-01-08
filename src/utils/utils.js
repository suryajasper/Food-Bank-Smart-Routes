import m from 'mithril';

function POST(url, body) {
  return m.request({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    url, body,
  })
}

export { POST };