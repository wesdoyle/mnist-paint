"use strict";

/**
 * Constants
 */
const MATRIX_SIZE = 28
const SCALE_FACTOR = 10
const NUM_CATEGORIES = 10
const WAIT_INTERVAL = 250

const COLOR_MAP = {
  0: '#edf7f1',
  1: '#d5ede0',
  2: '#b5d3c7',
  3: '#89b79e',
}


/**
 * Canvas for painting
 */
const canvas = document.getElementById('paint');
canvas.width = MATRIX_SIZE * SCALE_FACTOR;
canvas.height = MATRIX_SIZE * SCALE_FACTOR;
const context = canvas.getContext('2d');

/**
 * Data
 */
let clickX = [];
let clickY = [];
let clickDrag = [];
let isPainting = false;
let matrix = [];
let predictions = [];
let wait = false;

function reset() {
  clickX = [];
  clickY = [];
  clickDrag = [];
  isPainting = false;
  matrix = [];
  predictions = [];
}

function updateElement(elementId, val) {
  document.getElementById(elementId).innerHTML = val;
}

function recordClick(x, y, isDragging) {
  clickX.push(x);
  clickY.push(y);
  clickDrag.push(isDragging);
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

function paintPath() {
  let i = clickX.length - 1
  if (clickDrag[i]) {
    context.lineTo(clickX[i], clickY[i]);
  } else {
    switch (clickX.length) {
      case 0:
        context.beginPath();
        context.moveTo(clickX[i], clickY[i]);
        break;
      default:
        context.closePath();
        context.beginPath();
        context.moveTo(clickX[i], clickY[i]);
        break;
    }
  }
}

function darken(point) {
  return point === 3
    ? 3
    : point + 1;
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

function setCoordinates(e) {
  let x = e.pageX - canvas.offsetLeft;
  let y = e.pageY - canvas.offsetTop;
  if (x < 0) {
    x = 0;
  }
  if (y < 0) {
    y = 0;
  }
  if (x > MATRIX_SIZE * SCALE_FACTOR) {
    x = MATRIX_SIZE * SCALE_FACTOR
  }
  if (y > MATRIX_SIZE * SCALE_FACTOR) {
    y = MATRIX_SIZE * SCALE_FACTOR
  }
  return { x, y };
}

function onPaintEvent(x, y) {
  updateElement("xDisplay", x);
  updateElement("yDisplay", y);
  try { updateMatrix(x, y); } catch { }
  renderMatrix();
  handlePrediction();
  let hotness = sumHot();
  updateElement("hotRatio", Math.round(hotness.ratio).toString() + "%");
  updateElement("totalHot", hotness.hotCount);
  updateVector(matrix);
  recordClick(x, y);
  paintPath();
}

function mouseDownEventHandler(e) {
  isPainting = true;
  let { x, y } = setCoordinates(e);
  onPaintEvent(x, y);
}

function mouseMoveEventHandler(e) {
  let { x, y } = setCoordinates(e);
  if (isPainting) {
    onPaintEvent(x, y);
  }
}

function mouseUpEventHandler() {
  context.closePath();
  isPainting = false;
}

function buildSquareMatrix(size, asNoise) {
  for (let i = 0; i < size; i++) {
    matrix.push([]);
    for (let j = 0; j < size; j++) {
      let value = 0;
      if (asNoise === 'heavy') {
        value = getRandomInt(4);
      }
      if (asNoise === 'light') {
        value = getRandomInt(2);
      }
      matrix[i].push(value);
    }
  }
}

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function renderMatrix() {
  let cellWidth = SCALE_FACTOR;
  let cellHeight = SCALE_FACTOR;
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      context.fillStyle = COLOR_MAP[value];
      context.fillRect(
      x * cellWidth,
      y * cellHeight,
      cellWidth,
      cellHeight);
    });
  });
}

function updateScoreTable(scores) {
  for (let i=0; i<scores.length; i++) {
    let cell = document.getElementById(`score-${i}`)
    cell.innerHTML = scores[i];
    let scaledScore = parseFloat(scores[i]) + 0.2;
    cell.style.opacity = scaledScore.toString();
    document.getElementById(`score-index-${i}`).style.opacity = scaledScore.toString();
  }
}

function handlePrediction() {

  if (wait) return;

  let input = [];
  for (let i=0; i<MATRIX_SIZE; i++) {
    for (let j = 0; j < MATRIX_SIZE; j++) {
      input.push(matrix[i][j] / 3);
    }
  }

  wait = true;

  setTimeout(function (event) {
    wait = false;
  }, WAIT_INTERVAL);

  let tensor = tf.tensor(input).reshape([1, 28, 28, 1]);

  window.model.predict([tensor]).array().then(scores => {
    let roundedScores = [];
    for (let i=0; i<scores[0].length; i++) {
      roundedScores.push(scores[0][i].toFixed(2));
    }
    let updatedScores = scores[0];
    let predicted = updatedScores.indexOf(Math.max(...updatedScores));
    updateScoreTable(roundedScores);
    updateElement("prediction", predicted);
    document.getElementById("prediction").style.opacity = updatedScores[predicted].toString();
  });
}

function initializePredictions() {
  for (let i = 0; i < NUM_CATEGORIES; i++) {
    predictions.push(0.0);
  }
}

function handleControl(effect) {
  reset();
  initializePredictions();
  buildSquareMatrix(MATRIX_SIZE, effect);
  renderMatrix();
  updateElement("prediction", 0);
  updateVector(matrix);
  handlePrediction();
}

function removeAllChildNodes(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
}

function updateVector(matrix) {
  let vectorElement = document.getElementById("vector");
  removeAllChildNodes(vectorElement);

  matrix.forEach(row => {
    let newRow = document.createElement("div");
    newRow.classList.add('vector-row');

    row.forEach(element => {
      let bit = document.createElement("span");
      bit.classList.add('vector-bit');
      if (element > 0){
        bit.classList.add('bit-hot');
      } else {
        bit.classList.add('bit-not');
      }
      bit.innerHTML = element
      newRow.appendChild(bit)
    })
    vectorElement.appendChild(newRow)
  })
}

// Note the root directory needs to be served up, not fs
tf.loadLayersModel("./models/mnist_cnn_tfjs/model.json").then(model => {
   window.model = model;

  document.getElementById('clear').addEventListener('click', () => { handleControl(); });
  document.getElementById('heavy-noise').addEventListener('click', () => { handleControl("heavy"); });
  document.getElementById('light-noise').addEventListener('click', () => { handleControl("light"); });

  canvas.addEventListener('mouseup', mouseUpEventHandler);
  canvas.addEventListener('mousemove', mouseMoveEventHandler);
  canvas.addEventListener('mousedown', mouseDownEventHandler);

  initializePredictions();
  buildSquareMatrix(MATRIX_SIZE);
  renderMatrix();
  updateElement("prediction", 0)
  updateVector(matrix);
});

