// --- グローバル変数 (変更なし) ---
let scene, camera, renderer;
let hole, cubes = [];
let score = 0;
let arButton, scoreElement, joystickContainer, joystickHandle, uiContainer;
let hitTestSource = null;
let gameRunning = false;
let joystickActive = false;
let joystickStartPos = { x: 0, y: 0 };
let joystickMoveVector = { x: 0, y: 0 };


// --- 【最重要】修正後の初期化ロジック ---

function init() {
    // 最初に表示される許可画面の要素を取得
    const sensorContents = document.getElementById('sensor_contents');
    const permissionButton = document.getElementById('permission-button');

    // 「許可してはじめる」ボタンにクリックイベントを追加
    permissionButton.addEventListener('click', async () => {
        // iOS 13以降のSafariでのみ存在する関数かチェック
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            try {
                const permissionState = await DeviceMotionEvent.requestPermission();
                if (permissionState === 'granted') {
                    // 許可されたらゲームの準備を開始
                    prepareGame();
                } else {
                    alert('AR体験にはモーションセンサーの許可が必要です。');
                }
            } catch (error) {
                // ユーザーがダイアログを無視した場合など
                console.error('センサー許可リクエスト中にエラー:', error);
                alert('センサーの許可を取得できませんでした。');
            }
        } else {
            // AndroidやPCなど、この許可プロセスが不要な環境
            prepareGame();
        }
    });
}

// センサー許可が得られた後に呼び出される、ゲームの準備関数
function prepareGame() {
    // 許可画面を非表示にする
    document.getElementById('sensor_contents').classList.add('hidden');

    // HTML要素の取得
    arButton = document.getElementById('ar-button');
    scoreElement = document.getElementById('score');
    joystickContainer = document.getElementById('joystick-container');
    joystickHandle = document.getElementById('joystick-handle');
    uiContainer = document.getElementById('ui-container');

    // シーン、カメラ、レンダラーなどの基本設定
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('game-canvas'),
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    // ライト
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    // 穴
    const holeGeometry = new THREE.CircleGeometry(0.2, 32);
    const holeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    hole = new THREE.Mesh(holeGeometry, holeMaterial);
    hole.rotation.x = -Math.PI / 2;
    hole.position.set(0, 0.01, -1);
    hole.visible = false;
    scene.add(hole);

    // ジョイスティックの設定
    setupJoystick();
    
    // ARサポート状況を確認してUIを表示
    checkARSupport();
}

// ARサポート状況を確認する関数
async function checkARSupport() {
    // ゲームUIを表示状態にする
    arButton.classList.remove('hidden');
    uiContainer.classList.remove('hidden');

    if (navigator.xr) {
        try {
            const supported = await navigator.xr.isSessionSupported('immersive-ar');
            if (supported) {
                arButton.textContent = "ARを開始";
                arButton.addEventListener('click', startARSession);
            } else {
                arButton.textContent = "このデバイスはARに非対応です";
                arButton.disabled = true;
            }
        } catch (e) {
            arButton.textContent = "ARサポートの確認中にエラー";
            arButton.disabled = true;
        }
    } else {
        arButton.textContent = "WebXR APIがありません";
        arButton.disabled = true;
    }
}


// --- 以降の関数 (startARSession, onSessionStarted など) は変更なし ---

function startARSession() { /* ...変更なし... */
    navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['hit-test'] })
        .then(onSessionStarted)
        .catch(err => {
            console.error("ARセッションの開始に失敗しました:", err);
            alert(`ARセッションの開始に失敗しました。エラー: ${err.message}`);
        });
}
function onSessionStarted(session) { /* ...変更なし... */ 
    arButton.style.display = 'none'; // 直接スタイルを操作
    joystickContainer.style.display = 'block';
    gameRunning = true;
    renderer.xr.setReferenceSpaceType('local');
    renderer.xr.setSession(session);
    session.requestReferenceSpace('viewer').then((referenceSpace) => {
        session.requestHitTestSource({ space: referenceSpace }).then((source) => {
            hitTestSource = source;
        });
    });
    session.addEventListener('end', () => {
        gameRunning = false;
        arButton.style.display = 'block';
        joystickContainer.style.display = 'none';
    });
    renderer.setAnimationLoop(render);
}
function spawnCubes() { /* ...変更なし... */ }
function checkCollisions() { /* ...変更なし... */ }
function setupJoystick() { /* ...変更なし... */ }
function moveHole() { /* ...変更なし... */ }
function render(timestamp, frame) { /* ...変更なし... */ }

// 最初にinit関数を呼び出す
init();
