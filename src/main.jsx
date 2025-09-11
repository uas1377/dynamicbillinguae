import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import "./utils/clearStorage.js"; // Clear localStorage on app start

ReactDOM.createRoot(document.getElementById("root")).render(
    <App />
);
