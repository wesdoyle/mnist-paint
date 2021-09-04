"use strict";

const MATRIX_SIZE = 28
const SCALE_FACTOR = 10
const NUM_CATEGORIES = 10

const canvas = document.getElementById('paint');
canvas.width = MATRIX_SIZE * SCALE_FACTOR;
canvas.height = MATRIX_SIZE * SCALE_FACTOR;
const context = canvas.getContext('2d');

let clickX = [];
let clickY = [];
let clickDrag = [];
let paint;

const predictions = [];

const matrix = [];

const colorMap = {
  0: '#f2f1f9',
  1: '#888888',
  2: '#333333',
  3: '#000000',
}

function addClick(x, y, dragging) {
  clickX.push(x);
  clickY.push(y);
  clickDrag.push(dragging);
}

function redraw() {
  // Clear canvas
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  for (let i = 0; i < clickX.length; i += 1) {
      context.lineTo(clickX[i], clickY[i]);
  }
}

function updateElement(elementId, val) {
  document.getElementById(elementId).innerHTML = val;
}

function sumHot() {
  let hotCount = 0;
  for (let i = 0; i < MATRIX_SIZE; i++) {
    for (let j = 0; j < MATRIX_SIZE; j++) {
      if (matrix[i][j]) {
        hotCount++;
      };
    }
  }
  const ratio = 100 * hotCount / MATRIX_SIZE ** 2
  return { ratio, hotCount }
}

function drawNew() {
  let i = clickX.length - 1
  let xPos = 0;
  let yPos = 0;
  if (!clickDrag[i]) {
    if (clickX.length == 0) {
      context.beginPath();
      context.moveTo(clickX[i], clickY[i]);
    } else {
      context.closePath();
      context.beginPath();
      context.moveTo(clickX[i], clickY[i]);
    }
  } else {
    context.lineTo(clickX[i], clickY[i]);
  }
}

function darken(point) {
  if (point === 3) {
    return 3;
  }
  return point + 1;
}

function updateMatrix(x, y) {
  let xIndex = Math.floor(x / SCALE_FACTOR);
  let yIndex = Math.floor(y / SCALE_FACTOR);
  matrix[yIndex-1][xIndex-1] = darken(matrix[yIndex-1][xIndex-1]);
  matrix[yIndex-1][xIndex] = darken(matrix[yIndex-1][xIndex]);
  matrix[yIndex-1][xIndex+1] = darken(matrix[yIndex-1][xIndex+1]);
  matrix[yIndex][xIndex-1] = darken(matrix[yIndex][xIndex-1]);
  matrix[yIndex][xIndex] = darken(matrix[yIndex][xIndex]);
  matrix[yIndex+1][xIndex+1] = darken(matrix[yIndex+1][xIndex+1]);
  matrix[yIndex+1][xIndex] = darken(matrix[yIndex+1][xIndex]);
  matrix[yIndex+1][xIndex-1] = darken(matrix[yIndex+1][xIndex-1]);
  matrix[yIndex][xIndex+1] = darken(matrix[yIndex][xIndex+1]);
}

function mouseDownEventHandler(e) {
  paint = true;
  let x = e.pageX - canvas.offsetLeft;
  let y = e.pageY - canvas.offsetTop;
  if (x < 0) { x = 0; }
  if (y < 0) { y = 0; }
  if (x > MATRIX_SIZE * SCALE_FACTOR) { x = MATRIX_SIZE * SCALE_FACTOR }
  if (y > MATRIX_SIZE * SCALE_FACTOR) { y = MATRIX_SIZE * SCALE_FACTOR }
  if (paint) {
    addClick(x, y, false);
    drawNew();
  }
}

function mouseUpEventHandler(e) {
  context.closePath();
  paint = false;
}

function mouseMoveEventHandler(e) {
  let x = e.pageX - canvas.offsetLeft;
  let y = e.pageY - canvas.offsetTop;
  if (x < 0) { x = 0; }
  if (y < 0) { y = 0; }
  if (x > MATRIX_SIZE * SCALE_FACTOR) { x = MATRIX_SIZE * SCALE_FACTOR }
  if (y > MATRIX_SIZE * SCALE_FACTOR) { y = MATRIX_SIZE * SCALE_FACTOR }
  if (paint) {
    updateElement("xDisplay", x);
    updateElement("yDisplay", y);
    try {
      updateMatrix(x, y);
    } catch { }
    renderMatrix();
    let hotness = sumHot();
    updateElement("hotRatio", Math.round(hotness.ratio, 2).toString() + "%");
    updateElement("totalHot", hotness.hotCount);
    updateElement("vector", matrix);
    updateElement("prediction", predictions);
    addClick(x, y, true);
    drawNew();
  }
}

function setUpHandler(detectEvent) {
  removeRaceHandlers();
  canvas.addEventListener('mouseup', mouseUpEventHandler);
  canvas.addEventListener('mousemove', mouseMoveEventHandler);
  canvas.addEventListener('mousedown', mouseDownEventHandler);
  mouseDownEventHandler(detectEvent);
}

function onMouse(e) {
  setUpHandler(e);
}

function removeRaceHandlers() {
  canvas.removeEventListener('mousedown', onMouse);
}

canvas.addEventListener('mousedown', onMouse);

function buildSquareMatrix(size) {
  for (let i = 0; i < size; i++) {
    matrix.push([]);
    for (let j = 0; j < size; j++) {
      matrix[i].push(0);
    }
  }
}

function renderMatrix() {
  let cellWidth = SCALE_FACTOR;
  let cellHeight = SCALE_FACTOR;
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      // let color = Math.round(Math.random())
      context.fillStyle = colorMap[value];
      context.fillRect(
      x * cellWidth,
      y * cellHeight,
      cellWidth,
      cellHeight);
    });
  });
}

function initializePredictions() {
  for (let i = 0; i < NUM_CATEGORIES; i++) {
    predictions.push(0.0);
  }
}

initializePredictions();
buildSquareMatrix(MATRIX_SIZE);
renderMatrix();
updateElement("vector", matrix)
