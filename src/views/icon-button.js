import m from 'mithril';

import { icons } from './icons';

import '../resources/css/icon-button.css';

const IconButton = {
  view(vnode) {
    return m('div', { class: 'tool-container' }, 
      m('div', { class: 'tool', onclick: e => { vnode.attrs.onclick(e); } }, icons[vnode.attrs.icon]),
      m('div', { class: 'tool-title' }, vnode.attrs.title),
    );
  }
};

export default IconButton;