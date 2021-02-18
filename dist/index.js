
let wasm_instance;
let canvasElem;
let canvasCtx;
let __loaded_images = [];

const MAGIC_CANVAS_NUMBER = 0x5052455A;

function push_event_to_buffer(esp, event_size, event_kind, data) {
    let WASM_U32 = new Uint32Array(wasm_instance.exports.memory.buffer);

    if (WASM_U32[esp] >= WASM_U32[esp + 1]) {
        console.log("Buffer full!");
        return;
    }

    WASM_U32[esp] += 1;

    let event_idx = esp + (WASM_U32[esp] - 1) * (event_size / 4) + 2;
    WASM_U32[event_idx] = event_kind;
    WASM_U32[event_idx + 1] = Date.now();

    for (let i = 0; i < data.length; i++) {
        WASM_U32[event_idx + 2 + i] = data[i];
    }
}


let event_import_obj = {
    setup(esp, event_size) {
        // Indicies into a Uint32Array are not based on bytes,
        // but on the index.
        esp /= 4;

        document.addEventListener("keydown", (ev) => {
            if (ev.isComposing || ev.keyCode === 229) return;
            push_event_to_buffer(esp, event_size, 0x04, [ ev.keyCode ]);
        });

        document.addEventListener("keyup", (ev) => {
            if (ev.isComposing || ev.keyCode === 229) return;
            push_event_to_buffer(esp, event_size, 0x05, [ ev.keyCode ]);
        });

        document.addEventListener("mousedown", (ev) => {
            push_event_to_buffer(esp, event_size, 0x01, [ ev.clientX, ev.clientY, ev.button ]);
        });

        document.addEventListener("mouseup", (ev) => {
            push_event_to_buffer(esp, event_size, 0x02, [ ev.clientX, ev.clientY, ev.button ]);
        });

        document.addEventListener("mousemove", (ev) => {
            push_event_to_buffer(esp, event_size, 0x03, [ ev.clientX, ev.clientY, -1 ]);
        });

        document.addEventListener("wheel", (ev) => {
            push_event_to_buffer(esp, event_size, 0x07, [ ev.clientX, ev.clientY, ev.deltaY >= 0 ? 0x04 : 0x03 ]);
        });

        window.addEventListener("resize", (ev) => {
            push_event_to_buffer(esp, event_size, 0x06, [ window.innerWidth, window.innerHeight ]);
        });

        push_event_to_buffer(esp, event_size, 0x06, [ window.innerWidth, window.innerHeight ]);

        document.oncontextmenu = (e) => {
            e.preventDefault = true;
            return false;
        };
    }
}

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

    set_size(canvas, width, height) {
        canvasElem.width = width;
        canvasElem.height = height;
    },

    setFont(canvas, font_name, font_length) {
        const data = new Uint8Array(wasm_instance.exports.memory.buffer, font_name, font_length);
        const str  = new TextDecoder().decode(data);

        canvasCtx.font = str;
    },

    setColor(canvas, r, g, b, a) {
        canvasCtx.fillStyle = `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`; 
    },

    measureText(canvas, text_ptr, text_len, measure_ptr) {
        const data = new Uint8Array(wasm_instance.exports.memory.buffer, text_ptr, text_len);
        const text = new TextDecoder().decode(data);

        let metrics = canvasCtx.measureText(text);

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

        if (max_width > 0) canvasCtx.fillText(str, x, y, max_width);
        else               canvasCtx.fillText(str, x, y);
    },

    drawImage(canvas, image_idx, x, y, w, h) {
        let image = __loaded_images[image_idx];

        canvasCtx.drawImage(image, x, y, w, h);
    }
}

let html_import_obj = {
    load_image(path_str, path_len, out_image) {
        const data = new Uint8Array(wasm_instance.exports.memory.buffer, path_str, path_len);
        const path = new TextDecoder().decode(data);

        let image = new Image();
        __loaded_images.push(image);
        
        let data_view = new DataView(wasm_instance.exports.memory.buffer, out_image, 3 * 4);
        data_view.setInt32(0, __loaded_images.length - 1, true);

        image.src = path;
    },

    store_image_size(out_image) {
        let data_view = new DataView(wasm_instance.exports.memory.buffer, out_image, 3 * 4);
        let image_idx = data_view.getInt32(0, true);

        let image = __loaded_images[image_idx];
        data_view.setInt32(4, image.width, true);
        data_view.setInt32(8, image.height, true);
    }
}

let import_obj = {
    host: {
        print_str(ptr, len) {
            const data = new Uint8Array(wasm_instance.exports.memory.buffer, ptr, len);
            const str  = new TextDecoder().decode(data);
            console.log(str);
        },

        exit(status) { console.warn("Attempted to call host.exit()."); },

        start_loop() {
            let loop = () => {
                wasm_instance.exports.loop();
                window.requestAnimationFrame(loop);
            };

            window.requestAnimationFrame(loop);
        },
    },

    canvas: canvas_import_obj,
    event:  event_import_obj,
    html:   html_import_obj,
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
