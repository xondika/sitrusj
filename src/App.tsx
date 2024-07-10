import './App.css';
import { useCallback, useState, useRef } from 'react';
import { Stage, Graphics } from '@pixi/react';
import { Point, dist, add, sub, mul, div, rotate } from './kinematics.ts';
import CodeEditor from './codeEdit.tsx';
import Robot from './robot.tsx';
import { Type, Shape, OccupancyGrid, line, rectangle, square } from './shapes.ts';


const sensorPositions = [[37, 10], [37, -10], [0, -10], [0, 10],
  [24, 37], [24, -37], [-24, -37], [-24, 37]]


const containerStyle = {
  display: 'flex',
  justifyContent: 'start', // Distribute space around the items
  alignItems: 'left', // Align items vertically in the center
  padding: '2px',
};

// TODO
function AddObstacles({ obstacles, setObstacles, setGrabbing }) {
  const handleClick = () => {
    setGrabbing(false);
  }
  return (
    <button onClick={handleClick}>
      Add obstacle
    </button>
  );
};

function updateSelectedShape(event) {
  let shapeButtons = document.querySelectorAll('.shape-selector button');
  shapeButtons.forEach((button) => {
    button.classList.remove('selected');
  });

  let grabButton = document.querySelector('.grab-btn');
  if (grabButton !== null) grabButton.classList.remove('selected');

  event.target.classList.add('selected');
}

function DrawShapes({ drawings, setDrawings, grabbing, setGrabbing, addShape }) {
  const [start, setStart] = useState(null);
  const [idx, setIdx] = useState(0);
  const [type, setType] = useState(Type.Line)

  const handleShapeClick = (event, shapeType) => {
    updateSelectedShape(event);
    updateShapeType(shapeType);
  }
  const updateShapeType = (shapeType) => {
    setGrabbing(false);
    setType(shapeType);
  }

  if (!grabbing) {
    // Create shape
    onpointerdown = (event) => {
      const point = [event.clientX, event.clientY];
      setStart(point)
      setIdx(drawings.length);
      let copy = drawings.slice();
      copy.push(line(point.slice(), point.slice()));
      setDrawings(copy);
    }
    // Resize shape while moving
    onpointermove = (event) => {
      if (start !== null) {
        const shape = new Shape(type, start, [event.clientX, event.clientY]);
        let copy = drawings.slice();
        copy[idx] = shape;
        setDrawings(copy);
      }
    }
    // Fix shape and add to grid
    onpointerup = (event) => {
      const end = [event.clientX, event.clientY];
      addShape(new Shape(type, start, end, 0, 8), drawings);
      setStart(null);
    }

  }

  return (
    <div className='shape-selector'>
      <button onClick={(e) => handleShapeClick(e, Type.Line)}>
        Draw line
      </button>

      <button onClick={(e) => handleShapeClick(e, Type.Rectangle)}>
        Draw rectangle
      </button>

      <button onClick={(e) => handleShapeClick(e, Type.Circle)}>
        Draw circle
      </button>
    </div>
  );
};

function Rendering({ drawings }) {
  const draw = useCallback((graphics) => {
    graphics.clear();
    drawings.forEach((shape) => {
      if (shape.type === Type.Line) {
        graphics.lineStyle(4, shape.color, 1);
        graphics.moveTo(...shape.start);
        graphics.lineTo(...shape.end);
      }
      if (shape.type === Type.Rectangle) {
        graphics.beginFill(shape.color, 1);
        const minX = Math.min(shape.start[0], shape.end[0])
        const minY = Math.min(shape.start[1], shape.end[1])

        const maxX = Math.max(shape.start[0], shape.end[0])
        const maxY = Math.max(shape.start[1], shape.end[1])
        graphics.drawRect(minX, minY, maxX - minX, maxY - minY);
      }
      if (shape.type === Type.Circle) {
        graphics.beginFill(shape.color, 1);
        const rad = dist(shape.start, shape.end) / 2;
        const center = add(shape.start, div(sub(shape.end, shape.start), 2));
        graphics.drawCircle(center[0], center[1], rad);
      }
    })
  }, [drawings]);

  return <Graphics draw={draw} />;
}


