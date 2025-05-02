class TouchController {
    constructor() {
        this.canvas = document.getElementById('touchCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.touchArea = 0;
        this.maxArea = 0;
        this.activeTouches = new Map();
        this.osc = new OSC();
        this.osc.open({ host: 'localhost', port: 57120 }); // Default SuperCollider port, change to match your setup

        // Set canvas size to window size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Touch event listeners
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        this.canvas.addEventListener('touchcancel', (e) => this.handleTouchEnd(e));

        // Initialize canvas
        this.clearCanvas();
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight * 0.8;
        this.maxArea = this.canvas.width * this.canvas.height;
        this.clearCanvas();
    }

    clearCanvas() {
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    handleTouchStart(e) {
        e.preventDefault();
        this.updateTouches(e.touches);
        this.drawTouches();
        this.updateMIDI();
    }

    handleTouchMove(e) {
        e.preventDefault();
        this.updateTouches(e.touches);
        this.drawTouches();
        this.updateMIDI();
    }

    handleTouchEnd(e) {
        e.preventDefault();
        this.updateTouches(e.touches);
        this.drawTouches();
        this.updateMIDI();
    }

    updateTouches(touches) {
        this.activeTouches.clear();
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            this.activeTouches.set(touch.identifier, {
                x: touch.clientX,
                y: touch.clientY,
                radiusX: touch.radiusX || 20,
                radiusY: touch.radiusY || 20,
                force: touch.force || 1
            });
        }
    }

    drawTouches() {
        this.clearCanvas();
        
        // Draw each touch point
        this.activeTouches.forEach((touch, id) => {
            // Draw touch ellipse
            this.ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + touch.force * 0.7})`;
            this.ctx.beginPath();
            this.ctx.ellipse(
                touch.x,
                touch.y,
                touch.radiusX,
                touch.radiusY,
                0, 0, Math.PI * 2
            );
            this.ctx.fill();

            // Draw touch ID
            this.ctx.fillStyle = 'white';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(id.toString(), touch.x, touch.y);
        });
    }

    updateMIDI() {
        // Calculate total touch area
        this.touchArea = 0;
        this.activeTouches.forEach(touch => {
            const area = Math.PI * touch.radiusX * touch.radiusY * touch.force;
            this.touchArea += area;
        });

        // Calculate MIDI value based on both number of touches and area
        const touchCountFactor = Math.min(1, this.activeTouches.size / 10); // Max 10 touches
        const areaFactor = Math.min(1, this.touchArea / this.maxArea);
        const midiValue = Math.floor(127 * (touchCountFactor * 0.5 + areaFactor * 0.5));
        
        // Update display
        document.getElementById('touchArea').textContent = Math.floor(this.touchArea);
        document.getElementById('midiValue').textContent = midiValue;

        // Send OSC message
        this.sendOSC(midiValue);
    }

    sendOSC(value) {
        const message = new OSC.Message('/midi', value);
        this.osc.send(message);
    }
}

// Initialize the controller when the page loads
window.addEventListener('load', () => {
    new TouchController();
}); 
