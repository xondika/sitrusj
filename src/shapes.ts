import { Point } from './kinematics.ts';

export enum Type {
    Line,
    Rectangle,
    Circle
}

export class Shape {
    type: Type = Type.Line;
    start: Point = 0;
    end: Point = 0;
    color: number = 0;

    constructor( type: Type, start: Point, end: Point, color: number = 0x00, width: number = 4 ) {
        this.type = type;
        this.start = start;
        this.end = end;
        this.color = color;
        this.width = width;
    }

    collision( shape: Shape ): Point | Shape | null {
        if( this.type === Type.Line ){
            if( shape.type === Type.Line ){
                const uA = ((shape.end[0]-shape.start[0])*(this.start[0]-shape.start[1])
                    - (shape.end[1]-shape.start[1])*(this.start[0]-shape.start[0]))
                    / ((shape.end[1]-shape.start[1])*(this.end[0]-this.start[0])
                        - (shape.end[0]-shape.start[0])*(this.end[1]-this.start[0]));
                const uB = ((this.end[0]-this.start[0])*(this.start[0]-shape.start[1])
                    - (this.end[1]-this.start[0])*(this.start[0]-shape.start[0]))
                    / ((shape.end[1]-shape.start[1])*(this.end[0]-this.start[0])
                        - (shape.end[0]-shape.start[0])*(this.end[1]-this.start[0]));
                if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
                    return add(this.start, mul(sub(this.end, this.start), uA));
                }
                return null;
            }
        }
    }
}

export function line( start: Point, end: Point ): Shape {
    return new Shape(Type.Line, start, end);
}

export function rectangle( midpoint: Point, width: number, height: number = width ){
    const start = sub(midpoint, [width / 2, height / 2]);
    const end = add(midpoint, [width / 2, height / 2]);
    return new Shape( Type.Rectangle, start, end );
}

export function square( midpoint: Point, width: number ){
    return rectangle( midpoint, width );
}

// Represent the world as numbers, -1 for empty, -2 for occupied, otherwise color code
const Empty = 0xffffff;
const Occupied = -1;

export class OccupancyGrid {
    granularity: number = 5;
    rows: number = 0;
    cols: number = 0;
    data: number[] = []

    constructor(height: number, width: number, granularity = 5) {

        this.data = Array.apply(null, Array(Math.floor(width / granularity * height / granularity))).map(() => { return Empty; });
        this.rows = Math.floor(height / granularity);
        this.cols = Math.floor(width / granularity);
    }

    get(row: number, col: number): number {
        return this.data[row * this.cols + col];
    }

    set(row: number, col: number, value: number) {
        this.data[row * this.cols + col] = value;
    }

    getAt(point: Point) {
        const col = Math.floor(point[0] / this.granularity);
        const row = Math.floor(point[1] / this.granularity);
        return this.get(row, col);
    }

    setAt(point: Point, value: number) {
        const col = Math.floor(point[0] / this.granularity);
        const row = Math.floor(point[1] / this.granularity);
        this.set(row, col, value);
    }
}
