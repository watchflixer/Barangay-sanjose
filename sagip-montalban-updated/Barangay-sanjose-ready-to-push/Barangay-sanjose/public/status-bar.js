/**
 * Phone status bar for the device previews.
 * Shows a LIVE clock (plus signal / wifi / battery) at the top of every
 * portrait phone frame — Android (Pixel) and Apple (iPhone) styles.
 *
 * Usage:
 *   HSStatusBar.mount(screenEl, { os: 'android' | 'ios' });
 *   HSStatusBar.height('ios');  // px taken by the bar
 */
(function (global) {
  var HEIGHTS = {android: 28, ios: 32};

  var CSS = [
    '.hs-status-bar{position:absolute;top:0;left:0;right:0;z-index:30;display:flex;',
    'align-items:center;justify-content:space-between;padding:0 14px;height:28px;',
    'background:rgba(255,255,255,0.97);color:#0f172a;',
    "font-family:'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',sans-serif;",
    'font-size:12.5px;font-weight:700;letter-spacing:.2px;',
    'box-shadow:0 1px 0 rgba(15,23,42,.08);pointer-events:none;user-select:none;}',
    '.hs-status-bar.ios{height:32px;padding:0 20px;font-size:13.5px;}',
    '.hs-status-bar.ios .hs-sb-time{font-weight:600;}',
    '.hs-sb-time{font-variant-numeric:tabular-nums;}',
    '.hs-sb-icons{display:flex;align-items:center;gap:5px;}',
    '.hs-sb-icons svg{display:block;}'
  ].join('');

  function injectCss() {
    if (document.getElementById('hs-status-bar-css')) return;
    var s = document.createElement('style');
    s.id = 'hs-status-bar-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function icons(os) {
    var c = 'currentColor';
    var signal =
      '<svg width="15" height="11" viewBox="0 0 15 11" fill="' + c + '">' +
      '<rect x="0" y="7.5" width="2.6" height="3.5" rx="0.7"/>' +
      '<rect x="4" y="5" width="2.6" height="6" rx="0.7"/>' +
      '<rect x="8" y="2.5" width="2.6" height="8.5" rx="0.7"/>' +
      '<rect x="12" y="0" width="2.6" height="11" rx="0.7"/></svg>';
    var wifi =
      '<svg width="14" height="11" viewBox="0 0 16 12" fill="' + c + '">' +
      '<path d="M8 11.2 5.3 8.2a4 4 0 0 1 5.4 0L8 11.2Z"/>' +
      '<path d="M8 4.6c1.8 0 3.4.7 4.6 1.8l1.4-1.5A8.5 8.5 0 0 0 8 2.5c-2.3 0-4.4.9-6 2.4l1.4 1.5A6.6 6.6 0 0 1 8 4.6Z" opacity=".95"/>' +
      '</svg>';
    var battery =
      os === 'ios'
        ? '<svg width="25" height="12" viewBox="0 0 25 12">' +
          '<rect x="0.5" y="0.5" width="21" height="11" rx="3.2" fill="none" stroke="' + c + '" stroke-opacity=".45"/>' +
          '<rect x="2.2" y="2.2" width="16" height="7.6" rx="1.9" fill="' + c + '"/>' +
          '<path d="M23 4.2v3.6c1-.3 1.4-.9 1.4-1.8S24 4.5 23 4.2Z" fill="' + c + '" fill-opacity=".45"/></svg>'
        : '<svg width="13" height="13" viewBox="0 0 14 14" fill="' + c + '">' +
          '<path d="M5 0h4v1.4h1.6A1.4 1.4 0 0 1 12 2.8v9.8A1.4 1.4 0 0 1 10.6 14H3.4A1.4 1.4 0 0 1 2 12.6V2.8a1.4 1.4 0 0 1 1.4-1.4H5V0Z" fill-opacity=".25"/>' +
          '<path d="M3.4 5.6h7.2v7A1.4 1.4 0 0 1 9.2 14H4.8a1.4 1.4 0 0 1-1.4-1.4v-7Z"/></svg>';
    return signal + wifi + battery;
  }

  function fmt(os) {
    var d = new Date();
    var h = d.getHours();
    var m = String(d.getMinutes()).padStart(2, '0');
    // Both Android and iOS default to 12-hour in PH locale.
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 || 12;
    return os === 'ios' ? h12 + ':' + m : h12 + ':' + m + ' ' + ampm;
  }

  var clocks = [];
  function tick() {
    for (var i = 0; i < clocks.length; i++) {
      clocks[i].el.textContent = fmt(clocks[i].os);
    }
  }

  function mount(screenEl, opts) {
    if (!screenEl) return null;
    injectCss();
    var os = (opts && opts.os) === 'ios' ? 'ios' : 'android';
    var bar = document.createElement('div');
    bar.className = 'hs-status-bar ' + os;
    bar.innerHTML =
      '<span class="hs-sb-time">' + fmt(os) + '</span>' +
      '<span class="hs-sb-icons">' + icons(os) + '</span>';
    if (getComputedStyle(screenEl).position === 'static') screenEl.style.position = 'relative';
    screenEl.insertBefore(bar, screenEl.firstChild);
    clocks.push({el: bar.querySelector('.hs-sb-time'), os: os});
    return bar;
  }

  setInterval(tick, 1000);

  global.HSStatusBar = {
    mount: mount,
    height: function (os) { return HEIGHTS[os === 'ios' ? 'ios' : 'android']; }
  };
})(window);
