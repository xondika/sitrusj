import { shouldInterruptAfterDeadline, newQuickJSAsyncWASMModule, UsingDisposable } from "quickjs-emscripten"

let moduleCache = {};
let output = "";
let sensorReadings = [0, 0, 0, 0];
let velocity = 0;
let configuredAdc = {
    4: 0,
    5: 1,
    6: 2,
    7: 3
}

// Cleanup for setInterval
class QuickJSInterval extends UsingDisposable {
  static INTERVALS = new Map()

  static disposeContext(context: QuickJSContext) {
    for (const interval of QuickJSInterval.INTERVALS.values()) {
      if (interval.context === context) {
        interval.dispose()
      }
    }
  }

  constructor(
    fnHandle,
    context,
    intervalId,
  ) {
    super()
  }

  dispose() {
    clearInterval(this.intervalId)
    this.fnHandle.dispose()
    QuickJSInterval.INTERVALS.delete(this.fnHandle.value)
  }

  get alive() {
    return this.fnHandle.alive
  }
}

let eventListeners = {
    "sensorReadings": (event) => {
        sensorReadings = event.data.payload;
        //console.log("sensorReadings:", sensorReadings)
        //postMessage({action: "idk"})
    }
}

onmessage = (event) => {
    //console.log(e.data);
    const { action, payload } = event.data;
    if (action === 'evalCode') {
        runCode(payload.modules, payload.code);
    } else if( eventListeners[action] ){
        eventListeners[action](event);
    };
}

async function initializeVM(vm) {
    vm.runtime.setModuleLoader((moduleName) => {
        if (moduleCache[moduleName]) {
            return moduleCache[moduleName];
        } else {
            throw new Error(`Module ${moduleName} not found in cache`);
        }
    });

    addFunction(vm, "__enabledraw", (on) => {
        postMessage({ action: "setDraw", payload: vm.getNumber(on) !== 0 });
    });

    setupTimeouts(vm);
    setupOutput(vm);

    const robot = vm.newObject();

    setUpMotors(vm, robot);
    setUpSensors(vm, robot);

    setupServo(vm, robot);
    setupPins(vm, robot);
    vm.setProp(vm.global, "robutek", robot);
}

function addFunction(vm, name, func, parent = vm.global) {
    const functionHandle = vm.newFunction(name, func);
    vm.setProp(parent, name, functionHandle);
    functionHandle.dispose();
}

