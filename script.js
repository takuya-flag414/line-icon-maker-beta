// --- DOM要素の取得 ---
// アプリケーションの各画面
const uploadView = document.getElementById('upload-view');
const editorView = document.getElementById('editor-view');

// アップロード関連の要素
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadButton = document.querySelector('#upload-button');

// Canvasと描画コンテキスト
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 設定変更用のUI要素
const bgColorPicker = document.getElementById('bg-color');
const formatSelector = document.getElementById('format-selector');

// 操作ボタン
const downloadBtn = document.querySelector('#download-button');
const resetBtn = document.querySelector('#reset-button');

// 位置調整モーダル関連の要素
const positionEditorModal = document.getElementById('position-editor-modal');
const editorCanvas = document.getElementById('editor-canvas');
const editorCtx = editorCanvas.getContext('2d');
const adjustPositionBtn = document.getElementById('adjust-position-btn');
const resetPositionBtn = document.getElementById('reset-position-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const upBtn = document.getElementById('up-btn');
const downBtn = document.getElementById('down-btn');
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');


// --- アプリケーションの状態管理 ---
let uploadedImage = null; // アップロードされた画像オブジェクト
let originalFilename = ''; // 元のファイル名を保持する変数
let logoSize = 72;        // ロゴのサイズ (初期値 72px)
let bgColor = '#FFFFFF';  // 背景色 (初期値 白)
let imageFormat = 'jpg';  // 保存形式 (初期値 jpg)

// 位置調整・拡縮のための状態変数を追加
let logoX = 0, logoY = 0; // ロゴの描画位置
let isDragging = false;   // ドラッグ中かどうかのフラグ
let dragStartX = 0, dragStartY = 0; // ドラッグ開始時のマウス座標

// --- イベントリスナーの設定 ---
uploadButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
});
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
});

bgColorPicker.addEventListener('input', (e) => {
    bgColor = e.target.value;
    drawImage();
});

formatSelector.addEventListener('change', (e) => {
    imageFormat = e.target.value;
});

downloadBtn.addEventListener('click', downloadImage);
resetBtn.addEventListener('click', resetApp);
adjustPositionBtn.addEventListener('click', openPositionEditor);
resetPositionBtn.addEventListener('click', () => {
    resetImageState();
    drawImage();
});

closeModalBtn.addEventListener('click', closePositionEditor);
upBtn.addEventListener('click', () => moveImage(0, -1));
downBtn.addEventListener('click', () => moveImage(0, 1));
leftBtn.addEventListener('click', () => moveImage(-1, 0));
rightBtn.addEventListener('click', () => moveImage(1, 0));

editorCanvas.addEventListener('mousedown', handleMouseDown);
editorCanvas.addEventListener('mousemove', handleMouseMove);
editorCanvas.addEventListener('mouseup', handleMouseUp);
editorCanvas.addEventListener('mouseleave', handleMouseLeave);
editorCanvas.addEventListener('wheel', handleWheel);
editorCanvas.addEventListener('mouseenter', handleMouseEnter);

// --- 機能ごとの関数 ---

function handleFile(file) {
    if (!file.type.startsWith('image/')) {
        alert('画像ファイルを選択してください。');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        alert('ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。');
        return;
    }

    // ▼ここから変更▼
    // ファイル名から拡張子を除いた部分を取得して保存
    const lastDot = file.name.lastIndexOf('.');
    originalFilename = (lastDot === -1) ? file.name : file.name.substring(0, lastDot);
    // ▲ここまで変更▲

    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedImage = new Image();
        uploadedImage.onload = () => {
            uploadView.classList.add('hidden');
            editorView.classList.remove('hidden');
            resetImageState();
            drawImage();
        };
        uploadedImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function drawSizeGuides(ctx, scale = 1) {
    const canvasSize = 130 * scale;
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
    ctx.lineWidth = 1 * scale;
    ctx.setLineDash([4 * scale, 2 * scale]);
    const minSize = 54 * scale;
    const minXY = (canvasSize - minSize) / 2;
    ctx.strokeRect(minXY, minXY, minSize, minSize);
    const maxSize = 90 * scale;
    const maxXY = (canvasSize - maxSize) / 2;
    ctx.strokeRect(maxXY, maxXY, maxSize, maxSize);
    ctx.setLineDash([]);
}

function drawImage() {
    if (!uploadedImage) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    let w, h;
    if (uploadedImage.width > uploadedImage.height) {
        w = logoSize;
        h = logoSize * (uploadedImage.height / uploadedImage.width);
    } else {
        h = logoSize;
        w = logoSize * (uploadedImage.width / uploadedImage.height);
    }
    ctx.drawImage(uploadedImage, logoX, logoY, w, h);
    drawSizeGuides(ctx);
    if (!positionEditorModal.classList.contains('hidden')) {
        drawEditorCanvas();
    }
}

function drawEditorCanvas() {
    if (!uploadedImage) return;
    editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
    
    editorCtx.fillStyle = bgColor;
    editorCtx.fillRect(0, 0, editorCanvas.width, editorCanvas.height);

    const editorScale = editorCanvas.width / canvas.width;
    let w, h;
    if (uploadedImage.width > uploadedImage.height) {
        w = logoSize * editorScale;
        h = logoSize * (uploadedImage.height / uploadedImage.width) * editorScale;
    } else {
        h = logoSize * editorScale;
        w = logoSize * (uploadedImage.width / uploadedImage.height) * editorScale;
    }
    const x = logoX * editorScale;
    const y = logoY * editorScale;
    editorCtx.drawImage(uploadedImage, x, y, w, h);
    drawSizeGuides(editorCtx, editorScale);
}

function downloadImage() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 130;
    tempCanvas.height = 130;
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCtx.fillStyle = bgColor;
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    let w, h;
    if (uploadedImage.width > uploadedImage.height) {
        w = logoSize;
        h = logoSize * (uploadedImage.height / uploadedImage.width);
    } else {
        h = logoSize;
        w = logoSize * (uploadedImage.width / uploadedImage.height);
    }
    tempCtx.drawImage(uploadedImage, logoX, logoY, w, h);
    
    const format = imageFormat === 'png' ? 'image/png' : 'image/jpeg';
    const fileExtension = imageFormat;
    const link = document.createElement('a');

    // ▼ここから変更▼
    // 保存するファイル名を変更
    link.download = `${originalFilename}130.${fileExtension}`;
    // ▲ここまで変更▲
    
    link.href = tempCanvas.toDataURL(format, 0.95);
    link.click();
}

