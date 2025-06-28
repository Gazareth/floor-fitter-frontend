<script lang="ts">
	import sum from 'lodash/sum';
	import values from 'lodash/values';
	import flatten from 'lodash/flatten';
	import round from 'lodash/round';
	import shuffle from 'lodash/shuffle';

	import FloorboardRow from '../components/FloorboardRow.svelte';
	import FloorboardFileInput from '../components/FloorboardFileInput.svelte';
	import {
		createFloorboards,
		shuffleFloorboards,
		fitFloorboards,
		saveFloorboardsUrl,
		parseToFittedFloor
	} from '../lib/index';
	import { countConsecutives } from '../lib/consecutives';
	import { FloorboardRow as FloorboardRowClass } from '../lib/FloorboardRow';
	import {
		roomWidthStr,
		roomLengthStr,
		boardWidthStr,
		WHOLE_ROOM_CENTER_OFFSET
	} from '../constants';

	let consecs = {};
	let postFitConsecs = [];
	let rowMatchingSiblings = [];
	let numAdjacents = 0;
	let overfill = [];

	let floorboards = createFloorboards();
	let fittedFloor: FloorboardRowClass[] = [];

	let markedRow = null;

	const onClickShuffle = () => {
		floorboards = shuffleFloorboards(floorboards);
	};

	const onClickShuffleRows = () => {
		fittedFloor = [...shuffle(fittedFloor.slice(0, -4)), ...fittedFloor.slice(-4)];
		fittedFloor.forEach((floorRow, i) => {
			floorRow.index = i;
		});
		// fittedFloor = fittedFloor;
	};

	const onClickMarkRow = (i) => () => {
		if (markedRow === null) {
			markedRow = i;
		} else if (markedRow == i) {
			markedRow = null;
		} else {
			console.log('Swapping!', markedRow, i);
			[fittedFloor[markedRow], fittedFloor[i]] = [fittedFloor[i], fittedFloor[markedRow]];
			fittedFloor.forEach((floorRow, i) => {
				floorRow.index = i;
			});
			markedRow = null;
		}
	};

	const onClickSaveAs = () => {
		return saveFloorboardsUrl(fittedFloor);
	};

	export let setFileData = (data) => {
		console.log('Setting file data!!!');
		if (data !== null) {
			fittedFloor = parseToFittedFloor(data);
		}
	};

	$: {
		consecs = countConsecutives(floorboards);
		fittedFloor = fitFloorboards(floorboards, roomWidthStr, roomLengthStr, boardWidthStr);
	}

	$: {
		postFitConsecs = flatten(fittedFloor.map((floorRow) => values(floorRow.consecutives)));
		numAdjacents = sum(fittedFloor.map((row) => row.matchingBoards(fittedFloor).length));
		rowMatchingSiblings = fittedFloor.map((floorRow, i) => {
			return floorRow.matchesSiblings(fittedFloor);
		});
		overfill = fittedFloor
			.filter((row) => row.currentFill > row.capacity)
			.map((row) => round(row.currentFill - row.capacity, 2));
	}

	const boardWidthFloat = parseFloat(boardWidthStr);
</script>

<div>
	<h1 class="text-3xl font-bold text-center">Floor fitter frontend</h1>
	<!-- <h2 class="text-2xl font-bold text-center">Consecutives:</h2> -->
	<!-- <h2 class="text-xl font-bold text-center">{JSON.stringify(consecs)}</h2> -->
	<h2 class="my-5 text-lg font-bold text-center">
		Total consecutives (pre-fitting): <span class="font-mono text-white"
			>{sum(values(consecs))}</span
		>
	</h2>
	<h2 class="my-5 text-lg font-bold text-center">
		Total consecutives (post-fitting): <span class="font-mono text-white"
			>{sum(postFitConsecs)}</span
		>
	</h2>
	<h2 class="my-5 text-lg font-bold text-center">
		Total adjacent matches: <span class="font-mono text-white">{numAdjacents}</span>
	</h2>
	<h2 class="text-lg font-bold text-center mt-4 mb-2">
		Total overfill: <span class="font-mono text-white">{round(sum(overfill), 2)}</span>cm
	</h2>
	<h2 class="text-md font-bold text-center mb-4">
		{overfill.map((val) => round(val)).join(' | ')}
	</h2>
	<hr />
	<div class="flex justify-center space-x-4 mt-5">
		<button class="btn btn-primary" on:click={onClickShuffle}>Shuffle</button>
		<button class="btn btn-secondary" on:click={onClickShuffleRows}>Shuffle Rows</button>
		<button class="btn" on:click={onClickSaveAs}>Save</button>
		<FloorboardFileInput {setFileData} />
	</div>
	<!-- <h2 class="text-xl font-bold text-center">
		Matches: {JSON.stringify(rowMatchingSiblings)}
	</h2>
	<h2 class="text-lg font-bold text-center">
		Total matching rows: {filter(rowMatchingSiblings).length}
	</h2> -->
	<div>
		<div class="h-full flex justify-center scale-150 scale-x-150">
			<div class="m-auto relative scale-x-150 scale-y-110">
				{#each fittedFloor as floorRow, i (JSON.stringify(fittedFloor[i]))}
					<FloorboardRow
						{boardWidthStr}
						floorRowIndex={i}
						isOverCapacity={floorRow.currentFill > floorRow.capacity}
						hasConsecs={values(floorRow.consecutives).length > 0}
						matchesAdjacent={rowMatchingSiblings[i]}
						matchingBoards={floorRow.matchingBoards(fittedFloor)}
						isMarkedForSwap={markedRow === i}
						markSwapRow={onClickMarkRow(i)}
						position={{
							x: boardWidthFloat * i - WHOLE_ROOM_CENTER_OFFSET.x,
							y: -WHOLE_ROOM_CENTER_OFFSET.y
						}}
						rowLength={floorRow.capacity}
						floorboards={floorRow.floorboards}
					/>
				{/each}
			</div>
		</div>
	</div>
</div>

<style lang="postcss">
	:global(html) {
		background-color: theme(colors.gray.100);
		height: 100%;
	}
	:global(body) {
		height: 100%;
	}
</style>
