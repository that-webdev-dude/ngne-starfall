/** Presentation-only center offset, in baseline CSS pixels. Every canvas point can
 * reach the viewport center; clamping prevents losing the canvas beyond an edge. */
export class Inspection {
    width;
    height;
    x = 0;
    y = 0;
    zoom = 1;
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }
    pan(dx, dy) {
        this.x = Math.max(-this.width / 2, Math.min(this.width / 2, this.x + dx / this.zoom));
        this.y = Math.max(-this.height / 2, Math.min(this.height / 2, this.y + dy / this.zoom));
    }
    reset() {
        this.zoom = 1;
        this.x = this.y = 0;
    }
}