function setupTimeouts(vm) {
    const setIntervalHandle = vm.newFunction("setInterval", (callbackHandle, delayHandle) => {
        // Ensure the guest can't overload us by scheduling too many intervals.
        if (QuickJSInterval.INTERVALS.size > 100) {
            throw new Error(`Too many intervals scheduled already`)
        }

        const delayMs = vm.getNumber(delayHandle)
        const longLivedCallbackHandle = callbackHandle.dup()
        const intervalId = setInterval(() => {
            //console.log("called");
            vm.callFunction(longLivedCallbackHandle, vm.undefined)
        }, delayMs)
        const disposable = new QuickJSInterval(longLivedCallbackHandle, vm, intervalId)
        QuickJSInterval.INTERVALS.set(intervalId, disposable)
        return vm.newNumber(intervalId)
    })
    vm.setProp(vm.global, "setInterval", setIntervalHandle);
    setIntervalHandle.dispose();

    const setTimeoutHandle = vm.newFunction("setTimeout", (callbackHandle, delayHandle) => {
        // Ensure the guest can't overload us by scheduling too many intervals.
        if (QuickJSInterval.INTERVALS.size > 100) {
            throw new Error(`Too many intervals scheduled already`)
        }

        const delayMs = vm.getNumber(delayHandle)
        const longLivedCallbackHandle = callbackHandle.dup()
        const intervalId = setTimeout(() => {
            //console.log("called");
            vm.callFunction(longLivedCallbackHandle, vm.undefined)
        }, delayMs)
        const disposable = new QuickJSInterval(longLivedCallbackHandle, vm, intervalId)
        QuickJSInterval.INTERVALS.set(intervalId, disposable)
        return vm.newNumber(intervalId)
    })
    vm.setProp(vm.global, "setTimeout", setTimeoutHandle);
    setTimeoutHandle.dispose();

    const clearIntervalHandle = vm.newFunction("clearInterval", (intervalIdHandle) => {
        const intervalId = vm.getNumber(intervalIdHandle)
        const disposable = QuickJSInterval.INTERVALS.get(intervalId)
        clearInterval(intervalId);
        disposable?.dispose()
    })
    vm.setProp(vm.global, "clearInterval", clearIntervalHandle);
    clearIntervalHandle.dispose();

    const clearTimeoutHandle = vm.newFunction("clearTimeout", (intervalIdHandle) => {
        const intervalId = vm.getNumber(intervalIdHandle)
        const disposable = QuickJSInterval.INTERVALS.get(intervalId)
        clearTimeout(intervalId)
        disposable?.dispose()
    })
    vm.setProp(vm.global, "clearTimeout", clearTimeoutHandle);
    clearTimeoutHandle.dispose();

    const sleepHandle = vm.newFunction("sleep", (ms) => {
        const promise = vm.newPromise()
        setTimeout(() => {
            promise.resolve();
        }, vm.getNumber(ms))
        promise.settled.then(vm.runtime.executePendingJobs)
        return promise.handle
    })
    vm.setProp(vm.global, "sleep", sleepHandle);
    sleepHandle.dispose();
}

function setupOutput(vm) {
    const logHandle = vm.newFunction("log", (...args) => {
        const nativeArgs = args.map(vm.dump)
        output = ""
        nativeArgs.forEach((arg) => output += " " + arg);
        postMessage({ action: "print", payload: output + '\n' });
    })
    // Partially implement `console` object
    const consoleHandle = vm.newObject()
    vm.setProp(consoleHandle, "log", logHandle)
    vm.setProp(vm.global, "console", consoleHandle)
    consoleHandle.dispose()
    logHandle.dispose()
}

function setUpMotors(vm, robot) {
    addFunction(vm, "setSpeed", (speed) => {
        velocity = vm.getNumber(speed) / 60;
    }, robot);

    addFunction(vm, "move", (c = 0, d = vm.newObject()) => {
        let curve = vm.getNumber(c);
        let lRate = 1;
        let rRate = 1;

        if( curve < 0 ){
            lRate = 1 + curve;
        } else {
            rRate = 1 - curve;
        }

        const distance = vm.getNumber(vm.getProp(d, "distance"))
        const time = vm.getNumber(vm.getProp(d, "time"))

        const duration = distance ? { distance: distance } : { time: time };

        const promise = vm.newPromise();
        postMessage({ action: "move", payload: //{ velocity: 10 } });
                      { velocity: [lRate * velocity, rRate * velocity],
                        duration: duration
                      }
                    });
        eventListeners["stop"] = (event) => {
            promise.resolve();
        }
        promise.settled.then(vm.runtime.executePendingJobs);
        return promise.handle;
    }, robot);

    addFunction(vm, "rotate", (angle = vm.newNumber(0)) => {
        const promise = vm.newPromise();
        postMessage({ action: "rotate", payload: { angle: vm.getNumber(angle), velocity: velocity } });
        eventListeners["stop"] = (event) => {
            promise.resolve();
        }
        promise.settled.then(vm.runtime.executePendingJobs);
        return promise.handle;
    }, robot);

    addFunction(vm, "stop", () => {
        postMessage({ action: "setVelocity", payload: [0, 0] });
    }, robot);
}

