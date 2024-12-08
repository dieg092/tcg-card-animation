import { createRoot } from 'react-dom/client';
import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { TextureLoader } from 'three';
import './styles.css';

function Card({ frontImage, backImage, foilTexture }) {
  const meshRef = useRef();
  const lightRef = useRef(); // Referencia a la luz direccional
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [textures, setTextures] = useState({ front: null, back: null, foil: null });

  const { size } = useThree();
  const scale = Math.min(size.width / 4, size.height / 6) / 200;

  useEffect(() => {
    const loader = new TextureLoader();

    loader.load(frontImage, (texture) => {
      setTextures((prev) => ({ ...prev, front: texture }));
    });
    loader.load(backImage, (texture) => {
      setTextures((prev) => ({ ...prev, back: texture }));
    });
    loader.load(foilTexture, (texture) => {
      setTextures((prev) => ({ ...prev, foil: texture }));
    });
  }, [frontImage, backImage, foilTexture]);

  const handleMouseMove = (event) => {
    if (isDragging && dragStart) {
      const deltaX = (event.clientX - dragStart.x) * 0.01;
      const deltaY = (event.clientY - dragStart.y) * 0.01;

      setRotation((prev) => ({
        x: Math.max(-Math.PI / 13, Math.min(Math.PI / 13, prev.x + deltaY)),
        y: Math.max(-Math.PI / 5, Math.min(Math.PI / 5, prev.y + deltaX)),
      }));

      setDragStart({ x: event.clientX, y: event.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);

    // Volver a la posición inicial con animación suave
    const duration = 0.5; // Duración en segundos
    const steps = 30; // Número de pasos
    const interval = duration / steps;

    let currentStep = 0;
    const initialRotation = { ...rotation };

    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;

      setRotation({
        x: initialRotation.x * (1 - progress),
        y: initialRotation.y * (1 - progress),
      });

      if (currentStep >= steps) {
        clearInterval(timer);
        setRotation({ x: 0, y: 0 }); // Asegurar posición centrada
      }
    }, interval * 200);
  };

  const onPointerDown = (event) => {
    setIsDragging(true);
    setDragStart({ x: event.clientX, y: event.clientY });
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart]);

  useFrame(() => {
    if (meshRef.current && lightRef.current) {
      meshRef.current.rotation.x = rotation.x;
      meshRef.current.rotation.y = rotation.y;

      // Ajustar la posición de la luz para que ilumine correctamente en todos los rangos
      const maxRange = 2; // Define el rango de movimiento de la luz
      lightRef.current.position.set(
        rotation.y * maxRange,
        rotation.x * maxRange,
        2 + Math.abs(rotation.x) // Ajustar el eje Z según el ángulo de inclinación
      );
      lightRef.current.target.position.set(0, 0, 0);
      lightRef.current.target.updateMatrixWorld();
    }
  });

  return (
    <group ref={meshRef} scale={[scale, scale, 1]}>



      {/* Luz direccional dinámica */}
      <directionalLight
        ref={lightRef}
        position={[0, 0, 2]} // Posición inicial de la luz
        intensity={0.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.}
        shadow-camera-far={10}
      />

      {/* Front Face */}
      <mesh position={[0, 0, 0.01]} onPointerDown={onPointerDown}>
        <planeGeometry args={[3, 4.5]} />
        {textures.front && (
          <meshStandardMaterial
            map={textures.front}
            metalness={0.6}
            roughness={0.3}
            transparent
          />
        )}
      </mesh>

      {/* Back Face */}
      <mesh position={[0, 0, -0.01]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[3, 4.5]} />
        {textures.back && (
          <meshStandardMaterial
            map={textures.back}
            alphaMap={textures.back} // Usa el canal alpha para transparencia
            transparent
            metalness={0.6}
            roughness={0.3}
          />
        )}
      </mesh>
    </group>
  );
}

function ResponsiveCamera() {
  const { camera, size } = useThree();

  useEffect(() => {
    const aspect = size.width / size.height;
    const fov = 50;
    const distance = 4.5 / (2 * Math.tan((fov * Math.PI) / 360));

    camera.aspect = aspect;
    camera.fov = fov;
    camera.position.set(0, 0, distance);
    camera.updateProjectionMatrix();
  }, [camera, size]);

  return null;
}

createRoot(document.getElementById('root')).render(
  <Canvas
    gl={{ alpha: false }}
    shadows
    style={{ backgroundColor: '#ffffff' }}
  >
    <ResponsiveCamera />

    {/* Luz ambiental para proporcionar iluminación base */}
    <ambientLight intensity={1.5} />

    {/* Luz hemisférica para iluminar suavemente la escena */}
    <hemisphereLight
      skyColor="#ffffff"
      groundColor="#aaaaaa"
      intensity={0.8}
    />

    {/* Carta con luz direccional dinámica */}
    <Card
      frontImage="/public/charizard.png"
      backImage="https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fpre00.deviantart.net%2Fcb44%2Fth%2Fpre%2Fi%2F2016%2F259%2F5%2Fa%2Fpokemon_card_backside_in_high_resolution_by_atomicmonkeytcg-dah43cy.png&f=1&nofb=1&ipt=63ab100742c7cbed564c04f3ba277c1ae18ea9eaa1d22c2abdfa1378870af419&ipo=images"
      foilTexture="/public/foil3.jpg"
    />
  </Canvas>
);
