# Zoom Shareable Link Downloader Plan

## Goal Description
The backend Zoom API approach (Option 1) failed due to API limitations or account configuration issues. The user has requested to completely abandon the Meeting ID backend approach and instead use the Zoom Shareable Link directly. Since the user enables the "Download" tick when creating the shareable link, we can extract the exact video download URL directly from the Zoom webpage inside the Mobile App.

## Proposed Changes

### Mobile App (`CourseContentScreen.jsx`)

1. **Extracting the URL via Hidden WebView / Client Scraping:**
   - When the user taps the download icon in the list, we will fetch the Zoom Shareable Link's HTML directly in the app.
   - We will extract the `downloadUrl` from the Zoom page's JavaScript variables (which Zoom embeds in the page when the download tick is enabled).
   - If direct fetch scraping fails (due to Zoom's bot protection), we can load a hidden `WebView` momentarily to bypass the protection, extract the URL via injected JS, and then start the download.

2. **Intercepting WebView Downloads (In-Player):**
   - When the user is watching the video inside the `WebView` modal, Zoom will display its own native "Download" button (since the tick is enabled).
   - We will inject JavaScript (`injectedJavaScript`) into the WebView to intercept clicks on Zoom's native download button.
   - When clicked, instead of letting the WebView try to download it to the public device storage (which often fails on mobile), we will send a message (`window.ReactNativeWebView.postMessage`) with the URL back to our React Native app.
   - The React Native app will then catch this URL and download the video securely to the `.dat` private storage, showing the standard download alerts.

3. **Remove Backend Dependencies:**
   - Remove the `MOBILE_API_URL` calls for `/zoom-direct-link/:contentId` since we are abandoning the backend approach.

## Open Questions
- Do you want me to intercept the Zoom native download button when they are watching the video, OR do you want me to add a custom "Download" button in the App UI (next to the close button) while watching?
- For downloading from the list view (without opening the video), I will use a background fetch to get the link. Is this acceptable?
