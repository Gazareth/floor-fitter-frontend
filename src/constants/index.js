import keys from 'lodash/keys';

const roomWidthRaw = 325.0;
const roomLengthRaw = 500.0;

const expansionGap = 1.2;

export const roomWidthStr = `${roomWidthRaw - 2 * expansionGap}`;
export const roomLengthStr = `${roomLengthRaw - 2 * expansionGap}`;
export const boardWidthStr = '12.2';

export const CHIMNEY_BREAST = {
	width: 0,
	length: 141,
	offset: 125
};

export const WHOLE_ROOM_CENTER_OFFSET = {
	x: parseInt(roomWidthStr) / 2,
	y: -parseInt(roomLengthStr) / 8
};

export const groupInfo = {
	// "groupname": [size, count]
	A: ['30', 20],
	B: ['40', 4],
	C: ['45', 53],
	D: ['49', 2],
	E: ['55', 5],
	FG: ['60', 26],
	H: ['65', 7],
	I: ['70', 3],
	J: ['75', 38],
	K: ['80', 8],
	L: ['90', 18],
	MN: ['120', 12],

	XA: ['48.5', 1],
	XB: ['25.5', 1],
	XC: ['24.1', 1],
	XD: ['19.1', 1],

	ZA: ['84.3', 1],
	ZB: ['71.3', 1],
	ZC: ['66.5', 1],
	ZD: ['56.8', 1],
	ZE: ['41.7', 1],
	ZF: ['40.2', 1],
	ZG: ['38.0', 1],
	ZH: ['37.0', 1],
	ZI: ['34.0', 1],
	ZJ: ['26.5', 1],
	ZK: ['26.5', 1],
	ZL: ['25.4', 1],
	ZM: ['21.0', 1],
	ZN: ['20.0', 1],
	ZO: ['17.5', 1],
};

export const endGroupNames = ["ZA", "ZB", "ZC", "ZD", "ZE", "ZF", "ZG", "ZH", "ZI", "ZJ", "ZK", "ZL", "ZM", "ZN", "ZO"];
export const startGroupNames = ["XA", "XB", "XC", "XD"];

export const sortedGroups = keys(groupInfo).sort();

export const boardColors = [
	'red',
	'orange',
	'amber',
	'yellow',
	'lime',
	// 'green',
	'emerald',
	'teal',
	// 'cyan',
	'sky',
	// 'blue',
	'indigo',
	'violet',
	// 'purple',
	'fuchsia',
	'pink',
	'stone',
];