function setUpSensors(vm, robot) {
    const adcHandle = vm.newObject();
    vm.setProp(vm.global, "adc", adcHandle);
    addFunction(vm, "read", (pin) => {
        //console.log("pin:", sensorReadings[vm.getNumber(pin)])
        const idx = vm.getNumber(pin);
        if(configuredAdc[idx] !== undefined){
            return vm.newNumber(sensorReadings[configuredAdc[idx]]);
        }
        postMessage({ action: "print", payload: "Error: invalid reading" });
        return NaN;
    }, adcHandle);

    addFunction(vm, "configure", (pin) => {
        configuredAdc[vm.getNumber(pin)] = vm.getNumber(pin) - 4;
    }, adcHandle);
    adcHandle.dispose();

    addFunction(vm, "switchSensors", (value) => {
        const promise = vm.newPromise();
        postMessage({ action: "switchSensors", payload: vm.getNumber(value) });
        eventListeners["switchedSensors"] = (event) => {
            promise.resolve();
        }
        promise.settled.then(vm.runtime.executePendingJobs);
        return promise.handle;
    }, robot);

    const modExports = vm.unwrapResult(vm.evalCode(`
export const readSensor = async (sensor) => {
    switch (sensor) {
        case 'W_FR':
            await switchSensors(0);
            return adc.read(robutek.Pins.Sens1);
        case 'W_FL':
            await switchSensors(0);
            return adc.read(robutek.Pins.Sens2);
        case 'W_BL':
            await switchSensors(0);
            return adc.read(robutek.Pins.Sens3);
        case 'W_BR':
            await switchSensors(0);
            return adc.read(robutek.Pins.Sens4);
        case 'L_FR':
            await switchSensors(1);
            return adc.read(robutek.Pins.Sens1);
        case 'L_FL':
            await switchSensors(1);
            return adc.read(robutek.Pins.Sens2);
        case 'L_BL':
            await switchSensors(1);
            return adc.read(robutek.Pins.Sens3);
        case 'L_BR':
            await switchSensors(1);
            return adc.read(robutek.Pins.Sens4);
        default:
            return NaN;
    }
}`));
    vm.setProp(robot, "readSensor", vm.getProp(modExports, "readSensor"));
}

function setupServo(vm, robot) {
    vm.evalCode(`
class Servo {
    constructor( pin, timer, channel ){
        this.pin = pin;
    }

    write(value){
        __enabledraw(value > 512);
    }
}
`);
    const penPos = vm.newObject();
    vm.setProp(penPos, "Down", vm.newNumber(512 + 50));
    vm.setProp(penPos, "Up", vm.newNumber(512 - 180));
    vm.setProp(penPos, "Unload", vm.newNumber(0));

    vm.setProp(robot, "PenPos", penPos);
    penPos.dispose();
}

function setupPins(vm, robot) {
    const pins = vm.newObject();
    const sp = (name, val) => {
        vm.setProp(pins, name, vm.newNumber(val));
    }
    sp("StatusLED", 46);
    sp("Motor1A", 11);
    sp("Motor1B", 12);
    sp("Motor2A", 45);
    sp("Motor2B", 13);
    sp("Enc1A", 39);
    sp("Enc1B", 40);
    sp("Enc2A", 42);
    sp("Enc2B", 41);

    sp("Sens1", 4);
    sp("Sens2", 5);
    sp("Sens3", 6);
    sp("Sens4", 7);

    sp("SensSW", 8);
    sp("SensEN", 47);
    vm.setProp(robot, "Pins", pins);
}

function runCode(modules, code) {
    moduleCache = modules;

    newQuickJSAsyncWASMModule().then(async QuickJS => {
        const vm = QuickJS.newContext();
        initializeVM(vm);

        const deadline = Date.now() + 100
        vm.runtime.setInterruptHandler(shouldInterruptAfterDeadline(deadline))
        const result = await vm.evalCode(`(async () => {
${code}
})()` );
        vm.runtime.executePendingJobs();
        if (result.error) {
            console.log("Execution failed:", vm.getString(result.error));
            result.error.dispose();
        } else {
            console.log("Success:", vm.getString(result.value));
            result.value.dispose();
        }
    });
    //postMessage()
}