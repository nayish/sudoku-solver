const easy = '600120384008459072000006005000264030070080006940003000310000050089700000502000190';
const medium = '040100050107003960520008000000000017000906800803050620090060543600080700250097100';
const hard = '700000006005000200030407090002108500300709001009204300080901050003000700100000008';

const waitTime = 0;
const numberOfCells = Math.pow(3,4);
let stop = true;
let currentSelected = 0;

let solver;

const place = {};
for (let i=0;i<numberOfCells;i++) {
    place[convertCellToPlace(i)] = i;
}

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('load').addEventListener('click', () => {
        document.getElementById('time').innerText = '';
        stop = true;
        let moo =  document.getElementById('input').value.replace(/[^0-9]/g, '');
        document.getElementById('input').value = moo

        setTimeout(() => window.localStorage.setItem('state', JSON.stringify({input: moo, currentSelected})), 0);
        solver = new SudokuSolver(moo);
        validate()

    });

    document.getElementById('run').addEventListener('click', async () => {
        const start = new Date().getTime();
        stop = false;
        const input = solver.toInput();
        const solution = await solver.run();
        validate(solution)
        document.getElementById('time').innerText = `solved in ${(new Date().getTime() - start) /1000}s`;
    });

    Array.from(document.getElementsByClassName('cell')).forEach((el, i) => {
        el.addEventListener('focus', (ev) => {
            currentSelected = place[i];
            document.getElementById('load').click();
        });
        el.tabIndex = place[i] + 2;
        el.addEventListener('input', (ev) => {
            let value = document.getElementById('input').value.replace(/[^0-9]/g, '')
            const index = convertCellToPlace(i)
            while (value.length < index) {
                value += '0';
            }
            const current = ((ev.data && ev.data[0]) || el.innerText[el.innerText.length-1] || '0').replace(/[^0-9]/g, '0')

            value = value.substring(0, index) + current + value.substring(index + 1);
            document.getElementById('input').value = value
            document.getElementById('load').click();
            if (current === '0') {
                el.innerText = '';
            } else {
                el.innerText = current;
                document.getSelection().getRangeAt(0).setStart(el, 1);
                document.getSelection().getRangeAt(0).setEnd(el, 1);
            }
        });
    });

    document.getElementById('easy').addEventListener('click', () => {
        getSudoku('easy');
    });

    document.getElementById('hard').addEventListener('click', () => {
        getSudoku('hard');
    });

    document.getElementById('medium').addEventListener('click', () => {
        getSudoku('medium');
    });

    document.getElementById('clear').addEventListener('click', () => {
        document.getElementById('input').value = '';
        document.getElementById('load').click();
    });

    try {
        const stateJson = window.localStorage.getItem('state');
        const state = JSON.parse(stateJson);

        currentSelected = state.currentSelected;
        document.getElementById('input').value = state.input;
        //setTimeout(() => {
            const el = document.getElementsByClassName('cell')[convertCellToPlace(currentSelected)];
            el.focus();
            el.setSelectionRange(0,0);
        //}, 0);
    } catch {
        //
    }

    document.getElementById('load').click();
});

async function getSudoku(level) {
    const data = await(await fetch(`https://sugoku.herokuapp.com/board?difficulty=${level}`)).json();
    document.getElementById('input').value = data.board.map(a=> a.join('')).join('');
    document.getElementById('load').click();
}

function validate(solution) {
    document.getElementById('run').disabled = !solver.isValid || (solution && solution.indexOf('0') === -1);
    document.getElementById('error').style = solver.isValid ? "display: none;": '';
}


class Cell {
    constructor(i, solver) {
        if (i === undefined) {return}
        this.i = i;
        this.solver = solver;
        this.options = '123456789'.split('');
        this.row = Math.floor(this.i / 9);
        this.cell = i % 9;
        this.triple = Math.floor(this.row / 3) * 3 + Math.floor(this.cell / 3);
        const tripleCell = (this.row % 3) *3 + this.cell % 3;
        this.relatedCells = this.getRelatedCells();
        this.element = document.getElementsByClassName('triple')[this.triple].getElementsByClassName('cell')[tripleCell];
    }

