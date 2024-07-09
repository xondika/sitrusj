
export type Pair = [number, number];
export type Point = [number, number];

export function rotate(position: Pair, rad: number): Pair {
    return [Math.cos(rad) * position[0] - Math.sin(rad) * position[1],
            Math.sin(rad) * position[0] + Math.cos(rad) * position[1]];
}

export function add(left: Point, right: Point): Point {
    return [left[0] + right[0], left[1] + right[1]];
}

export function sub(left: Point, right: Point): Point {
    return [left[0] - right[0], left[1] - right[1]];
}

export function mul(left: Point, right: number): Point {
    return [left[0] * right, left[1] * right];
}

export function div(left: Point, right: number): Point {
    return [left[0] / right, left[1] / right];
}


export function dist(left: Point, right: Point): number {
    const diff = sub(left, right);
    return Math.sqrt(diff[0] * diff[0] + diff[1] * diff[1]);
}

export function posUpdate(state, delta: number, wheel_dist: number = 82): Object {
    if (Math.abs(state.velocity[0] - state.velocity[1]) < 0.01) {
        const rotated = rotate([state.velocity[0], 0], state.rotation);
        const newPos = [state.position[0] + delta * rotated[0], state.position[1] + delta * rotated[1]];
        return { position: newPos, rotation: state.rotation, velocity: state.velocity };
    }

    const ICC_dist = (wheel_dist / 2) * (state.velocity[1] + state.velocity[0]) / (state.velocity[1] - state.velocity[0]);
    const angular = (state.velocity[1] - state.velocity[0]) / wheel_dist;
    const ICC: Point = [state.position[0] - ICC_dist * Math.sin(state.rotation), state.position[1] + ICC_dist * Math.cos(state.rotation)];
    const newPos = add(rotate(sub(state.position, ICC), angular * delta), ICC);
    const newRot = state.rotation - angular * delta;
    return { position: newPos, rotation: newRot, velocity: state.velocity };
}

// export class Turtle {
//     size: number = 95;
//     wheel_dist: number = 90;
//     position: Point = [0, 0];
//     rotation: number = 0;
//     l_velocity: number = 0;
//     r_velocity: number = 0;

//     pos_update(delta: number): Turtle {
//         if (Math.abs(this.l_velocity - this.r_velocity) < 0.01) {
//             const rotated = rotate([this.l_velocity, 0], this.rotation);
//             this.position = [this.position[0] + delta * rotated[0], this.position[1] + delta * rotated[1]];
//             return;
//         }

//         const ICC_dist = (this.wheel_dist / 2) * (this.r_velocity + this.l_velocity) / (this.r_velocity - this.l_velocity);
//         const angular = (this.r_velocity - this.l_velocity) / this.wheel_dist;
//         const ICC: Point = [this.position[0] - ICC_dist * Math.sin(this.rotation), this.position[1] + ICC_dist * Math.cos(this.rotation)];
//         this.position = add(rotate(sub(this.position, ICC), angular * delta), ICC);
//         this.rotation -= angular * delta;
//         return this;
//     }

//     set_speed(l_vel: number, r_vel: number){
//         this.l_velocity = l_vel;
//         this.r_velocity = r_vel;
//     }

//     set_pos(x: number, y: number){
//         this.position = [x, y];
//     }
// }
