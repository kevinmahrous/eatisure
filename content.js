if (typeof browser === "undefined") {
  var browser = chrome;
}

function getStorage(key) {
  return new Promise((resolve) => {
    (typeof browser !== "undefined" ? browser : chrome).storage.local.get([key], (result) => {
      resolve(result[key]);
    });
  });
}

function runScript() {
  let bannedIngredients = [];

  getStorage("bannedItems").then((items) => {
    bannedIngredients = items || [];

    (async () => {
      const productNodes = document.querySelectorAll(".sc-list-item");
      const productList = [];

      for (let node of productNodes) {
        const linkElem = node.querySelector(".sc-product-link.sc-product-title.aok-block");
        const titleElem = node.querySelector(".sc-product-title h4 span span");
        if (!linkElem || !titleElem) continue;
        const url = "https://www.amazon.com" + linkElem.getAttribute("href").split("?")[0];
        const title = titleElem.textContent.trim();
        productList.push({
          title,
          url
        });
      }

      const results = [];

      for (const {
          title,
          url
        }
        of productList) {
        try {
          const html = await fetch(url).then(r => r.text());
          const div = document.createElement("div");
          div.innerHTML = html;
          const ingText = div.querySelector("#nic-ingredients-content")?.innerText?.toLowerCase() || "";
          const match = ingText.match(/ingredients:?[\s\n]*([^\n]+)/i);
          const ingredients = match ? match[1].trim() : ingText || "Not found";
          const bannedFound = bannedIngredients.filter(b => ingredients.includes(b));
          results.push({
            title,
            ingredients,
            bannedFound
          });
        } catch {
          results.push({
            title,
            ingredients: "Error fetching",
            bannedFound: []
          });
        }
      }

      if (typeof browser !== "undefined" && browser.runtime?.sendMessage) {
        browser.runtime.sendMessage({
          action: "scanResults",
          data: results
        });
      } else if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          action: "scanResults",
          data: results
        });
      }
    })();
  });
}

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "runContentScript") {
    runScript();
  }
});