function resetApp() {
    uploadedImage = null;
    originalFilename = ''; // ▼追加▼ ファイル名もリセット
    bgColor = '#FFFFFF';
    bgColorPicker.value = '#FFFFFF';
    imageFormat = 'jpg';
    document.querySelector('input[name="format"][value="jpg"]').checked = true;
    resetImageState();
    fileInput.value = '';
    editorView.classList.add('hidden');
    uploadView.classList.remove('hidden');
}

function resetImageState() {
    logoSize = 72;
    if (!uploadedImage) return;
    let w, h;
    if (uploadedImage.width > uploadedImage.height) {
        w = logoSize;
        h = logoSize * (uploadedImage.height / uploadedImage.width);
    } else {
        h = logoSize;
        w = logoSize * (uploadedImage.width / uploadedImage.height);
    }
    const canvasSize = 130;
    logoX = (canvasSize - w) / 2;
    logoY = (canvasSize - h) / 2;
}

function adjustPositionForZoom(oldSize, newSize) {
    if (!uploadedImage) return;
    let oldW, oldH, newW, newH;
    if (uploadedImage.width > uploadedImage.height) {
        oldW = oldSize;
        oldH = oldSize * (uploadedImage.height / uploadedImage.width);
        newW = newSize;
        newH = newSize * (uploadedImage.height / uploadedImage.width);
    } else {
        oldH = oldSize;
        oldW = oldSize * (uploadedImage.width / uploadedImage.height);
        newH = newSize;
        newW = newSize * (uploadedImage.width / uploadedImage.height);
    }
    logoX -= (newW - oldW) / 2;
    logoY -= (newH - oldH) / 2;
}

function openPositionEditor() {
    positionEditorModal.classList.remove('hidden');
    drawEditorCanvas();
}

function closePositionEditor() {
    positionEditorModal.classList.add('hidden');
}

function moveImage(dx, dy) {
    logoX += dx;
    logoY += dy;
    drawImage();
}

function handleMouseDown(e) {
    isDragging = true;
    const rect = editorCanvas.getBoundingClientRect();
    dragStartX = e.clientX - rect.left;
    dragStartY = e.clientY - rect.top;
    editorCanvas.style.cursor = 'grabbing';
}

function handleMouseMove(e) {
    if (isDragging) {
        const rect = editorCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const editorScale = editorCanvas.width / canvas.width;
        const dx = (mouseX - dragStartX) / editorScale;
        const dy = (mouseY - dragStartY) / editorScale;
        logoX += dx;
        logoY += dy;
        dragStartX = mouseX;
        dragStartY = mouseY;
        drawImage();
    }
}

function handleMouseUp() {
    isDragging = false;
    editorCanvas.style.cursor = 'grab';
}

function handleMouseLeave() {
    isDragging = false;
    editorCanvas.style.cursor = 'default';
}

function handleMouseEnter() {
    editorCanvas.style.cursor = 'grab';
}

function handleWheel(e) {
    e.preventDefault();
    const oldSize = logoSize;
    const zoomAmount = 2;
    const newSize = logoSize + (e.deltaY < 0 ? zoomAmount : -zoomAmount);
    logoSize = Math.max(20, Math.min(200, newSize));
    if (logoSize !== oldSize) {
        adjustPositionForZoom(oldSize, logoSize);
        drawImage();
    }
}
