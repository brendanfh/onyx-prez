
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
    
    fillRect(canvas, x, y, w, h, r, g, b, a) {
        canvasCtx.fillStyle = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`; 
        canvasCtx.fillRect(x, y, w, h);
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
