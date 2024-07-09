import { useState } from 'react';
import { useTick, Sprite } from '@pixi/react';
import { posUpdate, dist } from './kinematics.ts';
import { line } from './shapes.ts';

import tutel from './assets/turtle.png';

const maxTicks = 3;

export default function Robot({
    position, setPosition,
    rotation, setRotation, velocity,
    drawings, setDrawings, isDrawing, addShape,
    grabbing, wasMoved,
    grid
})
{
    const [ticks, setTicks] = useState(0);
    const [start, setStart] = useState([0, 0]);
    const [dragging, setDragging] = useState(false);

    useTick(delta => {
        if( dragging ){
            return;
        }
        if( velocity[0] === 0 && velocity[1] === 0 ){
            return;
        }

        if(ticks === 0){
            setStart(position);
        }
        setTicks((ticks + 1) % maxTicks);

        const state = { position: position, rotation: rotation, velocity: velocity };
        const newState = posUpdate(state, delta);
        setPosition(newState.position);
        setRotation(newState.rotation);
        if( ticks === maxTicks - 1 ){
            if( isDrawing.current ){
                const end = newState.position;
                addShape(line(start, end));
            }
        }
        console.log(position)

    });

    if( grabbing ){
        onpointerdown = (event) => {
            if(dist([event.clientX, event.clientY], position) < 50){
                setDragging(true);
            }
        }
        onpointerup = (event) => {
            setDragging(false);
            setStart(position);
        }
        onpointermove = (event) => {
            const mousePos = [event.clientX, event.clientY];
            if(dragging
                && mousePos[0] > 45
                && mousePos[0] < (window.innerWidth / 3 * 2) - 45
                && mousePos[1] > 45
                && mousePos[1] < (window.innerHeight * 0.8) - 45 )
            {
                setPosition(mousePos);
            }
            if(velocity[0] !== 0 || velocity[1] !== 0){
                wasMoved.current = true;
            }
        }
    }

    return (
        <Sprite
        x={position[0]}
        y={position[1]}
        image={tutel}
        width={100}
        height={90}
        rotation={Math.PI / 2 + rotation}
        anchor={0.5}
            />
    );
};
