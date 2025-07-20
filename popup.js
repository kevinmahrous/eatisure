const browserAPI = typeof browser !== "undefined" ? browser : chrome;

const amazonBtn = document.getElementById("scan-amazon");
const bannedList = document.getElementById("banned-list");
const resultSection = document.getElementById("result-section");
const itemsList = document.getElementById("items-list");
const bannedInput = document.getElementById("banned-input");
const bannedDisplay = document.getElementById("banned-display");

amazonBtn.addEventListener("click", () => {
  amazonBtn.disabled = true;
  bannedList.style.display = "block";
  resultSection.classList.remove("hidden");
  itemsList.innerHTML = "";
  browserAPI.tabs.query({
    active: true,
    currentWindow: true
  }, (tabs) => {
    if (tabs[0]) {
      browserAPI.tabs.sendMessage(tabs[0].id, {
        action: "runContentScript"
      });
    }
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "scanResults") {
    itemsList.innerHTML = "";
    for (const {
        title,
        ingredients,
        bannedFound
      }
      of message.data) {
      const li = document.createElement("li");
      li.className = "result-item";
      li.innerHTML = `
        <div class="item-title">${title}</div>
        <div class="item-ingredients"><strong>Ingredients:</strong> ${ingredients}</div>
        ${
          bannedFound.length
            ? `<span class="banned-label">Banned ingredients:</span> ${bannedFound.join(", ")}`
            : `<span class="safe-label">No banned ingredients.</span>`
        }
      `;
      itemsList.appendChild(li);
    }
    amazonBtn.disabled = false;
  }
});

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["bannedItems"], (result) => {
    const items = result.bannedItems || [];
    bannedInput.value = items.join(", ");
    bannedDisplay.textContent = items.join(", ") || "none";
  });

  document.getElementById("save-banned").addEventListener("click", () => {
    const items = bannedInput.value
      .split(",")
      .map(i => i.trim().toLowerCase())
      .filter(Boolean);
    chrome.storage.local.set({
      bannedItems: items
    }, () => {
      bannedDisplay.textContent = items.join(", ") || "none";
    });
  });
});