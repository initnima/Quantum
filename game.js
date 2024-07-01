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
            this.id = localStorage.getItem('playerId') || this.generatePlayerId();
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
            this.referrals = JSON.parse(localStorage.getItem('referrals')) || [];
            this.referralsData = JSON.parse(localStorage.getItem('referralsData')) || {};

            this.calculateOfflineEarnings();

            setInterval(() => {
                this.earnCoins();
            }, 1000);

            setInterval(() => {
                this.updateMiningTimer();
            }, 1000);

            this.checkMiningStatus();

            this.updateUI();
            this.savePlayerData();
        }

        generatePlayerId() {
            const playerId = Math.random().toString(36).substring(2, 15);
            localStorage.setItem('playerId', playerId);
            return playerId;
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
            document.getElementById('coinBalanceValue').innerText = this.coins.toFixed(1);
            this.updateUpgradeCostText();
            this.updateMiningTimer();
        }

        startMining() {
            this.isMining = true;
            this.miningEndTime = Date.now() + 6 * 60 * 60 * 1000;
            localStorage.setItem('isMining', JSON.stringify(this.isMining));
            localStorage.setItem('miningEndTime', this.miningEndTime);
            this.showMiningAnimation();
            this.updateMiningTimer();
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

        updateMiningTimer() {
            const now = Date.now();
            const timeRemaining = this.miningEndTime - now;
            if (timeRemaining > 0) {
                const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
                const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
                document.getElementById('miningTime').innerText = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            } else {
                document.getElementById('miningTime').innerText = '00:00:00';
            }
        }

        showMiningAnimation() {
            miningAnimation.style.display = 'block';
            miningAnimation.style.top = `${window.innerHeight / 2 - 25}px`;
            miningAnimation.style.left = `${window.innerWidth / 2 - 25}px`;
            setTimeout(() => {
                miningAnimation.style.display = 'none';
            }, 2000);
        }

        generateReferralLink() {
            const referralCode = Math.random().toString(36).substring(2, 15);
            this.referrals.push(referralCode);
            localStorage.setItem('referrals', JSON.stringify(this.referrals));
            return `${window.location.origin}?ref=${referralCode}`;
        }

        checkReferral() {
            const urlParams = new URLSearchParams(window.location.search);
            const ref = urlParams.get('ref');
            if (ref) {
                const referredPlayer = localStorage.getItem(`referral_${ref}`);
                if (!referredPlayer) {
                    this.coins += 150; // Reward for being referred
                    localStorage.setItem('coins', this.coins);

                    // Save referred player data
                    const referrer = {
                        referrerId: ref,
                        id: this.id,
                        coinsMined: this.coins
                    };
                    localStorage.setItem(`referral_${ref}`, JSON.stringify(referrer));

                    // Update referrer's data
                    const referrerData = this.referralsData[ref] || { totalCoins: 0, referrals: [] };
                    referrerData.totalCoins += 150;
                    referrerData.referrals.push(referrer);
                    this.referralsData[ref] = referrerData;
                    localStorage.setItem('referralsData', JSON.stringify(this.referralsData));
                    this.updateUI();
                }
                // Redirect to referral page
                document.getElementById('ui').classList.remove('open');
                document.getElementById('referralPage').classList.add('open');
                this.updateReferralPage();
            }
        }

        savePlayerData() {
            const playerData = JSON.parse(localStorage.getItem('playerData')) || [];
            const existingPlayerIndex = playerData.findIndex(player => player.id === this.id);
            if (existingPlayerIndex >= 0) {
                playerData[existingPlayerIndex] = this.getPlayerData();
            } else {
                playerData.push(this.getPlayerData());
            }
            localStorage.setItem('playerData', JSON.stringify(playerData));
        }

        getPlayerData() {
            return {
                id: this.id,
                energy: this.energy,
                colony: this.colony,
                communication: this.communication,
                water: this.water,
                food: this.food,
                coins: this.coins,
                level: this.level
            };
        }

        updateReferralPage() {
            const referralList = document.getElementById('referralList');
            referralList.innerHTML = '<h2>Your Referrals</h2>';
            const playerReferrals = JSON.parse(localStorage.getItem('playerData')) || [];
            playerReferrals.forEach(ref => {
                const referrer = this.referralsData[ref.id];
                if (referrer) {
                    referralList.innerHTML += `<p>Referred by: ${referrer.referrerId}, Coins Mined: ${ref.coins}</p>`;
                }
            });
        }
    }

    const player = new Player();
    player.checkReferral();

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
        player.updateReferralPage();
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

    // Generate and display referral link
    const referralLinkElement = document.createElement('div');
    referralLinkElement.id = 'referralLink';
    referralLinkElement.innerHTML = `Your referral link: <a href="${player.generateReferralLink()}">${player.generateReferralLink()}</a>`;
    document.getElementById('referralPage').appendChild(referralLinkElement);
});
