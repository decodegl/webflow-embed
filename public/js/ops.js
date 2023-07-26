"use strict";

var CABLES=CABLES||{};
CABLES.OPS=CABLES.OPS||{};

var Ops=Ops || {};
Ops.Gl=Ops.Gl || {};
Ops.Ui=Ops.Ui || {};
Ops.Data=Ops.Data || {};
Ops.Html=Ops.Html || {};
Ops.Json=Ops.Json || {};
Ops.User=Ops.User || {};
Ops.Array=Ops.Array || {};
Ops.Cables=Ops.Cables || {};
Ops.String=Ops.String || {};
Ops.Trigger=Ops.Trigger || {};
Ops.Html.Event=Ops.Html.Event || {};
Ops.User.kikohs=Ops.User.kikohs || {};
Ops.Data.Compose=Ops.Data.Compose || {};



// **************************************************************
// 
// Ops.Gl.MainLoop
// 
// **************************************************************

Ops.Gl.MainLoop = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    fpsLimit = op.inValue("FPS Limit", 0),
    trigger = op.outTrigger("trigger"),
    width = op.outNumber("width"),
    height = op.outNumber("height"),
    reduceFocusFPS = op.inValueBool("Reduce FPS not focussed", true),
    reduceLoadingFPS = op.inValueBool("Reduce FPS loading"),
    clear = op.inValueBool("Clear", true),
    clearAlpha = op.inValueBool("ClearAlpha", true),
    fullscreen = op.inValueBool("Fullscreen Button", false),
    active = op.inValueBool("Active", true),
    hdpi = op.inValueBool("Hires Displays", false),
    inUnit = op.inSwitch("Pixel Unit", ["Display", "CSS"], "Display");

op.onAnimFrame = render;
hdpi.onChange = function ()
{
    if (hdpi.get()) op.patch.cgl.pixelDensity = window.devicePixelRatio;
    else op.patch.cgl.pixelDensity = 1;

    op.patch.cgl.updateSize();
    if (CABLES.UI) gui.setLayout();

    // inUnit.setUiAttribs({ "greyout": !hdpi.get() });

    // if (!hdpi.get())inUnit.set("CSS");
    // else inUnit.set("Display");
};

active.onChange = function ()
{
    op.patch.removeOnAnimFrame(op);

    if (active.get())
    {
        op.setUiAttrib({ "extendTitle": "" });
        op.onAnimFrame = render;
        op.patch.addOnAnimFrame(op);
        op.log("adding again!");
    }
    else
    {
        op.setUiAttrib({ "extendTitle": "Inactive" });
    }
};

const cgl = op.patch.cgl;
let rframes = 0;
let rframeStart = 0;

if (!op.patch.cgl) op.uiAttr({ "error": "No webgl cgl context" });

const identTranslate = vec3.create();
vec3.set(identTranslate, 0, 0, 0);
const identTranslateView = vec3.create();
vec3.set(identTranslateView, 0, 0, -2);

fullscreen.onChange = updateFullscreenButton;
setTimeout(updateFullscreenButton, 100);
let fsElement = null;

let winhasFocus = true;
let winVisible = true;

window.addEventListener("blur", () => { winhasFocus = false; });
window.addEventListener("focus", () => { winhasFocus = true; });
document.addEventListener("visibilitychange", () => { winVisible = !document.hidden; });
testMultiMainloop();

inUnit.onChange = () =>
{
    width.set(0);
    height.set(0);
};

function getFpsLimit()
{
    if (reduceLoadingFPS.get() && op.patch.loading.getProgress() < 1.0) return 5;

    if (reduceFocusFPS.get())
    {
        if (!winVisible) return 10;
        if (!winhasFocus) return 30;
    }

    return fpsLimit.get();
}

