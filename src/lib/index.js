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
		...floorboards.filter((fb) => fb.isInnerPiece),
		...floorboards.filter((fb) => !fb.isInnerPiece)
	];	// Make sure non-inner pieces are at the end

	let fittedRows = [...floorboardRows];
	let excessFloorboards = [];

	// floorboardStock = orderBy(floorboardStock, (floorboard) => parseInt(floorboard.length, 10), "desc");
	// floorboardStock = shuffle(floorboardStock);

	while (floorboardStock.length > 0) {
		const floorboard = floorboardStock[0];
		const foundFloorboardRowIndex = findIndex(fittedRows, (fittedRow) =>
			findBestFitForRow(fittedRow, floorboard, floorboardStock, tolerance)
		);
		const foundFloorboardRow = fittedRows[foundFloorboardRowIndex];

		if (foundFloorboardRow) {
			foundFloorboardRow.addFloorboard(floorboardStock.shift(), foundFloorboardRowIndex);
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

const findBestFitForRow = (floorboardRow, currentFloorboard, remainingFloorboards, tolerance) => {
	let currentTolerance = tolerance;

	const isProjectionWithinTolerance =
		floorboardRow.canCompleteRow(currentFloorboard, tolerance);

	const rowIsNotFull = floorboardRow.isUnfinished();

	if (rowIsNotFull) {
		if (isProjectionWithinTolerance) {
			// See if any other floorboard would fit better
			const currentProjectedFill = floorboardRow.projectedFill(currentFloorboard);

			// But only if this one brings us to over capacity
			if (currentProjectedFill > floorboardRow.capacity) {
				// Look for another floorboard that might fit better
				const potentialBetterFit = find(remainingFloorboards, (potentialFloorboard) => {
					const potentialProjected = floorboardRow.projectedFill(potentialFloorboard);
					return (
						potentialProjected > floorboardRow.capacity && potentialProjected < currentProjectedFill
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
				return true;
			}
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