import m from 'mithril';
import Popup from './popup';
import { ldb, isWhole } from '../utils/utils';

export default class RouteGenPopup {
  reset() {
    let cached = ldb.get('routegen-params');

    if (cached) {
      this.params = cached;
    } else {
      this.params = {
        depotAddress: '',
        maxTravelTime: '',
        maxDestinations: '',
        numDeliv: '',
        useDriversStored: false,
      }
    }
  }

  constructor(vnode) {
    this.reset();
  }

  save() {
    ldb.set('routegen-params', this.params);
  }

  validateParams() {
    const p = this.params;
    return p.depotAddress.length > 0 && 
            isWhole(p.maxTravelTime) &&
            isWhole(p.maxDestinations) &&
           (isWhole(p.numDeliv) || p.useDriversStored);
  }

  view(vnode) {

    return m('div', {style: `display: ${vnode.attrs.active ? 'block': 'none'}`}, 
      m(Popup, [
        m('div', {'class':'center-outside'}, m('div', {'class':'center-div'}, m('form', [
          
          m('h3', 'Depot Address'),
          m('input', {
            'type':'text',
            'placeholder':'address',
            'id':'rgp__depotAddress',
            'style':{'width':'100%'},

            value: this.params.depotAddress,
            oninput: e => { this.params.depotAddress = e.target.value; },
          }),
          
          m('h3', 'Parameters'),

          m('div', {'class':'groupinputs'},
            [
              m('h4', 'Maximum Travel Time per vehicle'),
              m('input', {
                'id':'rgp__maxTravelTime', 
                'type':'number',
                'placeholder':'90',
                'min':'1',

                value: this.params.maxTravelTime, 
                oninput: e => { this.params.maxTravelTime = e.target.value; },
              }),
              m('br'),

              m('h4', 'Maximum Destinations per vehicle'),
              m('input', {
                'id':'rgp__maxDestinations',
                'type':'number',
                'placeholder':'5',
                'min':'1',

                value: this.params.maxDestinations,
                oninput: e => { this.params.maxDestinations = e.target.value; },
              }),
              m('br'),

              m('h4', 'Number of Delivery Personnel'),
              m('input', {
                'id':'rgp__numDeliv',
                'type':'number',
                'placeholder':'10',
                'min':'1',

                value: this.params.useDriversStored ? '1234' : this.params.numDeliv,
                disabled: this.params.useDriversStored,
                oninput: e => { this.params.numDeliv = e.target.value; },
              }),
              
              m('h4', 'Use Number of Drivers Stored'),
              m('input', {
                'id':'rgp__useDriversStored',
                'type':'checkbox',

                checked: this.params.useDriversStored,
                oninput: e => { this.params.useDriversStored = e.target.checked; },
              }),

            ]
          ),

          m('button', { 'class':'cancel', onclick: e => {
            e.preventDefault();
            this.reset();
            vnode.attrs.status('cancelled');
          } }, 'Cancel'),

          m('button', { 
            onclick: e => {
              e.preventDefault();
              this.save();
              vnode.attrs.status('success', this.params);
            },
            disabled: !this.validateParams(),
          }, 'Calculate')

        ])))
      ])
    );

  }
}