function updateFullscreenButton()
{
    function onMouseEnter()
    {
        if (fsElement)fsElement.style.display = "block";
    }

    function onMouseLeave()
    {
        if (fsElement)fsElement.style.display = "none";
    }

    op.patch.cgl.canvas.addEventListener("mouseleave", onMouseLeave);
    op.patch.cgl.canvas.addEventListener("mouseenter", onMouseEnter);

    if (fullscreen.get())
    {
        if (!fsElement)
        {
            fsElement = document.createElement("div");

            const container = op.patch.cgl.canvas.parentElement;
            if (container)container.appendChild(fsElement);

            fsElement.addEventListener("mouseenter", onMouseEnter);
            fsElement.addEventListener("click", function (e)
            {
                if (CABLES.UI && !e.shiftKey) gui.cycleFullscreen();
                else cgl.fullScreen();
            });
        }

        fsElement.style.padding = "10px";
        fsElement.style.position = "absolute";
        fsElement.style.right = "5px";
        fsElement.style.top = "5px";
        fsElement.style.width = "20px";
        fsElement.style.height = "20px";
        fsElement.style.cursor = "pointer";
        fsElement.style["border-radius"] = "40px";
        fsElement.style.background = "#444";
        fsElement.style["z-index"] = "9999";
        fsElement.style.display = "none";
        fsElement.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.1\" id=\"Capa_1\" x=\"0px\" y=\"0px\" viewBox=\"0 0 490 490\" style=\"width:20px;height:20px;\" xml:space=\"preserve\" width=\"512px\" height=\"512px\"><g><path d=\"M173.792,301.792L21.333,454.251v-80.917c0-5.891-4.776-10.667-10.667-10.667C4.776,362.667,0,367.442,0,373.333V480     c0,5.891,4.776,10.667,10.667,10.667h106.667c5.891,0,10.667-4.776,10.667-10.667s-4.776-10.667-10.667-10.667H36.416     l152.459-152.459c4.093-4.237,3.975-10.99-0.262-15.083C184.479,297.799,177.926,297.799,173.792,301.792z\" fill=\"#FFFFFF\"/><path d=\"M480,0H373.333c-5.891,0-10.667,4.776-10.667,10.667c0,5.891,4.776,10.667,10.667,10.667h80.917L301.792,173.792     c-4.237,4.093-4.354,10.845-0.262,15.083c4.093,4.237,10.845,4.354,15.083,0.262c0.089-0.086,0.176-0.173,0.262-0.262     L469.333,36.416v80.917c0,5.891,4.776,10.667,10.667,10.667s10.667-4.776,10.667-10.667V10.667C490.667,4.776,485.891,0,480,0z\" fill=\"#FFFFFF\"/><path d=\"M36.416,21.333h80.917c5.891,0,10.667-4.776,10.667-10.667C128,4.776,123.224,0,117.333,0H10.667     C4.776,0,0,4.776,0,10.667v106.667C0,123.224,4.776,128,10.667,128c5.891,0,10.667-4.776,10.667-10.667V36.416l152.459,152.459     c4.237,4.093,10.99,3.975,15.083-0.262c3.992-4.134,3.992-10.687,0-14.82L36.416,21.333z\" fill=\"#FFFFFF\"/><path d=\"M480,362.667c-5.891,0-10.667,4.776-10.667,10.667v80.917L316.875,301.792c-4.237-4.093-10.99-3.976-15.083,0.261     c-3.993,4.134-3.993,10.688,0,14.821l152.459,152.459h-80.917c-5.891,0-10.667,4.776-10.667,10.667s4.776,10.667,10.667,10.667     H480c5.891,0,10.667-4.776,10.667-10.667V373.333C490.667,367.442,485.891,362.667,480,362.667z\" fill=\"#FFFFFF\"/></g></svg>";
    }
    else
    {
        if (fsElement)
        {
            fsElement.style.display = "none";
            fsElement.remove();
            fsElement = null;
        }
    }
}

op.onDelete = function ()
{
    cgl.gl.clearColor(0, 0, 0, 0);
    cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
};

function render(time)
{
    if (!active.get()) return;
    if (cgl.aborted || cgl.canvas.clientWidth === 0 || cgl.canvas.clientHeight === 0) return;

    op.patch.cg = cgl;

    const startTime = performance.now();

    op.patch.config.fpsLimit = getFpsLimit();

    if (cgl.canvasWidth == -1)
    {
        cgl.setCanvas(op.patch.config.glCanvasId);
        return;
    }

    if (cgl.canvasWidth != width.get() || cgl.canvasHeight != height.get())
    {
        let div = 1;
        if (inUnit.get() == "CSS")div = op.patch.cgl.pixelDensity;

        width.set(cgl.canvasWidth / div);
        height.set(cgl.canvasHeight / div);
    }

    if (CABLES.now() - rframeStart > 1000)
    {
        CGL.fpsReport = CGL.fpsReport || [];
        if (op.patch.loading.getProgress() >= 1.0 && rframeStart !== 0)CGL.fpsReport.push(rframes);
        rframes = 0;
        rframeStart = CABLES.now();
    }
    CGL.MESH.lastShader = null;
    CGL.MESH.lastMesh = null;

    cgl.renderStart(cgl, identTranslate, identTranslateView);

    if (clear.get())
    {
        cgl.gl.clearColor(0, 0, 0, 1);
        cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT | cgl.gl.DEPTH_BUFFER_BIT);
    }

    trigger.trigger();

    if (CGL.MESH.lastMesh)CGL.MESH.lastMesh.unBind();

    if (CGL.Texture.previewTexture)
    {
        if (!CGL.Texture.texturePreviewer) CGL.Texture.texturePreviewer = new CGL.Texture.texturePreview(cgl);
        CGL.Texture.texturePreviewer.render(CGL.Texture.previewTexture);
    }
    cgl.renderEnd(cgl);

    op.patch.cg = null;

    if (clearAlpha.get())
    {
        cgl.gl.clearColor(1, 1, 1, 1);
        cgl.gl.colorMask(false, false, false, true);
        cgl.gl.clear(cgl.gl.COLOR_BUFFER_BIT);
        cgl.gl.colorMask(true, true, true, true);
    }

    if (!cgl.frameStore.phong)cgl.frameStore.phong = {};
    rframes++;

    op.patch.cgl.profileData.profileMainloopMs = performance.now() - startTime;
}

function testMultiMainloop()
{
    setTimeout(
        () =>
        {
            if (op.patch.getOpsByObjName(op.name).length > 1)
            {
                op.setUiError("multimainloop", "there should only be one mainloop op!");
                op.patch.addEventListener("onOpDelete", testMultiMainloop);
            }
            else op.setUiError("multimainloop", null, 1);
        }, 500);
}


};

Ops.Gl.MainLoop.prototype = new CABLES.Op();
CABLES.OPS["b0472a1d-db16-4ba6-8787-f300fbdc77bb"]={f:Ops.Gl.MainLoop,objName:"Ops.Gl.MainLoop"};




