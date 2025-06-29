// @ts-nocheck
import forEach from 'lodash/forEach';
import find from 'lodash/find';
import findIndex from 'lodash/findIndex';
import shuffle from 'lodash/shuffle';
import min from 'lodash/min';
import map from 'lodash/map';
import sum from 'lodash/sum';
import values from 'lodash/values';
import isEmpty from 'lodash/isEmpty';
import isEqual from 'lodash/isEqual';
import filter from 'lodash/filter';

import { saveAs } from 'file-saver';

import { array_move } from './lib';
import { groupInfo, CHIMNEY_BREAST } from '../constants';

import { Floorboard, FloorboardRow } from './FloorboardRow';

import { totalConsecutives } from './consecutives';


export const createFloorboards = () => {
	let floorboards = [];

	forEach(groupInfo, ([length, count], lengthGroup) => {
		const arr = Array(count).fill(new Floorboard(lengthGroup));

		arr.forEach((floorBoard) => floorboards.push(floorBoard));
	});

	return floorboards;
};

export const shuffleFloorboards = (floorboards) => {
	let shuffledBoards = shuffle(floorboards);

	// Move around consecutive boards of the same type
	while (totalConsecutives(shuffledBoards) > 0) {
		shuffledBoards = moveConsec(shuffledBoards);
	}

	return shuffledBoards;
}

export const calculateRoomRows = (roomWidthStr, boardWidthStr) => {
	// @todo: also consider fireplace
	const roomWidth = parseFloat(roomWidthStr, 10);
	const boardWidth = parseFloat(boardWidthStr, 10);

	return roomWidth / boardWidth;
};

export const fitFloorboards = (floorboards, roomWidthStr, roomLengthStr, boardWidthStr) => {
	const numRows = calculateRoomRows(roomWidthStr, boardWidthStr);

	const chimneyRows = CHIMNEY_BREAST.width / parseFloat(boardWidthStr, 10);

	const fullRows = Array(Math.floor(numRows - chimneyRows))
		.fill(0)
		.map((_, i) => new FloorboardRow(parseFloat(roomLengthStr), i));

	const roomLengthFloat = parseFloat(roomLengthStr);
	const partialRows = [
		CHIMNEY_BREAST.offset,
		roomLengthFloat - CHIMNEY_BREAST.offset - CHIMNEY_BREAST.length
	];
	const allPartialRows = [...partialRows, ...partialRows].sort().reverse();

	const allRows = [
		...fullRows,
		//...allPartialRows.map((rowLength, i) => new FloorboardRow(rowLength, i + fullRows.length))
	];

	// const thinRowWidth = numRows - Math.floor(numRows);

	// Implement "best fit" algorithm
	const fittedFloor = bestFitFloor(floorboards, allRows);

	const nonConsecFloor = moveFittedConsecs(fittedFloor)

	return nonConsecFloor;
};

const moveFittedConsecs = (fittedFloor) => {
	let nonConsecFloor = fittedFloor;

	nonConsecFloor.forEach((floorRow, i) => {
		let boards = floorRow.floorboards;

		// Move around consecutive boards of the same type
		while (totalConsecutives(boards) > 0) {
			let newBoards = moveConsec(boards);

			if (isEqual(boards, newBoards)) { break; }
			boards = newboards;
		}

		nonConsecFloor[i].floorboards = boards;
	})

	return nonConsecFloor
}

