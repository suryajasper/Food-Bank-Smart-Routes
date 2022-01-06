import m from 'mithril';

const Popup = {
  view(vnode) {
    return m('div', {class: 'popup'}, 
      m('div', {class: 'center-outside'},
        m('div', {class: 'center-div'}, 
          vnode.children
        )
      )
    );
  }
};

export default Popup;