// **************************************************************
// 
// Ops.Cables.Function_v2
// 
// **************************************************************

Ops.Cables.Function_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    funcName = op.inString("Function Name", "default"),
    triggerButton = op.inTriggerButton("Trigger"),
    inString1 = op.inString("Default Parameter 1"),
    inString2 = op.inString("Default Parameter 2"),
    inString3 = op.inString("Default Parameter 3"),
    outTrigger = op.outTrigger("Next"),
    outString1 = op.outString("Parameter 1"),
    outString2 = op.outString("Parameter 2"),
    outString3 = op.outString("Parameter 3");

triggerButton.onTriggered = triggered;

funcName.onChange = function ()
{
    op.patch.config[funcName.get()] = triggered;
};

function triggered()
{
    const arg1 = arguments.hasOwnProperty(0) ? arguments[0] : inString1.get();
    const arg2 = arguments.hasOwnProperty(1) ? arguments[1] : inString2.get();
    const arg3 = arguments.hasOwnProperty(2) ? arguments[2] : inString3.get();
    outString1.set(arg1);
    outString2.set(arg2);
    outString3.set(arg3);
    outTrigger.trigger();
}


};

Ops.Cables.Function_v2.prototype = new CABLES.Op();
CABLES.OPS["39043a11-1ae0-4568-93a7-ec1493df2662"]={f:Ops.Cables.Function_v2,objName:"Ops.Cables.Function_v2"};




// **************************************************************
// 
// Ops.Html.QuerySelector_v2
// 
// **************************************************************

Ops.Html.QuerySelector_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    inUpdate = op.inTriggerButton("Update"),
    queryPort = op.inString("Query"),
    inMode = op.inValueSelect("Mode", ["document", "string input"], "document"),
    inMimeType = op.inValueSelect("Type", ["text/html", "text/xml"], "text/html"),
    inSource = op.inStringEditor("Document", "xml"),
    elementPort = op.outObject("Element");

if (inMode.get() === "document")
{
    inSource.setUiAttribs({ "greyout": true });
    inMimeType.set("text/html");
    inMimeType.setUiAttribs({ "greyout": true });
}

inUpdate.onTriggered =
queryPort.onChange =
inMimeType.onChange =
inSource.onChange = update;

inMode.onChange = modeChange;

function update()
{
    const q = queryPort.get();
    const theDocument = inSource.get();
    const mode = inMode.get();
    if (mode === "string input" && theDocument)
    {
        let parser = new DOMParser();
        let htmlDoc = null;
        try
        {
            htmlDoc = parser.parseFromString(theDocument, inMimeType.get());
            const el = htmlDoc.querySelector(q);
            elementPort.set(el);
        }
        catch (e)
        {
            op.logError(e);
        }
    }
    else
    {
        try
        {
            const el = document.querySelector(q);
            elementPort.set(el);
        }
        catch (e)
        {
            op.logError(e);
        }
    }
}

function modeChange()
{
    if (inMode.get() === "document")
    {
        inSource.setUiAttribs({ "greyout": true });
        inMimeType.set("text/html");
        inMimeType.setUiAttribs({ "greyout": true });
    }
    else
    {
        inSource.setUiAttribs({ "greyout": false });
        inMimeType.setUiAttribs({ "greyout": false });
    }
}


};

Ops.Html.QuerySelector_v2.prototype = new CABLES.Op();
CABLES.OPS["a1a2189b-564c-4dd7-b3d9-a6cebc0cd94e"]={f:Ops.Html.QuerySelector_v2,objName:"Ops.Html.QuerySelector_v2"};




// **************************************************************
// 
// Ops.Html.QuerySelectorAll
// 
// **************************************************************

Ops.Html.QuerySelectorAll = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    inUpdate = op.inTriggerButton("Update"),
    queryPort = op.inString("Query"),
    inMode = op.inValueSelect("Mode", ["document", "string input"], "document"),
    inMimeType = op.inValueSelect("Type", ["text/html", "text/xml"], "text/html"),
    inSource = op.inStringEditor("Document", "xml"),
    elementPort = op.outArray("Elements");

if (inMode.get() === "document")
{
    inSource.setUiAttribs({ "greyout": true });
    inMimeType.set("text/html");
    inMimeType.setUiAttribs({ "greyout": true });
}

inUpdate.onTriggered =
queryPort.onChange =
inMimeType.onChange =
inSource.onChange = update;

inMode.onChange = modeChange;

function update()
{
    const q = queryPort.get();
    const theDocument = inSource.get();
    const mode = inMode.get();
    if (mode === "string input" && theDocument)
    {
        let parser = new DOMParser();
        let htmlDoc = null;
        try
        {
            htmlDoc = parser.parseFromString(theDocument, inMimeType.get());
            const el = Array.from(htmlDoc.querySelectorAll(q));
            elementPort.set(el);
        }
        catch (e)
        {
            op.logError(e);
        }
    }
    else
    {
        try
        {
            const el = Array.from(document.querySelectorAll(q));
            elementPort.set(el);
        }
        catch (e)
        {
            op.logError(e);
        }
    }
}

function modeChange()
{
    if (inMode.get() === "document")
    {
        inSource.setUiAttribs({ "greyout": true });
        inMimeType.set("text/html");
        inMimeType.setUiAttribs({ "greyout": true });
    }
    else
    {
        inSource.setUiAttribs({ "greyout": false });
        inMimeType.setUiAttribs({ "greyout": false });
    }
}


};

