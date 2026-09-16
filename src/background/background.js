// Opens the extension's own Library UI in a new tab when the toolbar icon is clicked.
// No default_popup is set in manifest.json, so this onClicked event is what fires.
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/pages/library/library.html') });
});
