class TouchController {
    constructor() {
        this.canvas = document.getElementById('touchCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.touchArea = 0;
        this.maxArea = 0;
        this.activeTouches = new Map();
        this.osc = new OSC();
        this.osc.open({ host: 'localhost', port: 57120 });

        // Set canvas size to window size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Prevent default touch behaviors
        document.body.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
        document.body.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
        document.body.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
        
        // Add touch event listeners with bind to maintain context
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });

        // Debug touch events
        this.setupDebugDisplay();
        
        // Initialize canvas
        this.clearCanvas();

        // Add parameter tracking
        this.parameters = {
            x: { label: 'X Position', value: 0, min: 0, max: 127 },
            y: { label: 'Y Position', value: 0, min: 0, max: 127 },
            pressure: { label: 'Pressure', value: 0, min: 0, max: 127 },
            touches: { label: 'Touch Count', value: 0, min: 0, max: 127 }
        };

        // Create parameter display
        this.createParameterDisplay();
        
        // Prevent iOS Safari's default behaviors
        document.addEventListener('gesturestart', (e) => e.preventDefault());
        document.addEventListener('gesturechange', (e) => e.preventDefault());
        document.addEventListener('gestureend', (e) => e.preventDefault());
    }

    setupDebugDisplay() {
        const debugDiv = document.createElement('div');
        debugDiv.id = 'debug';
        debugDiv.style.position = 'fixed';
        debugDiv.style.top = '10px';
        debugDiv.style.left = '10px';
        debugDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
        debugDiv.style.color = 'white';
        debugDiv.style.padding = '10px';
        debugDiv.style.fontFamily = 'monospace';
        document.body.appendChild(debugDiv);
    }

    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.maxArea = this.canvas.width * this.canvas.height;
    }

    handleTouchStart(e) {
        e.preventDefault();
        const touches = e.targetTouches;
        this.updateDebugInfo('touchstart', touches.length);
        this.updateTouches(touches);
        this.drawTouches();
        this.updateMIDI();
    }

    handleTouchMove(e) {
        e.preventDefault();
        const touches = e.targetTouches;
        this.updateDebugInfo('touchmove', touches.length);
        this.updateTouches(touches);
        this.drawTouches();
        this.updateMIDI();
    }

    handleTouchEnd(e) {
        e.preventDefault();
        const touches = e.targetTouches;
        this.updateDebugInfo('touchend', touches.length);
        this.updateTouches(touches);
        this.drawTouches();
        this.updateMIDI();
    }

    updateDebugInfo(eventType, touchCount) {
        const debugDiv = document.getElementById('debug');
        debugDiv.innerHTML = `
            Event: ${eventType}<br>
            Touches: ${touchCount}<br>
            Time: ${new Date().toISOString()}
        `;
    }

    updateTouches(touches) {
        this.activeTouches.clear();
        const rect = this.canvas.getBoundingClientRect();
        
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            this.activeTouches.set(touch.identifier, {
                x: x,
                y: y,
                radiusX: touch.radiusX || 20,
                radiusY: touch.radiusY || 20,
                force: touch.force || 1
            });
        }
    }

    drawTouches() {
        this.clearCanvas();
        
        this.activeTouches.forEach((touch, id) => {
            // Draw touch circle
            this.ctx.beginPath();
            this.ctx.arc(touch.x, touch.y, 30, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.fill();
            
            // Draw touch ID
            this.ctx.fillStyle = 'white';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(id.toString(), touch.x, touch.y);
        });
    }

    clearCanvas() {
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    updateMIDI() {
        if (this.activeTouches.size > 0) {
            let avgX = 0, avgY = 0, totalForce = 0;
            
            this.activeTouches.forEach(touch => {
                avgX += touch.x;
                avgY += touch.y;
                totalForce += touch.force;
            });
            
            avgX /= this.activeTouches.size;
            avgY /= this.activeTouches.size;
            totalForce /= this.activeTouches.size;
            
            const normalizedX = Math.floor((avgX / this.canvas.width) * 127);
            const normalizedY = Math.floor((avgY / this.canvas.height) * 127);
            const normalizedForce = Math.floor(totalForce * 127);
            
            // Update display
            document.getElementById('touchArea').textContent = this.activeTouches.size;
            document.getElementById('midiValue').textContent = 
                `X: ${normalizedX}, Y: ${normalizedY}, Force: ${normalizedForce}`;
            
            // Send OSC messages
            this.sendOSC('/x', normalizedX);
            this.sendOSC('/y', normalizedY);
            this.sendOSC('/force', normalizedForce);
        }
    }

    sendOSC(address, value) {
        const message = new OSC.Message(address, value);
        this.osc.send(message);
    }

    createParameterDisplay() {
        const display = document.createElement('div');
        display.className = 'parameter-display';
        Object.keys(this.parameters).forEach(param => {
            const paramDiv = document.createElement('div');
            paramDiv.className = 'parameter';
            paramDiv.innerHTML = `
                <div class="param-label">${this.parameters[param].label}</div>
                <div class="param-value" id="${param}-value">0</div>
                <div class="param-bar">
                    <div class="param-fill" id="${param}-fill"></div>
                </div>
            `;
            display.appendChild(paramDiv);
        });
        document.querySelector('.container').appendChild(display);
    }
}

// Initialize the controller when the page loads
window.addEventListener('load', () => {
    new TouchController();
}); 