Ops.Html.QuerySelectorAll.prototype = new CABLES.Op();
CABLES.OPS["001799c7-9ddf-4f3e-b260-e865f0ed2c0e"]={f:Ops.Html.QuerySelectorAll,objName:"Ops.Html.QuerySelectorAll"};




// **************************************************************
// 
// Ops.String.StringEditor
// 
// **************************************************************

Ops.String.StringEditor = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    v = op.inStringEditor("value", ""),
    syntax = op.inValueSelect("Syntax", ["text", "glsl", "css", "html", "xml", "json", "javascript", "inline-css", "sql"], "text"),
    result = op.outString("Result");

syntax.onChange = updateSyntax;

function updateSyntax()
{
    let s = syntax.get();
    if (s == "javascript")s = "js";
    v.setUiAttribs({ "editorSyntax": s });
}

v.onChange = function ()
{
    result.set(v.get());
};


};

Ops.String.StringEditor.prototype = new CABLES.Op();
CABLES.OPS["6468b7c1-f63e-4db4-b809-4b203d27ead3"]={f:Ops.String.StringEditor,objName:"Ops.String.StringEditor"};




// **************************************************************
// 
// Ops.Html.CSS_v2
// 
// **************************************************************

Ops.Html.CSS_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const code = op.inStringEditor("css code");

code.setUiAttribs(
    {
        "editorSyntax": "css",
        "ignoreBigPort": true
    });

let styleEle = null;
const eleId = "css_" + CABLES.uuid();

code.onChange = update;
update();

function getCssContent()
{
    let css = code.get();
    if (css)
    {
        let patchId = null;
        if (op.storage && op.storage.blueprint && op.storage.blueprint.patchId)
        {
            patchId = op.storage.blueprint.patchId;
        }
        css = css.replace(new RegExp("{{ASSETPATH}}", "g"), op.patch.getAssetPath(patchId));
    }
    return css;
}

function update()
{
    styleEle = document.getElementById(eleId);

    if (styleEle)
    {
        styleEle.textContent = getCssContent();
    }
    else
    {
        styleEle = document.createElement("style");
        styleEle.type = "text/css";
        styleEle.id = eleId;
        styleEle.textContent = attachments.css_spinner;

        const head = document.getElementsByTagName("body")[0];
        head.appendChild(styleEle);
    }
}

op.onDelete = function ()
{
    styleEle = document.getElementById(eleId);
    if (styleEle)styleEle.remove();
};


};

Ops.Html.CSS_v2.prototype = new CABLES.Op();
CABLES.OPS["a56d3edd-06ad-44ed-9810-dbf714600c67"]={f:Ops.Html.CSS_v2,objName:"Ops.Html.CSS_v2"};




// **************************************************************
// 
// Ops.Html.ElementInteraction
// 
// **************************************************************

Ops.Html.ElementInteraction = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    inEle = op.inObject("Element"),
    inAct = op.inBool("Active", true),
    outIsDownLeft = op.outBool("Mouse Is Down Left"),
    outIsDownRight = op.outBool("Mouse Is Down Right"),
    outDownLeft = op.outTrigger("Mouse Down Left"),
    outDownRight = op.outTrigger("Mouse Down Right"),
    outUpLeft = op.outTrigger("Mouse Up Left"),
    outUpRight = op.outTrigger("Mouse Up Right"),
    outOver = op.outBool("Mouse Over"),
    outEnter = op.outTrigger("Mouse Enter"),
    outLeave = op.outTrigger("Mouse Leave"),
    outPosX = op.outNumber("Offset X"),
    outPosY = op.outNumber("Offset Y");

let ele = null;

inEle.onChange = () =>
{
    const el = inEle.get();

    if (el) addListeners(el);
    else removeListeners();
};

function addListeners(el)
{
    ele = el;

    ele.addEventListener("pointerenter", onEnter);
    ele.addEventListener("pointerleave", onLeave);
    ele.addEventListener("pointermove", onMove);
    ele.addEventListener("pointerdown", onDown);
    ele.addEventListener("pointerup", onUp);
}

function removeListeners()
{
    if (!ele) return;
    ele.removeEventListener("pointerenter", onEnter);
    ele.removeEventListener("pointerleave", onLeave);
    ele.removeEventListener("pointermove", onMove);
    ele.removeEventListener("pointerdown", onDown);
    ele.removeEventListener("pointerup", onUp);
}

function onMove(e)
{
    outPosX.set(e.offsetX);
    outPosY.set(e.offsetY);
    outIsDownLeft.set(e.which == 1);
    outIsDownRight.set(e.which == 2);
}

function onDown(e)
{
    outPosX.set(e.offsetX);
    outPosY.set(e.offsetY);

    if (e.which == 1)outDownLeft.trigger();
    if (e.which == 2)outDownRight.trigger();

    ele.setPointerCapture(e.pointerId);

    outIsDownLeft.set(e.which == 1);
    outIsDownRight.set(e.which == 2);
}

function onUp(e)
{
    outPosX.set(e.offsetX);
    outPosY.set(e.offsetY);

    ele.releasePointerCapture(e.pointerId);

    if (e.which == 1)outUpLeft.trigger();
    if (e.which == 2)outUpRight.trigger();
    outIsDownRight.set(false);
    outIsDownLeft.set(false);
}

