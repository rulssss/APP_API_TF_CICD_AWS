const form = document.querySelector("#product-form");
const nameInput = document.querySelector("#product-name");
const priceInput = document.querySelector("#product-price");
const stockInput = document.querySelector("#product-stock");
const saveButton = document.querySelector("#save-button");
const cancelButton = document.querySelector("#cancel-edit");
const formTitle = document.querySelector("#form-title");
const formKicker = document.querySelector("#form-kicker");
const formMessage = document.querySelector("#form-message");
const productRows = document.querySelector("#product-rows");
const productCount = document.querySelector("#product-count");
const listSummary = document.querySelector("#list-summary");
const searchInput = document.querySelector("#product-search");
const connectionStatus = document.querySelector("#connection-status");
const connectionLabel = document.querySelector("#connection-label");

let products = [];
let editingProductId = null;

const priceFormatter = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let detail = `Error ${response.status}`;
    try {
      const body = await response.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      // Keep the HTTP status when the server does not return JSON.
    }
    throw new Error(detail);
  }

  if (response.status === 204) return null;
  return response.json();
}

function setConnection(online) {
  connectionStatus.classList.toggle("is-online", online);
  connectionStatus.classList.toggle("is-offline", !online);
  connectionLabel.textContent = online ? "API conectada" : "API sin conexión";
}

function showFormMessage(message = "", kind = "") {
  formMessage.textContent = message;
  formMessage.className = `form-message${kind ? ` is-${kind}` : ""}`;
}

function createCell(className, text) {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  cell.textContent = text;
  return cell;
}

function renderProducts() {
  const query = searchInput.value.trim().toLocaleLowerCase("es");
  const visibleProducts = products.filter((product) =>
    product.name.toLocaleLowerCase("es").includes(query),
  );

  productCount.textContent = String(products.length);
  listSummary.textContent = query
    ? `${visibleProducts.length} de ${products.length} productos`
    : `${products.length} ${products.length === 1 ? "registro" : "registros"}`;

  if (visibleProducts.length === 0) {
    const row = document.createElement("tr");
    const cell = createCell(
      "table-state",
      products.length === 0 ? "Todavía no hay productos." : "No se encontraron coincidencias.",
    );
    cell.colSpan = 4;
    row.append(cell);
    productRows.replaceChildren(row);
    return;
  }

  const rows = visibleProducts.map((product) => {
    const row = document.createElement("tr");
    const nameCell = createCell("product-name", product.name);
    const productId = document.createElement("span");
    productId.className = "product-id";
    productId.textContent = `ID ${product.id}`;
    nameCell.append(productId);

    const priceCell = createCell("product-price", priceFormatter.format(Number(product.price)));
    const stockCell = document.createElement("td");
    const stockBadge = document.createElement("span");
    stockBadge.className = "stock-badge";
    if (product.stock === 0) {
      stockBadge.classList.add("is-empty");
      stockBadge.textContent = "Sin stock";
    } else if (product.stock < 5) {
      stockBadge.classList.add("is-low");
      stockBadge.textContent = `${product.stock} · Bajo`;
    } else {
      stockBadge.textContent = `${product.stock} · Disponible`;
    }
    stockCell.append(stockBadge);

    const actionsCell = document.createElement("td");
    const actions = document.createElement("div");
    actions.className = "row-actions";

    const editButton = document.createElement("button");
    editButton.className = "row-action";
    editButton.type = "button";
    editButton.textContent = "Editar";
    editButton.setAttribute("aria-label", `Editar ${product.name}`);
    editButton.addEventListener("click", () => beginEdit(product));

    const deleteButton = document.createElement("button");
    deleteButton.className = "row-action is-delete";
    deleteButton.type = "button";
    deleteButton.textContent = "Eliminar";
    deleteButton.setAttribute("aria-label", `Eliminar ${product.name}`);
    deleteButton.addEventListener("click", () => deleteProduct(product));

    const uploadButton = document.createElement("button");
    uploadButton.className = "row-action";
    uploadButton.type = "button";
    uploadButton.textContent = "Subir imagen";
    uploadButton.setAttribute("aria-label", `Subir imagen para ${product.name}`);
    uploadButton.addEventListener("click", () => chooseProductImage(product));

    const viewImageButton = document.createElement("button");
    viewImageButton.className = "row-action";
    viewImageButton.type = "button";
    viewImageButton.textContent = "Ver imagen";
    viewImageButton.setAttribute("aria-label", `Ver imagen de ${product.name}`);
    viewImageButton.addEventListener("click", () => viewProductImage(product));

    actions.append(editButton, deleteButton, uploadButton, viewImageButton);
    actionsCell.append(actions);
    row.append(nameCell, priceCell, stockCell, actionsCell);
    return row;
  });

  productRows.replaceChildren(...rows);
}

