import m from 'mithril';

const Popup = {
  view(vnode) {
    /*return m('div', {class: 'popup'}, 
      m('div', {class: 'center-outside'},
        m('div', {class: 'center-div'}, 
          vnode.children
        )
      )
    );*/
    return m("div", { class: "modal", style: { display: 'block' } },
      m("form", { class: "modal-content popup animate" },
        m("div", { class: "container" }, 
          vnode.children,
        )
      )
    );
    
    m('div', {class: 'popup'}, 
      m('div', {class: 'center-outside'},
        m('div', {class: 'center-div'}, 
          vnode.children
        )
      )
    );
  }
};

export default Popup;