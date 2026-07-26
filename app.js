// ---------- State ----------
let items = [];
let currentView = "calendar";
let calMonth = new Date();
calMonth.setDate(1);

const sortState = {
  todo: { col: "due_date", dir: "asc" },
  learn: { col: "due_date", dir: "asc" },
  play: { col: "due_date", dir: "asc" },
};

let currentPhotoDataUrl = "";

const CATEGORY_LABEL = { todo: "To Do", learn: "To Learn", play: "To Play" };
const CATEGORY_TITLE = { calendar: "หน้าแรก", todo: "To Do", learn: "To Learn", play: "To Play" };

// ---------- API ----------
async function fetchItems() {
  const res = await fetch("/api/items");
  items = await res.json();
}

async function createItem(payload) {
  const res = await fetch("/api/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function updateItem(id, payload) {
  const res = await fetch(`/api/items/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function deleteItemApi(id) {
  await fetch(`/api/items/${id}`, { method: "DELETE" });
}

// ---------- Navigation ----------
function switchView(view) {
  currentView = view;
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  document.getElementById(`view-${view}`).classList.remove("hidden");

  document.querySelectorAll(".navbtn").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view)
  );

  document.getElementById("pageTitle").textContent = CATEGORY_TITLE[view];

  const fab = document.getElementById("fabAdd");
  if (view === "calendar") {
    fab.classList.add("hidden");
  } else {
    fab.classList.remove("hidden");
    fab.style.background =
      view === "todo" ? "var(--todo)" : view === "learn" ? "var(--learn)" : "var(--play)";
  }

  render();
}

document.querySelectorAll(".navbtn").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

// ---------- Render dispatcher ----------
function render() {
  if (currentView === "calendar") renderCalendar();
  else renderList(currentView);
}

// ---------- Calendar view ----------
const MONTH_NAMES_TH = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];

function itemsOnDate(dateStr) {
  return items.filter((it) => {
    if (!it.start_date && !it.due_date) return false;
    const start = it.start_date || it.due_date;
    const due = it.due_date || it.start_date;
    return dateStr >= start && dateStr <= due;
  });
}

function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function renderCalendar() {
  const y = calMonth.getFullYear();
  const m = calMonth.getMonth();
  document.getElementById("calMonthLabel").textContent = `${MONTH_NAMES_TH[m]} ${y + 543}`;

  const grid = document.getElementById("calGrid");
  grid.innerHTML = "";

  const firstDay = new Date(y, m, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayStr = toDateStr(new Date());

  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement("div");
    empty.className = "cal-day empty";
    grid.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(y, m, day);
    const dateStr = toDateStr(dateObj);
    const dayItems = itemsOnDate(dateStr);

    const cell = document.createElement("button");
    cell.className = "cal-day" + (dateStr === todayStr ? " is-today" : "");
    cell.innerHTML = `${day}`;

    if (dayItems.length) {
      const dotsWrap = document.createElement("div");
      dotsWrap.className = "cal-day-dots";
      const cats = [...new Set(dayItems.map((it) => it.category))];
      cats.forEach((cat) => {
        const dot = document.createElement("span");
        dot.className = `dot dot-${cat}`;
        dotsWrap.appendChild(dot);
      });
      cell.appendChild(dotsWrap);
    }

    cell.addEventListener("click", () => showDayPanel(dateStr));
    grid.appendChild(cell);
  }
}

let currentDayPanelDate = null;

function showDayPanel(dateStr) {
  currentDayPanelDate = dateStr;
  document.getElementById("dayPanelDate").textContent = dateStr;
  renderDayPanelList(dateStr);
  document.getElementById("dayPanel").classList.remove("hidden");
}

function renderDayPanelList(dateStr) {
  const container = document.getElementById("dayPanelList");
  const dayItems = itemsOnDate(dateStr);

  if (!dayItems.length) {
    container.innerHTML = `<div class="list-empty" style="padding:24px 0;">ไม่มีรายการในวันนี้</div>`;
    return;
  }

  container.innerHTML = dayItems.map(rowHtml).join("");
  wireItemCards(container, () => {
    renderCalendar();
    renderDayPanelList(dateStr);
  });
}

document.getElementById("closeDayPanel").addEventListener("click", () => {
  document.getElementById("dayPanel").classList.add("hidden");
  currentDayPanelDate = null;
});

document.getElementById("prevMonth").addEventListener("click", () => {
  calMonth.setMonth(calMonth.getMonth() - 1);
  renderCalendar();
});
document.getElementById("nextMonth").addEventListener("click", () => {
  calMonth.setMonth(calMonth.getMonth() + 1);
  renderCalendar();
});

// ---------- List views (To Do / To Learn / To Play) ----------
const SWIPE_ACTION_WIDTH = 140; // total width of the Edit + Delete buttons revealed on swipe
let openSwipeId = null; // id of the row currently swiped open (only one at a time)

function renderList(category) {
  const container = document.getElementById(`view-${category}`);
  let list = items.filter((it) => it.category === category);
  openSwipeId = null;

  const { col, dir } = sortState[category];
  list = list.slice().sort((a, b) => {
    let av = a[col] || "";
    let bv = b[col] || "";
    if (col === "done") { av = a.done; bv = b.done; }
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });

  if (!list.length) {
    container.innerHTML = `<div class="list-empty">ยังไม่มีรายการใน ${CATEGORY_LABEL[category]}<br>กดปุ่ม + เพื่อเพิ่มรายการแรก</div>`;
    return;
  }

  const arrow = (c) => (col === c ? (dir === "asc" ? "▲" : "▼") : "");
  const chipClass = (c) => "sort-chip" + (col === c ? " active" : "");

  container.innerHTML = `
    <div class="sort-bar">
      <button type="button" class="${chipClass("title")}" data-col="title">ชื่อ ${arrow("title")}</button>
      <button type="button" class="${chipClass("start_date")}" data-col="start_date">เริ่ม ${arrow("start_date")}</button>
      <button type="button" class="${chipClass("due_date")}" data-col="due_date">กำหนดจบ ${arrow("due_date")}</button>
      <button type="button" class="${chipClass("done")}" data-col="done">เสร็จ ${arrow("done")}</button>
    </div>
    <div class="list-rows">
      ${list.map(rowHtml).join("")}
    </div>
  `;

  container.querySelectorAll(".sort-bar [data-col]").forEach((el) => {
    el.addEventListener("click", () => {
      const c = el.dataset.col;
      if (sortState[category].col === c) {
        sortState[category].dir = sortState[category].dir === "asc" ? "desc" : "asc";
      } else {
        sortState[category].col = c;
        sortState[category].dir = "asc";
      }
      renderList(category);
    });
  });

  wireItemCards(container, () => renderList(category));
}

function rowHtml(it) {
  const doneBadge = it.done
    ? `<span class="badge badge-done">เสร็จแล้ว</span>`
    : `<span class="badge badge-muted">ยังไม่เสร็จ</span>`;

  const linkBtn = it.link
    ? `<button type="button" class="btn btn-link card-link-btn" data-action="open-link" data-id="${it.id}">🔗 เปิดลิงก์</button>`
    : `<button type="button" class="btn btn-link card-link-btn disabled" disabled>🔗 เปิดลิงก์</button>`;

  const photoEl = it.photo
    ? `<img src="${it.photo}" class="card-photo-thumb" data-id="${it.id}" alt="แตะเพื่อดูรูปเต็ม">`
    : `<span class="card-photo-empty" aria-hidden="true">🖼️</span>`;

  return `
    <div class="swipe-row" data-id="${it.id}">
      <div class="swipe-actions">
        <button type="button" class="swipe-action-btn swipe-action-edit swipe-action-${it.category}" data-action="edit" data-id="${it.id}">แก้ไข</button>
        <button type="button" class="swipe-action-btn swipe-action-delete" data-action="delete" data-id="${it.id}">ลบ</button>
      </div>
      <div class="swipe-content item-card" data-id="${it.id}" data-open="false">
        <div class="card-top">
          <span class="row-title ${it.done ? "done" : ""}">${escapeHtml(it.title)}</span>
          <input type="checkbox" class="row-done-check row-done-check-${it.category}" data-id="${it.id}" ${it.done ? "checked" : ""}>
        </div>
        <div class="card-badges">
          <span class="badge badge-${it.category}">${CATEGORY_LABEL[it.category]}</span>
          ${doneBadge}
        </div>
        <div class="card-dates">
          <div class="card-date-item">
            <span class="card-date-label">เริ่ม</span>
            <span>${it.start_date || "—"}</span>
          </div>
          <div class="card-date-item">
            <span class="card-date-label">กำหนดจบ</span>
            <span>${it.due_date || "—"}</span>
          </div>
        </div>
        <div class="card-bottom">
          ${linkBtn}
          ${photoEl}
        </div>
      </div>
    </div>
  `;
}

// Wires the checkbox / open-link / photo-lightbox / edit / delete actions and the
// swipe gesture for a container of item cards. Works for both the fixed-category
// List views and the calendar's mixed-category day panel (each item carries its
// own .category, so no outer "current category" needs to be passed in).
function wireItemCards(container, refreshFn) {
  container.querySelectorAll(".row-done-check").forEach((chk) => {
    chk.addEventListener("click", async (e) => {
      e.stopPropagation();
      const it = items.find((i) => i.id === chk.dataset.id);
      it.done = chk.checked ? 1 : 0;
      await updateItem(it.id, toPayload(it));
      refreshFn();
    });
  });

  container.querySelectorAll('[data-action="open-link"]').forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const it = items.find((i) => i.id === btn.dataset.id);
      if (it && it.link) window.open(it.link, "_blank");
    });
  });

  container.querySelectorAll(".card-photo-thumb").forEach((img) => {
    img.addEventListener("click", (e) => {
      e.stopPropagation();
      const it = items.find((i) => i.id === img.dataset.id);
      if (it && it.photo) openLightbox(it.photo);
    });
  });

  container.querySelectorAll('[data-action="edit"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const it = items.find((i) => i.id === btn.dataset.id);
      editItemDirectly(it.category, it);
    });
  });

  container.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("ต้องการลบรายการนี้ใช่ไหม?")) return;
      await deleteItemApi(btn.dataset.id);
      await fetchItems();
      refreshFn();
    });
  });

  setupSwipeRows(container);
}

// Swipe-to-reveal Edit/Delete, using Pointer Events (works for touch and mouse).
function setupSwipeRows(container) {
  container.querySelectorAll(".swipe-content").forEach((contentEl) => {
    let startX = 0;
    let dragX = 0;
    let dragging = false;
    let moved = false;

    const isInteractiveTarget = (target) =>
      target.closest(".row-done-check, .card-link-btn, .card-photo-thumb, .card-photo-empty");

    const closeRow = () => {
      contentEl.style.transition = "transform 0.2s ease";
      contentEl.style.transform = "translateX(0)";
      contentEl.dataset.open = "false";
      if (openSwipeId === contentEl.dataset.id) openSwipeId = null;
    };

    const openRow = () => {
      contentEl.style.transition = "transform 0.2s ease";
      contentEl.style.transform = `translateX(-${SWIPE_ACTION_WIDTH}px)`;
      contentEl.dataset.open = "true";
      openSwipeId = contentEl.dataset.id;
    };

    contentEl.addEventListener("pointerdown", (e) => {
      if (isInteractiveTarget(e.target)) return;
      startX = e.clientX;
      dragging = true;
      moved = false;
      contentEl.style.transition = "none";
      if (openSwipeId && openSwipeId !== contentEl.dataset.id) {
        const otherEl = container.querySelector(`.swipe-content[data-id="${openSwipeId}"]`);
        if (otherEl) {
          otherEl.style.transition = "transform 0.2s ease";
          otherEl.style.transform = "translateX(0)";
          otherEl.dataset.open = "false";
        }
        openSwipeId = null;
      }
    });

    contentEl.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 5) moved = true;
      const base = contentEl.dataset.open === "true" ? -SWIPE_ACTION_WIDTH : 0;
      dragX = Math.max(-SWIPE_ACTION_WIDTH, Math.min(0, base + dx));
      contentEl.style.transform = `translateX(${dragX}px)`;
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      if (dragX < -SWIPE_ACTION_WIDTH / 2) {
        openRow();
      } else {
        closeRow();
      }
    };
    contentEl.addEventListener("pointerup", endDrag);
    contentEl.addEventListener("pointercancel", endDrag);

    contentEl.addEventListener("click", (e) => {
      if (isInteractiveTarget(e.target)) return;
      if (moved) { moved = false; return; }
      if (contentEl.dataset.open === "true") {
        closeRow();
      }
      // else: nothing to do — all info is already shown on the card itself.
      // Swipe left to reveal Edit/Delete.
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function toPayload(it) {
  return {
    category: it.category,
    title: it.title,
    notes: it.notes,
    start_date: it.start_date,
    due_date: it.due_date,
    done: it.done,
    link: it.link,
    photo: it.photo,
  };
}

// ---------- FAB ----------
document.getElementById("fabAdd").addEventListener("click", () => {
  openModal(currentView, null); // no item -> always opens straight into edit mode
});

// ---------- Modal ----------
const modalOverlay = document.getElementById("modalOverlay");
const itemForm = document.getElementById("itemForm");
const viewPanel = document.getElementById("viewPanel");
const editPanel = document.getElementById("editPanel");

let activeItem = null; // the item currently shown/edited in the modal

// Open the modal. If an item is given, opens in read-only Preview mode.
// If item is null (adding new), opens straight into the Edit form.
function openModal(category, item) {
  activeItem = item;
  if (item) {
    showViewPanel(category, item);
  } else {
    showEditPanel(category, null);
  }
  modalOverlay.classList.remove("hidden");
}

function showViewPanel(category, item) {
  viewPanel.classList.remove("hidden");
  editPanel.classList.add("hidden");

  document.getElementById("viewTitle").textContent = item.title;

  const catBadge = document.getElementById("viewCategoryBadge");
  catBadge.textContent = CATEGORY_LABEL[item.category];
  catBadge.className = "badge badge-" + item.category;

  const doneBadge = document.getElementById("viewDoneBadge");
  doneBadge.textContent = item.done ? "เสร็จแล้ว" : "ยังไม่เสร็จ";
  doneBadge.className = "badge " + (item.done ? "badge-done" : "badge-muted");

  const notesRow = document.getElementById("viewNotesRow");
  if (item.notes) {
    document.getElementById("viewNotes").textContent = item.notes;
    notesRow.classList.remove("hidden");
  } else {
    notesRow.classList.add("hidden");
  }

  document.getElementById("viewStart").textContent = item.start_date || "—";
  document.getElementById("viewDue").textContent = item.due_date || "—";

  const linkRow = document.getElementById("viewLinkRow");
  if (item.link) {
    linkRow.classList.remove("hidden");
    document.getElementById("viewLinkBtn").onclick = () => window.open(item.link, "_blank");
  } else {
    linkRow.classList.add("hidden");
  }

  const photoRow = document.getElementById("viewPhotoRow");
  if (item.photo) {
    photoRow.classList.remove("hidden");
    const photoEl = document.getElementById("viewPhoto");
    photoEl.src = item.photo;
    photoEl.onclick = () => openLightbox(item.photo);
  } else {
    photoRow.classList.add("hidden");
  }

  document.getElementById("viewEditBtn").onclick = () => showEditPanel(category, item);
}

function showEditPanel(category, item) {
  editPanel.classList.remove("hidden");
  viewPanel.classList.add("hidden");

  document.getElementById("modalTitle").textContent = item ? "แก้ไขรายการ" : "รายการใหม่";
  document.getElementById("f_id").value = item ? item.id : "";
  document.getElementById("f_category").value = category;
  document.getElementById("f_title").value = item ? item.title : "";
  document.getElementById("f_notes").value = item ? item.notes : "";
  document.getElementById("f_start").value = item ? item.start_date || "" : "";
  document.getElementById("f_due").value = item ? item.due_date || "" : "";
  document.getElementById("f_link").value = item ? item.link : "";
  document.getElementById("f_done").checked = item ? !!item.done : false;
  document.getElementById("f_photo_upload").value = "";
  document.getElementById("f_photo_camera").value = "";

  currentPhotoDataUrl = item ? item.photo || "" : "";
  const preview = document.getElementById("f_photo_preview");
  if (currentPhotoDataUrl) {
    preview.src = currentPhotoDataUrl;
    preview.classList.remove("hidden");
  } else {
    preview.classList.add("hidden");
  }

  document.getElementById("deleteBtn").classList.toggle("hidden", !item);
}

// Opens the modal straight into edit mode for an existing item
// (used by the swipe "แก้ไข" action, skipping the preview step).
function editItemDirectly(category, item) {
  activeItem = item;
  showEditPanel(category, item);
  modalOverlay.classList.remove("hidden");
}

function closeModal() {
  modalOverlay.classList.add("hidden");
  activeItem = null;
}

document.getElementById("viewClose").addEventListener("click", closeModal);
document.getElementById("viewCloseBtn2").addEventListener("click", closeModal);
document.getElementById("modalClose").addEventListener("click", closeModal);
document.getElementById("cancelBtn").addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.getElementById("viewDeleteBtn").addEventListener("click", async () => {
  if (!activeItem) return;
  if (!confirm("ต้องการลบรายการนี้ใช่ไหม?")) return;
  await deleteItemApi(activeItem.id);
  closeModal();
  await fetchItems();
  render();
});

// ---------- Lightbox (full-screen photo viewer) ----------
const lightbox = document.getElementById("lightbox");
function openLightbox(src) {
  document.getElementById("lightboxImg").src = src;
  lightbox.classList.remove("hidden");
}
lightbox.addEventListener("click", () => lightbox.classList.add("hidden"));

// Tapping the small photo thumbnail in the edit form opens the lightbox
// instead of re-triggering the camera/file picker.
document.getElementById("f_photo_preview").addEventListener("click", () => {
  if (currentPhotoDataUrl) openLightbox(currentPhotoDataUrl);
});

// "เพิ่มรูป" opens the photo library / file picker (no camera attribute).
document.getElementById("photoUploadBtn").addEventListener("click", () => {
  document.getElementById("f_photo_upload").click();
});

// "ถ่ายรูป" opens the camera directly.
document.getElementById("photoCameraBtn").addEventListener("click", () => {
  document.getElementById("f_photo_camera").click();
});

// ---------- QR code scanner ----------
const qrOverlay = document.getElementById("qrOverlay");
const qrVideo = document.getElementById("qrVideo");
const qrCanvas = document.getElementById("qrCanvas");
let qrStream = null;
let qrScanning = false;

async function startQrScanner() {
  try {
    qrStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
  } catch (err) {
    alert("ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้กล้องในเบราว์เซอร์");
    return;
  }
  qrVideo.srcObject = qrStream;
  await qrVideo.play();
  qrOverlay.classList.remove("hidden");
  qrScanning = true;
  requestAnimationFrame(scanQrFrame);
}

function stopQrScanner() {
  qrScanning = false;
  qrOverlay.classList.add("hidden");
  if (qrStream) {
    qrStream.getTracks().forEach((track) => track.stop());
    qrStream = null;
  }
}

function scanQrFrame() {
  if (!qrScanning) return;

  if (qrVideo.readyState === qrVideo.HAVE_ENOUGH_DATA) {
    qrCanvas.width = qrVideo.videoWidth;
    qrCanvas.height = qrVideo.videoHeight;
    const ctx = qrCanvas.getContext("2d");
    ctx.drawImage(qrVideo, 0, 0, qrCanvas.width, qrCanvas.height);
    const imageData = ctx.getImageData(0, 0, qrCanvas.width, qrCanvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code && code.data) {
      document.getElementById("f_link").value = code.data;
      stopQrScanner();
      return;
    }
  }

  requestAnimationFrame(scanQrFrame);
}

document.getElementById("qrScanBtn").addEventListener("click", startQrScanner);
document.getElementById("qrCloseBtn").addEventListener("click", stopQrScanner);

// Compress photo to keep D1 rows small (shared by both the upload and camera inputs)
function handlePhotoFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 800;
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      currentPhotoDataUrl = canvas.toDataURL("image/jpeg", 0.7);
      const preview = document.getElementById("f_photo_preview");
      preview.src = currentPhotoDataUrl;
      preview.classList.remove("hidden");
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

document.getElementById("f_photo_upload").addEventListener("change", handlePhotoFile);
document.getElementById("f_photo_camera").addEventListener("change", handlePhotoFile);

itemForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("f_id").value;
  const payload = {
    category: document.getElementById("f_category").value,
    title: document.getElementById("f_title").value.trim(),
    notes: document.getElementById("f_notes").value.trim(),
    start_date: document.getElementById("f_start").value || null,
    due_date: document.getElementById("f_due").value || null,
    link: document.getElementById("f_link").value.trim(),
    done: document.getElementById("f_done").checked ? 1 : 0,
    photo: currentPhotoDataUrl,
  };

  if (id) {
    await updateItem(id, payload);
  } else {
    await createItem(payload);
  }

  closeModal();
  await fetchItems();
  render();
  if (currentDayPanelDate) renderDayPanelList(currentDayPanelDate);
});

document.getElementById("deleteBtn").addEventListener("click", async () => {
  const id = document.getElementById("f_id").value;
  if (!id) return;
  if (!confirm("ต้องการลบรายการนี้ใช่ไหม?")) return;
  await deleteItemApi(id);
  closeModal();
  await fetchItems();
  render();
  if (currentDayPanelDate) renderDayPanelList(currentDayPanelDate);
});

// ---------- Init ----------
(async function init() {
  await fetchItems();
  render();
})();
