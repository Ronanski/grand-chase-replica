// Bridge to the Android shell (window.GCShell is injected by the app's WebView).
// In a normal browser (GitHub Pages) these become no-ops.
const b = () => window.GCShell;

export const Shell = {
  get native() { return !!b(); },
  info() {
    try { if (b()) return JSON.parse(b().info()); } catch (e) { /* ignore */ }
    return null;
  },
  openUpdates() { try { b() && b().openUpdates(); } catch (e) { /* ignore */ } },
  checkUpdates() { try { b() && b().checkUpdates(); } catch (e) { /* ignore */ } },
  setChannel(c) { try { b() && b().setChannel(c); } catch (e) { /* ignore */ } },
  vibrate(ms) {
    try {
      if (b()) b().vibrate(ms);
      else if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) { /* ignore */ }
  },
  exit() { try { b() && b().exit(); } catch (e) { /* ignore */ } },
};
