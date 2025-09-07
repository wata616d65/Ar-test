const canvas = document.getElementById('renderCanvas');
const scoreElement = document.getElementById('score');
const engine = new BABYLON.Engine(canvas, true);

let score = 0;
let hole = null;
const cubes = [];

// シーンを作成
const createScene = async function () {
    const scene = new BABYLON.Scene(engine);
    // カメラとライトはARモードでは自動的に管理されるので、簡単なものでOK
    const camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -10), scene);
    camera.setTarget(BABYLON.Vector3.Zero());
    const light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);

    // --- AR機能の設定 (ここがBabylon.jsの凄いところ) ---
    // WebXRExperienceHelper を使うと、ARの定型的な処理をすべて自動化できる
    const xr = await scene.createDefaultXRExperienceAsync({
        uiOptions: {
            sessionMode: 'immersive-ar',
            // ARセッションの開始ボタンを画面右下に自動で表示してくれる
        },
        optionalFeatures: true // 床検出などの機能を有効にする
    });

    // プレイヤーの「穴」を作成
    hole = BABYLON.MeshBuilder.CreateCylinder("hole", {height: 0.01, diameter: 0.4}, scene);
    const holeMaterial = new BABYLON.StandardMaterial("holeMat", scene);
    holeMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0); // 色を黒に
    hole.material = holeMaterial;
    hole.setEnabled(false); // 最初は非表示

    // 床が検出（ヒットテスト）された時の処理を設定
    xr.baseExperience.featuresManager.enableFeature(BABYLON.WebXRHitTest, "latest").onHitTestResultObservable.add((results) => {
        if (results.length > 0 && !hole.isEnabled()) {
            // 最初に床を検出したら、その場所に穴を表示する
            const hitPoint = results[0].transformationMatrix.getTranslation();
            hole.position.copyFrom(hitPoint);
            hole.setEnabled(true);
            
            // ゲームループを開始
            scene.onBeforeRenderObservable.add(gameLoop);
        }
    });
    
    return scene;
};

// 毎フレーム実行されるゲームループ
function gameLoop() {
    // 定期的にキューブを生成
    if (Math.random() < 0.02 && cubes.length < 20) {
        spawnCube();
    }
    
    // 当たり判定
    checkCollisions();
    
    // TODO: ここにジョイスティックでの穴の移動ロジックを追加
}

function spawnCube() {
    const cube = BABYLON.MeshBuilder.CreateBox("cube" + cubes.length, {size: 0.1});
    const cubeMaterial = new BABYLON.StandardMaterial("cubeMat", cube.getScene());
    cubeMaterial.diffuseColor = BABYLON.Color3.Random(); // ランダムな色
    cube.material = cubeMaterial;

    const angle = Math.random() * Math.PI * 2;
    const radius = 1 + Math.random() * 2;
    cube.position.set(
        hole.position.x + Math.cos(angle) * radius,
        0.05, // 床から少し浮かせる
        hole.position.z + Math.sin(angle) * radius
    );
    cubes.push(cube);
}

function checkCollisions() {
    const holeRadius = 0.2;
    const cubesToRemove = [];

    for (const cube of cubes) {
        // 穴とキューブの距離を計算
        const distance = BABYLON.Vector3.Distance(hole.position, cube.position);
        if (distance < holeRadius) {
            cubesToRemove.push(cube);
            score++;
            scoreElement.textContent = `Score: ${score}`;
        }
    }

    // 当たったキューブを削除
    for (const cube of cubesToRemove) {
        cube.dispose();
        const index = cubes.indexOf(cube);
        if (index > -1) {
            cubes.splice(index, 1);
        }
    }
}


// --- 実行開始 ---
createScene().then(scene => {
    engine.runRenderLoop(() => {
        scene.render();
    });
});
window.addEventListener("resize", function () {
    engine.resize();
});