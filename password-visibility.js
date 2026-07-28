(() => {
  let generatedInputId = 0;

  function renderButtonIcon(button, visible) {
    button.innerHTML = `<i data-lucide="${visible ? "eye-off" : "eye"}" aria-hidden="true"></i>`;
    const label = visible ? "Hide password" : "Show password";
    button.setAttribute("aria-label", label);
    button.title = label;
    window.lucide?.createIcons();
  }

  function enhancePasswordInput(input) {
    if (!input || input.dataset.passwordVisibilityReady === "true") return;
    input.dataset.passwordVisibilityReady = "true";
    if (!input.id) input.id = `passwordField${++generatedInputId}`;

    const wrapper = document.createElement("span");
    wrapper.className = "password-visibility-field";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.append(input);

    const button = document.createElement("button");
    button.className = "password-visibility-button";
    button.type = "button";
    button.setAttribute("aria-controls", input.id);
    button.addEventListener("click", () => {
      const visible = input.type === "password";
      input.type = visible ? "text" : "password";
      renderButtonIcon(button, visible);
      input.focus({ preventScroll: true });
      const end = input.value.length;
      input.setSelectionRange?.(end, end);
    });
    wrapper.append(button);
    renderButtonIcon(button, false);
  }

  function enhancePasswordInputs(root = document) {
    if (root.matches?.('input[type="password"]')) enhancePasswordInput(root);
    root.querySelectorAll?.('input[type="password"]').forEach(enhancePasswordInput);
  }

  enhancePasswordInputs();
  new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => enhancePasswordInputs(node)));
  }).observe(document.body, { childList: true, subtree: true });
})();
