// three.jsの基本設定
let scene, camera, renderer;
let hole, cubes = [];
let score = 0;
let arButton, scoreElement, joystickContainer, joystickHandle, uiContainer;
let hitTestSource = null;

// ゲームの状態
let gameRunning = false;

// --- ジョイスティックのロジック ---
let joystickActive = false;
let joystickStartPos = { x: 0, y: 0 };
let joystickMoveVector = { x: 0, y: 0 };

// 初期化関数
async function init() {
    console.log("1. 初期化開始");

    // HTML要素の取得
    arButton = document.getElementById('ar-button');
    scoreElement = document.getElementById('score');
    joystickContainer = document.getElementById('joystick-container');
    joystickHandle = document.getElementById('joystick-handle');
    uiContainer = document.getElementById('ui-container');

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

    // プレイヤーの「穴」を作成
    const holeGeometry = new THREE.CircleGeometry(0.2, 32);
    const holeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    hole = new THREE.Mesh(holeGeometry, holeMaterial);
    hole.rotation.x = -Math.PI / 2;
    hole.position.set(0, 0.01, -1); // 初期位置はカメラの少し前
    hole.visible = false; // 最初は非表示
    scene.add(hole);

    // --- ARサポート状況の確認 ---
    if (navigator.xr) {
        try {
            const supported = await navigator.xr.isSessionSupported('immersive-ar');
            if (supported) {
                arButton.textContent = "ARを開始";
                arButton.addEventListener('click', startARSession);
            } else {
                arButton.textContent = "AR非対応です";
                arButton.disabled = true;
            }
        } catch (e) {
            console.error("isSessionSupportedの確認中にエラー:", e);
            arButton.textContent = "AR非対応です";
            arButton.disabled = true;
        }
    } else {
        arButton.textContent = "WebXR APIがありません";
        arButton.disabled = true;
    }

    setupJoystick();
    console.log("2. 初期化完了");
}

// ARセッションを開始する
function startARSession() {
    console.log("3. ARセッション開始ボタンがクリックされました");
    navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test']
    }).then(onSessionStarted).catch(err => {
        // 【重要】セッション開始失敗時のエラーハンドリング
        console.error("ARセッションの開始に失敗しました:", err);
        alert(`ARセッションの開始に失敗しました。エラー: ${err.message}`);
        arButton.style.display = 'block';
    });
}

// ARセッションが正常に開始されたときの処理
function onSessionStarted(session) {
    console.log("4. ARセッションが正常に開始されました");
    arButton.style.display = 'none';
    joystickContainer.style.display = 'block';
    uiContainer.style.display = 'block';
    gameRunning = true;

    renderer.xr.setReferenceSpaceType('local');
    renderer.xr.setSession(session);

    session.requestReferenceSpace('viewer').then((referenceSpace) => {
        session.requestHitTestSource({ space: referenceSpace }).then((source) => {
            hitTestSource = source;
        });
    });
    
    session.addEventListener('end', () => {
        console.log("ARセッションが終了しました");
        gameRunning = false;
        arButton.style.display = 'block';
        joystickContainer.style.display = 'none';
    });

    // レンダリングループを開始
    renderer.setAnimationLoop(render);
    console.log("5. レンダリングループを開始");
}

function spawnCubes() {
    if (cubes.length >= 20) return;
    const cubeGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const cubeMaterial = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);

    const angle = Math.random() * Math.PI * 2;
    const radius = 1 + Math.random() * 2;
    cube.position.set(
        hole.position.x + Math.cos(angle) * radius,
        0.05,
        hole.position.z + Math.sin(angle) * radius
    );
    scene.add(cube);
    cubes.push(cube);
}

function checkCollisions() {
    if (!hole.visible) return;
    const holeRadius = hole.geometry.parameters.radius * hole.scale.x;
    const cubesToRemove = [];

    cubes.forEach(cube => {
        const distance = hole.position.distanceTo(cube.position);
        if (distance < holeRadius) {
            cubesToRemove.push(cube);
            score++;
            scoreElement.textContent = `Score: ${score}`;
        }
    });

    cubesToRemove.forEach(cube => {
        scene.remove(cube);
        cubes = cubes.filter(c => c !== cube);
    });
}

function setupJoystick() {
    // ... (ジョイスティックのコードは変更なし) ...
    function onPointerDown(e) { joystickActive = true; joystickHandle.style.cursor = 'grabbing'; joystickStartPos.x = e.clientX || e.touches[0].clientX; joystickStartPos.y = e.clientY || e.touches[0].clientY; }
    function onPointerMove(e) { if (!joystickActive) return; const currentX = e.clientX || e.touches[0].clientX; const currentY = e.clientY || e.touches[0].clientY; let deltaX = currentX - joystickStartPos.x; let deltaY = currentY - joystickStartPos.y; const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY); if (distance > 30) { deltaX = (deltaX / distance) * 30; deltaY = (deltaY / distance) * 30; } joystickHandle.style.transform = `translate(${deltaX}px, ${deltaY}px)`; joystickMoveVector.x = deltaX / 30; joystickMoveVector.y = deltaY / 30; }
    function onPointerUp() { if (!joystickActive) return; joystickActive = false; joystickHandle.style.cursor = 'grab'; joystickHandle.style.transform = `translate(0px, 0px)`; joystickMoveVector = { x: 0, y: 0 }; }
    joystickContainer.addEventListener('mousedown', onPointerDown); window.addEventListener('mousemove', onPointerMove); window.addEventListener('mouseup', onPointerUp);
    joystickContainer.addEventListener('touchstart', onPointerDown, { passive: false }); window.addEventListener('touchmove', onPointerMove, { passive: false }); window.addEventListener('touchend', onPointerUp);
}

function moveHole() {
    if (!hole.visible) return;
    const speed = 0.01;
    hole.position.x += joystickMoveVector.x * speed;
    hole.position.z += joystickMoveVector.y * speed;
}

// 毎フレーム呼ばれるレンダリング関数
function render(timestamp, frame) {
    if (!gameRunning) return;

    if (frame && hitTestSource) {
        const hitTestResults = frame.getHitTestResults(hitTestSource);
        if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const referenceSpace = renderer.xr.getReferenceSpace();
            const pose = hit.getPose(referenceSpace);
            if (!hole.visible) {
                // 最初の床検出で穴を表示し、位置を確定
                hole.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
                hole.visible = true;
                 console.log("6. 床を検出し、穴を表示しました");
            }
        }
    }

    if (hole.visible) {
        if (Math.random() < 0.02) spawnCubes();
        moveHole();
        checkCollisions();
    }
    
    renderer.render(scene, camera);
}

// 初期化関数を実行
init();