    clone(solver) {
        const cell = new Cell();
        cell.i = this.i;
        cell.val = this.val;
        cell.solver = solver;
        cell.triple = this.triple;
        cell.options = [...this.options];
        cell.relatedCells = [...this.relatedCells];
        cell.element = this.element;
        cell.row = this.row;
        cell.cell = this.cell;
        return cell;
    }

    getRelatedCells(triple) {
        let relatedCells = [];
        this.tripleStart = (Math.floor(this.triple / 3)) * 27 + (this.triple % 3) * 3
        for (let i = 0; i < 9; i++) {
            relatedCells.push(this.row * 9 + i)
            relatedCells.push(i * 9 + this.cell)
            relatedCells.push(this.tripleStart + Math.floor(i / 3)*9 + i % 3)
        }
        let selfIndex = relatedCells.indexOf(this.i)
        while (selfIndex !== -1) {
            relatedCells.splice(selfIndex, 1);
            selfIndex = relatedCells.indexOf(this.i)
        }

        return relatedCells;
    }

    setVal(val) {
        this.val = val !== '0' ?  val : undefined;
        this.print();
        if (this.val) {
            this.options = [];
            this.updateAllCells();
        }
        this.setBg();
    }

    print() {
        if (!this.val) {
            this.element.innerText = ''
            return;
        }
        if (document.activeElement !== this.element) {
            this.element.innerText = this.val;
        }
    }

    removeOption(val) {
        if (this.options.length === 0) {
            return;
        }
        const index = this.options.indexOf(val);
        if (index !== -1) {
            this.options.splice(index, 1);
        }
        this.setBg();
        return true;
    }

    setBg() {
        let style = `background: rgba(0,0,256,${(this.options.length/9*0.7).toFixed(1)});`
        this.element.style = style;
    }

    updateAllCells() {
        this.relatedCells = this.relatedCells.filter((i) => this.solver.cells[i].removeOption(this.val));
    }

    run() {
        this.lastUnsolved = this.solver.unsolved.length;
        if (this.options.length === 1) {
            this.val = this.options[0];
            this.options = [];
            this.print();
            this.setBg();
            this.updateAllCells();
        } else if (this.options.length === 0) {
            return -1;
        }
    }
}

function convertCellToPlace (i) {
    const triple = Math.floor(i / 9)
    const tripleCell = i % 9

    const startColumn = triple % 3
    const offsiteColumn = tripleCell % 3
    const startRow = Math.floor(triple / 3)
    const offsiteRow = Math.floor(tripleCell / 3)
    const row = 3 * startRow + offsiteRow;
    const column = 3* startColumn + offsiteColumn;
    return column + row * 9;
}

class SudokuSolver {
    constructor(input) {
        if (input === undefined) {return}
        this.unsolved = [];
        this.cells = {};
        for (let i =0; i < numberOfCells; i++) {
            this.cells[i] = new Cell(i, this);
        }
        for (let i =0; i < numberOfCells; i++) {
            const val = input[i];
            this.cells[+i].setVal(val);
            if (val === '0' || !val) {
                this.unsolved.push(+i);
            }
        }

        this.isValid = this.valid();
    }

    valid() {
        let valid = true;
        Object.values(this.cells).forEach(cell => {
            if ((cell.val && cell.getRelatedCells().map(o => this.cells[+o].val).indexOf(cell.val) > -1) ||
                (!cell.val && cell.options.length === 0)) {
                cell.element.style += '; background: red;';
                valid = false;
            }
        })

        return valid;
    }

    setAsSolved(i, val) {
        this.cells[i].setVal(val);
        let selfIndex = this.unsolved.indexOf(i)
        this.unsolved.splice(selfIndex, 1);
    }

    clone() {
        const solver = new SudokuSolver();
        solver.isValid = this.isValid;
        solver.unsolved = [...this.unsolved];
        solver.cells = {};
        Object.keys(this.cells).forEach(i => {
            solver.cells[i] = this.cells[i].clone(solver);
        });
        return solver;
    }