function onEnter()
{
    outEnter.trigger();
    outOver.set(true);
}

function onLeave()
{
    outLeave.trigger();
    outIsDownLeft.set(false);
    outOver.set(false);
}


};

Ops.Html.ElementInteraction.prototype = new CABLES.Op();
CABLES.OPS["bc2903a0-ee7f-4918-b1d8-ea3a6262e3ee"]={f:Ops.Html.ElementInteraction,objName:"Ops.Html.ElementInteraction"};




// **************************************************************
// 
// Ops.Array.ArrayGetObject
// 
// **************************************************************

Ops.Array.ArrayGetObject = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    array = op.inArray("array"),
    index = op.inValueInt("index"),
    value = op.outObject("value");

let last = null;

array.ignoreValueSerialize = true;
value.ignoreValueSerialize = true;

index.onChange = update;
array.onChange = update;

op.toWorkPortsNeedToBeLinked(array);

function update()
{
    if (index.get() < 0)
    {
        value.set(null);
        return;
    }

    const arr = array.get();
    if (!arr)
    {
        value.set(null);
        return;
    }

    const ind = index.get();
    if (ind >= arr.length)
    {
        value.set(null);
        return;
    }
    if (arr[ind])
    {
        value.setRef(arr[ind]);
        last = arr[ind];
    }
}


};

Ops.Array.ArrayGetObject.prototype = new CABLES.Op();
CABLES.OPS["44d34542-174c-47c6-b9c6-adde6fc371ac"]={f:Ops.Array.ArrayGetObject,objName:"Ops.Array.ArrayGetObject"};




// **************************************************************
// 
// Ops.Ui.VizObject
// 
// **************************************************************

Ops.Ui.VizObject = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    inObj = op.inObject("Object"),
    inConsole = op.inTriggerButton("console log"),
    inZoomText = op.inBool("ZoomText", false),
    inLineNums = op.inBool("Line Numbers", true),
    inFontSize = op.inFloat("Font Size", 10),
    inPos = op.inFloatSlider("Scroll", 0);

let lines = [];
inConsole.setUiAttribs({ "hidePort": true });

op.setUiAttrib({ "height": 200, "width": 400, "resizable": true });

inObj.onChange = () =>
{
    let obj = inObj.get();
    let str = "???";

    if (obj && obj.getInfo)
    {
        obj = obj.getInfo();
    }

    if (obj instanceof Element)
    {
        const o = {};

        o.id = obj.getAttribute("id");
        o.classes = obj.classList.value;
        o.innerText = obj.innerText;
        o.tagName = obj.tagName;

        obj = o;
    }

    if (obj && obj.constructor && obj.constructor.name != "Object")
    {
        // str =  + "()\n" + str;
        op.setUiAttribs({ "extendTitle": obj.constructor.name });
    }

    try
    {
        str = JSON.stringify(obj, false, 4);

        if (str == "{}" && obj && obj.constructor && obj.constructor.name != "Object")
        {
            str = "could not stringify object: " + obj.constructor.name + "\n";

            if (obj) for (let i in obj)
            {
                str += "\n" + i + " (" + typeof obj[i] + ")";
            }
        }
    }
    catch (e)
    {
        str = "object can not be displayed as string";
    }

    if (str === undefined)str = "undefined";
    if (str === null)str = "null";
    str = String(str);
    lines = str.split("\n");
};

inObj.onLinkChanged = () =>
{
    if (inObj.isLinked())
    {
        const p = inObj.links[0].getOtherPort(inObj);

        op.setUiAttrib({ "extendTitle": p.uiAttribs.objType });
    }
};

inConsole.onTriggered = () =>
{
    console.log(inObj.get());
};

op.renderVizLayer = (ctx, layer, viz) =>
{
    ctx.fillStyle = "#222";
    ctx.fillRect(layer.x, layer.y, layer.width, layer.height);

    ctx.save();
    ctx.scale(layer.scale, layer.scale);

    // ctx.font = "normal 10px sourceCodePro";
    // ctx.fillStyle = "#ccc";
    // const padding = 10;

    viz.renderText(ctx, layer, lines, {
        "zoomText": inZoomText.get(),
        "showLineNum": inLineNums.get(),
        "fontSize": inFontSize.get(),
        "scroll": inPos.get()
    });

    ctx.restore();
};

//


};

Ops.Ui.VizObject.prototype = new CABLES.Op();
CABLES.OPS["d09bc53e-9f52-4872-94c7-4ef777512222"]={f:Ops.Ui.VizObject,objName:"Ops.Ui.VizObject"};




// **************************************************************
// 
// Ops.Trigger.Sequence
// 
// **************************************************************

Ops.Trigger.Sequence = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    exe = op.inTrigger("exe"),
    cleanup = op.inTriggerButton("Clean up connections");

const
    exes = [],
    triggers = [],
    num = 16;

let
    updateTimeout = null,
    connectedOuts = [];

exe.onTriggered = triggerAll;
cleanup.onTriggered = clean;
cleanup.setUiAttribs({ "hideParam": true, "hidePort": true });

for (let i = 0; i < num; i++)
{
    const p = op.outTrigger("trigger " + i);
    triggers.push(p);
    p.onLinkChanged = updateButton;

    if (i < num - 1)
    {
        let newExe = op.inTrigger("exe " + i);
        newExe.onTriggered = triggerAll;
        exes.push(newExe);
    }
}

