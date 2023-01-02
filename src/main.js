import 'bootswatch/dist/darkly/bootstrap.min.css';
import './style.css';
import { FastAverageColor } from 'fast-average-color';
import colorDiff from 'color-diff';

const fileUploadEl = document.getElementById('fileUpload');
const previewEl = document.getElementById('preview');
const outputEl = document.getElementById('output');

const fac = new FastAverageColor();

const state = {
  file: null,
  height: 200,
  width: 200,
  averages: null,
};

function init() {
  fileUploadEl?.addEventListener('change', (e) => {
    if (!e.target || !e.target.files || !e.target.files) return;
    state.file = e.target.files[0];
    previewEl.src = URL.createObjectURL(state.file);
    previewEl.onload = () => {
      const rect = previewEl.getBoundingClientRect();
      state.height = rect.height;
      state.width = rect.width;
      outputEl.height = rect.height;
      outputEl.width = rect.width;
      state.cols = Math.ceil(state.width / 32);
      state.rows = Math.ceil(state.height / 32);

      const averages = getAverageColorsGrid();
      state.averages = averages;
      drawAveragesToCanvas();
      getPalette().then((palette) => {
        state.palette = palette;
        drawEmojis();
      });
    };
  });
}

function getAverageColorsGrid() {
  const { rows, cols } = state;
  const averages = [];
  for (let row = 0; row < rows; row++) {
    averages[row] = [];
    for (let col = 0; col < cols; col++) {
      const ave = fac.getColor(previewEl, {
        algorithm: 'dominant',
        top: row * 32,
        left: col * 32,
        width: 32,
        height: 32,
      });
      const [R, G, B, a] = ave.value;
      averages[row][col] = { R, G, B, A: a / 255 };
    }
  }

  return averages;
}

function drawAveragesToCanvas() {
  const ctx = outputEl.getContext('2d');
  const { rows, cols } = state;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const { R, G, B, A } = state.averages[row][col];
      ctx.fillStyle = `rgba(${R},${G},${B},${A})`;
      ctx.fillRect(col * 32, row * 32, 32, 32);
    }
  }
}

async function getPalette() {
  return fetch('/average-colors-deduped.json')
    .then((res) => res.json())
    .then((data) => {
      const palette = [];
      Object.entries(data).forEach(([emoji, [R, G, B, a]], idx) => {
        palette[idx] = { R, G, B, A: a / 255, name: emoji };
      });
      return palette;
    });
}

function drawEmojis() {
  const { rows, cols, averages, palette, height, width } = state;
  const ctx = outputEl.getContext('2d');
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const closest = colorDiff.closest(averages[row][col], palette);
      const img = new Image();
      img.src = `/32/${closest.name}`;
      img.onload = () => {
        const randAngle = -180 + Math.random() * 360;
        ctx.save();
        // move to the center of the canvas
        ctx.translate(col * 32, row * 32);
        // rotate the canvas to the specified degrees (in rad)
        ctx.rotate((randAngle * Math.PI) / 180);
        // since the ctx is rotated, the image will be rotated also
        ctx.drawImage(img, -16, -16);
        // ctx.drawImage(img, col * 32 - 16, row * 32 - 16);
        // we’re done with the rotating so restore the unrotated ctx
        ctx.restore();
      };
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
