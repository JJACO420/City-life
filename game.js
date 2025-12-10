// City Life - Complex Life Simulation Game
// Main Game Engine

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        this.tileSize = 16;
        this.camera = { x: 0, y: 0 };
        
        this.world = null;
        this.player = null;
        this.npcs = [];
        this.buildings = [];
        
        this.keys = {};
        this.lastTime = 0;
        this.gameTime = 0;
        this.dayCount = 0;
        this.timeOfDay = 6; // 6 AM start
        
        this.actionMenuOpen = false;
        this.currentInteraction = null;
        
        // Constants
        this.VERSION = "Alpha 0.2";
        this.NPC_COUNT = 50;
        this.BUILDING_COUNT = 30;
        this.SECONDS_PER_GAME_HOUR = 10;
        this.DAYS_TO_YEARS = 1 / 365;
        this.RANDOM_EVENT_PROBABILITY = 0.3;
        this.MAX_MESSAGE_COUNT = 20;
        
        this.init();
    }
    
    init() {
        this.setupInput();
        this.world = new World(100, 100, this.tileSize);
        this.player = new Player(25, 25);
        this.generateNPCs(this.NPC_COUNT);
        this.generateBuildings();
        
        this.updateUI();
        this.addMessage(`Welcome to City Life ${this.VERSION}! Start your new life.`, "success");
        this.addMessage("Use WASD to move, E for actions menu, SPACE to interact", "");
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    setupInput() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key.toLowerCase() === 'e' && !this.actionMenuOpen) {
                this.openActionsMenu();
                e.preventDefault();
            }
            if (e.key === 'Escape' && this.actionMenuOpen) {
                this.closeActionsMenu();
                e.preventDefault();
            }
            if (e.key.toLowerCase() === 'r') {
                this.player.rest();
                this.addMessage("You rest for a moment...", "");
                this.updateUI();
            }
            if (e.key === ' ') {
                this.interact();
                e.preventDefault();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    gameLoop(currentTime) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(dt) {
        // Update game time
        this.gameTime += dt;
        
        // Update time of day (1 hour every 10 seconds of real time)
        if (this.gameTime > this.SECONDS_PER_GAME_HOUR) {
            this.gameTime = 0;
            this.timeOfDay = (this.timeOfDay + 1) % 24;
            
            if (this.timeOfDay === 0) {
                this.dayCount++;
                this.player.age(this.DAYS_TO_YEARS); // Age by 1 day
                this.triggerRandomEvent();
            }
            
            // Time-based stat changes
            this.player.hunger = Math.max(0, this.player.hunger - 1);
            this.player.energy = Math.max(0, this.player.energy - 0.5);
            
            if (this.player.hunger < 20) {
                this.player.health = Math.max(0, this.player.health - 1);
                this.player.happiness = Math.max(0, this.player.happiness - 2);
            }
            
            if (this.player.energy < 20) {
                this.player.happiness = Math.max(0, this.player.happiness - 1);
            }
            
            this.updateUI();
        }
        
        // Handle movement
        if (!this.actionMenuOpen) {
            const speed = 2;
            if (this.keys['w'] || this.keys['arrowup']) {
                this.player.y = Math.max(0, this.player.y - speed);
            }
            if (this.keys['s'] || this.keys['arrowdown']) {
                this.player.y = Math.min(this.world.height - 1, this.player.y + speed);
            }
            if (this.keys['a'] || this.keys['arrowleft']) {
                this.player.x = Math.max(0, this.player.x - speed);
            }
            if (this.keys['d'] || this.keys['arrowright']) {
                this.player.x = Math.min(this.world.width - 1, this.player.x + speed);
            }
        }
        
        // Update camera
        this.camera.x = this.player.x - (this.width / this.tileSize) / 2;
        this.camera.y = this.player.y - (this.height / this.tileSize) / 2;
        
        // Update NPCs
        this.npcs.forEach(npc => npc.update(dt, this.world));
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Render world
        this.world.render(this.ctx, this.camera);
        
        // Render buildings
        this.buildings.forEach(building => {
            building.render(this.ctx, this.camera, this.tileSize);
        });
        
        // Render NPCs
        this.npcs.forEach(npc => {
            npc.render(this.ctx, this.camera, this.tileSize);
        });
        
        // Render player
        this.player.render(this.ctx, this.camera, this.tileSize);
        
        // Render time of day overlay
        this.renderTimeOverlay();
        
        // Render version info
        this.renderVersionInfo();
    }
    
    renderTimeOverlay() {
        let alpha = 0;
        if (this.timeOfDay < 6 || this.timeOfDay > 20) {
            alpha = 0.4; // Night
        } else if (this.timeOfDay < 8 || this.timeOfDay > 18) {
            alpha = 0.2; // Dawn/Dusk
        }
        
        if (alpha > 0) {
            this.ctx.fillStyle = `rgba(0, 0, 50, ${alpha})`;
            this.ctx.fillRect(0, 0, this.width, this.height);
        }
    }
    
    renderVersionInfo() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(this.VERSION, this.width - 10, this.height - 10);
    }
    
    interact() {
        // Check for nearby NPCs
        const nearbyNPC = this.npcs.find(npc => {
            const dist = Math.sqrt(Math.pow(npc.x - this.player.x, 2) + Math.pow(npc.y - this.player.y, 2));
            return dist < 2;
        });
        
        if (nearbyNPC) {
            this.interactWithNPC(nearbyNPC);
            return;
        }
        
        // Check for nearby buildings
        const nearbyBuilding = this.buildings.find(building => {
            const dist = Math.sqrt(
                Math.pow(building.x + building.width / 2 - this.player.x, 2) + 
                Math.pow(building.y + building.height / 2 - this.player.y, 2)
            );
            return dist < 5;
        });
        
        if (nearbyBuilding) {
            this.interactWithBuilding(nearbyBuilding);
            return;
        }
        
        this.addMessage("Nothing to interact with nearby.", "");
    }
    
    interactWithNPC(npc) {
        const menu = document.getElementById('actionMenu');
        const content = document.getElementById('menuContent');
        
        // Clear existing content
        content.innerHTML = '';
        
        // Safely create elements
        const title = document.createElement('div');
        title.className = 'menu-title';
        title.textContent = npc.name;
        content.appendChild(title);
        
        const info = document.createElement('div');
        info.className = 'info-text';
        info.textContent = `Age: ${npc.age} | Job: ${npc.job}`;
        content.appendChild(info);
        
        const talkBtn = document.createElement('button');
        talkBtn.className = 'action-btn';
        talkBtn.textContent = '💬 Talk';
        talkBtn.onclick = () => this.talkToNPC(npc.id);
        content.appendChild(talkBtn);
        
        const complimentBtn = document.createElement('button');
        complimentBtn.className = 'action-btn';
        complimentBtn.textContent = '😊 Compliment';
        complimentBtn.onclick = () => this.complimentNPC(npc.id);
        content.appendChild(complimentBtn);
        
        const jobBtn = document.createElement('button');
        jobBtn.className = 'action-btn';
        jobBtn.textContent = '💼 Ask about work';
        jobBtn.onclick = () => this.askForJob(npc.id);
        content.appendChild(jobBtn);
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'action-btn';
        cancelBtn.textContent = '❌ Cancel';
        cancelBtn.onclick = () => this.closeActionsMenu();
        content.appendChild(cancelBtn);
        
        menu.classList.add('active');
        this.actionMenuOpen = true;
        this.currentInteraction = npc;
    }
    
    interactWithBuilding(building) {
        const menu = document.getElementById('actionMenu');
        const content = document.getElementById('menuContent');
        
        let actions = `<div class="menu-title">${building.name}</div>`;
        
        switch (building.type) {
            case 'home':
                actions += `
                    <button class="action-btn" onclick="game.sleep()">😴 Sleep (Restore Energy)</button>
                    <button class="action-btn" onclick="game.watchTV()">📺 Watch TV</button>
                    <button class="action-btn" onclick="game.study()">📚 Study</button>
                `;
                break;
            case 'restaurant':
                actions += `
                    <button class="action-btn" onclick="game.eatMeal('cheap')">🍔 Fast Food ($10)</button>
                    <button class="action-btn" onclick="game.eatMeal('normal')">🍽️ Restaurant Meal ($25)</button>
                    <button class="action-btn" onclick="game.eatMeal('expensive')">🍾 Fine Dining ($75)</button>
                `;
                break;
            case 'gym':
                actions += `
                    <button class="action-btn" onclick="game.workout()">💪 Workout (Build Strength)</button>
                    <button class="action-btn" onclick="game.takeClass('fitness')">🏃 Fitness Class ($20)</button>
                `;
                break;
            case 'office':
                actions += `
                    <button class="action-btn" onclick="game.work()">💼 Work (Earn Money)</button>
                    <button class="action-btn" onclick="game.askForRaise()">💰 Ask for Raise</button>
                `;
                break;
            case 'school':
                actions += `
                    <button class="action-btn" onclick="game.attendClass()">📖 Attend Class</button>
                    <button class="action-btn" onclick="game.takeExam()">📝 Take Exam</button>
                `;
                break;
            case 'store':
                actions += `
                    <button class="action-btn" onclick="game.buyItem('food')">🛒 Buy Groceries ($30)</button>
                    <button class="action-btn" onclick="game.buyItem('clothes')">👔 Buy Clothes ($50)</button>
                    <button class="action-btn" onclick="game.buyItem('luxury')">💎 Buy Luxury Item ($200)</button>
                `;
                break;
            case 'hospital':
                actions += `
                    <button class="action-btn" onclick="game.getCheckup()">🏥 Medical Checkup ($100)</button>
                    <button class="action-btn" onclick="game.getTreatment()">💊 Get Treatment ($500)</button>
                `;
                break;
            case 'bar':
                actions += `
                    <button class="action-btn" onclick="game.haveDrink()">🍺 Have a Drink ($15)</button>
                    <button class="action-btn" onclick="game.socialize()">🎉 Socialize</button>
                `;
                break;
        }
        
        actions += `<button class="action-btn" onclick="game.closeActionsMenu()">❌ Leave</button>`;
        content.innerHTML = actions;
        
        menu.classList.add('active');
        this.actionMenuOpen = true;
        this.currentInteraction = building;
    }
    
    openActionsMenu() {
        const menu = document.getElementById('actionMenu');
        const content = document.getElementById('menuContent');
        
        content.innerHTML = `
            <button class="action-btn" onclick="game.viewStats()">📊 View Full Stats</button>
            <button class="action-btn" onclick="game.viewRelationships()">👥 Relationships</button>
            <button class="action-btn" onclick="game.changeJob()">💼 Change Job</button>
            <button class="action-btn" onclick="game.moveHouse()">🏠 Move House</button>
            <button class="action-btn" onclick="game.goToTherapy()">🧘 Mental Health</button>
            <button class="action-btn" onclick="game.startHobby()">🎨 Start Hobby</button>
            <button class="action-btn" onclick="game.planVacation()">✈️ Plan Vacation</button>
            <button class="action-btn" onclick="game.volunteer()">🤝 Volunteer</button>
            <button class="action-btn" onclick="game.closeActionsMenu()">❌ Close</button>
        `;
        
        menu.classList.add('active');
        this.actionMenuOpen = true;
    }
    
    closeActionsMenu() {
        document.getElementById('actionMenu').classList.remove('active');
        this.actionMenuOpen = false;
        this.currentInteraction = null;
    }
    
    // NPC Interaction Methods
    talkToNPC(npcId) {
        const npc = this.npcs.find(n => n.id === npcId);
        if (!npc) return;
        
        const responses = [
            `${npc.name}: "Hello! How are you doing today?"`,
            `${npc.name}: "Nice weather we're having!"`,
            `${npc.name}: "I love living in this city."`,
            `${npc.name}: "Have you been to the new restaurant downtown?"`,
            `${npc.name}: "Work has been keeping me busy lately."`
        ];
        
        this.addMessage(responses[Math.floor(Math.random() * responses.length)], "");
        this.player.charisma += 1;
        this.player.happiness += 5;
        this.updateUI();
        this.closeActionsMenu();
    }
    
    complimentNPC(npcId) {
        const npc = this.npcs.find(n => n.id === npcId);
        if (!npc) return;
        
        this.addMessage(`${npc.name} smiles! Your relationship improved.`, "success");
        this.player.charisma += 2;
        this.player.happiness += 3;
        this.updateUI();
        this.closeActionsMenu();
    }
    
    askForJob(npcId) {
        const npc = this.npcs.find(n => n.id === npcId);
        if (!npc) return;
        
        if (Math.random() > 0.5) {
            this.addMessage(`${npc.name}: "We might have an opening. Let me check!"`, "success");
            this.player.charisma += 1;
        } else {
            this.addMessage(`${npc.name}: "Sorry, no openings right now."`, "warning");
        }
        this.updateUI();
        this.closeActionsMenu();
    }
    
    // Building Interaction Methods
    sleep() {
        this.player.energy = 100;
        this.player.health = Math.min(100, this.player.health + 10);
        this.advanceTime(8);
        this.addMessage("You slept well and feel refreshed!", "success");
        this.updateUI();
        this.closeActionsMenu();
    }
    
    watchTV() {
        this.player.happiness += 10;
        this.player.energy -= 5;
        this.advanceTime(2);
        this.addMessage("You watched some TV and relaxed.", "");
        this.updateUI();
        this.closeActionsMenu();
    }
    
    study() {
        if (this.player.energy < 20) {
            this.addMessage("You're too tired to study effectively.", "warning");
            return;
        }
        this.player.intelligence += 3;
        this.player.energy -= 15;
        this.advanceTime(2);
        this.addMessage("You studied hard! Intelligence increased.", "success");
        this.updateUI();
        this.closeActionsMenu();
    }
    
    eatMeal(type) {
        const meals = {
            cheap: { cost: 10, hunger: 30, happiness: 5 },
            normal: { cost: 25, hunger: 60, happiness: 15 },
            expensive: { cost: 75, hunger: 100, happiness: 35 }
        };
        
        const meal = meals[type];
        
        if (this.player.money < meal.cost) {
            this.addMessage("You don't have enough money!", "warning");
            return;
        }
        
        this.player.money -= meal.cost;
        this.player.hunger = Math.min(100, this.player.hunger + meal.hunger);
        this.player.happiness += meal.happiness;
        this.addMessage(`You enjoyed your meal! -$${meal.cost}`, "success");
        this.updateUI();
        this.closeActionsMenu();
    }
    
    workout() {
        if (this.player.energy < 25) {
            this.addMessage("You're too tired to workout.", "warning");
            return;
        }
        this.player.strength += 2;
        this.player.energy -= 20;
        this.player.health = Math.min(100, this.player.health + 5);
        this.advanceTime(1);
        this.addMessage("Great workout! Strength and health improved.", "success");
        this.updateUI();
        this.closeActionsMenu();
    }
    
    takeClass(type) {
        if (this.player.money < 20) {
            this.addMessage("You don't have enough money for the class!", "warning");
            return;
        }
        
        this.player.money -= 20;
        this.player.strength += 3;
        this.player.energy -= 25;
        this.player.happiness += 10;
        this.addMessage("You completed the fitness class! -$20", "success");
        this.updateUI();
        this.closeActionsMenu();
    }
    
    work() {
        if (this.player.energy < 30) {
            this.addMessage("You're too tired to work effectively.", "warning");
            return;
        }
        
        const salary = this.player.calculateSalary();
        this.player.money += salary;
        this.player.energy -= 30;
        this.player.happiness -= 5;
        this.advanceTime(8);
        this.addMessage(`You worked and earned $${salary}!`, "success");
        this.updateUI();
        this.closeActionsMenu();
    }
    
    askForRaise() {
        const chance = (this.player.intelligence + this.player.charisma) / 200;
        
        if (Math.random() < chance) {
            this.player.baseSalary += 20;
            this.addMessage("Your raise was approved! Salary increased.", "success");
        } else {
            this.addMessage("Your raise was denied. Keep improving your skills.", "warning");
        }
        
        this.updateUI();
        this.closeActionsMenu();
    }
    
    attendClass() {
        if (this.player.energy < 20) {
            this.addMessage("You're too tired to attend class.", "warning");
            return;
        }
        
        this.player.intelligence += 5;
        this.player.energy -= 15;
        this.player.educationLevel += 1;
        this.advanceTime(4);
        this.addMessage("You attended class and learned a lot!", "success");
        this.updateUI();
        this.closeActionsMenu();
    }
    
    takeExam() {
        const score = Math.min(100, this.player.intelligence + Math.random() * 20);
        
        if (score > 80) {
            this.player.intelligence += 10;
            this.player.happiness += 20;
            this.addMessage(`Excellent! You scored ${score.toFixed(0)}% on the exam!`, "success");
        } else if (score > 60) {
            this.player.intelligence += 5;
            this.addMessage(`You passed with ${score.toFixed(0)}%. Good job!`, "success");
        } else {
            this.player.happiness -= 10;
            this.addMessage(`You scored ${score.toFixed(0)}%. Study harder next time.`, "warning");
        }
        
        this.updateUI();
        this.closeActionsMenu();
    }
    
    buyItem(type) {
        const items = {
            food: { cost: 30, effect: () => { this.player.hunger += 50; } },
            clothes: { cost: 50, effect: () => { this.player.happiness += 15; this.player.charisma += 2; } },
            luxury: { cost: 200, effect: () => { this.player.happiness += 40; this.player.charisma += 5; } }
        };
        
        const item = items[type];
        
        if (this.player.money < item.cost) {
            this.addMessage("You can't afford this!", "warning");
            return;
        }
        
        this.player.money -= item.cost;
        item.effect();
        this.addMessage(`Purchase successful! -$${item.cost}`, "success");
        this.updateUI();
        this.closeActionsMenu();
    }
    
    getCheckup() {
        if (this.player.money < 100) {
            this.addMessage("You can't afford the checkup!", "warning");
            return;
        }
        
        this.player.money -= 100;
        this.player.health = Math.min(100, this.player.health + 20);
        this.addMessage("Checkup complete! Health improved. -$100", "success");
        this.updateUI();
        this.closeActionsMenu();
    }
    
    getTreatment() {
        if (this.player.money < 500) {
            this.addMessage("You can't afford the treatment!", "warning");
            return;
        }
        
        this.player.money -= 500;
        this.player.health = 100;
        this.addMessage("Treatment successful! Fully healed. -$500", "success");
        this.updateUI();
        this.closeActionsMenu();
    }
    
    haveDrink() {
        if (this.player.money < 15) {
            this.addMessage("You can't afford a drink!", "warning");
            return;
        }
        
        this.player.money -= 15;
        this.player.happiness += 15;
        this.player.health -= 5;
        this.player.energy -= 10;
        this.addMessage("You enjoyed a drink at the bar. -$15", "");
        this.updateUI();
        this.closeActionsMenu();
    }
    
    socialize() {
        this.player.happiness += 20;
        this.player.charisma += 3;
        this.player.energy -= 15;
        this.advanceTime(2);
        this.addMessage("You had a great time socializing!", "success");
        this.updateUI();
        this.closeActionsMenu();
    }
    
    // Main Action Menu Methods
    viewStats() {
        const menu = document.getElementById('menuContent');
        menu.innerHTML = `
            <div class="info-text">
                <strong>${this.player.name}</strong><br>
                Age: ${this.player.age} years<br>
                Job: ${this.player.job}<br>
                Education: ${this.player.getEducationLevel()}<br>
                <br>
                <strong>Attributes:</strong><br>
                Intelligence: ${this.player.intelligence}<br>
                Strength: ${this.player.strength}<br>
                Charisma: ${this.player.charisma}<br>
                Creativity: ${this.player.creativity}<br>
                <br>
                <strong>Life Stats:</strong><br>
                Days Lived: ${this.dayCount}<br>
                Money Earned: $${this.player.totalMoneyEarned}<br>
            </div>
            <button class="action-btn" onclick="game.closeActionsMenu()">❌ Close</button>
        `;
    }
    
    viewRelationships() {
        this.addMessage("Relationships system - Meet people and build connections!", "");
        this.closeActionsMenu();
    }
    
    changeJob() {
        const jobs = [
            { name: "Cashier", salary: 50, reqInt: 10 },
            { name: "Office Worker", salary: 100, reqInt: 30 },
            { name: "Teacher", salary: 150, reqInt: 60 },
            { name: "Engineer", salary: 250, reqInt: 80 },
            { name: "Doctor", salary: 400, reqInt: 90 }
        ];
        
        const menu = document.getElementById('menuContent');
        menu.innerHTML = '';
        
        const info = document.createElement('div');
        info.className = 'info-text';
        info.textContent = 'Choose a new career:';
        menu.appendChild(info);
        
        jobs.forEach(job => {
            const canApply = this.player.intelligence >= job.reqInt;
            const btn = document.createElement('button');
            btn.className = 'action-btn';
            btn.disabled = !canApply;
            btn.textContent = `${job.name} - $${job.salary}/day${!canApply ? ` (Requires ${job.reqInt} INT)` : ''}`;
            btn.onclick = () => this.applyForJob(job.name, job.salary);
            menu.appendChild(btn);
        });
        
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'action-btn';
        cancelBtn.textContent = '❌ Cancel';
        cancelBtn.onclick = () => this.closeActionsMenu();
        menu.appendChild(cancelBtn);
    }
    
    applyForJob(jobName, salary) {
        this.player.job = jobName;
        this.player.baseSalary = salary;
        this.addMessage(`Congratulations! You're now a ${jobName}!`, "success");
        this.updateUI();
        this.closeActionsMenu();
    }
    
    moveHouse() {
        this.addMessage("House moving feature - Find your dream home!", "");
        this.closeActionsMenu();
    }
    
    goToTherapy() {
        if (this.player.money < 100) {
            this.addMessage("Therapy costs $100. You don't have enough money.", "warning");
            return;
        }
        
        this.player.money -= 100;
        this.player.happiness += 30;
        this.addMessage("Therapy session complete. You feel much better! -$100", "success");
        this.updateUI();
        this.closeActionsMenu();
    }
    
    startHobby() {
        const hobbies = ["Painting", "Music", "Sports", "Cooking", "Writing"];
        const hobby = hobbies[Math.floor(Math.random() * hobbies.length)];
        
        this.player.creativity += 10;
        this.player.happiness += 15;
        this.addMessage(`You started ${hobby} as a hobby!`, "success");
        this.updateUI();
        this.closeActionsMenu();
    }
    
    planVacation() {
        if (this.player.money < 500) {
            this.addMessage("A vacation costs $500. Save up more money!", "warning");
            return;
        }
        
        this.player.money -= 500;
        this.player.happiness += 50;
        this.player.energy = 100;
        this.addMessage("Amazing vacation! You feel completely refreshed. -$500", "success");
        this.updateUI();
        this.closeActionsMenu();
    }
    
    volunteer() {
        this.player.happiness += 25;
        this.player.charisma += 5;
        this.player.energy -= 20;
        this.advanceTime(4);
        this.addMessage("You volunteered and helped the community. You feel great!", "success");
        this.updateUI();
        this.closeActionsMenu();
    }
    
    // Helper Methods
    advanceTime(hours) {
        this.timeOfDay = (this.timeOfDay + hours) % 24;
        
        for (let i = 0; i < hours; i++) {
            this.player.hunger = Math.max(0, this.player.hunger - 2);
            this.player.energy = Math.max(0, this.player.energy - 1);
        }
    }
    
    triggerRandomEvent() {
        const events = [
            { 
                message: "You found $50 on the street!", 
                effect: () => { this.player.money += 50; }
            },
            { 
                message: "You got a small bonus at work!", 
                effect: () => { this.player.money += 100; }
            },
            { 
                message: "You're feeling under the weather...", 
                effect: () => { this.player.health -= 10; }
            },
            { 
                message: "A great day! You feel energized!", 
                effect: () => { this.player.happiness += 10; }
            },
            { 
                message: "You had an inspiring conversation!", 
                effect: () => { this.player.intelligence += 2; }
            },
            {
                message: "You're feeling stressed from work...",
                effect: () => { this.player.happiness -= 5; }
            }
        ];
        
        if (Math.random() < this.RANDOM_EVENT_PROBABILITY) { // 30% chance
            const event = events[Math.floor(Math.random() * events.length)];
            this.addMessage(event.message, "event");
            event.effect();
            this.updateUI();
        }
    }
    
    generateNPCs(count) {
        const firstNames = ["Alex", "Sam", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Avery", "Quinn", "Drew"];
        const lastNames = ["Smith", "Johnson", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas"];
        const jobs = ["Cashier", "Teacher", "Doctor", "Engineer", "Artist", "Chef", "Lawyer", "Mechanic", "Writer", "Musician"];
        
        for (let i = 0; i < count; i++) {
            const npc = {
                id: `npc_${i}`,
                name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
                x: Math.random() * this.world.width,
                y: Math.random() * this.world.height,
                age: Math.floor(Math.random() * 50) + 18,
                job: jobs[Math.floor(Math.random() * jobs.length)],
                targetX: 0,
                targetY: 0,
                moveTimer: 0,
                color: `hsl(${Math.random() * 360}, 70%, 60%)`,
                
                update(dt, world) {
                    this.moveTimer -= dt;
                    if (this.moveTimer <= 0) {
                        this.targetX = Math.random() * world.width;
                        this.targetY = Math.random() * world.height;
                        this.moveTimer = Math.random() * 10 + 5;
                    }
                    
                    const dx = this.targetX - this.x;
                    const dy = this.targetY - this.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist > 0.5) {
                        this.x += (dx / dist) * 0.5;
                        this.y += (dy / dist) * 0.5;
                    }
                },
                
                render(ctx, camera, tileSize) {
                    const screenX = (this.x - camera.x) * tileSize;
                    const screenY = (this.y - camera.y) * tileSize;
                    
                    if (screenX < -tileSize || screenX > 800 || screenY < -tileSize || screenY > 600) {
                        return;
                    }
                    
                    // Draw NPC
                    ctx.fillStyle = this.color;
                    ctx.fillRect(screenX, screenY, tileSize, tileSize);
                    
                    // Draw eyes
                    ctx.fillStyle = '#000';
                    ctx.fillRect(screenX + 4, screenY + 4, 3, 3);
                    ctx.fillRect(screenX + 9, screenY + 4, 3, 3);
                }
            };
            
            this.npcs.push(npc);
        }
    }
    
    generateBuildings() {
        const buildingTypes = [
            { type: 'home', name: 'House', width: 4, height: 4, color: '#8B4513' },
            { type: 'restaurant', name: 'Restaurant', width: 5, height: 4, color: '#FF6347' },
            { type: 'gym', name: 'Gym', width: 6, height: 5, color: '#4169E1' },
            { type: 'office', name: 'Office', width: 7, height: 6, color: '#696969' },
            { type: 'school', name: 'School', width: 8, height: 6, color: '#FFD700' },
            { type: 'store', name: 'Store', width: 5, height: 4, color: '#32CD32' },
            { type: 'hospital', name: 'Hospital', width: 8, height: 7, color: '#DC143C' },
            { type: 'bar', name: 'Bar', width: 4, height: 3, color: '#8B008B' }
        ];
        
        for (let i = 0; i < this.BUILDING_COUNT; i++) {
            const template = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];
            const building = {
                ...template,
                x: Math.random() * (this.world.width - template.width - 10) + 5,
                y: Math.random() * (this.world.height - template.height - 10) + 5,
                
                render(ctx, camera, tileSize) {
                    const screenX = (this.x - camera.x) * tileSize;
                    const screenY = (this.y - camera.y) * tileSize;
                    
                    if (screenX < -this.width * tileSize || screenX > 800 || 
                        screenY < -this.height * tileSize || screenY > 600) {
                        return;
                    }
                    
                    // Draw building
                    ctx.fillStyle = this.color;
                    ctx.fillRect(screenX, screenY, this.width * tileSize, this.height * tileSize);
                    
                    // Draw border
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(screenX, screenY, this.width * tileSize, this.height * tileSize);
                    
                    // Draw windows
                    ctx.fillStyle = '#87CEEB';
                    for (let wx = 1; wx < this.width - 1; wx += 2) {
                        for (let wy = 1; wy < this.height - 1; wy += 2) {
                            ctx.fillRect(
                                screenX + wx * tileSize + 2,
                                screenY + wy * tileSize + 2,
                                tileSize - 4,
                                tileSize - 4
                            );
                        }
                    }
                    
                    // Draw label
                    ctx.fillStyle = '#FFF';
                    ctx.font = '10px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(
                        this.name,
                        screenX + (this.width * tileSize) / 2,
                        screenY - 5
                    );
                }
            };
            
            this.buildings.push(building);
        }
    }
    
    updateUI() {
        // Update character info
        document.getElementById('charName').textContent = this.player.name;
        document.getElementById('charAge').textContent = this.player.age.toFixed(1);
        document.getElementById('charJob').textContent = this.player.job;
        document.getElementById('charEducation').textContent = this.player.getEducationLevel();
        
        // Update stat bars
        this.updateStatBar('healthBar', this.player.health);
        this.updateStatBar('energyBar', this.player.energy);
        this.updateStatBar('hungerBar', this.player.hunger);
        this.updateStatBar('happinessBar', this.player.happiness);
        
        // Update other stats
        document.getElementById('moneyAmount').textContent = this.player.money.toFixed(0);
        document.getElementById('intelligence').textContent = this.player.intelligence;
        document.getElementById('strength').textContent = this.player.strength;
        document.getElementById('charisma').textContent = this.player.charisma;
    }
    
    updateStatBar(id, value) {
        const bar = document.getElementById(id);
        const percent = Math.max(0, Math.min(100, value));
        bar.style.width = percent + '%';
        bar.textContent = percent.toFixed(0) + '%';
    }
    
    addMessage(text, type = '') {
        const log = document.getElementById('messageLog');
        const message = document.createElement('div');
        message.className = `message ${type}`;
        message.textContent = text;
        log.appendChild(message);
        log.scrollTop = log.scrollHeight;
        
        // Keep only last 20 messages
        while (log.children.length > this.MAX_MESSAGE_COUNT) {
            log.removeChild(log.firstChild);
        }
    }
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        
        // Basic info
        this.name = this.generateName();
        this.age = 18;
        this.job = "Unemployed";
        this.baseSalary = 50;
        
        // Stats (0-100)
        this.health = 100;
        this.energy = 100;
        this.hunger = 100;
        this.happiness = 75;
        
        // Attributes
        this.intelligence = Math.floor(Math.random() * 20) + 30;
        this.strength = Math.floor(Math.random() * 20) + 30;
        this.charisma = Math.floor(Math.random() * 20) + 30;
        this.creativity = Math.floor(Math.random() * 20) + 30;
        
        // Life progress
        this.money = 500;
        this.totalMoneyEarned = 0;
        this.educationLevel = 0;
        this.relationships = [];
    }
    
    generateName() {
        const firstNames = ["Alex", "Jordan", "Sam", "Taylor", "Morgan", "Casey", "Riley", "Avery"];
        const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller"];
        return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
    }
    
    age(years) {
        this.age += years;
        
        if (this.age >= 65) {
            this.health = Math.max(0, this.health - 0.5);
            this.energy = Math.max(0, this.energy - 0.5);
        }
    }
    
    rest() {
        this.energy = Math.min(100, this.energy + 20);
        this.happiness = Math.min(100, this.happiness + 5);
    }
    
    calculateSalary() {
        const modifier = (this.intelligence + this.charisma) / 100;
        return Math.floor(this.baseSalary * (1 + modifier));
    }
    
    getEducationLevel() {
        if (this.educationLevel < 10) return "High School";
        if (this.educationLevel < 30) return "Some College";
        if (this.educationLevel < 60) return "Bachelor's";
        if (this.educationLevel < 100) return "Master's";
        return "PhD";
    }
    
    render(ctx, camera, tileSize) {
        const screenX = (this.x - camera.x) * tileSize;
        const screenY = (this.y - camera.y) * tileSize;
        
        // Draw player character (pixelated style)
        ctx.fillStyle = '#00d9ff';
        ctx.fillRect(screenX, screenY, tileSize, tileSize);
        
        // Draw face
        ctx.fillStyle = '#FFE0BD';
        ctx.fillRect(screenX + 2, screenY + 2, tileSize - 4, tileSize - 4);
        
        // Draw eyes
        ctx.fillStyle = '#000';
        ctx.fillRect(screenX + 4, screenY + 4, 2, 2);
        ctx.fillRect(screenX + 10, screenY + 4, 2, 2);
        
        // Draw smile
        ctx.fillRect(screenX + 5, screenY + 10, 6, 1);
        
        // Draw name above
        ctx.fillStyle = '#FFF';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, screenX + tileSize / 2, screenY - 5);
    }
}

