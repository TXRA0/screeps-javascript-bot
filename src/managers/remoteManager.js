var Utils = require('../utils');

var remoteManager = {
	run: function(room) {
		if (!Memory.rooms) Memory.rooms = {};

		let flags = _.filter(Game.flags, f => f.name.startsWith(`remoteRoom_${room.name}`));
		for (const flag of flags) {
			let remoteRoomName = flag.name.split("_")[2];
			if (!remoteRoomName) continue;

			let remoteRoom = Game.rooms[remoteRoomName];

			this.updateRemoteRoomMemory(remoteRoomName);

			this.manageHarvesters(room, remoteRoomName);
			this.manageHaulers(room, remoteRoomName);
			if (room.controller && room.controller.level >= 3) {
				this.manageDefenders(room, remoteRoomName);
			}
			this.manageReservers(room, remoteRoomName);
		}
	},

	updateRemoteRoomMemory: function(remoteRoomName) {
		const room = Game.rooms[remoteRoomName];
		if (!room) return;

		const memRoom = Memory.rooms[remoteRoomName] || {};
		const prevHash = memRoom.__hash;

		const sources = room.find(FIND_SOURCES);
		const containers = _.filter(
			room.find(FIND_STRUCTURES),
			s => s.structureType === STRUCTURE_CONTAINER
		);

		const controller = room.controller;

		let reservation = null;
		let reservationTicks = 0;
		let mine = false;

		if (controller) {
			if (controller.reservation) {
				reservation = controller.reservation.username;
				reservationTicks = controller.reservation.ticksToEnd;

				if (controller.reservation.username === Game.username) {
					mine = true;
				}
			}

			if (controller.my) {
				mine = true;
			}
		}

		const newData = {
			name: room.name,

			mine: mine,

			sources: Utils.deflate(sources),
			sourcePositions: _.map(sources, s => [s.pos.x, s.pos.y]),

			sourceContainers: Utils.deflate(containers),

			reservation: reservation,
			reservationTicks: reservationTicks
		};

		const newHash = this.fnv1aHash(JSON.stringify(newData));

		if (newHash !== prevHash) {
			Memory.rooms[remoteRoomName] = newData;
			Memory.rooms[remoteRoomName].__hash = newHash;
		}
	},

	fnv1aHash: function(str) {
		let hash = 0x811c9dc5;
		for (let i = 0; i < str.length; i++) {
			hash ^= str.charCodeAt(i);
			hash = (hash >>> 0) * 0x01000193;
		}
		return hash >>> 0;
	},

	manageHarvesters: function(room, remoteRoomName) {
		let remoteRoom = Game.rooms[remoteRoomName];
		let harvesterTarget = remoteRoom ? remoteRoom.find(FIND_SOURCES).length : 1;
		let harvesters = _.filter(Game.creeps, c =>
			c.memory.role === "remoteHarvester" &&
			c.memory.homeRoom === room.name &&
			c.memory.remoteRoom === remoteRoomName
		);
		const queued = _.filter(room.memory.spawnQueue || [], r =>
			r.role === "remoteHarvester" && r.remoteRoom === remoteRoomName
		).length;
		if (harvesters.length + queued < harvesterTarget) {
			this.request(room, "remoteHarvester", remoteRoomName, room.name, 4);
		}
	},

	manageHaulers: function(room, remoteRoomName) {
		let neededHaulers = this.calculateNeededHaulers(room, remoteRoomName);
		let haulers = _.filter(Game.creeps, c =>
			c.memory.role === "remoteHauler" &&
			c.memory.homeRoom === room.name &&
			c.memory.remoteRoom === remoteRoomName
		);
		const queued = _.filter(room.memory.spawnQueue || [], r =>
			r.role === "remoteHauler" && r.remoteRoom === remoteRoomName
		).length;
		if (haulers.length + queued < neededHaulers) {
			this.request(room, "remoteHauler", remoteRoomName, room.name, 5);
		}
	},

	manageDefenders: function(room, remoteRoomName) {
		let remoteRoom = Game.rooms[remoteRoomName];
		if (!remoteRoom) return;
		let hostiles = remoteRoom.find(FIND_HOSTILE_CREEPS);
		if (!hostiles.length) return;
		let defenderTarget = hostiles.length < 3 ? 1 : 2;
		let defenders = _.filter(Game.creeps, c =>
			c.memory.role === "remoteDefender" &&
			c.memory.homeRoom === room.name &&
			c.memory.remoteRoom === remoteRoomName
		);
		const queued = _.filter(room.memory.spawnQueue || [], r =>
			r.role === "remoteDefender" && r.remoteRoom === remoteRoomName
		).length;
		if (defenders.length + queued < defenderTarget) {
			this.request(room, "remoteDefender", remoteRoomName, room.name, 3);
		}
	},

	manageReservers: function(room, remoteRoomName) {
		let reserverTarget = 2;
		let reservers = _.filter(Game.creeps, c =>
			c.memory.role === "reserver" &&
			c.memory.homeRoom === room.name &&
			c.memory.remoteRoom === remoteRoomName
		);
		const queued = _.filter(room.memory.spawnQueue || [], r =>
			r.role === "reserver" && r.remoteRoom === remoteRoomName
		).length;
		if (reservers.length + queued < reserverTarget) {
			this.request(room, "reserver", remoteRoomName, room.name, 6);
		}
	},

	request: function(room, role, remoteRoomName, homeRoomName, priority) {
		room.memory.spawnQueue = room.memory.spawnQueue || [];
		room.memory.spawnQueue.push({
			role: role,
			remoteRoom: remoteRoomName,
			homeRoom: homeRoomName,
			priority: priority
		});
	},

	calculateNeededHaulers: function(room, remoteRoomName) {
		const spawn = room.find(FIND_MY_SPAWNS)[0];
		if (!spawn) return 0;
		const remoteRoom = Game.rooms[remoteRoomName];
		if (!remoteRoom) return 1;
		let totalCarryPartsNeeded = 0;
		remoteRoom.find(FIND_SOURCES).forEach(source => {
			const path = PathFinder.search(
				spawn.pos,
				{ pos: source.pos, range: 1 },
				{ swampCost: 5, plainCost: 2, maxOps: 5000 }
			);
			const distance = path.path.length;
			const energyPerTick = 10;
			const carryParts = Math.ceil((distance * 2 * energyPerTick) / 50);
			totalCarryPartsNeeded += carryParts;
		});
		const segment = [CARRY, CARRY, MOVE, MOVE];
		const carryPerSegment = 2;
		let energyAvailable = room.energyCapacityAvailable;
		let segmentCost = _.sum(segment, p => BODYPART_COST[p]);
		let maxSegments = Math.floor(energyAvailable / segmentCost);
		maxSegments = Math.max(1, Math.min(maxSegments, 12));
		let carryPerHauler = maxSegments * carryPerSegment;
		return Math.ceil(totalCarryPartsNeeded / carryPerHauler);
	}
};

module.exports = remoteManager;