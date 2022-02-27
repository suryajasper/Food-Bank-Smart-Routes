import m from 'mithril';

import IconButton from './icon-button';

import '../resources/css/icon-button.css';
import '../resources/css/main.css';
import '../resources/css/loginforeign.css';

const TestView = {
  view(vnode) {
    return [
      m('div', { class: 'tool-group' }, [
        m(IconButton, { icon: 'build', title: 'Settings' }),
        m(IconButton, { icon: 'build', title: 'Build' }),
        m(IconButton, { icon: 'build', title: 'ewoifjaoweifjoij' }),
      ]),
    ];
  }
} 

export default TestView;