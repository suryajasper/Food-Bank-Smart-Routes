import m from 'mithril';

import IconButton from './icon-button';
import RouteGenPopup from './route-generation-popup';

import '../resources/css/icon-button.css';
import '../resources/css/main.css';
import '../resources/css/loginforeign.css';

const TestView = {
  view(vnode) {
    return [
      m(RouteGenPopup, {active: true})
    ];
  }
} 

export default TestView;