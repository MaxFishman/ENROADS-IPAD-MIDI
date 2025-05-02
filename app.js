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
            // Normalize coordinates relative to canvas
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            // Handle iOS touch properties
            const force = ('force' in touch) ? touch.force : 1;
            const radiusX = ('radiusX' in touch) ? touch.radiusX : 20;
            const radiusY = ('radiusY' in touch) ? touch.radiusY : 20;
            
            this.activeTouches.set(touch.identifier, {
                x, y, radiusX, radiusY, force
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
        // Calculate average position and pressure
        let avgX = 0, avgY = 0, avgPressure = 0;
        this.activeTouches.forEach(touch => {
            avgX += touch.x;
            avgY += touch.y;
            avgPressure += touch.force;
        });
        
        const touchCount = this.activeTouches.size;
        if (touchCount > 0) {
            avgX /= touchCount;
            avgY /= touchCount;
            avgPressure /= touchCount;
        }

        // Update parameters
        this.parameters.x.value = Math.floor((avgX / this.canvas.width) * 127);
        this.parameters.y.value = Math.floor((avgY / this.canvas.height) * 127);
        this.parameters.pressure.value = Math.floor(avgPressure * 127);
        this.parameters.touches.value = Math.floor((touchCount / 10) * 127); // Max 10 touches

        // Update visual feedback
        Object.keys(this.parameters).forEach(param => {
            const value = this.parameters[param].value;
            document.getElementById(`${param}-value`).textContent = value;
            document.getElementById(`${param}-fill`).style.width = `${(value / 127) * 100}%`;
        });

        // Send OSC messages for each parameter
        Object.keys(this.parameters).forEach(param => {
            this.sendOSC(param, this.parameters[param].value);
        });
    }

    sendOSC(parameter, value) {
        const message = new OSC.Message(`/midi/${parameter}`, value);
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
