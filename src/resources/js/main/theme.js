function refreshTheme() {
  var theme = Cookies.get('theme');
  if (theme == 'dark') document.body.className = 'darkTheme';
  else document.body.className = '';
}

Mousetrap.bind(['command+shift+d', 'ctrl+shift+d'], function(e) {
  e.preventDefault();
  if (Cookies.get('theme') == 'dark')
    Cookies.set('theme', 'light');
  else
    Cookies.set('theme', 'dark');
  refreshTheme();
});

refreshTheme();