class World {
    constructor(width, height, tileSize) {
        this.width = width;
        this.height = height;
        this.tileSize = tileSize;
        
        // Generate terrain
        this.tiles = [];
        for (let y = 0; y < height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < width; x++) {
                const rand = Math.random();
                if (rand < 0.1) {
                    this.tiles[y][x] = { type: 'tree', color: '#228B22' };
                } else if (rand < 0.15) {
                    this.tiles[y][x] = { type: 'flower', color: '#FF69B4' };
                } else if (rand < 0.3) {
                    this.tiles[y][x] = { type: 'path', color: '#A9A9A9' };
                } else {
                    this.tiles[y][x] = { type: 'grass', color: '#7CFC00' };
                }
            }
        }
    }
    
    render(ctx, camera) {
        const startX = Math.max(0, Math.floor(camera.x));
        const startY = Math.max(0, Math.floor(camera.y));
        const endX = Math.min(this.width, Math.ceil(camera.x + 800 / this.tileSize));
        const endY = Math.min(this.height, Math.ceil(camera.y + 600 / this.tileSize));
        
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = this.tiles[y][x];
                const screenX = (x - camera.x) * this.tileSize;
                const screenY = (y - camera.y) * this.tileSize;
                
                // Draw tile
                ctx.fillStyle = tile.color;
                ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
                
                // Add texture
                if (tile.type === 'grass') {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                    if ((x + y) % 2 === 0) {
                        ctx.fillRect(screenX, screenY, this.tileSize / 2, this.tileSize / 2);
                    }
                } else if (tile.type === 'tree') {
                    ctx.fillStyle = '#006400';
                    ctx.fillRect(screenX + 4, screenY + 4, 8, 8);
                }
            }
        }
    }
}

// Start the game
let game;
window.addEventListener('load', () => {
    game = new Game();
});
