// const input = '000000030800009150500003009007000010001806304940350020009010502608200700400708000';
const input = ('7\t0\t0\t0\t0\t0\t0\t0\t6\n' +
    '0\t0\t5\t0\t0\t0\t2\t0\t0\n' +
    '0\t3\t0\t4\t0\t7\t0\t9\t0\n' +
    '0\t0\t2\t1\t0\t8\t5\t0\t0\n' +
    '3\t0\t0\t7\t0\t9\t0\t0\t1\n' +
    '0\t0\t9\t2\t0\t4\t3\t0\t0\n' +
    '0\t8\t0\t9\t0\t1\t0\t5\t0\n' +
    '0\t0\t3\t0\t0\t0\t7\t0\t0\n' +
    '1\t0\t0\t0\t0\t0\t0\t0\t8').replace(/\s/g, '');
const waitTime = 0;
const numberOfCells = Math.pow(3,4);

class SudokuSolver {
    constructor(input) {
        if (!input) {return}
        this.unsolved = [];
        this.cells = {};
        for (let i =0; i < numberOfCells; i++) {
            this.cells[i] = new Cell(i, this);
        }
        input.split('').forEach((val, i) => {
            this.cells[+i].setVal(val);
            if (val === '0') {
                this.unsolved.push(+i);
            }
        });
    }
    setAsSolved(i, val) {
        this.cells[i].setVal(val);
        let selfIndex = this.unsolved.indexOf(i)
        this.unsolved.splice(selfIndex, 1);
    }

    clone() {
        const solver = new SudokuSolver();
        solver.unsolved = [...this.unsolved];
        solver.cells = {};
        Object.keys(this.cells).forEach(i => {
            solver.cells[i] = this.cells[i].clone(solver);
        });
        return solver;
    }

    async run() {
        let next =  this.cells[this.unsolved.shift()];
        while (next && (next.lastUnsolved === undefined || this.unsolved.length < next.lastUnsolved)) {
            const isSolvable = next.run();
            if (isSolvable === -1) {
                return;
            }
            if (!next.val) {
                this.unsolved.push(next.i);
            }
            next =  this.cells[this.unsolved.shift()];
            await new Promise(r => setTimeout(r, waitTime));
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

            const newSolver1 = this.clone();
            newSolver1.setAsSolved(minCell, op);
            newSolver1.unsolved.sort((a,b) => a-b)//.sort((a,b) => newSolver1.cells[+b].options.length-newSolver1.cells[+a].options.length)
            newSolver1.print();

            const input1 = this.toInput().split('').map((a, i) => (i === minCell) ? op : a).join('');
            const newSolver2 = new SudokuSolver(input1);
            newSolver2.unsolved.sort((a,b) => a-b)//.sort((a,b) => newSolver2.cells[+b].options.length-newSolver2.cells[+a].options.length)


            console.log(newSolver2.toInput(), newSolver1.toInput(), newSolver2.toInput() === newSolver1.toInput());
            console.log(newSolver2.unsolved, newSolver1.unsolved, newSolver2.unsolved.join(',') === newSolver1.unsolved.join(','));

            const solution = await newSolver1.run();

            if (solution) {
                return solution;
            }
        }
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

document.addEventListener('DOMContentLoaded', async () => {
    const solver = new SudokuSolver(input);
    const start = new Date().getTime();
    const solution = await solver.run();
    console.log(input);
    console.log(solution);
    console.log(`solved in ${(new Date().getTime() - start) /1000}s`);
});


class Cell {
    constructor(i, solver) {
        if (i === undefined) {return}
        this.i = i;
        this.solver = solver;
        this.options = '123456789'.split('');
        this.row = Math.floor(this.i / 9);
        this.cell = i % 9;
        const triple = Math.floor(this.row / 3) * 3 + Math.floor(this.cell / 3);
        const tripleCell = (this.row % 3) *3 + this.cell % 3;
        this.setRelatedCells(triple);
        this.element = document.getElementsByClassName('triple')[triple].getElementsByClassName('cell')[tripleCell];
    }

    clone(solver) {
        const cell = new Cell();
        cell.i = this.i;
        cell.val = this.val;
        cell.solver = solver;
        cell.options = [...this.options];
        cell.relatedCells = [...this.relatedCells];
        cell.element = this.element;
        cell.row = this.row;
        cell.cell = this.cell;
        return cell;
    }

    setRelatedCells(triple) {
        this.relatedCells = [];
        this.tripleStart = (Math.floor(triple / 3)) * 27 + (triple % 3) * 3
        for (let i = 0; i < 9; i++) {
            this.relatedCells.push(this.row * 9 + i)
            this.relatedCells.push(i * 9 + this.cell)
            this.relatedCells.push(this.tripleStart + Math.floor(i / 3)*9 + i % 3)
        }
        let selfIndex = this.relatedCells.indexOf(this.i)
        while (selfIndex !== -1) {
            this.relatedCells.splice(selfIndex, 1);
            selfIndex = this.relatedCells.indexOf(this.i)
        }
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
        this.element.innerText = !!this.val ? this.val : '';
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
        let style = `background: rgba(0,0,256,${(this.options.length/9*0.8).toFixed(1)});`
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


