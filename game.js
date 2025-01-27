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

    function animate() {
        requestAnimationFrame(animate);
        planet.rotation.y += 0.01;
        renderer.render(scene, camera);
    }

    animate();

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
            if (document.getElementById('energy')) document.getElementById('energy').innerText = this.energy;
            if (document.getElementById('colony')) document.getElementById('colony').innerText = this.colony;
            if (document.getElementById('communication')) document.getElementById('communication').innerText = this.communication;
            if (document.getElementById('water')) document.getElementById('water').innerText = this.water;
            if (document.getElementById('food')) document.getElementById('food').innerText = this.food;
            if (document.getElementById('coins')) document.getElementById('coins').innerText = this.coins.toFixed(1);
            if (document.getElementById('level')) document.getElementById('level').innerText = this.level;
            if (document.getElementById('earnRate')) document.getElementById('earnRate').innerText = this.earnRate.toFixed(1);
            if (document.getElementById('coinBalanceValue')) document.getElementById('coinBalanceValue').innerText = this.coins.toFixed(1);
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
            const parameter = document.getElementById('upgradeSelect') ? document.getElementById('upgradeSelect').value : null;
            if (parameter) {
                document.getElementById('upgradeCost').innerText = this.upgradeCosts[parameter].toFixed(1);
            }
        }

        updateMiningTimer() {
            const now = Date.now();
            const timeRemaining = this.miningEndTime - now;
            if (timeRemaining > 0) {
                const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
                const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
                if (document.getElementById('miningTime')) {
                    document.getElementById('miningTime').innerText = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
            } else {
                if (document.getElementById('miningTime')) {
                    document.getElementById('miningTime').innerText = '00:00:00';
                }
            }
        }

        showMiningAnimation() {
            const miningAnimation = document.createElement('div');
            miningAnimation.className = 'mining-animation';
            miningAnimation.innerText = `+${this.earnRate.toFixed(1)}`;
            document.body.appendChild(miningAnimation);
            setTimeout(() => {
                document.body.removeChild(miningAnimation);
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
                let referredPlayer = JSON.parse(localStorage.getItem(`referral_${ref}`));
                if (!referredPlayer) {
                    this.coins += 150; // Reward for being referred
                    localStorage.setItem('coins', this.coins);

                    // Save referred player data
                    referredPlayer = {
                        referrerId: ref,
                        id: this.id,
                        coinsMined: this.coins
                    };
                    localStorage.setItem(`referral_${ref}`, JSON.stringify(referredPlayer));

                    // Update referrer's data
                    const referrerData = this.referralsData[ref] || { totalCoins: 0, referrals: [] };
                    referrerData.totalCoins += 150;
                    referrerData.referrals.push(referredPlayer);
                    this.referralsData[ref] = referrerData;
                    localStorage.setItem('referralsData', JSON.stringify(this.referralsData));
                    this.updateUI();
                }
                // Redirect to referral page
                window.location.href = 'referrals.html';
            }
        }

        savePlayerData() {
            const playerData = {
                id: this.id,
                energy: this.energy,
                colony: this.colony,
                communication: this.communication,
                water: this.water,
                food: this.food,
                coins: this.coins,
                level: this.level,
                lastLoginTime: this.lastLoginTime,
                isMining: this.isMining,
                miningEndTime: this.miningEndTime,
                referrals: this.referrals,
                referralsData: this.referralsData
            };

            // Save to localStorage as a backup
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
            const playerReferrals = JSON.parse(localStorage.getItem('referralsData')) || {};
            const currentPlayerReferrals = playerReferrals[this.id] || { referrals: [] };
            currentPlayerReferrals.referrals.forEach(ref => {
                referralList.innerHTML += `<p>Referred by: ${ref.referrerId}, Coins Mined: ${ref.coinsMined}</p>`;
            });
        }
    }

    const player = new Player();
    player.checkReferral();

    if (document.getElementById('upgradeButton')) {
        document.getElementById('upgradeButton').addEventListener('click', () => {
            const parameter = document.getElementById('upgradeSelect').value;
            player.upgrade(parameter);
        });
    }

    if (document.getElementById('upgradeSelect')) {
        document.getElementById('upgradeSelect').addEventListener('change', () => {
            player.updateUpgradeCostText();
        });
    }

    if (document.getElementById('referralList')) {
        player.updateReferralPage();
    }
});