export default function App() {
  const [velocity, setVelocity] = useState([0, 0]);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState([50, 50]);

  const [obstacles, setObstacles] = useState([]);
  const [drawings, setDrawings] = useState([]);

  const [grabbing, setGrabbing] = useState(true);

  const wasMoved = useRef(false);
  const isDrawing = useRef(false);

  const frontSensors = useRef(true);
  const workerRef = useRef(null);

  const grid = useRef(new OccupancyGrid(
    Math.floor(window.innerHeight * 0.8),
    Math.floor(window.innerWidth / 3 * 2))
  );

  const adjustPosition = (pos) => {
    if (!wasMoved.current) {
      setPosition(pos);
    }
    //if(velocity[0] === 0 && velocity[1] === 0){ wasMoved.current = false; }
  }

  const readSensors = () => {
    //console.log(sensors);
    let result = sensorPositions.map((sensorPos) => {
      let sum = 0;
      let squares = 0;
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const rotatedPos = rotate(sensorPos, rotation);

          // 112000 ~ white / 150 (upper bound for reading of adc in range 0-1023)
          sum += grid.current.getAt([position[0] + rotatedPos[0] + dx * 5,
          position[1] + rotatedPos[1] + dy * 5]) / 112000;
          squares++;
        }
      }
      //console.log(sum);
      return sum / squares;
    });
    return result;
  }

  const positionUpdate = (pos) => {
    setPosition(pos);

    if (workerRef.current !== null) {
      workerRef.current.postMessage({ action: "sensorReadings", payload: readSensors() });
    }
  }

  const addShape = (shape) => {
    const shapes = drawings.slice();
    shapes.push(shape);
    setDrawings(shapes);
    if (shape.type === Type.Line) {
      const lineLength = dist(shape.start, shape.end);
      for (let point: Point = shape.start;
        dist(shape.start, point) < lineLength;
        point = add(point, div(sub(shape.end, shape.start), lineLength))) {
        grid.current.setAt(point, 0x00);
      }
    }
    if (shape.type === Type.Rectangle) {
      const minX = Math.min(shape.start[0], shape.end[0])
      const minY = Math.min(shape.start[1], shape.end[1])

      const maxX = Math.max(shape.start[0], shape.end[0])
      const maxY = Math.max(shape.start[1], shape.end[1])

      for (let y = minY; y < maxY; y += 5) {
        for (let x = minX; x < maxX; x += 5) {
          grid.current.setAt([x, y], shape.color);
        }
      }
    }
    if (shape.type === Type.Circle) {
      const rad = dist(shape.start, shape.end) / 2;
      const center = add(shape.start, div(sub(shape.end, shape.start), 2));

      for (let y = center[1] - rad; y < center[1] + rad; y += 5) {
        for (let x = center[0] - rad; x < center[0] + rad; x += 5) {
          if (dist([x, y], center) < rad)
            grid.current.setAt([x, y], shape.color);
        }
      }
    }
  }

  const handleGrabBtnClick = (event) => {
    updateSelectedShape(event);
    setGrabbing(true);
  }

  return (
    <div>
      <div style={containerStyle} onContextMenu={(e) => e.preventDefault()}>
        <Stage width={window.innerWidth / 3 * 2} height={window.innerHeight * 0.8}
          options={{ backgroundColor: 0xf8f8ff }}>
          <Rendering drawings={drawings} />
          <Robot velocity={velocity} position={position} setPosition={positionUpdate}
            rotation={rotation} setRotation={setRotation}
            drawings={drawings} setDrawings={setDrawings} isDrawing={isDrawing} addShape={addShape}
            grabbing={grabbing} wasMoved={wasMoved}
            grid={grid}
          />
        </Stage>
        <CodeEditor velocity={velocity} setVelocity={setVelocity} position={position}
          setPosition={adjustPosition} rotation={rotation} setRotation={setRotation}
          isDrawing={isDrawing} drawings={drawings} setDrawings={setDrawings}
          grid={grid} workerRef={workerRef} readSensors={readSensors} frontSensors={frontSensors}
        />
      </div>
      <button onClick={(e) => { handleGrabBtnClick(e) }} className='grab-btn selected'>
        Grab turtle
      </button>

      <div>
        <DrawShapes grabbing={grabbing} setGrabbing={setGrabbing} drawings={drawings} setDrawings={setDrawings} addShape={addShape} />
      </div>
    </div>
  );
}
