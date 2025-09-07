// three.jsの基本設定
let scene, camera, renderer;
let hole, cubes = [];
let score = 0;
let arButton, scoreElement, joystickContainer, joystickHandle;

// ゲームの状態
let gameRunning = false;

// 初期化関数
function init() {
    // HTML要素の取得
    arButton = document.getElementById('ar-button');
    scoreElement = document.getElementById('score');
    joystickContainer = document.getElementById('joystick-container');
    joystickHandle = document.getElementById('joystick-handle');

    // シーンを作成
    scene = new THREE.Scene();

    // カメラを作成
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    // レンダラーを作成
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('game-canvas'),
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    // ライトを追加
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    // --- ゲームオブジェクトの作成 ---

    // ① プレイヤーの「穴」を作成
    // 見た目は黒い円。実際には当たり判定用の透明なオブジェクト。
    const holeGeometry = new THREE.CircleGeometry(0.2, 32); // 半径0.2m
    const holeMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        side: THREE.DoubleSide
    });
    hole = new THREE.Mesh(holeGeometry, holeMaterial);
    hole.rotation.x = -Math.PI / 2; // 床に水平になるように回転
    hole.position.set(0, 0.01, -1); // 目の前に初期配置
    scene.add(hole);


    // --- ARセッションの設定 ---
    arButton.addEventListener('click', () => {
        if (navigator.xr) {
            navigator.xr.requestSession('immersive-ar', {
                requiredFeatures: ['hit-test'] // 床を検出するために必要
            }).then(onSessionStarted);
        }
    });

    // ジョイスティックのイベントリスナーを設定
    setupJoystick();
}

// ARセッションが開始されたときの処理
function onSessionStarted(session) {
    arButton.style.display = 'none'; // ボタンを非表示
    joystickContainer.style.display = 'block'; // ジョイスティックを表示
    gameRunning = true;

    renderer.xr.setReferenceSpaceType('local');
    renderer.xr.setSession(session);

    // 床を検出するためのヒットテストを設定
    session.requestReferenceSpace('viewer').then((referenceSpace) => {
        session.requestHitTestSource({ space: referenceSpace }).then((source) => {
            hitTestSource = source;
        });
    });

    // レンダリングループを開始
    renderer.setAnimationLoop(render);
}

// ② 吸い込まれるキューブをランダムに配置する関数
function spawnCubes() {
    if (cubes.length >= 20) return; // 一度に存在するキューブは最大20個

    const cubeGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const cubeMaterial = new THREE.MeshStandardMaterial({
        color: Math.random() * 0xffffff
    });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);

    // 穴の周りにランダムに配置
    const angle = Math.random() * Math.PI * 2;
    const radius = 1 + Math.random() * 2; // 1mから3mの範囲
    cube.position.set(
        hole.position.x + Math.cos(angle) * radius,
        0.05, // 床から少し浮かせる
        hole.position.z + Math.sin(angle) * radius
    );
    scene.add(cube);
    cubes.push(cube);
}

// ③ 当たり判定とスコア加算
function checkCollisions() {
    const holeRadius = hole.geometry.parameters.radius;
    const cubesToRemove = [];

    cubes.forEach(cube => {
        // 穴とキューブの距離を計算
        const distance = hole.position.distanceTo(cube.position);

        if (distance < holeRadius) {
            // 当たったらキューブを消してスコアを増やす
            cubesToRemove.push(cube);
            score++;
            scoreElement.textContent = `Score: ${score}`;
        }
    });

    // 当たったキューブをシーンから削除
    cubesToRemove.forEach(cube => {
        scene.remove(cube);
        cubes = cubes.filter(c => c !== cube);
    });
}


// --- ジョイスティックのロジック ---
let joystickActive = false;
let joystickStartPos = { x: 0, y: 0 };
let joystickMoveVector = { x: 0, y: 0 };

function setupJoystick() {
    function onPointerDown(e) {
        joystickActive = true;
        joystickHandle.style.cursor = 'grabbing';
        joystickStartPos.x = e.clientX || e.touches[0].clientX;
        joystickStartPos.y = e.clientY || e.touches[0].clientY;
    }
    
    function onPointerMove(e) {
        if (!joystickActive) return;
        
        const currentX = e.clientX || e.touches[0].clientX;
        const currentY = e.clientY || e.touches[0].clientY;
        
        let deltaX = currentX - joystickStartPos.x;
        let deltaY = currentY - joystickStartPos.y;
        
        // ジョイスティックの移動範囲を制限
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance > 30) { // 最大半径30px
            deltaX = (deltaX / distance) * 30;
            deltaY = (deltaY / distance) * 30;
        }

        // ハンドルを動かす
        joystickHandle.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        
        // 移動ベクトルを更新（YがZ軸、XがX軸に対応）
        joystickMoveVector.x = deltaX / 30;
        joystickMoveVector.y = deltaY / 30;
    }

    function onPointerUp() {
        if (!joystickActive) return;

        joystickActive = false;
        joystickHandle.style.cursor = 'grab';
        joystickHandle.style.transform = `translate(0px, 0px)`;
        joystickMoveVector = { x: 0, y: 0 };
    }

    joystickContainer.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    
    joystickContainer.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);
}

// 穴を動かす処理
function moveHole() {
    // ジョイスティックの入力に応じて穴を移動させる
    // Y方向の入力がAR空間のZ軸（奥行き）に対応
    const speed = 0.01;
    hole.position.x += joystickMoveVector.x * speed;
    hole.position.z += joystickMoveVector.y * speed;
}

// 毎フレーム呼ばれるレンダリング関数
function render(timestamp, frame) {
    if (!gameRunning) return;

    // キューブを定期的に生成
    if (Math.random() < 0.02) {
        spawnCubes();
    }
    
    // 穴を動かす
    moveHole();

    // 当たり判定
    checkCollisions();

    // シーンをレンダリング
    renderer.render(scene, camera);
}

// 初期化関数を実行
init();