import { useState } from 'react';
import { Editor } from '@monaco-editor/react';

//import { add } from './kinematics.ts';

import * as ts from 'typescript';

//import Worker from './worker.js';

export default function CodeEditor({
    velocity, setVelocity,
    position, setPosition,
    rotation, setRotation,
    isDrawing,
    grid,
    workerRef,
    readSensors, frontSensors

}) {
    const [output, setOutput] = useState("");
    const [code, setCode] = useState(
`//import * as robutek from 'robutek';
//import { Servo } from 'servo';
//import * as adc from 'adc';
`);

    const compileAndRun = () => {
        const removedImports = code.replace("import", "//import");
        let compiledCode = ts.transpile(removedImports, {
            compilerOptions: {
                strict: true,
                module: ts.ModuleKind.CommonJS,
                jsx: ts.JsxEmit.React,
            },
        });

        //setOutput(compiledCode);
        runCode(compiledCode);
    };

    const runCode = async (compiledCode) => {
        if(window.Worker){
            if(workerRef.current !== null) {
                workerRef.current.terminate();
            }

            //const Worker = await import('./worker.js');
            //const worker = new Worker.default();

            const worker = new Worker(new URL("./worker.js", import.meta.url), {type: "module"});
            //const worker = new Worker("worker.js", {type: "module"});
            workerRef.current = worker;
            worker.postMessage({action: "sensorReadings", payload: readSensors()});

            worker.postMessage({
                action: 'evalCode', payload: {
                    modules: {}, code: compiledCode
                }
            });

            let executing = false;
            let interrupted = false;
            let buffer = output;

            worker.onmessage = async (e) => {
                const { action, payload } = e.data;
                console.log("received message " + action)
                if( action === "print" ){
                    setOutput(buffer + payload);
                    buffer = buffer + payload;
                };
                if( action === "setVelocity" ){
                    setVelocity(payload)
                }
                if( action === "move" ){
                    if(executing){
                        interrupted = true;
                    }
                    executing = true;
                    setVelocity(payload.velocity);
                    console.log("velocity", payload.velocity);
                    console.log("duration", payload.duration);
                    //const velocity = dist([0, 0], payload.velocity)
                    const velocity = Math.max(payload.velocity[0], payload.velocity[1]);
                    const timeout = payload.duration.distance ?
                        payload.duration.distance / 60 * 1000 / velocity :
                        payload.duration.time;

                    if( timeout ){
                        setTimeout(() => {
                            setVelocity([0, 0]);
                            executing = false;
                            worker.postMessage({ action: "stop" });
                        }, timeout);
                    }
                }
                if( action === "rotate" ){
                    if(executing){
                        interrupted = true;
                    }
                    executing = true;
                    const rotationVelocity = payload.velocity * (payload.angle >= 0 ? 1 : -1);
                    console.log(rotationVelocity);
                    setVelocity([rotationVelocity / 2, -rotationVelocity / 2]);
                    const rad = payload.angle / 180 * Math.PI;
                    const angular = payload.velocity / 82;
                    if( payload.angle !== 0 ){
                        setTimeout(() => {
                            rotation = rotation + rad;
                            if(!interrupted){
                                setRotation(rotation);
                            }
                            setVelocity([0, 0]);
                            executing = false;
                            worker.postMessage({ action: "stop" });
                        }, Math.abs(rad) / 60 * 1000 / angular);
                    }
                }
                if( action === "setDraw" ){
                    isDrawing.current = payload;
                }
                if( action === "switchSensors" ){
                    frontSensors.current = payload;

                    worker.postMessage({ action: "sensorReadings", payload: readSensors()});
                    worker.postMessage({ action: "switchedSensors" });
                }
            };
            worker.onerror = (e) => {
                console.log(e);
            }
            setTimeout(() => {
                worker.terminate()
            }, 60000);
        } else {
            console.log("worker unavailable");
        }
    };
    return (
        <div>
            <h1>TypeScript Code Editor</h1>
            <Editor
        height={window.innerHeight * 0.40}
        width={window.innerWidth * 0.32}
        language="javascript"
        theme="vs-dark"
        value={code}
        onChange={(c) => setCode(c)}
            />
            <button onClick={compileAndRun} className='run-btn'>Run Code</button>
            <h2 className='output-text'>Output:</h2>
            <div className="text-window">
        {output}
        </div>
            </div>
    );
};
