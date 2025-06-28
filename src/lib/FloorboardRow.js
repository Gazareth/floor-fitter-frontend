import map from 'lodash/map';
import filter from 'lodash/filter';

import { groupInfo, startGroupNames, endGroupNames } from '../constants';

import { countConsecutives } from './consecutives';

export class Floorboard {
    constructor(lengthGroup, offset = 0) {
        this._lengthGroup = lengthGroup;
        this._length = parseInt(groupInfo[lengthGroup][0], 10);
        this._offset = offset;

        if (startGroupNames.includes(lengthGroup)) {
            this._isStartPiece = true;
        } else if (endGroupNames.includes(lengthGroup)) {
            this._isEndPiece = true;
        } else {
            this._isStartPiece = false;
            this._isEndPiece = false;
        }
    }

    get length() {
        return this._length;
    }

    get lengthGroup() {
        return this._lengthGroup;
    }

    get offset() {
        return this._offset;
    }

    set offset(val) {
        this._offset = val;
    }

    get isStartPiece() {
        return this._isStartPiece;
    }

    get isEndPiece() {
        return this._isEndPiece;
    }

    get isInnerPiece() {
        return !this._isStartPiece && !this._isEndPiece;
    }
}

export class FloorboardRow {
    constructor(length, index, floorboards = []) {
        this._capacity = length;
        this._floorboards = floorboards;
        this._index = index;
    }

    get capacity() {
        return this._capacity;
    }

    get currentFill() {
        return this.floorboards.reduce((accum, floorboard) => accum + floorboard.length, 0);
    }

    get currentFillproportion() {
        return this.currentFill / this._capacity;
    }

    get index() {
        return this._index;
    }

    get floorboards() {
        return this._floorboards;
    }

    set floorboards(val) {
        this._floorboards = val;
    }

    set index(val) {
        this._index = val;
    }

    isUnfinished() {
        return this.currentFillproportion < 1.0;
    }

    projectedFill(floorboard) {
        return this.currentFill + floorboard.length;
    }

    projectedFillProportion(floorboard) {
        return this.projectedFill(floorboard) / this._capacity;
    }

    canCompleteRow(floorboard, tolerance) {
        if (!this.isUnfinished()) return false;
        return this.projectedFillProportion(floorboard) < (1.0 + tolerance);
    }

    addFloorboard(floorboard) {
        this.floorboards.push(new Floorboard(floorboard.lengthGroup, this.currentFill));
    }

    get consecutives() {
        return countConsecutives(this.floorboards);
    }

    // matchesRow(siblingRow) {
    // 	const siblingBoards = siblingRow?.floorboards || [];
    // 	return isEmpty(siblingBoards)
    // 		? false
    // 		: this.floorboards.some((boardFromThis) =>
    // 			siblingBoards.some(
    // 				(siblingBoard) =>
    // 				(boardFromThis.lengthGroup === siblingBoard.lengthGroup &&
    // 					boardFromThis.offset === siblingBoard.offset)
    // 			)
    // 		);
    // }

    // matchesSiblings(prev, next) {
    // 	console.log('Checking if', this, 'matches', prev, 'or', next);
    // 	const [matchesPrev, matchesNext] = [prev, next].map(this.matchesRow.bind(this));
    // 	if (matchesPrev || matchesNext) console.log(this._index, 'Matches!', matchesPrev, matchesNext);

    // 	return matchesPrev || matchesNext;
    // }


    matchesSiblings(allRows) {
        return this.matchingBoards(allRows).length > 0;
    }

    static hasBoard(boards, specimen) {
        const match = boards.some((board) => board.lengthGroup === specimen.lengthGroup && board.offset === specimen.offset);
        // if (match) console.log("Found a match!", specimen, find(boards, (board) => board.lengthGroup === specimen.lengthGroup && board.offset === specimen.offset));
        return match;
    }

    matchingBoards(allRows) {
        const [prevBoards, nextBoards] = [this._index - 1, this._index + 1].map((i) => allRows[i]?.floorboards || []);
        const matchedIndices = map(this.floorboards, (thisBoard, i) => FloorboardRow.hasBoard(prevBoards, thisBoard) || FloorboardRow.hasBoard(nextBoards, thisBoard) ? i : false);

        const finalMatches = filter(matchedIndices, (val) => val !== false);
        // if (finalMatches.length > 0) console.log("Matching boards for ", this._index, this._floorboards, "and", prevBoards, nextBoards, "are ", finalMatches);

        return finalMatches;
    }
}