updateConnected();

function updateConnected()
{
    connectedOuts.length = 0;
    for (let i = 0; i < triggers.length; i++)
        if (triggers[i].links.length > 0) connectedOuts.push(triggers[i]);
}

function updateButton()
{
    updateConnected();
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() =>
    {
        let show = false;
        for (let i = 0; i < triggers.length; i++)
            if (triggers[i].links.length > 1) show = true;

        cleanup.setUiAttribs({ "hideParam": !show });

        if (op.isCurrentUiOp()) op.refreshParams();
    }, 60);
}

function triggerAll()
{
    // for (let i = 0; i < triggers.length; i++) triggers[i].trigger();
    for (let i = 0; i < connectedOuts.length; i++) connectedOuts[i].trigger();
}

function clean()
{
    let count = 0;
    for (let i = 0; i < triggers.length; i++)
    {
        let removeLinks = [];

        if (triggers[i].links.length > 1)
            for (let j = 1; j < triggers[i].links.length; j++)
            {
                while (triggers[count].links.length > 0) count++;

                removeLinks.push(triggers[i].links[j]);
                const otherPort = triggers[i].links[j].getOtherPort(triggers[i]);
                op.patch.link(op, "trigger " + count, otherPort.parent, otherPort.name);
                count++;
            }

        for (let j = 0; j < removeLinks.length; j++) removeLinks[j].remove();
    }
    updateButton();
    updateConnected();
}


};

Ops.Trigger.Sequence.prototype = new CABLES.Op();
CABLES.OPS["a466bc1f-06e9-4595-8849-bffb9fe22f99"]={f:Ops.Trigger.Sequence,objName:"Ops.Trigger.Sequence"};




// **************************************************************
// 
// Ops.Trigger.TriggerOnce
// 
// **************************************************************

Ops.Trigger.TriggerOnce = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    exe = op.inTriggerButton("Exec"),
    reset = op.inTriggerButton("Reset"),
    next = op.outTrigger("Next"),
    outTriggered = op.outBoolNum("Was Triggered");

let triggered = false;

op.toWorkPortsNeedToBeLinked(exe);

reset.onTriggered = function ()
{
    triggered = false;
    outTriggered.set(triggered);
};

exe.onTriggered = function ()
{
    if (triggered) return;

    triggered = true;
    next.trigger();
    outTriggered.set(triggered);
};


};

Ops.Trigger.TriggerOnce.prototype = new CABLES.Op();
CABLES.OPS["cf3544e4-e392-432b-89fd-fcfb5c974388"]={f:Ops.Trigger.TriggerOnce,objName:"Ops.Trigger.TriggerOnce"};




// **************************************************************
// 
// Ops.Html.EventListener
// 
// **************************************************************

Ops.Html.EventListener = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
// variables
let lastElement = null; // stores the last connected element, so we can remove prior event listeners
let subscribedEvents = []; // array of event-names the currrent element is subscribed to

/**
 * events to subscribe to
 * displayName is used for the port names
 * will later hold the trigger port and handler-function,
 * e.g. { name: 'mousedown', displayName: 'Mouse Down', port: ..., handler: ... }
 */
let events = [
    {
        "name": "mousedown",
        "displayName": "Mouse Down"
    },
    {
        "name": "mouseup",
        "displayName": "Mouse Up"
    },
    {
        "name": "click",
        "displayName": "Click"
    },
    {
        "name": "mousemove",
        "displayName": "Mouse Move"
    },
    {
        "name": "touchstart",
        "displayName": "Touch Start"
    },
    {
        "name": "touchmove",
        "displayName": "Touch Move"
    },
    {
        "name": "touchend",
        "displayName": "Touch End"
    },
    {
        "name": "touchcancel",
        "displayName": "Touch Cancel"
    },
];

/**
 * Creates an event handler function
 * @param {object} event an element of the events array (see top)
 */
function handlerFactory(event)
{
    function handleEvent(ev)
    {
        eventPort.set(ev); // set the event object port
        eventNamePort.set(ev.type);
        ev.preventDefault(); // TODO: maybe add a toggle for every event. but then we need port-groups...
        event.port.trigger(); // trigger the appropriate port
    }

    return handleEvent;
}

/**
 * Creates an event handler for the active (bool) ports
 */
function toggleHandlerFactory(event)
{
    function onToggleChange(port, isActive)
    {
        if (isActive)
        {
            addListener(elementPort.get(), event);
        }
        else
        {
            removeListener(elementPort.get(), event.name);
        }
    }

    return onToggleChange;
}

/**
 * Creates a trigger port for each event type, add the port to the events object-array
 */
function createPorts()
{
    events.forEach(function (event)
    {
        event.port = op.outTrigger(event.displayName);
        event.handler = handlerFactory(event);
        event.togglePort = op.inValueBool(event.displayName + " Active", true);
        event.togglePort.onChange = toggleHandlerFactory(event);
    });
    op.log(events);
}

// ports
let elementPort = op.inObject("Dom Element");
elementPort.onChange = onElementChanged;
let eventPort = op.outObject("Event Object");
createPorts();
let eventNamePort = op.outString("Event Name");

/**
 * Called when element port (DOM elemenet) changed
 */
