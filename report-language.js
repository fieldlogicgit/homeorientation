(() => {
  const storageKey = "constructionIssueReport.language";
  const languageButton = document.querySelector("#reportLanguageToggle");
  const originalDocumentTitle = document.title;
  const textSources = new WeakMap();
  const attributeSources = new WeakMap();
  let currentLanguage = localStorage.getItem(storageKey) === "es" ? "es" : "en";
  let observer = null;

  const spanishText = Object.freeze({
    "Crew Item Report": "Reporte de pendientes por cuadrilla",
    "Crew Open Items Report": "Reporte de pendientes abiertos por cuadrilla",
    "Site Item Report": "Reporte de pendientes del sitio",
    "Crew report": "Reporte por cuadrilla",
    "Site report": "Reporte del sitio",
    "Open Punch Logic website": "Abrir el sitio web de Punch Logic",
    "Sort by": "Ordenar por",
    "Item added": "Fecha agregada",
    "Crew": "Cuadrilla",
    "Location": "Ubicación",
    "Crew completed": "Cuadrilla completada",
    "Project": "Proyecto",
    "Projects": "Proyectos",
    "Site": "Sitio",
    "Sites": "Sitios",
    "Address": "Dirección",
    "Permit": "Permiso",
    "Open Issues": "Pendientes abiertos",
    "Open Items": "Pendientes abiertos",
    "All projects": "Todos los proyectos",
    "All sites": "Todos los sitios",
    "Site details": "Detalles del sitio",
    "Issue": "Pendiente",
    "No notes added.": "No se agregaron notas.",
    "Date Added -": "Fecha agregada -",
    "Crew marked complete": "Cuadrilla marcada como completada",
    "Office complete": "Completado por la oficina",
    "Shared notes": "Notas compartidas",
    "Add notes for this item": "Agregar notas para este pendiente",
    "Save note": "Guardar nota",
    "Saved": "Guardado",
    "Saving...": "Guardando...",
    "Mark Complete": "Marcar como completado",
    "Undo Crew Complete": "Deshacer finalización de cuadrilla",
    "Completion photo": "Foto de finalización",
    "Completion Photo": "Foto de finalización",
    "Item Photo": "Foto del pendiente",
    "Take photo": "Tomar foto",
    "Choose photo": "Elegir foto",
    "Save photo": "Guardar foto",
    "Selected completion photo": "Foto de finalización seleccionada",
    "Close photo": "Cerrar foto",
    "Not recorded": "No registrado",
    "Other": "Otro",
    "Lobby": "Vestíbulo",
    "Reception": "Recepción",
    "Open Office": "Oficina abierta",
    "Private Office": "Oficina privada",
    "Conference Room": "Sala de conferencias",
    "Break Room": "Sala de descanso",
    "Restroom": "Baño",
    "Corridor": "Pasillo",
    "Stairwell": "Escalera",
    "Elevator Lobby": "Vestíbulo de elevadores",
    "Mechanical Room": "Cuarto mecánico",
    "Electrical Room": "Cuarto eléctrico",
    "IT / Server Room": "Cuarto de TI / servidores",
    "Storage Room": "Almacén",
    "Warehouse": "Bodega",
    "Loading Dock": "Muelle de carga",
    "Roof": "Techo",
    "Parking Area": "Estacionamiento",
    "Sidewalk": "Acera",
    "Building Exterior": "Exterior del edificio",
    "Site Perimeter": "Perímetro del sitio",
    "Framing": "Estructura",
    "Roofing": "Techos",
    "Glazing": "Vidrios",
    "Masonry": "Mampostería",
    "Electric": "Electricidad",
    "Plumbing": "Plomería",
    "Fire Suppression": "Sistema contra incendios",
    "Drywall": "Paneles de yeso",
    "Tile": "Azulejos",
    "Flooring": "Pisos",
    "Carpentry": "Carpintería",
    "Specialty trim": "Acabados especiales",
    "Low Voltage": "Bajo voltaje",
    "Landscape": "Paisajismo",
    "Work incomplete": "Trabajo incompleto",
    "Missing material or component": "Falta material o componente",
    "Damaged material or finish": "Material o acabado dañado",
    "Incorrect material or product": "Material o producto incorrecto",
    "Poor workmanship": "Trabajo de mala calidad",
    "Out of alignment or not level": "Desalineado o fuera de nivel",
    "Not per plans or specifications": "No cumple con los planos o especificaciones",
    "Code or inspection correction": "Corrección de código o inspección",
    "Access or clearance issue": "Problema de acceso o espacio libre",
    "Sealant, caulk, or firestop needed": "Se necesita sellador, calafateo o cortafuego",
    "Touch-up or finish repair": "Retoque o reparación de acabado",
    "Cleanup needed": "Se necesita limpieza",
    "Missing report link.": "Falta el enlace del reporte.",
    "Missing crew report link.": "Falta el enlace del reporte por cuadrilla.",
    "Report not found.": "No se encontró el reporte.",
    "Report could not be loaded.": "No se pudo cargar el reporte.",
    "No items have been added to this site.": "No se agregaron pendientes a este sitio.",
    "No open crew items match those filters.": "Ningún pendiente abierto coincide con esos filtros.",
    "That photo could not be prepared. Choose another photo.": "No se pudo preparar esa foto. Elige otra foto.",
    "Photo could not be saved.": "No se pudo guardar la foto.",
    "This photo could not be saved. Please try again.": "No se pudo guardar esta foto. Inténtalo de nuevo.",
    "Issue could not be updated.": "No se pudo actualizar el pendiente.",
    "This issue could not be updated. Please try again.": "No se pudo actualizar este pendiente. Inténtalo de nuevo.",
    "Note could not be saved.": "No se pudo guardar la nota.",
    "This note could not be saved. Please try again.": "No se pudo guardar esta nota. Inténtalo de nuevo."
  });

  const phraseTranslations = [
    ["Updated ", "Actualizado "],
    ["Date Added -", "Fecha agregada -"],
    ["Crew marked complete", "Cuadrilla marcada como completada"],
    ["Office complete", "Completado por la oficina"]
  ];

  function locale() {
    return currentLanguage === "es" ? "es-419" : "en-US";
  }

  function toggleLanguage() {
    currentLanguage = currentLanguage === "es" ? "en" : "es";
    localStorage.setItem(storageKey, currentLanguage);
    refreshLanguageDom();
    window.dispatchEvent(new CustomEvent("punchlogiclanguagechange", { detail: { language: currentLanguage } }));
  }

  function refreshLanguageDom() {
    observer?.disconnect();
    document.documentElement.lang = currentLanguage === "es" ? "es-419" : "en";
    document.title = translate(originalDocumentTitle);
    translateTree(document.body, false);
    if (languageButton) {
      languageButton.textContent = currentLanguage === "es" ? "English" : "Español";
      const action = currentLanguage === "es" ? "Cambiar a inglés" : "Switch to Spanish";
      languageButton.setAttribute("aria-label", action);
      languageButton.title = action;
    }
    observeLanguageChanges();
  }

  function observeLanguageChanges() {
    if (!observer) observer = new MutationObserver(handleMutations);
    observer.takeRecords();
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "aria-label", "title", "alt"]
    });
  }

  function handleMutations(records) {
    observer?.disconnect();
    records.forEach((record) => {
      if (record.type === "characterData") translateTextNode(record.target, true);
      if (record.type === "attributes") translateAttributes(record.target, true, [record.attributeName]);
      record.addedNodes?.forEach((node) => translateTree(node, true));
    });
    observeLanguageChanges();
  }

  function translateTree(root, sourceIsCurrent = false) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root, sourceIsCurrent);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE || root.closest?.("[data-i18n-skip]")) return;

    translateAttributes(root, sourceIsCurrent);
    root.querySelectorAll?.("[placeholder], [aria-label], [title], [alt]").forEach((element) => {
      if (!element.closest("[data-i18n-skip]")) translateAttributes(element, sourceIsCurrent);
    });

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || ["SCRIPT", "STYLE", "TEMPLATE"].includes(parent.tagName) || parent.closest("[data-i18n-skip]")) {
          return NodeFilter.FILTER_REJECT;
        }
        return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    while (walker.nextNode()) translateTextNode(walker.currentNode, sourceIsCurrent);
  }

  function translateTextNode(node, sourceIsCurrent = false) {
    if (!node?.nodeValue || node.parentElement?.closest("[data-i18n-skip]")) return;
    if (sourceIsCurrent || !textSources.has(node)) textSources.set(node, node.nodeValue);
    node.nodeValue = translate(textSources.get(node));
  }

  function translateAttributes(element, sourceIsCurrent = false, attributes = ["placeholder", "aria-label", "title", "alt"]) {
    if (!element?.hasAttribute || element.closest("[data-i18n-skip]")) return;
    const sources = attributeSources.get(element) || {};
    attributes.forEach((attribute) => {
      if (!attribute || !element.hasAttribute(attribute)) return;
      if (sourceIsCurrent || !Object.prototype.hasOwnProperty.call(sources, attribute)) {
        sources[attribute] = element.getAttribute(attribute);
      }
      element.setAttribute(attribute, translate(sources[attribute]));
    });
    attributeSources.set(element, sources);
  }

  function translate(value) {
    const source = String(value ?? "");
    if (currentLanguage !== "es") return source;
    const trimmed = source.trim();
    if (!trimmed) return source;
    const translated = spanishText[trimmed]
      || window.PUNCH_LOGIC_SETTING_TRANSLATIONS?.[trimmed]
      || translatePattern(trimmed);
    return translated === trimmed ? source : source.replace(trimmed, translated);
  }

  function translatePattern(value) {
    let match = /^(\d+)\.\s+(.+)$/.exec(value);
    if (match) return `${match[1]}. ${translateTerm(match[2])}`;
    match = /^(.+) Open Items$/.exec(value);
    if (match) return `Pendientes abiertos de ${translateTerm(match[1])}`;
    match = /^(.+) Items$/.exec(value);
    if (match) return `Pendientes de ${translateTerm(match[1])}`;
    match = /^(.+) Item Report$/.exec(value);
    if (match) return `Reporte de pendientes - ${match[1]}`;
    match = /^Updated (.+)$/.exec(value);
    if (match) return `Actualizado ${match[1]}`;
    match = /^(\d+) open items?$/.exec(value);
    if (match) return `${match[1]} ${Number(match[1]) === 1 ? "pendiente abierto" : "pendientes abiertos"}`;
    match = /^(\d+) items?$/.exec(value);
    if (match) return `${match[1]} ${Number(match[1]) === 1 ? "pendiente" : "pendientes"}`;
    match = /^Item Photo (\d+)$/.exec(value);
    if (match) return `Foto del pendiente ${match[1]}`;
    match = /^View (.+) larger$/.exec(value);
    if (match) return `Ver ${translatePattern(match[1]) === match[1] ? (spanishText[match[1]] || match[1]) : translatePattern(match[1])} en tamaño grande`;
    match = /^No (.+) items have been added to this site\.$/.exec(value);
    if (match) return `No se agregaron pendientes de ${translateTerm(match[1])} a este sitio.`;

    let translated = value;
    phraseTranslations.forEach(([english, spanish]) => {
      translated = translated.replaceAll(english, spanish);
    });
    return translated.split(" | ").map((segment) => {
      const direct = translateTerm(segment);
      if (direct !== segment) return direct;
      const field = /^([^:]+):\s*(.+)$/.exec(segment);
      return field ? `${translateTerm(field[1])}: ${translateTerm(field[2])}` : segment;
    }).join(" | ");
  }

  function translateTerm(value) {
    return spanishText[value] || window.PUNCH_LOGIC_SETTING_TRANSLATIONS?.[value] || value;
  }

  function installLocalizedDialogs() {
    const nativeAlert = window.alert.bind(window);
    const nativeConfirm = window.confirm.bind(window);
    const nativePrompt = window.prompt.bind(window);
    window.alert = (message) => nativeAlert(translate(message));
    window.confirm = (message) => nativeConfirm(translate(message));
    window.prompt = (message, defaultValue) => nativePrompt(translate(message), defaultValue);
  }

  window.PUNCH_LOGIC_REPORT_LANGUAGE = Object.freeze({
    locale,
    refresh: refreshLanguageDom,
    translate
  });

  languageButton?.addEventListener("click", toggleLanguage);
  installLocalizedDialogs();
  refreshLanguageDom();
})();
