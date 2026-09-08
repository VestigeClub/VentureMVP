import { recordLocalAction } from "./experiment.js";

const storageKey = "busfin4215-mvp-demo-actions";
const countElement = document.querySelector("#intent-count");
const dialog = document.querySelector("#response-dialog");

function readCount() {
  const parsed = Number.parseInt(localStorage.getItem(storageKey) ?? "0", 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
}

function renderCount() {
  countElement.textContent = String(readCount());
}

for (const button of document.querySelectorAll("[data-event]")) {
  button.addEventListener("click", () => {
    localStorage.setItem(storageKey, String(recordLocalAction(readCount())));
    renderCount();
    dialog.showModal();
  });
}

document.querySelector("[data-close]").addEventListener("click", () => dialog.close());
document.querySelector("#reset").addEventListener("click", () => {
  localStorage.removeItem(storageKey);
  renderCount();
});

renderCount();
