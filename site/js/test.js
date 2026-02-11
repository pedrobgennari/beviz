///////////////////
// -> IMPORTS <- //
///////////////////

// Shaders
import GRID_SHADER from "../shaders/grid.wgsl?raw"

// Colormatching Functions
import CMFs from "../data/cmfs.json"

// BlackBody
import {BlackBody} from "./blackbody.js"

/////////////////////
// -> CONSTANTS <- //
/////////////////////

const GRID_SIZE = 128;

///////////////////
// -> COMPUTE <- //
///////////////////

function compute(temperature){

    let bb = new BlackBody(temperature, 1);
    bb.setTemperature(temperature);
    //console.log(bb.SpectralPowerDistribution[800]);

    let X = 0;
    let Y = 0;
    let Z = 0;

    for (let i = 360; i <= 830; i++){
        X += bb.SpectralPowerDistribution[i] * CMFs[i][0];
        Y += bb.SpectralPowerDistribution[i] * CMFs[i][1];
        Z += bb.SpectralPowerDistribution[i] * CMFs[i][2];
    }

    // console.log(temperature);
    // console.log(Z, Z/Y);

    let normX = X/Y;
    let normY = Y/Y;
    let normZ = Z/Y;

    let R = 3.2404542*normX - 1.5371385*normY - 0.4985314*normZ
    let G = -0.9692660*normX + 1.8760108*normY + 0.0415560*normZ
    let B = 0.0556434*normX - 0.2040259*normY + 1.0572252*normZ

    // console.log(X, Y, Z);
    // console.log(R, G, B);

    R = Math.min(Math.max(R, 0), 1);
    G = Math.min(Math.max(G, 0), 1);
    B = Math.min(Math.max(B, 0), 1);

    return [R, G, B];
}

//////////////////
// -> RENDER <- //
//////////////////

function render(device, encoder, context, canvasFormat, rgb){

    const GridShaderModule = device.createShaderModule({
        label: "Grid Shader",
        code: GRID_SHADER
    });

    // Vertices -> The 2 triangles form 1 square of size _size_
    const size = 1;
    const vertices = new Float32Array([
        -size, -size, size, -size, size, size, // Triangle #1
        -size, -size, size, size, -size, size, // Triangle #2
    ]);

    const vertexBuffer = device.createBuffer({
        label: "Cell Vertices",
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, vertices);

    const vertexBufferLayout = {
        arrayStride: 8,
        attributes: [
            {
                format: "float32x2",
                offset: 0,
                shaderLocation: 0,
            },
        ],
    };

    const renderBindGroupLayout = device.createBindGroupLayout({
        label: "Render Bind Group Layout",
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: {},
            },
            {
                binding: 1,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: { type: "read-only-storage" },
            },
        ],
    });

    const renderPipelineLayout = device.createPipelineLayout({
        label: "Render Pipeline Layout",
        bindGroupLayouts: [renderBindGroupLayout],
    });

    const renderPipeline = device.createRenderPipeline({
        label: "Render Pipeline",
        layout: renderPipelineLayout,
        vertex: {
            module: GridShaderModule,
            entryPoint: "vertexMain",
            buffers: [vertexBufferLayout]
        },
        fragment: {
            module: GridShaderModule,
            entryPoint: "fragmentMain",
            targets: [{
                format: canvasFormat
            }]
        }
    });

    const uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE]);
    const uniformBuffer = device.createBuffer({
        label: "Grid Uniforms",
        size: uniformArray.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(uniformBuffer, 0, uniformArray);

    // Testing with rgbs calculated from a blackbody in a circle
    const RGBs = new Float32Array(GRID_SIZE * GRID_SIZE * 4);
    let i = 0;
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let y = 0; y < GRID_SIZE; y++) {
            if ( (x - (GRID_SIZE-1)/2)**2 + (y - (GRID_SIZE-1)/2)**2 <= ((GRID_SIZE-1)/2)**2){
                RGBs.set(rgb, i);
            }
            i += 4;
        }
    }

    const RGBsBuffer = device.createBuffer({
        label: "RGBs",
        size: RGBs.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(RGBsBuffer, 0, RGBs);

    const renderBindGroup = device.createBindGroup({
        label: "Render renderer bind",
        layout: renderBindGroupLayout,
        entries: [{
            binding: 0,
            resource: { buffer: uniformBuffer }
        }, {
            binding: 1,
            resource: { buffer: RGBsBuffer }
        }],
    });

    const renderPass = encoder.beginRenderPass({
        colorAttachments: [{
            view: context.getCurrentTexture().createView(),
            loadOp: "clear",
            clearValue: { r: 0, g: 0, b: 0.4, a: 1.0 },
            storeOp: "store",
        }]
    });

    renderPass.setPipeline(renderPipeline);
    renderPass.setVertexBuffer(0, vertexBuffer);
    renderPass.setBindGroup(0, renderBindGroup);

    const instanceCount = GRID_SIZE * GRID_SIZE;
    renderPass.draw(vertices.length / 2, instanceCount);

    renderPass.end();

    device.queue.submit([encoder.finish()]);
}

////////////////
// -> MAIN <- //
////////////////

export async function main() {

    ////////////////////////////////
    // -> CHECK WEBGPU SUPPORT <- //
    ////////////////////////////////

    // Check for webGPU support
    if (!navigator.gpu) {throw new Error("WebGPU not supported");}
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {throw new Error("No GPUAdapter found.");}

    console.log(adapter.limits);

    ///////////////////////
    // -> BASIC SETUP <- //
    ///////////////////////

    // Get GPU device
    const device = await adapter.requestDevice();

    // Get and configure canvas context
    const canvas = document.querySelector("canvas"); // Get canvas on index.html
    const context = canvas.getContext("webgpu"); // Get canvas context (for drawing)
    const canvasFormat = navigator.gpu.getPreferredCanvasFormat(); // Get canvas format
    context.configure({
        device,
        format: canvasFormat,
    });

    //////////////// COMPUTE & RENDER
    let temperatureSlider = document.getElementById("temperatureSliderId");
    let temperatureSliderLabel = document.getElementById("temperatureSliderLabelId");
    temperatureSlider.oninput = function (){
        temperatureSliderLabel.innerText = "Temperature: " + temperatureSlider.value + "K";

        const encoder = device.createCommandEncoder();

        let rgb = compute(this.value);

        render(device, encoder, context, canvasFormat, rgb);
    }
}

main();
