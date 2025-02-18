class PuzzleGame {
    constructor(size = 3) {
        this.size = size;
        this.moves = 0;
        this.history = [];
        this.startTime = null;
        this.timerInterval = null;
        this.achievements = new Set(JSON.parse(localStorage.getItem('achievements') || '[]'));
        this.initializeGame();
        this.initializeEventListeners();
        this.initializeRulesModal();
    }

    initializeGame() {
        // 生成打乱的数字数组
        this.board = Array.from({length: this.size * this.size - 1}, (_, i) => i + 1);
        this.board.push(0); // 0 表示空格
        this.shuffleBoard();
        this.moves = 0;
        this.updateMoves();
        this.startTimer();
        this.renderBoard();
    }

    shuffleBoard() {
        for (let i = this.board.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.board[i], this.board[j]] = [this.board[j], this.board[i]];
        }
        // 确保生成的棋盘可解
        if (!this.isSolvable()) {
            if (this.getEmptyTileIndex() < 2) {
                [this.board[this.board.length-2], this.board[this.board.length-1]] = 
                [this.board[this.board.length-1], this.board[this.board.length-2]];
            } else {
                [this.board[0], this.board[1]] = [this.board[1], this.board[0]];
            }
        }
    }

    isSolvable() {
        let inversions = 0;
        const board = this.board.filter(num => num !== 0);
        
        for (let i = 0; i < board.length - 1; i++) {
            for (let j = i + 1; j < board.length; j++) {
                if (board[i] > board[j]) inversions++;
            }
        }

        if (this.size % 2 === 1) {
            return inversions % 2 === 0;
        } else {
            const emptyRowFromBottom = this.size - Math.floor(this.getEmptyTileIndex() / this.size);
            return (inversions + emptyRowFromBottom) % 2 === 0;
        }
    }

    renderBoard() {
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;
        gameBoard.innerHTML = '';

        this.board.forEach((num, index) => {
            const tile = document.createElement('div');
            tile.className = `tile${num === 0 ? ' empty' : ''}`;
            tile.textContent = num || '';
            tile.addEventListener('click', () => this.handleTileClick(index));
            gameBoard.appendChild(tile);
        });
    }

    handleTileClick(index) {
        if (this.canMoveTile(index)) {
            const emptyIndex = this.getEmptyTileIndex();
            this.history.push([...this.board]);
            [this.board[index], this.board[emptyIndex]] = [this.board[emptyIndex], this.board[index]];
            
            // 添加移动动画
            const tiles = document.querySelectorAll('.tile');
            tiles[index].classList.add('moving');
            setTimeout(() => tiles[index].classList.remove('moving'), 300);

            this.moves++;
            this.updateMoves();
            this.renderBoard();

            if (this.isComplete()) {
                this.handleGameComplete();
            }
        }
    }

    canMoveTile(index) {
        const emptyIndex = this.getEmptyTileIndex();
        const row = Math.floor(index / this.size);
        const emptyRow = Math.floor(emptyIndex / this.size);
        const col = index % this.size;
        const emptyCol = emptyIndex % this.size;

        return (row === emptyRow && Math.abs(col - emptyCol) === 1) ||
               (col === emptyCol && Math.abs(row - emptyRow) === 1);
    }

    getEmptyTileIndex() {
        return this.board.indexOf(0);
    }

    isComplete() {
        return this.board.every((num, index) => 
            index === this.board.length - 1 ? num === 0 : num === index + 1
        );
    }

    handleGameComplete() {
        clearInterval(this.timerInterval);
        document.getElementById('gameBoard').classList.add('victory');
        setTimeout(() => document.getElementById('gameBoard').classList.remove('victory'), 1000);

        // 检查并解锁成就
        const time = Math.floor((Date.now() - this.startTime) / 1000);
        if (this.size === 3 && time <= 60) {
            this.unlockAchievement('speed_demon');
        }
        if (this.size === 5) {
            this.unlockAchievement('master');
        }
        const minMoves = this.calculateMinimumMoves();
        if (this.moves <= minMoves * 1.2) { // 允许比最优解多20%的步数
            this.unlockAchievement('perfect_solve');
        }
    }

    calculateMinimumMoves() {
        let count = 0;
        for (let i = 0; i < this.board.length; i++) {
            if (this.board[i] !== 0) {
                const currentPos = i;
                const targetPos = this.board[i] - 1;
                const currentRow = Math.floor(currentPos / this.size);
                const currentCol = currentPos % this.size;
                const targetRow = Math.floor(targetPos / this.size);
                const targetCol = targetPos % this.size;
                count += Math.abs(currentRow - targetRow) + Math.abs(currentCol - targetCol);
            }
        }
        return count;
    }

    unlockAchievement(achievementId) {
        if (!this.achievements.has(achievementId)) {
            this.achievements.add(achievementId);
            localStorage.setItem('achievements', JSON.stringify([...this.achievements]));
            document.querySelector(`[data-id="${achievementId}"]`).classList.add('unlocked');
        }
    }

    updateMoves() {
        document.getElementById('moves').textContent = this.moves;
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.startTime = Date.now();
        const timerElement = document.getElementById('timer');
        
        this.timerInterval = setInterval(() => {
            const seconds = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            timerElement.textContent = 
                `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    undo() {
        if (this.history.length > 0) {
            this.board = this.history.pop();
            this.moves--;
            this.updateMoves();
            this.renderBoard();
        }
    }

    hint() {
        const emptyIndex = this.getEmptyTileIndex();
        let bestMove = null;
        let bestScore = Infinity;

        // 检查所有可能的移动
        for (let i = 0; i < this.board.length; i++) {
            if (this.canMoveTile(i)) {
                // 模拟移动
                [this.board[i], this.board[emptyIndex]] = [this.board[emptyIndex], this.board[i]];
                const score = this.calculateHeuristic();
                if (score < bestScore) {
                    bestScore = score;
                    bestMove = i;
                }
                // 撤销移动
                [this.board[i], this.board[emptyIndex]] = [this.board[emptyIndex], this.board[i]];
            }
        }

        if (bestMove !== null) {
            const tiles = document.querySelectorAll('.tile');
            tiles[bestMove].style.backgroundColor = '#ffd700';
            setTimeout(() => {
                tiles[bestMove].style.backgroundColor = '';
            }, 1000);
        }
    }

    calculateHeuristic() {
        let score = 0;
        for (let i = 0; i < this.board.length; i++) {
            if (this.board[i] !== 0) {
                const currentPos = i;
                const targetPos = this.board[i] - 1;
                const currentRow = Math.floor(currentPos / this.size);
                const currentCol = currentPos % this.size;
                const targetRow = Math.floor(targetPos / this.size);
                const targetCol = targetPos % this.size;
                score += Math.abs(currentRow - targetRow) + Math.abs(currentCol - targetCol);
            }
        }
        return score;
    }

    initializeEventListeners() {
        // 新游戏按钮
        document.getElementById('newGame').addEventListener('click', () => {
            this.initializeGame();
        });

        // 棋盘大小选择
        document.getElementById('boardSize').addEventListener('change', (e) => {
            this.size = parseInt(e.target.value);
            this.initializeGame();
        });

        // 撤销按钮
        document.getElementById('undo').addEventListener('click', () => {
            this.undo();
        });

        // 更换背景
        document.getElementById('changeBg').addEventListener('click', () => {
            document.getElementById('bgImage').click();
        });

        document.getElementById('bgImage').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('gameBoard').style.backgroundImage = `url(${e.target.result})`;
                    document.getElementById('gameBoard').style.backgroundSize = 'cover';
                };
                reader.readAsDataURL(file);
            }
        });

        // 加载已解锁的成就
        this.achievements.forEach(achievementId => {
            document.querySelector(`[data-id="${achievementId}"]`).classList.add('unlocked');
        });
    }

    initializeRulesModal() {
        const modal = document.getElementById('rulesModal');
        const rulesBtn = document.getElementById('rules');
        const closeBtn = modal.querySelector('.close');

        rulesBtn.addEventListener('click', () => {
            modal.style.display = 'block';
        });

        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
}

// 初始化游戏
const game = new PuzzleGame(3);


