import m from 'mithril';
import Popup from './popup';

export default class CSVSelector {
  reset() {
    this.start = null;
    this.selections = {};
    this.selectMode = 'add';
  }

  constructor(vnode) {
    this.reset();
    this.addressType = 'patients';
  }

  view(vnode) {
    if (vnode.attrs.matrix)
      return m('div', {class: 'centered', style: `display: ${vnode.attrs.active ? 'block': 'none'}`}, 
        m(Popup, [
          m('table', {class: 'columnPopupTable'},
            m('tbody', vnode.attrs.matrix.map((rowData, row) => 
              m('tr', rowData.map((cell, col) => 
                m('td', {
                  class: `${this.selections[`${row},${col}`] ? 'selected-cell' : ''}`,
                  onclick: e => {

                    const code = `${row},${col}`;

                    let resetAfter = true;

                    if (!this.start) {
                      resetAfter = false;

                      this.start = [row, col];

                      if (this.selections[code] && this.selections[code].type === this.addressType) {
                        this.selectMode = 'delete';
                      } else this.selectMode = 'add';
                    }

                    const c = this.start[1],
                         r1 = Math.min(this.start[0], row), 
                         r2 = Math.max(this.start[0], row);

                    for (let r = r1; r <= r2; r++) {
                      if (this.selectMode === 'add')
                        this.selections[`${r},${c}`] = {
                          type: this.addressType,
                          address: vnode.attrs.matrix[r][c],
                        };
                      else
                        delete this.selections[`${r},${c}`];
                    }

                    if (resetAfter) this.start = null;

                  }
                }, cell)
              ))
            ))
          ),

          m('button', { 
            disabled: Object.entries(this.selections).length === 0,
            onclick: e => { this.reset(); },
          }, 'Clear Selection'),

          m('button', { 
            disabled: Object.entries(this.selections).length === 0,
            onclick: e => { 
              vnode.attrs.status('success', Object.values(this.selections)) 
              this.reset();
            },
          }, 'Confirm Extraction'),

          m('button', { 
            onclick: e => { 
              vnode.attrs.status('cancelled'); 
              this.reset();
            } 
          }, 'Cancel'),
          
        ])
      );
  }
}