function moveOffRoad(creep) {
	let atPos = creep.pos.lookFor(LOOK_STRUCTURES);
	for (let s of atPos) {
		if (s.structureType === STRUCTURE_ROAD) {
			let offroadPosition = getOffroadMovePosition(creep);
			creep.moveTo(offroadPosition);
			return true;
		}
	}
	return false;
}
exports.moveOffRoad = moveOffRoad;
function moveRandomDirection(creep) {
	creep.move(getRandomDirection());
}
exports.moveRandomDirection = moveRandomDirection;
function getRandomDirection() {
	let possibleDirections = [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT];
	return possibleDirections[(Math.floor(Math.random() * possibleDirections.length))];
}
function getOffroadMovePosition(creep) {
	let path = PathFinder.search(creep.pos, { pos: creep.pos, range: 10 }, {
		plainCost: 1,
		swampCost: 2,
		flee: true,
		roomCallback: getOffroadRoomCallback,
		maxRooms: 1
	}).path;
	for (let pos of path) {
		let structs = pos.lookFor(LOOK_STRUCTURES);
		let creeps = pos.lookFor(LOOK_CREEPS);
		if (structs.length === 0 && creeps.length === 0) {
			return pos;
		}
	}
	return path[0];
}
function getOffroadRoomCallback(roomName) {
	let room = Game.rooms[roomName];
	if (!room)
		return new PathFinder.CostMatrix;
	let costs = new PathFinder.CostMatrix;
	room.find(FIND_STRUCTURES).forEach(function (structure) {
		if (structure.structureType === STRUCTURE_ROAD) {
			costs.set(structure.pos.x, structure.pos.y, 20);
		}
		else if (structure.structureType !== STRUCTURE_CONTAINER &&
			(structure.structureType !== STRUCTURE_RAMPART ||
				!(structure instanceof OwnedStructure && structure.my))) {
			costs.set(structure.pos.x, structure.pos.y, 0xff);
		}
	});
	room.find(FIND_CREEPS).forEach(function (creep) {
		costs.set(creep.pos.x, creep.pos.y, 0xff);
	});
	return costs;
}