// グローバル変数
let score = 0;
const cubes = [];

/*
 * ゲーム全体の管理とキューブの生成を行うコンポーネント
 */
AFRAME.registerComponent('game-manager', {
    init: function () {
        this.hole = document.getElementById('hole');
        this.scoreElement = document.getElementById('score');
        this.marker = document.querySelector('a-marker');

        // 【変更】マーカーが認識されたらジョイスティックを表示
        this.marker.addEventListener('markerFound', () => {
            console.log('Marker Found!');
            document.getElementById('joystick-container').style.display = 'block';
        });
    },

    tick: function () {
        if (this.marker.object3D.visible) { // マーカーが見えている時だけ処理
            if (Math.random() < 0.02 && cubes.length < 20) {
                this.spawnCube();
            }
            this.checkCollisions();
        }
    },

    spawnCube: function () {
        const cube = document.createElement('a-box');
        cube.setAttribute('color', `#${Math.floor(Math.random()*16777215).toString(16)}`);
        cube.setAttribute('height', 0.1);
        cube.setAttribute('width', 0.1);
        cube.setAttribute('depth', 0.1);
        
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.3 + Math.random() * 0.5; // マーカーの範囲内に収まるように調整
        // AR.jsではYが上なので、y座標を調整
        cube.setAttribute('position', {
            x: Math.cos(angle) * radius,
            y: 0.05,
            z: Math.sin(angle) * radius
        });

        // マーカーの子要素としてキューブを追加
        this.marker.appendChild(cube);
        cubes.push(cube);
    },

    checkCollisions: function () {
        const holePosition = new THREE.Vector3();
        this.hole.object3D.getWorldPosition(holePosition);
        const holeRadius = this.hole.querySelector('a-cylinder').getAttribute('radius');

        for (let i = cubes.length - 1; i >= 0; i--) {
            const cube = cubes[i];
            const cubePosition = new THREE.Vector3();
            cube.object3D.getWorldPosition(cubePosition);

            if (holePosition.distanceTo(cubePosition) < holeRadius) {
                cube.parentNode.removeChild(cube);
                cubes.splice(i, 1);
                score++;
                this.scoreElement.textContent = `Score: ${score}`;
            }
        }
    }
});


/*
 * 穴の移動をジョイスティックで制御するコンポーネント
 */
AFRAME.registerComponent('hole-controls', {
    init: function () {
        // ... (このコンポーネントの中身は一切変更ありません) ...
        this.joystickContainer = document.getElementById('joystick-container');
        this.joystickHandle = document.getElementById('joystick-handle');
        this.moveVector = { x: 0, y: 0 };
        this.speed = 0.005; // スピードを少し調整
        let joystickActive = false;
        let startPos = { x: 0, y: 0 };
        const onPointerDown = (e) => { /* ... */ };
        const onPointerMove = (e) => { /* ... */ };
        const onPointerUp = () => { /* ... */ };
        this.joystickContainer.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);
        this.joystickContainer.addEventListener('touchstart', onPointerDown, { passive: false });
        window.addEventListener('touchmove', onPointerMove, { passive: false });
        window.addEventListener('touchend', onPointerUp);
    },

    tick: function () {
        const el = this.el;
        // AR.jsではYが高さになるので、XとZ平面で動かす
        el.object3D.position.x += this.moveVector.x * this.speed;
        el.object3D.position.z -= this.moveVector.y * this.speed; // Z軸の向きを調整
    }
});
