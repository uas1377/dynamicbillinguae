import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./utils/clearStorage.js"; // Clear localStorage on app start

// Register service worker with update handling
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then((registration) => {
    // Check for updates every 30 seconds
    setInterval(() => {
      registration.update();
    }, 30000);
    
    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
          // New service worker activated, reload the page
          window.location.reload();
        }
      });
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
    <App />
);
