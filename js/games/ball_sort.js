// js/games/ball_sort.js
import { apiRequest, API_URL } from '../api.js';

// Module-level state
let currentLevel = 1;
let tubes = [];
let selectedTubeIndex = null;
let selectedBallBlock = [];
let moveHistory = [];
let freeUndoCount = 3;
let extraTubesAdded = 0;

// DOM elements
let gameBoard, levelIndicator, undoBtn, restartBtn, addTubeBtn, winModal, nextLevelBtn, playAgainBtn, goldCoinsEl, freeUndoEl, rewardMessageEl, winAnimationContainer;

// --- Helper Functions ---

function isTubeComplete(tube) {
    return tube.length === 4 && new Set(tube).size === 1;
}

function triggerWinAnimation() {
    winAnimationContainer.innerHTML = ''; // Clear previous confetti
    winAnimationContainer.classList.remove('hidden');

    const colors = ['#f00', '#0f0', '#00f', '#ff0', '#f0f', '#0ff'];
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = `${Math.random() * 100}%`;
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = `${Math.random() * 3}s`;
        confetti.style.transform = `rotateZ(${Math.random() * 360}deg)`;
        winAnimationContainer.appendChild(confetti);
    }
}

// --- Main Functions ---

function renderBoard() {
    gameBoard.innerHTML = '';
    tubes.forEach((tubeContent, index) => {
        const tubeEl = document.createElement('div');
        tubeEl.className = 'tube';
        tubeEl.dataset.index = index;

        // Add completed class if tube is complete
        if (isTubeComplete(tubeContent)) {
            tubeEl.classList.add('completed');
        }

        tubeContent.forEach(color => {
            const ballEl = document.createElement('div');
            ballEl.className = `ball ball-${color}`;
            tubeEl.appendChild(ballEl);
        });
        tubeEl.addEventListener('click', () => onTubeClick(index));
        gameBoard.appendChild(tubeEl);
    });
}

async function checkWinCondition() {
    const isWon = tubes.every(tube => tube.length === 0 || isTubeComplete(tube));
    if (isWon) {
        triggerWinAnimation(); // Trigger confetti

        const formData = new FormData();
        formData.append('action', 'complete_ball_sort_level');
        formData.append('level', currentLevel);
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });

        // Show modal after animation
        setTimeout(() => {
            if (data.status === 'success') {
                rewardMessageEl.innerHTML = `You earned <span class="font-bold">${data.reward}</span> Gold Coin${data.reward > 1 ? 's' : ''}!`;
                updateUserGoldCoinsUI(data.new_gold_coins);
                winModal.classList.remove('hidden');
                setTimeout(() => {
                    winModal.querySelector('div').classList.add('scale-100');
                }, 10);
            } else {
                alert(data.message || 'Could not save progress.');
            }
             winAnimationContainer.classList.add('hidden'); // Hide confetti
        }, 3000); // 3 seconds delay for animation
    }
}

async function loadLevel(level) {
    currentLevel = level;
    levelIndicator.textContent = `Level: ${level}`;
    freeUndoCount = 3;
    extraTubesAdded = 0;
    updateUndoCountUI();
    
    try {
        const data = await apiRequest(`${API_URL}?action=get_ball_sort_level&level=${level}`);
        if (data.status === 'success' && Array.isArray(data.levelData)) {
            tubes = data.levelData;
            renderBoard();
            moveHistory = [];
            winModal.classList.add('hidden');
            winModal.querySelector('div').classList.remove('scale-100');
        } else {
            gameBoard.innerHTML = `<p class="text-red-500 text-center">Error: Could not load level data. ${data.message || ''}</p>`;
        }
    } catch (error) {
        console.error("Failed to load level:", error);
        gameBoard.innerHTML = `<p class="text-red-500 text-center">A network error occurred while loading the level.</p>`;
    }
}

function updateUndoCountUI() {
    freeUndoEl.textContent = freeUndoCount;
}

function updateUserGoldCoinsUI(newAmount) {
    goldCoinsEl.textContent = newAmount;
}

function setupEventListeners() {
    restartBtn.addEventListener('click', () => loadLevel(currentLevel));
    undoBtn.addEventListener('click', useUndo);
    addTubeBtn.addEventListener('click', addExtraTube);
    nextLevelBtn.addEventListener('click', () => loadLevel(currentLevel + 1));
    playAgainBtn.addEventListener('click', () => loadLevel(currentLevel));
}

function identifyTopBlock(tube) {
    if (tube.length === 0) return [];
    const topColor = tube[tube.length - 1];
    let block = [];
    for (let i = tube.length - 1; i >= 0; i--) {
        if (tube[i] === topColor) {
            block.unshift(tube[i]);
        } else {
            break;
        }
    }
    return block;
}