function onElementChanged()
{
    let element = elementPort.get();
    if (lastElement !== element)
    {
        removeAllListeners(lastElement);
    }
    if (element)
    {
        addListeners(element);
    }
    checkListeners(element);
    lastElement = element;
}

/**
 * Checks all toggle-ports and adds / removes listeners accordingly
 */
function checkListeners(element)
{
    events.forEach(function (event)
    {
        if (event.togglePort.get())
        {
            addListener(element, event);
        }
        else
        {
            removeListener(element, event.name);
        }
    });
}

/**
 * Removes all listeners added by this op for the element
 */
function removeAllListeners(element)
{
    if (element)
    {
        for (let i = subscribedEvents.length - 1; i >= 0; i--)
        {
            removeListener(element, subscribedEvents[i]);
        }
    }
}

function removeListener(element, eventName)
{
    if (!element || !eventName || !arrayContainsValue(subscribedEvents, eventName)) { return; }
    let subscribedEventIndex = subscribedEvents.indexOf(eventName);
    element.removeEventListener(eventName, getEventByName(eventName).handler);
    subscribedEvents.splice(subscribedEventIndex, 1);
}

/*
function removeFromArray(arr, v) {
    let i = arr.indexOf(v);
    if(i > -1) {
        arr.splice(i, 1);
    }
}
*/

function arrayContainsValue(arr, v)
{
    return arr && arr.indexOf(v) > -1;
}

/**
 * Returns an event-object from the events array
 * @param {string} name e.g. 'mousedown'
 */
function getEventByName(eventName)
{
    for (let i = 0; i < events.length; i++)
    {
        if (events[i].name == eventName)
        {
            return events[i];
        }
    }
    return null;
}

/**
 * Adds all listeners to the element and saves it in the events array
 */
function addListeners(element)
{
    if (!element) { return; }
    events.forEach(function (event)
    {
        addListener(element, event);
    });
}

/**
 * Adds a listener to the element
 * @param {object} element the HTML DOM element
 * @param {object} event the event object from the events-array
 */
function addListener(element, event)
{
    if (!element || !event) { return; }
    if (subscribedEvents.indexOf(event.name) > -1) { return; } // already subscribed
    if (!event.togglePort.get()) { return; } // toggle for event not set
    element.addEventListener(event.name, event.handler);
    subscribedEvents.push(event.name);
}

op.onDelete = function ()
{
    removeAllListeners(lastElement);
    removeAllListeners(elementPort.get());
};


};

Ops.Html.EventListener.prototype = new CABLES.Op();
CABLES.OPS["73dc05e9-7b63-444b-980b-bd63f511b94a"]={f:Ops.Html.EventListener,objName:"Ops.Html.EventListener"};




// **************************************************************
// 
// Ops.Trigger.TriggerExtender
// 
// **************************************************************

Ops.Trigger.TriggerExtender = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    inTriggerPort = op.inTriggerButton("Execute"),
    outTriggerPort = op.outTrigger("Next");

inTriggerPort.onTriggered = function ()
{
    outTriggerPort.trigger();
};


};

Ops.Trigger.TriggerExtender.prototype = new CABLES.Op();
CABLES.OPS["7ef594f3-4907-47b0-a2d3-9854eda1679d"]={f:Ops.Trigger.TriggerExtender,objName:"Ops.Trigger.TriggerExtender"};




// **************************************************************
// 
// Ops.Html.Event.CustomEventListener
// 
// **************************************************************

Ops.Html.Event.CustomEventListener = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
// constants
let EVENT_NAME_DEFAULT = "";
let USE_CAPTURE_DEFAULT = false;
let PREVENT_DEFAULT_DEFAULT = true;
let STOP_PROPAGATION_DEFAULT = true;

// variables
let lastElement = null; // stores the last connected element, so we can remove prior event listeners
let lastEventName = EVENT_NAME_DEFAULT;
let lastUseCapture = USE_CAPTURE_DEFAULT;

// inputs
let elementPort = op.inObject("Element");
let eventNamePort = op.inValueString("Event Name", EVENT_NAME_DEFAULT);
let useCapturePort = op.inValueBool("Use Capture", USE_CAPTURE_DEFAULT);
let preventDefaultPort = op.inValueBool("Prevent Default", PREVENT_DEFAULT_DEFAULT);
let stopPropagationPort = op.inValueBool("Stop Propagation", STOP_PROPAGATION_DEFAULT);

// outputs
let triggerPort = op.outTrigger("Event Trigger");
let eventObjPort = op.outObject("Event Object");

// change listeners
elementPort.onChange = update;
eventNamePort.onChange = update;
useCapturePort.onChange = update;

function update()
{
    let element = elementPort.get();
    let eventName = eventNamePort.get();
    let useCapture = useCapturePort.get();
    removeListener();
    addListener(element, eventName, useCapture);
    lastElement = element;
    lastEventName = eventName;
    lastUseCapture = useCapture;
}

function removeListener()
{
    if (lastElement && lastEventName)
    {
        lastElement.removeEventListener(lastEventName, handleEvent, lastUseCapture);
    }
}

function addListener(el, name, useCapture)
{
    if (el && name)
    {
        el.addEventListener(name, handleEvent, useCapture);
    }
}

function handleEvent(ev)
{
    eventObjPort.set(ev);
    if (preventDefaultPort.get()) { ev.preventDefault(); }
    if (stopPropagationPort.get()) { ev.stopPropagation(); }
    triggerPort.trigger();
}


};

