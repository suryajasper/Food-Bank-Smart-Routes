import m from 'mithril';
import Landing from './views/landing';
import Main from './views/main';
import TestView from './views/testview';

m.route(document.body, "/", {
  '/': Landing,
  '/main': Main,
  '/test': TestView,
});

// m.mount(document.body, Explorer);