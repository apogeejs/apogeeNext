To make the native title bar look good with a dark-themed app on macOS, you can enable the dark appearance for your Electron app. When the dark appearance is enabled, the native title bar will automatically adapt to the dark theme, and the window controls will use the dark mode colors.

Here's how you can enable the dark appearance for your Electron app:

1. Update your `main.js` or `main.ts` file to set the `appearance` option for the `BrowserWindow`:

```javascript
const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    appearance: 'dark', // Enable the dark appearance
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);
```

This will enable the dark appearance for your app, and the native title bar will adapt to the dark theme on macOS.

2. Apply the dark theme to your app's content:

For your app's content, you'll need to apply the dark theme manually. Update your app's CSS to use dark colors for the background, text, and other UI elements. Here's a simple example:

```css
body {
  background-color: #222;
  color: #eee;
}

/* Other dark theme styles for your app */
```

With these changes, your Electron app will have a dark theme with a native title bar that looks good on macOS. The window controls will use the dark mode colors, and the title bar will integrate well with your app's dark theme.

Keep in mind that this will only affect the appearance on macOS. For other platforms, you can still use a custom title bar with platform-specific styles, as discussed in previous responses.