Ops.Html.Event.CustomEventListener.prototype = new CABLES.Op();
CABLES.OPS["0e299bb2-d9e8-4b95-9dd5-ad730c26a791"]={f:Ops.Html.Event.CustomEventListener,objName:"Ops.Html.Event.CustomEventListener"};




// **************************************************************
// 
// Ops.Json.ObjectGetNumber_v2
// 
// **************************************************************

Ops.Json.ObjectGetNumber_v2 = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    data = op.inObject("Data"),
    key = op.inString("Key"),
    result = op.outNumber("Result"),
    outFound = op.outBoolNum("Found");

result.ignoreValueSerialize = true;
data.ignoreValueSerialize = true;

data.onChange = exec;

key.onChange = function ()
{
    if (!key.isLinked())op.setUiAttrib({ "extendTitle": key.get() });
    exec();
};

function exec()
{
    if (data.get())
    {
        const val = data.get()[key.get()];
        result.set(val);
        if (val === undefined) outFound.set(0);
        else outFound.set(1);
    }
    else
    {
        result.set(null);
        outFound.set(0);
    }
}


};

Ops.Json.ObjectGetNumber_v2.prototype = new CABLES.Op();
CABLES.OPS["a7335e79-046e-40da-9e9c-db779b0a5e53"]={f:Ops.Json.ObjectGetNumber_v2,objName:"Ops.Json.ObjectGetNumber_v2"};




// **************************************************************
// 
// Ops.Ui.VizNumber
// 
// **************************************************************

Ops.Ui.VizNumber = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const inNum = op.inFloat("Number", 0);
const outNum = op.outNumber("Result");

op.setUiAttrib({ "widthOnlyGrow": true });

inNum.onChange = () =>
{
    let n = inNum.get();
    if (op.patch.isEditorMode())
    {
        let str = "";
        if (n === null)str = "null";
        else if (n === undefined)str = "undefined";
        else
        {
            str = "" + Math.round(n * 10000) / 10000;

            if (str[0] != "-")str = " " + str;
        }

        op.setUiAttribs({ "extendTitle": str });
    }

    outNum.set(n);
};


};

Ops.Ui.VizNumber.prototype = new CABLES.Op();
CABLES.OPS["2b60d12d-2884-4ad0-bda4-0caeb6882f5c"]={f:Ops.Ui.VizNumber,objName:"Ops.Ui.VizNumber"};




// **************************************************************
// 
// Ops.User.kikohs.ConsoleLogObj
// 
// **************************************************************

Ops.User.kikohs.ConsoleLogObj = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const inTrig = op.inTriggerButton("Log");
const inAny = op.addInPort(new CABLES.Port(op, 'Any value', CABLES.OP_PORT_TYPE_DYNAMIC));


inTrig.onTriggered = () => {
    console.log(inAny.get());
}

};

Ops.User.kikohs.ConsoleLogObj.prototype = new CABLES.Op();
CABLES.OPS["ffa33c05-0178-4c85-9031-430762c609b9"]={f:Ops.User.kikohs.ConsoleLogObj,objName:"Ops.User.kikohs.ConsoleLogObj"};




// **************************************************************
// 
// Ops.Data.Compose.CompObject
// 
// **************************************************************

Ops.Data.Compose.CompObject = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    update = op.inTrigger("Update"),
    next = op.outTrigger("Next"),
    outArr = op.outObject("Result");

update.onTriggered = () =>
{
    op.patch.frameStore.compObject = op.patch.frameStore.compObject || [];

    let obj = {};
    op.patch.frameStore.compObject.push(obj);
    next.trigger();

    outArr.setRef(op.patch.frameStore.compObject.pop());
};


};

Ops.Data.Compose.CompObject.prototype = new CABLES.Op();
CABLES.OPS["c85b449b-fb4e-40b3-928e-5eea6a5d0ebc"]={f:Ops.Data.Compose.CompObject,objName:"Ops.Data.Compose.CompObject"};




// **************************************************************
// 
// Ops.Data.Compose.CompObjectSetNumber
// 
// **************************************************************

Ops.Data.Compose.CompObjectSetNumber = function()
{
CABLES.Op.apply(this,arguments);
const op=this;
const attachments={};
const
    update = op.inTrigger("Update"),
    inKey = op.inString("Key", ""),
    inNum = op.inFloat("Number", 0),
    next = op.outTrigger("Next");

op.setUiAttrib({ "extendTitlePort": inKey.name });

update.onTriggered = () =>
{
    if (op.patch.frameStore.compObject && op.patch.frameStore.compObject.length > 0)
    {
        let obj = op.patch.frameStore.compObject[op.patch.frameStore.compObject.length - 1];
        obj[inKey.get()] = inNum.get();
    }
    next.trigger();
};


};

Ops.Data.Compose.CompObjectSetNumber.prototype = new CABLES.Op();
CABLES.OPS["58a75bf7-6828-4190-a205-3b8037bc24d4"]={f:Ops.Data.Compose.CompObjectSetNumber,objName:"Ops.Data.Compose.CompObjectSetNumber"};



window.addEventListener('load', function(event) {
CABLES.jsLoaded=new Event('CABLES.jsLoaded');
document.dispatchEvent(CABLES.jsLoaded);
});