    async run() {
        if (!this.isValid) {
            return;
        }
        let next =  this.cells[this.unsolved.shift()];
        while (next && (next.lastUnsolved === undefined || this.unsolved.length < next.lastUnsolved) && !stop) {
            const isSolvable = next.run();
            if (isSolvable === -1) {
                this.isValid = this.valid()
                return;
            }
            if (!next.val) {
                this.unsolved.push(next.i);
            }
            next =  this.cells[this.unsolved.shift()];
            await new Promise(r => setTimeout(r, waitTime));
        }

        if (stop) {
            return false;
        }

        if (this.isDone()) {
            return this.toInput();
        }
        if (next) {
            this.unsolved.push(next.i);
        }

        let minVal = 10;
        let minCell = undefined;

        this.unsolved.forEach((i) => {
            const opts = this.cells[i].options.length;
            if (opts < minVal) {
                minVal = opts;
                minCell = i;
            }
        });

        for (let i=0; i<this.cells[minCell].options.length; i++) {
            const op = this.cells[minCell].options[i];

            // const newSolver1 = this.clone();
            // newSolver1.setAsSolved(minCell, op);
            // newSolver1.print();

            const input1 = this.toInput().split('').map((a, i) => (i === minCell) ? op : a).join('');
            const newSolver2 = new SudokuSolver(input1);

            const solution = await newSolver2.run();

            if (solution) {
                return solution;
            }
        }
        this.isValid = false;
    }

    print() {
        Object.values(this.cells).forEach(cell => cell.print());
    }

    isDone() {
        return this.unsolved.length === 0;
    }

    toInput() {
        return Object.values(this.cells).map(c => c.val || '0').join('');
    }
}

document.addEventListener('touchstart', handleTouchStart, false);
document.addEventListener('touchmove', handleTouchMove, false);

var xDown = null;
var yDown = null;

function getTouches(evt) {
    return evt.touches ||             // browser API
        evt.originalEvent.touches; // jQuery
}

function handleTouchStart(evt) {
    const firstTouch = getTouches(evt)[0];
    xDown = firstTouch.clientX;
    yDown = firstTouch.clientY;
};

function handleTouchMove(evt) {
    if ( ! xDown || ! yDown ) {
        return;
    }

    var xUp = evt.touches[0].clientX;
    var yUp = evt.touches[0].clientY;

    var xDiff = xDown - xUp;
    var yDiff = yDown - yUp;

    if ( Math.abs( xDiff ) > Math.abs( yDiff ) ) {/*most significant*/
        if ( xDiff > 10 ) {
            leftSwipe();
        } else if (xDiff < -10) {
            rightSwipe()
        }
    } else {
        if ( yDiff > 10 ) {
            upSwipe()
        } else if ( yDiff < -10 ) {
            downSwipe()
        }
    }
    /* reset values */
    xDown = null;
    yDown = null;
};

function leftSwipe() {
    const next = (currentSelected % 9 === 0)? currentSelected + 8 : (currentSelected - 1) % numberOfCells;
    const el = Array.from(document.getElementsByClassName('cell'))[convertCellToPlace(next)]
    el.focus();
}

function rightSwipe() {
    const next = (currentSelected % 9 === 8)? currentSelected - 8 : (currentSelected + 1) % numberOfCells;
    const el = Array.from(document.getElementsByClassName('cell'))[convertCellToPlace(next)]
    el.focus();
}

function upSwipe() {
    const next = (currentSelected - 9 + numberOfCells) % numberOfCells;
    const el = Array.from(document.getElementsByClassName('cell'))[convertCellToPlace(next)]
    el.focus();
}

function downSwipe() {
    const next = (currentSelected + 9 + numberOfCells) % numberOfCells;
    const el = Array.from(document.getElementsByClassName('cell'))[convertCellToPlace(next)]
    el.focus();
}

document.onkeydown = function(e) {
    switch (e.keyCode) {
        case 37:
            leftSwipe();
            break;
        case 38:
            upSwipe();
            break;
        case 39:
            rightSwipe();
            break;
        case 40:
            downSwipe();
            break;
    }
};