function chooseProductImage(product) {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/jpeg,image/png,image/webp";
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    try {
      await apiRequest(`/products/${product.id}/image`, {
        method: "PUT",
        body: formData,
      });
      showFormMessage(`Imagen guardada para ${product.name}.`, "success");
    } catch (error) {
      showFormMessage(error.message, "error");
    }
  }, { once: true });
  fileInput.click();
}

async function viewProductImage(product) {
  const imageWindow = window.open("about:blank", "_blank");
  if (!imageWindow) {
    showFormMessage("Permite ventanas emergentes para abrir la imagen.", "error");
    return;
  }
  imageWindow.opener = null;

  try {
    const image = await apiRequest(`/products/${product.id}/image`);
    imageWindow.location = image.url;
  } catch (error) {
    imageWindow.close();
    showFormMessage(error.message, "error");
  }
}

async function loadProducts() {
  try {
    products = await apiRequest("/products");
    setConnection(true);
    renderProducts();
  } catch (error) {
    setConnection(false);
    const row = document.createElement("tr");
    const cell = createCell("table-state is-error", `No se pudieron cargar los productos: ${error.message}`);
    cell.colSpan = 4;
    row.append(cell);
    productRows.replaceChildren(row);
    listSummary.textContent = "";
  }
}

function resetForm() {
  form.reset();
  editingProductId = null;
  formTitle.textContent = "Agregar producto";
  formKicker.textContent = "NUEVO REGISTRO";
  saveButton.querySelector("span:last-child").textContent = "Agregar producto";
  cancelButton.hidden = true;
  showFormMessage();
}

function beginEdit(product) {
  editingProductId = product.id;
  nameInput.value = product.name;
  priceInput.value = Number(product.price).toFixed(2);
  stockInput.value = String(product.stock);
  formTitle.textContent = "Editar producto";
  formKicker.textContent = `EDITANDO ID ${product.id}`;
  saveButton.querySelector("span:last-child").textContent = "Guardar cambios";
  cancelButton.hidden = false;
  showFormMessage();
  nameInput.focus();
  form.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    name: nameInput.value.trim(),
    price: Number(priceInput.value).toFixed(2),
    stock: Number(stockInput.value),
  };

  saveButton.disabled = true;
  showFormMessage(editingProductId ? "Guardando cambios..." : "Agregando producto...");

  try {
    if (editingProductId === null) {
      await apiRequest("/products", { method: "POST", body: JSON.stringify(payload) });
      showFormMessage("Producto agregado.", "success");
    } else {
      await apiRequest(`/products/${editingProductId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      resetForm();
      showFormMessage("Cambios guardados.", "success");
    }
    await loadProducts();
    if (editingProductId === null) form.reset();
  } catch (error) {
    showFormMessage(error.message, "error");
  } finally {
    saveButton.disabled = false;
  }
});

async function deleteProduct(product) {
  const confirmed = window.confirm(`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`);
  if (!confirmed) return;

  try {
    await apiRequest(`/products/${product.id}`, { method: "DELETE" });
    if (editingProductId === product.id) resetForm();
    await loadProducts();
    showFormMessage("Producto eliminado.", "success");
  } catch (error) {
    showFormMessage(error.message, "error");
  }
}

cancelButton.addEventListener("click", resetForm);
searchInput.addEventListener("input", renderProducts);

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== searchInput) {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape" && document.activeElement === searchInput) {
    searchInput.value = "";
    renderProducts();
    searchInput.blur();
  }
});

async function initialize() {
  try {
    await apiRequest("/health");
    setConnection(true);
  } catch {
    setConnection(false);
  }
  await loadProducts();
}

initialize();