export const bestFitFloor = (floorboards, floorboardRows, tolerance = 0.05) => {
	let floorboardStock = [
		// Prefer start & end pieces first
		...floorboards.filter((fb) => fb.isInnerPiece),
		// ...floorboards.filter((fb) => fb.isEndPiece),
	];	// Make sure non-inner pieces are at the end

	let startPieces = [...floorboards.filter((fb) => fb.isStartPiece)];
	let endPieces = [...floorboards.filter((fb) => fb.isEndPiece)].sort((a, b) => a.length - b.length);

	let fittedRows = [...floorboardRows];
	let excessFloorboards = [];

	while (floorboardStock.length > 0) {
		const floorboard = floorboardStock[0];
		let foundRowIndex = -1;

		for (let i = 0; i < fittedRows.length; i++) {
			const fittedRow = fittedRows[i];
			if (!fittedRow.isUnfinished) {
				console.log("Row is full, skipping", i);
				continue;
			}

			// If this row is empty, we can just add the start piece
			if (fittedRow.isEmpty) {
				if (startPieces.length > 0) {
					const startPiece = startPieces.shift();
					fittedRow.addFloorboard(startPiece);
					console.log("Adding start piece to row", i, startPiece.lengthGroup);
				} else {
					console.log("Row is empty, but no start pieces left", i);
				}
			} else {
				// See if any end pieces will finish the row
				const endPieceIndex = endPieces.findIndex((endPiece) => {
					return fittedRow.willOverfillRow(endPiece, tolerance);
				});

				if (endPieceIndex > -1) {
					const [endPiece] = endPieces.splice(endPieceIndex, 1);
					fittedRow.addFloorboard(endPiece);
					console.log("Adding endpiece to row", i, endPiece);
					continue;
				} else {
					console.log("No end piece will fit in row", i);
				}
			}

			if (shouldJoinRow(fittedRow, floorboard, floorboardStock, tolerance)) {
				// console.log("Joining row", i, "with floorboard", floorboard);
				foundRowIndex = i;
				break; // try next row
			}
		}

		const foundFloorboardRow = fittedRows[foundRowIndex];

		if (foundFloorboardRow) {
			console.log("adding floorboard to row", foundRowIndex, floorboard.lengthGroup);
			foundFloorboardRow.addFloorboard(floorboardStock.shift());
		} else {
			// console.error(
			// 	'Could not find a row with enough room for floorboard',
			// 	floorboard,
			// 	`[floorboards: ${floorboardStock.length}, rows: ${fittedRows.length}`
			// );
			excessFloorboards.push(floorboardStock.shift());
			// throw Error('Quitting...');
		}
	}

	console.log("Excess floorboards:", excessFloorboards);

	return fittedRows;
};

const shouldJoinRow = (floorboardRow, currentFloorboard, remainingFloorboards, tolerance) => {

	if (floorboardRow.canJoinRow(currentFloorboard, tolerance)) {
		// See if any other floorboard would fit better
		const currentProjectedFill = floorboardRow.willOverfillRow(currentFloorboard);

		// But only if this one brings us to over capacity
		if (currentProjectedFill > floorboardRow.capacity) {
			// Look for another floorboard that might fit better
			const potentialBetterFit = find(remainingFloorboards, (potentialFloorboard) => {
				const potentialProjected = floorboardRow.projectedFill(potentialFloorboard);
				return (
					floorboardRow.willOverfillRow(potentialFloorboard) && potentialProjected < currentProjectedFill
				);
			});
			if (potentialBetterFit) {
				return false;
			}
		}
		return true;
	} else {
		// If not in tolerance but there are no more boards that will fit, we might just have to use this one...

		// Get smallest available board
		const smallestRemainingBoardLength =
			min(map(remainingFloorboards, 'length')) || currentFloorboard.length;

		if (smallestRemainingBoardLength >= currentFloorboard.length) {
			console.log("Reluctantly joining row", floorboardRow.index, "with floorboard", currentFloorboard.lengthGroup);
			return true;
		}
	}

	return false;
};


export const moveConsec = (floorboards) => {
	let consecIndex;
	let consecGroup;
	let prevGroup;

	// Find consec index
	floorboards.some((fb, i) => {
		if (fb.lengthGroup === prevGroup) {
			consecIndex = i;
			consecGroup = fb.lengthGroup;
			return true;
		} else {
			prevGroup = fb.lengthGroup;
		}
	});

	prevGroup = undefined;
	let newIndex;

	// Find new location
	floorboards.some((fb, i) => {
		if (fb.lengthGroup !== prevGroup) {
			const lg = fb.lengthGroup;
			const nextGroup = floorboards[i + 1]?.lengthGroup;

			if (![nextGroup, prevGroup, consecGroup].includes(lg) && nextGroup != prevGroup) {
				newIndex = i;
				return true;
			} else {
				prevGroup = fb.lengthGroup;
			}
		}
	});

	return array_move(floorboards, consecIndex, newIndex);
};


export const saveFloorboardsUrl = (fittedFloor) => {
	const saveableFloor = fittedFloor.map((floorRow) => {
		const rawObjBoards = floorRow.floorboards.map((board) => ({ lengthGroup: board.lengthGroup, offset: board.offset }));

		return { floorboards: rawObjBoards, index: floorRow.index, length: floorRow.capacity }
	});

	const fileName = prompt("Enter file name");

	return saveAs(new Blob([JSON.stringify(saveableFloor)]), fileName || "floorboards.json");
}

export const parseToFittedFloor = (jsonStr) => {
	const parsedData = JSON.parse(jsonStr);

	const newData = parsedData.map(({ length, index, floorboards }) => new FloorboardRow(length, index, floorboards.map(({ lengthGroup, offset }) => new Floorboard(lengthGroup, offset))));
	console.log("New data !", newData);

	return newData;
}