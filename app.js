class TouchController {
    constructor() {
        this.canvas = document.getElementById('touchCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.touchArea = 0;
        this.maxArea = 0;
        this.activeTouches = new Map();
        this.osc = new OSC();
        this.osc.open({ host: 'localhost', port: 57120 });

        // Ensure proper canvas sizing
        this.setupCanvas();
        
        // iOS-specific event prevention
        document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
        document.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
        
        // Bind touch events directly to canvas
        this.canvas.ontouchstart = this.handleTouch.bind(this);
        this.canvas.ontouchmove = this.handleTouch.bind(this);
        this.canvas.ontouchend = this.handleTouch.bind(this);
        this.canvas.ontouchcancel = this.handleTouch.bind(this);
        
        // Debug element
        this.debugEl = document.getElementById('debug');
        if (!this.debugEl) {
            this.debugEl = document.createElement('div');
            this.debugEl.id = 'debug';
            document.body.appendChild(this.debugEl);
        }

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

    setupCanvas() {
        // Set canvas size
        const updateSize = () => {
            const width = window.innerWidth;
            const height = window.innerHeight * 0.8;
            this.canvas.style.width = width + 'px';
            this.canvas.style.height = height + 'px';
            this.canvas.width = width;
            this.canvas.height = height;
        };

        updateSize();
        window.addEventListener('resize', updateSize);
    }

    handleTouch(event) {
        event.preventDefault();
        
        // Clear previous touches if this is a touchstart event
        if (event.type === 'touchstart') {
            this.activeTouches.clear();
        }
        
        // Update debug info
        this.debugEl.innerHTML = `
            Event Type: ${event.type}<br>
            Touch Count: ${event.touches.length}<br>
            Time: ${new Date().toISOString()}
        `;

        // Process all current touches
        Array.from(event.touches).forEach(touch => {
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            this.activeTouches.set(touch.identifier, { x, y });
        });

        // Clear touches if this is a touchend/cancel event
        if (event.type === 'touchend' || event.type === 'touchcancel') {
            this.activeTouches.clear();
        }

        // Draw the current state
        this.draw();
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#2a2a2a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw touch points
        this.activeTouches.forEach((touch, id) => {
            this.ctx.beginPath();
            this.ctx.arc(touch.x, touch.y, 40, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.ctx.fill();
            
            this.ctx.fillStyle = 'white';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(id, touch.x, touch.y);
        });

        // Update touch count display
        const touchCountEl = document.getElementById('touchCount');
        if (touchCountEl) {
            touchCountEl.textContent = this.activeTouches.size;
        }
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
                totalForce += touch.force || 1;
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