function onTubeClick(index) {
    // Prevent interaction with a completed tube
    if (document.querySelector(`.tube[data-index='${index}']`)?.classList.contains('completed')) {
        return;
    }
    
    // Deselect previous tube if any
    if (selectedTubeIndex !== null) {
        const prevSelectedTubeEl = document.querySelector(`[data-index='${selectedTubeIndex}']`);
        if (prevSelectedTubeEl) prevSelectedTubeEl.classList.remove('selected');
    }

    if (selectedBallBlock.length > 0) { // A block is selected, try to move
        const sourceTube = tubes[selectedTubeIndex];
        const destTube = tubes[index];

        if (selectedTubeIndex !== index && canMoveBlock(selectedBallBlock, destTube)) {
            sourceTube.splice(sourceTube.length - selectedBallBlock.length);
            destTube.push(...selectedBallBlock);
            moveHistory.push({ from: selectedTubeIndex, to: index, block: selectedBallBlock });
            renderBoard();
            checkWinCondition();
        }
        // Reset selection after move attempt
        selectedBallBlock = [];
        selectedTubeIndex = null;

    } else { // No block selected, try to select one
        const clickedTube = tubes[index];
        if (clickedTube.length > 0) {
            selectedTubeIndex = index;
            selectedBallBlock = identifyTopBlock(clickedTube);
            const currentSelectedTubeEl = document.querySelector(`[data-index='${selectedTubeIndex}']`);
            if (currentSelectedTubeEl) currentSelectedTubeEl.classList.add('selected');
        }
    }
}

function canMoveBlock(block, destTube) {
    if (block.length === 0) return false;
    // Check for space
    if (block.length > (4 - destTube.length)) return false;
    // If destination is empty, it's a valid move
    if (destTube.length === 0) return true;
    // If not empty, check if top ball color matches the block's color
    const blockColor = block[0];
    const destTopColor = destTube[destTube.length - 1];
    return blockColor === destTopColor;
}

async function useUndo() {
    if (moveHistory.length === 0) return;

    if (freeUndoCount > 0) {
        freeUndoCount--;
        undoMove();
        updateUndoCountUI();
    } else {
        if (confirm('You have no free undos left. This will cost 2 Gold Coins. Proceed?')) {
            const formData = new FormData();
            formData.append('action', 'use_ball_sort_feature');
            formData.append('feature', 'undo');
            const data = await apiRequest(API_URL, { method: 'POST', body: formData });
            if (data.status === 'success') {
                updateUserGoldCoinsUI(data.new_gold_coins);
                undoMove();
            } else {
                alert(data.message || 'Action failed.');
            }
        }
    }
}

function undoMove() {
    const lastMove = moveHistory.pop();
    // Remove the block from the destination tube
    tubes[lastMove.to].splice(tubes[lastMove.to].length - lastMove.block.length);
    // Add the block back to the source tube
    tubes[lastMove.from].push(...lastMove.block);
    renderBoard();
}

async function addExtraTube() {
    if (extraTubesAdded >= 3) {
        alert('You can add a maximum of 3 extra tubes per level.');
        return;
    }
    const costMap = { 0: 2, 1: 5, 2: 5 };
    const cost = costMap[extraTubesAdded];
    if (confirm(`This will add an extra tube for ${cost} Gold Coins. Proceed?`)) {
        const formData = new FormData();
        formData.append('action', 'use_ball_sort_feature');
        formData.append('feature', 'add_tube');
        formData.append('tubes_added', extraTubesAdded);
        const data = await apiRequest(API_URL, { method: 'POST', body: formData });
        if (data.status === 'success') {
            updateUserGoldCoinsUI(data.new_gold_coins);
            tubes.push([]);
            extraTubesAdded++;
            renderBoard();
        } else {
            alert(data.message || 'Action failed.');
        }
    }
}

export async function initBallSortGame() {
    // Assign DOM elements
    gameBoard = document.getElementById('game-board');
    levelIndicator = document.getElementById('level-indicator');
    undoBtn = document.getElementById('undo-move-btn');
    restartBtn = document.getElementById('restart-level-btn');
    addTubeBtn = document.getElementById('add-tube-btn');
    winModal = document.getElementById('win-modal');
    nextLevelBtn = document.getElementById('next-level-btn');
    playAgainBtn = document.getElementById('play-again-btn');
    goldCoinsEl = document.getElementById('user-gold-coins');
    freeUndoEl = document.getElementById('free-undo-count');
    rewardMessageEl = document.getElementById('reward-message');
    winAnimationContainer = document.getElementById('win-animation-container');

    if (!gameBoard) { return; }

    const progressData = await apiRequest(`${API_URL}?action=get_ball_sort_progress`);
    if (progressData.status === 'success') {
        currentLevel = progressData.level;
        updateUserGoldCoinsUI(progressData.gold_coins);
        await loadLevel(currentLevel);
        setupEventListeners();
    } else {
        alert("Could not load your game progress. Starting from level 1.");
        await loadLevel(1);
        setupEventListeners();
    }
}