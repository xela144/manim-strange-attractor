import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Three.js setup
let scene, camera, renderer;
let lorenzSystem, axes;
let controls;
let isAnimating = false;

const initialSigma = 10;
const initialRho = 28;
const initialBeta = 8/3;

// Lorenz attractor parameters
const params = {
    sigma: initialSigma,
    rho: initialRho,
    beta: initialBeta,
    dt: 0.01,
    numTraces: 3,
    traceLength: 1000,
    showAxes: false,
    rotationSpeed: 0.001, // Default rotation speed
    startPoints: generateRandomStartPoints(3),
    animationSpeed: 1 // Default animation speed
};

// Initialize Three.js scene
function init() {
    // Set up scene, camera, and renderer
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, .001, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xffffff); // Set background to white
    document.getElementById('container').appendChild(renderer.domElement);

    // Add orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    camera.position.set(0, -100, 50); // Adjust the camera position to make Z-axis point upwards
    camera.lookAt(0, 0, 0); // Ensure the camera is looking at the origin

    // Create GUI controls
    const gui = new dat.GUI();
    gui.add(params, 'sigma', 0, 50);
    gui.add(params, 'rho', 0, 50);
    gui.add(params, 'beta', 0, 20);
    gui.add(params, 'dt', 0.0001, 0.01);
    gui.add(params, 'numTraces', 1, 10).step(1).onChange(createLorenzSystem);
    gui.add(params, 'showAxes').onChange(toggleAxes);
    gui.add(params, 'rotationSpeed', -0.05, 0.05).name('Rotation Speed');
    gui.add(params, 'traceLength', Math.log10(100), Math.log10(100000))
        .name('Trace Length')
        .onChange(value => {
            params.traceLength = Math.pow(10, value);
        });
    gui.add(params, 'animationSpeed', 0.1, 20).name('Animation Speed');
    gui.add({ resetParams: resetParams }, 'resetParams').name('Reset Lorenz Parameters');
    gui.add({ toggleAnimation: toggleAnimation }, 'toggleAnimation').name('Start/Stop');
    gui.add({ clearTraces: clearTraces }, 'clearTraces').name('Clear Traces');

    // Create axes
    createAxes();
    axes.visible = false;

    // Create Lorenz system
    createLorenzSystem();

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}

// Create axes
function createAxes() {
    axes = new THREE.AxesHelper(200);
    scene.add(axes);
}

// Create Lorenz attractor system
function createLorenzSystem() {
    if (lorenzSystem) {
        lorenzSystem.forEach(trace => {
            scene.remove(trace.line);
            scene.remove(trace.sphere); // Remove the sphere from the scene
        });
        lorenzSystem.forEach(trace => scene.remove(trace.line));
    }
    lorenzSystem = [];

    const sphereGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });

    for (let i = 0; i < params.numTraces; i++) {
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        scene.add(sphere);
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(100000 * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
            color: new THREE.Color(0x0),
        });

        const line = new THREE.Line(geometry, material);
        scene.add(line);

        lorenzSystem.push({
            sphere: sphere,
            line: line,
            positions: positions,
            currentIndex: 0,
            x: params.startPoints[i % params.startPoints.length].x,
            y: params.startPoints[i % params.startPoints.length].y,
            z: params.startPoints[i % params.startPoints.length].z
        });
    }
}

// Update Lorenz system
function updateLorenzSystem() {
    const traceLength = params.traceLength;
    lorenzSystem.forEach(trace => {
        const {dx, dy, dz} = lorenzDerivatives(trace.x, trace.y, trace.z);
        trace.x += dx * params.dt;
        trace.y += dy * params.dt;
        trace.z += dz * params.dt;

        trace.positions[trace.currentIndex * 3] = trace.x;
        trace.positions[trace.currentIndex * 3 + 1] = trace.y;
        trace.positions[trace.currentIndex * 3 + 2] = trace.z;

        trace.currentIndex = (trace.currentIndex + 1) % (trace.positions.length / 3);

        const start = Math.max(0, trace.currentIndex - traceLength);
        const end = trace.currentIndex;
        trace.line.geometry.setDrawRange(start, end - start);

        trace.line.geometry.attributes.position.needsUpdate = true;
        trace.sphere.position.set(trace.x, trace.y, trace.z);
    });
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    if (isAnimating) {
        for (let i = 0; i < params.animationSpeed; i++) {
            updateLorenzSystem();
        }
    }
    // Rotate the entire scene around the z-axis
    scene.rotation.z += params.rotationSpeed; // Use the rotation speed parameter

    controls.update();
    renderer.render(scene, camera);
}

// Toggle the animation loop
function toggleAnimation() {
    isAnimating = !isAnimating;
    if (isAnimating) {
        animate();
    }
}


// Reset the parameters to their inital
function resetParams(){
    params.sigma = initialSigma;
    params.beta = initialBeta;
    params.rho = initialRho;
}

// Clear the traces
function clearTraces() {
    params.startPoints = generateRandomStartPoints(params.numTraces);
    lorenzSystem.forEach((trace, index) => {
        scene.remove(trace.sphere); // Remove the sphere from the scene
        trace.currentIndex = 0;
        trace.positions.fill(0);
        trace.x = params.startPoints[index % params.startPoints.length].x;
        trace.y = params.startPoints[index % params.startPoints.length].y;
        trace.z = params.startPoints[index % params.startPoints.length].z;
        trace.line.geometry.attributes.position.needsUpdate = true;
    });
}

// Lorenz attractor equations
function lorenzDerivatives(x, y, z) {
    const dx = params.sigma * (y - x);
    const dy = x * (params.rho - z) - y;
    const dz = x * y - params.beta * z;
    return {dx, dy, dz};
}

// Toggle axes visibility
function toggleAxes() {
    axes.visible = params.showAxes;
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function generateRandomStartPoints(numPoints) {
    const points = [];
    const randX = Math.random() * 20;
    const randY = Math.random() * 20;
    const randZ = Math.random() * 20;
    for (let i = 0; i < numPoints; i++) {
        points.push({
            x: randX + (Math.random()) * 0.02, // Random x close to 0
            y: randY + (Math.random()) * 0.02, // Random y close to 0
            z: randZ + (Math.random()) * 0.02  // Random z close to 0
        });
    }
    return points;
}
init();
toggleAnimation();
