import { createApp } from "./app.js";

const root = document.getElementById("app-root");

if (!root) {
  throw new Error("App root element was not found.");
}

createApp(root).mount();
