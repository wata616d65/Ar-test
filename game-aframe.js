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
        this.sceneEl = this.el.sceneEl;

        // ARセッションが開始されたらジョイスティックを表示
        this.sceneEl.addEventListener('enter-vr', () => {
            document.getElementById('joystick-container').style.display = 'block';
        });
    },

    // tickは毎フレーム呼ばれる更新関数 (three.jsのrenderループに相当)
    tick: function () {
        // 定期的にキューブを生成
        if (Math.random() < 0.02 && cubes.length < 20) {
            this.spawnCube();
        }

        this.checkCollisions();
    },

    spawnCube: function () {
        const cube = document.createElement('a-box');
        cube.setAttribute('color', `#${Math.floor(Math.random()*16777215).toString(16)}`);
        cube.setAttribute('height', 0.1);
        cube.setAttribute('width', 0.1);
        cube.setAttribute('depth', 0.1);
        
        // 穴の周りのランダムな位置に配置
        const angle = Math.random() * Math.PI * 2;
        const radius = 1 + Math.random() * 2;
        const holePosition = this.hole.object3D.position;
        cube.setAttribute('position', {
            x: holePosition.x + Math.cos(angle) * radius,
            y: 0.05, // 床から少し浮かせる
            z: holePosition.z + Math.sin(angle) * radius
        });

        this.sceneEl.appendChild(cube);
        cubes.push(cube);
    },

    checkCollisions: function () {
        const holePosition = new THREE.Vector3();
        this.hole.object3D.getWorldPosition(holePosition); // 穴のワールド座標を取得
        const holeRadius = this.hole.querySelector('a-cylinder').getAttribute('radius');

        for (let i = cubes.length - 1; i >= 0; i--) {
            const cube = cubes[i];
            const cubePosition = new THREE.Vector3();
            cube.object3D.getWorldPosition(cubePosition); // キューブのワールド座標を取得

            if (holePosition.distanceTo(cubePosition) < holeRadius) {
                // 当たったらキューブを消してスコアを更新
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
        this.joystickContainer = document.getElementById('joystick-container');
        this.joystickHandle = document.getElementById('joystick-handle');
        this.moveVector = { x: 0, y: 0 };
        this.speed = 0.01;

        let joystickActive = false;
        let startPos = { x: 0, y: 0 };

        const onPointerDown = (e) => {
            joystickActive = true;
            this.joystickHandle.style.cursor = 'grabbing';
            startPos.x = e.clientX || e.touches[0].clientX;
            startPos.y = e.clientY || e.touches[0].clientY;
        };

        const onPointerMove = (e) => {
            if (!joystickActive) return;
            const currentX = e.clientX || e.touches[0].clientX;
            const currentY = e.clientY || e.touches[0].clientY;
            let deltaX = currentX - startPos.x;
            let deltaY = currentY - startPos.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            if (distance > 30) {
                deltaX = (deltaX / distance) * 30;
                deltaY = (deltaY / distance) * 30;
            }
            this.joystickHandle.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            this.moveVector.x = deltaX / 30;
            this.moveVector.y = deltaY / 30;
        };

        const onPointerUp = () => {
            if (!joystickActive) return;
            joystickActive = false;
            this.joystickHandle.style.cursor = 'grab';
            this.joystickHandle.style.transform = `translate(0px, 0px)`;
            this.moveVector = { x: 0, y: 0 };
        };

        this.joystickContainer.addEventListener('mousedown', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);
        this.joystickContainer.addEventListener('touchstart', onPointerDown, { passive: false });
        window.addEventListener('touchmove', onPointerMove, { passive: false });
        window.addEventListener('touchend', onPointerUp);
    },

    tick: function () {
        // ジョイスティックの入力に応じて穴の位置を更新
        const el = this.el; // elは、このコンポーネントがアタッチされているエンティティ(#hole)
        el.object3D.position.x += this.moveVector.x * this.speed;
        el.object3D.position.z += this.moveVector.y * this.speed;
    }
});
