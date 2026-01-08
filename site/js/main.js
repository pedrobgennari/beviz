/*******
* Main *
********/

const GRID_SIZE = 8;
const UPDATE_INTERVAL = 200;
const WORKGROUP_SIZE = 8;

// Get canvas on index.html
const canvas = document.querySelector("canvas");

// Check for webGPU support
if (!navigator.gpu) {
    throw new Error("WebGPU not supported on this browser.");
}

// Check for GPU adapter
const adapter = await navigator.gpu.requestAdapter();
if (!adapter) {
    throw new Error("No appropriate GPUAdapter found.");
}

// Get GPU device
const device = await adapter.requestDevice();

const context = canvas.getContext("webgpu");
const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
    device,
    format: canvasFormat,
});