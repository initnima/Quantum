document.addEventListener('DOMContentLoaded', () => {
    if (window.Telegram && Telegram.WebApp) {
        Telegram.WebApp.ready();
    }

    const tg = window.Telegram.WebApp;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });

    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const loader = new THREE.TextureLoader();
    const planetTexture = loader.load('textureplanet.jpg');
    const backgroundTexture = loader.load('bg.jpg');

    const planetGeometry = new THREE.SphereGeometry(5, 32, 32);
    let planetMaterial = new THREE.MeshPhongMaterial({ map: planetTexture });
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    scene.add(planet);

    scene.background = backgroundTexture;

    camera.position.z = 15;

    const light = new THREE.PointLight(0xffffff, 1, 100);
    light.position.set(10, 10, 10);
    scene.add(light);

    const miningAnimation = document.createElement('div');
    miningAnimation.className = 'mining-animation';
    document.body.appendChild(miningAnimation);

    class Player {
        constructor() {
            this.energy = parseInt(localStorage.getItem('energy')) || 0;
            this.colony = parseInt(localStorage.getItem('colony')) || 0;
            this.communication = parseInt(localStorage.getItem('communication')) || 0;
            this.water = parseInt(localStorage.getItem('water')) || 0;
            this.food = parseInt(localStorage.getItem('food')) || 0;
            this.coins = parseFloat(localStorage.getItem('coins')) || 0;
            this.level = parseInt(localStorage.getItem('level')) || 1;
            this.earnRate = 0.1;
            this.upgradeCosts = {
                energy: parseFloat(localStorage.getItem('upgradeCostEnergy')) || 0.4,
                colony: parseFloat(localStorage.getItem('upgradeCostColony')) || 0.4,
                communication: parseFloat(localStorage.getItem('upgradeCostCommunication')) || 0.4,
                water: parseFloat(localStorage.getItem('upgradeCostWater')) || 0.4,
                food: parseFloat(localStorage.getItem('upgradeCostFood')) || 0.4
            };
            this.lastLoginTime = parseInt(localStorage.getItem('lastLoginTime')) || Date.now();
            this.isMining = JSON.parse(localStorage.getItem('isMining')) || false;
            this.miningEndTime = parseInt(localStorage.getItem('miningEndTime')) || 0;

            this.calculateOfflineEarnings();

            setInterval(() => {
                this.earnCoins();
            }, 1000);

            this.checkMiningStatus();

            this.updateUI();
        }

        calculateOfflineEarnings() {
            const now = Date.now();
            const timeElapsed = (now - this.lastLoginTime) / 300000;
            const offlineEarnings = timeElapsed * this.earnRate;
            this.coins += offlineEarnings;
            this.lastLoginTime = now;
            localStorage.setItem('lastLoginTime', now);
            this.updateUI();
        }

        earnCoins() {
            this.coins += this.earnRate;
            localStorage.setItem('coins', this.coins);
            this.updateUI();
        }

        upgrade(parameter) {
            const cost = this.upgradeCosts[parameter];
            if (this[parameter] !== undefined && this.coins >= cost) {
                this[parameter]++;
                this.coins -= cost;
                this.upgradeCosts[parameter] *= 2;
                localStorage.setItem('coins', this.coins);
                localStorage.setItem(parameter, this[parameter]);
                localStorage.setItem('upgradeCost' + parameter.charAt(0).toUpperCase() + parameter.slice(1), this.upgradeCosts[parameter]);
                this.updateUI();
                this.levelUp();
            }
        }

        levelUp() {
            this.level++;
            this.earnRate += 0.1;
            localStorage.setItem('level', this.level);
            this.changePlanetTexture();
        }

        changePlanetTexture() {
            planetMaterial.map = loader.load('textureplanet.jpg');
            planetMaterial.needsUpdate = true;
        }

        updateUI() {
            document.getElementById('energy').innerText = this.energy;
            document.getElementById('colony').innerText = this.colony;
            document.getElementById('communication').innerText = this.communication;
            document.getElementById('water').innerText = this.water;
            document.getElementById('food').innerText = this.food;
            document.getElementById('coins').innerText = this.coins.toFixed(1);
            document.getElementById('level').innerText = this.level;
            document.getElementById('earnRate').innerText = this.earnRate.toFixed(1);
            this.updateUpgradeCostText();
        }

        startMining() {
            this.isMining = true;
            this.miningEndTime = Date.now() + 6 * 60 * 60 * 1000;
            localStorage.setItem('isMining', JSON.stringify(this.isMining));
            localStorage.setItem('miningEndTime', this.miningEndTime);
            this.showMiningAnimation();
        }

        checkMiningStatus() {
            const now = Date.now();
            if (this.isMining && now >= this.miningEndTime) {
                this.isMining = false;
                localStorage.setItem('isMining', JSON.stringify(this.isMining));
                this.coins += 100;
                localStorage.setItem('coins', this.coins);
            }
            this.updateUI();
        }

        updateUpgradeCostText() {
            const parameter = document.getElementById('upgradeSelect').value;
            document.getElementById('upgradeCost').innerText = this.upgradeCosts[parameter].toFixed(1);
        }

        showMiningAnimation() {
            miningAnimation.style.display = 'block';
            miningAnimation.style.top = `${window.innerHeight / 2 - 25}px`;
            miningAnimation.style.left = `${window.innerWidth / 2 - 25}px`;
            setTimeout(() => {
                miningAnimation.style.display = 'none';
            }, 2000);
        }
    }

    const player = new Player();

    function animate() {
        requestAnimationFrame(animate);
        planet.rotation.y += 0.01;
        renderer.render(scene, camera);
    }

    animate();

    const addButtonEventListener = (id, callback) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', callback);
            button.addEventListener('touchstart', (event) => {
                event.preventDefault();
                callback();
            }, { passive: false });
        }
    };

    addButtonEventListener('toggleMenu', () => {
        document.getElementById('ui').classList.remove('open');
        document.getElementById('upgradePage').classList.add('open');
    });

    addButtonEventListener('toggleMenu2', () => {
        player.startMining();
    });

    addButtonEventListener('upgradeButton', () => {
        const parameter = document.getElementById('upgradeSelect').value;
        player.upgrade(parameter);
    });

    document.getElementById('upgradeSelect').addEventListener('change', () => {
        player.updateUpgradeCostText();
    });

    addButtonEventListener('toggleMenuRefferals', () => {
        document.getElementById('ui').classList.remove('open');
        document.getElementById('referralPage').classList.add('open');
    });

    addButtonEventListener('toggleMenuTasks', () => {
        document.getElementById('ui').classList.remove('open');
        document.getElementById('tasksPage').classList.add('open');
    });

    addButtonEventListener('backToMain', () => {
        window.location.href = 'index.html';
    });

    addButtonEventListener('backToMainFromReferral', () => {
        window.location.href = 'index.html';
    });

    addButtonEventListener('backToMainFromTasks', () => {
        window.location.href = 'index.html';
    });
});
