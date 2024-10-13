'use client'
import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, extend, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useControls, button } from 'leva';

extend({ OrbitControls });

interface LorenzPoint {
  x: number;
  y: number;
  z: number;
}

interface LorenzTrace {
  positions: Float32Array;
  currentIndex: number;
  x: number;
  y: number;
  z: number;
}

function LorenzSystem(): JSX.Element {
  const meshRef = useRef<THREE.Group>(null);
  const lineRefs = useRef<THREE.Line[]>([]);

  const initialSigma = 10;
  const initialRho = 28;
  const initialBeta = 8/3;

  const [isAnimating, setIsAnimating] = useState<boolean>(true);

  const {
    sigma,
    rho,
    beta,
    dt,
    numTraces,
    // traceLength,
    showAxes,
    rotationSpeed,
    animationSpeed,
  } = useControls({
    sigma: { value: initialSigma, min: 0, max: 50 },
    rho: { value: initialRho, min: 0, max: 50 },
    beta: { value: initialBeta, min: 0, max: 20 },
    dt: { value: 0.01, min: 0.0001, max: 0.01 },
    numTraces: { value: 3, min: 1, max: 10, step: 1 },
    traceLength: {
      value: Math.log10(1000),
      min: Math.log10(100),
      max: Math.log10(100000),
      onChange: (value: number) => Math.pow(10, value)
    },
    showAxes: false,
    rotationSpeed: { value: 0.001, min: -0.05, max: 0.05 },
    animationSpeed: { value: 1, min: 0.1, max: 20 },
    resetParams: button(() => {
      // Reset parameters logic here
    }),
    toggleAnimation: button(() => setIsAnimating(!isAnimating)),
    clearTraces: button(() => {
      // Clear traces logic here
    })
  });

  const lorenzSystem = useMemo<LorenzTrace[]>(() => {
    const generateRandomStartPoints = (numPoints: number): LorenzPoint[] => {
      const points: LorenzPoint[] = [];
      const randX = Math.random() * 20;
      const randY = Math.random() * 20;
      const randZ = Math.random() * 20;
      for (let i = 0; i < numPoints; i++) {
        points.push({
          x: randX + (Math.random()) * 0.02,
          y: randY + (Math.random()) * 0.02,
          z: randZ + (Math.random()) * 0.02
        });
      }
      return points;
    };

    const startPoints = generateRandomStartPoints(numTraces);
    return Array(numTraces).fill(null).map((_, i) => ({
      positions: new Float32Array(100000 * 3),
      currentIndex: 0,
      x: startPoints[i % startPoints.length].x,
      y: startPoints[i % startPoints.length].y,
      z: startPoints[i % startPoints.length].z
    }));
  }, [numTraces]);

  const lorenzDerivatives = (x: number, y: number, z: number): LorenzPoint => {
    const dx = sigma * (y - x);
    const dy = x * (rho - z) - y;
    const dz = x * y - beta * z;
    x = dx;
    y = dy;
    z = dz
    return {x, y, z};
  };

  useFrame(() => {
    if (isAnimating) {
      lorenzSystem.forEach((trace, index) => {
        for (let i = 0; i < animationSpeed; i++) {
          const {x, y, z} = lorenzDerivatives(trace.x, trace.y, trace.z);
          trace.x += x * dt;
          trace.y += y * dt;
          trace.z += z * dt;

          trace.positions[trace.currentIndex * 3] = trace.x;
          trace.positions[trace.currentIndex * 3 + 1] = trace.y;
          trace.positions[trace.currentIndex * 3 + 2] = trace.z;

          trace.currentIndex = (trace.currentIndex + 1) % (trace.positions.length / 3);
        }

        if (lineRefs.current[index]) {
          lineRefs.current[index].geometry.attributes.position.needsUpdate = true;
        }
      });
    }

    if (meshRef.current) {
      meshRef.current.rotation.z += rotationSpeed;
    }
  });

  return (
    <group ref={meshRef}>
      {showAxes && <axesHelper args={[200]} />}
      {lorenzSystem.map((trace, index) => (
        <React.Fragment key={index}>
          <mesh position={[trace.x, trace.y, trace.z]}>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshBasicMaterial color={0x222222} />
          </mesh>
          <line ref={(el) => { if (el) lineRefs.current[index] = el; }}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={trace.positions.length / 3}
                array={trace.positions}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color={0x000000} />
          </line>
        </React.Fragment>
      ))}
    </group>
  );
}

function Controls(): JSX.Element {
  const { camera, gl } = useThree();
  return <orbitControls args={[camera, gl.domElement]} />;
}

export default function LorenzAttractor(): JSX.Element {
  const canvasStyle: React.CSSProperties = {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
  }

  return (
    <div style={canvasStyle}>
      <Canvas camera={{ position: [0, -100, 50], fov: 75 }}>
        <color attach="background" args={[1, 1, 1]} />
          <LorenzSystem />
        <Controls />
      </Canvas>
    </div>
  );
}
