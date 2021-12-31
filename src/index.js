import m from 'mithril';
import Landing from './views/landing';
import Main from './views/main';

m.route(document.body, "/", {
  '/': Landing,
  '/main': Main,
});

// m.mount(document.body, Explorer);