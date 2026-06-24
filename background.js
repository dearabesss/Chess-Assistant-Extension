chrome.action.onClicked.addListener(() => {
    chrome.windows.create({
        url: chrome.runtime.getURL("panel.html"),
        type: "popup",
        width: 190,   // Barely wider than the 160px board
        height: 260,  // Just enough height so no scrollbars appear
        focused: true
    });
});