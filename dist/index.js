
let wasm_instance;
let canvasElem;
let canvasCtx;

const MAGIC_CANVAS_NUMBER = 0x5052455A;

let canvas_import_obj = {

    init(canvas_name, length) {
        const data = new Uint8Array(wasm_instance.exports.memory.buffer, canvas_name, length);
        const str  = new TextDecoder().decode(data);

        canvasElem = document.getElementById(str);
        if (canvasElem == null) return -1;

        canvasElem.width = window.innerWidth;
        canvasElem.height = window.innerHeight;

        canvasCtx = canvasElem.getContext('2d');
        
        return MAGIC_CANVAS_NUMBER;
    },

    clear(canvas, r, g, b, a) {
        canvasCtx.fillStyle = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`; 
        canvasCtx.fillRect(0, 0, canvasElem.width, canvasElem.height);
    },

    get_width(canvas)  { return canvasElem.width;  },
    get_height(canvas) { return canvasElem.height; },

    setFont(canvas, font_name, font_length) {
        const data = new Uint8Array(wasm_instance.exports.memory.buffer, font_name, font_length);
        const str  = new TextDecoder().decode(data);

        canvasCtx.font = str;
    },

    measureText(canvas, text_ptr, text_len, measure_ptr) {
        const data = new Uint8Array(wasm_instance.exports.memory.buffer, text_ptr, text_len);
        const text = new TextDecoder().decode(data);

        let metrics = canvasCtx.measureText(text);
        console.log("TEST:", metrics);

        let data_view = new DataView(wasm_instance.exports.memory.buffer, measure_ptr, 5 * 4);
        data_view.setFloat32(0,  metrics.width, true);
        data_view.setFloat32(4,  metrics.actualBoundingBoxLeft, true);
        data_view.setFloat32(8,  metrics.actualBoundingBoxRight, true);
        data_view.setFloat32(12, metrics.actualBoundingBoxTop, true);
        data_view.setFloat32(16, metrics.actualBoundingBoxBottom, true);
    },
    
    fillRect(canvas, x, y, w, h, r, g, b, a) {
        canvasCtx.fillStyle = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`; 
        canvasCtx.fillRect(x, y, w, h);
    },

    fillText(canvas, text_ptr, text_len, x, y, max_width) {
        const data = new Uint8Array(wasm_instance.exports.memory.buffer, text_ptr, text_len);
        const str  = new TextDecoder().decode(data);

        canvasCtx.fillStyle = "#ffffff";
        
        if (max_width > 0) canvasCtx.fillText(str, x, y, max_width);
        else               canvasCtx.fillText(str, x, y);
    }
}

let import_obj = {
    host: {
        print_str(ptr, len) {
            const data = new Uint8Array(wasm_instance.exports.memory.buffer, ptr, len);
            const str  = new TextDecoder().decode(data);
            console.log(str);
        },

        exit(status) { console.warn("Attempted to call host.exit()."); }
    },

    canvas: canvas_import_obj
}

function main() {

    fetch("prez.wasm")
    .then(res => res.arrayBuffer())
    .then(res => WebAssembly.instantiate(res, import_obj))
    .then(({ instance }) => {
        wasm_instance = instance;

        instance.exports._start();
    });

}

window.onload = main;
