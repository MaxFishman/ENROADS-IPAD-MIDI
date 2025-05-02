class TouchController {
    constructor() {
        this.canvas = document.getElementById('touchCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.touchArea = 0;
        this.maxArea = 0;
        this.osc = new OSC();
        this.osc.open({ host: 'localhost', port: 57120 }); // Default SuperCollider port, change to match your setup

        // Set canvas size to window size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Touch event listeners
        this.canvas.addEventListener('touchstart', (e) => this.handleTouch(e));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouch(e));
        this.canvas.addEventListener('touchend', () => this.handleTouchEnd());

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

    handleTouch(e) {
        e.preventDefault();
        this.clearCanvas();
        
        // Calculate total touch area
        this.touchArea = 0;
        for (let i = 0; i < e.touches.length; i++) {
            const touch = e.touches[i];
            const radius = 50; // Approximate touch radius in pixels
            this.touchArea += Math.PI * radius * radius;
            
            // Draw touch point
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.beginPath();
            this.ctx.arc(touch.clientX, touch.clientY, radius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Calculate MIDI value (0-127)
        const midiValue = Math.min(127, Math.floor((this.touchArea / this.maxArea) * 127));
        
        // Update display
        document.getElementById('touchArea').textContent = Math.floor(this.touchArea);
        document.getElementById('midiValue').textContent = midiValue;

        // Send OSC message
        this.sendOSC(midiValue);
    }

    handleTouchEnd() {
        this.clearCanvas();
        this.touchArea = 0;
        document.getElementById('touchArea').textContent = '0';
        document.getElementById('midiValue').textContent = '0';
        this.sendOSC(0);
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