var Utils = require('../utils');

var roomManager = {
	// flesh out creep roles spawning into here
	run: function (room) {
		const memRoom = Memory.rooms[room.name] || {};
		const prevHash = memRoom.__hash;

		if (this.roomNeedsUpdate(room, prevHash)) {
			const newData = this.setRoomMemory(room);
			const newHash = this.generateRoomHash(newData);

			if (newHash !== prevHash) {
				Memory.rooms[room.name] = newData;
				Memory.rooms[room.name].__hash = newHash;
			}
		}
		this.updateDefcon(room)
	},

	fnv1aHash: function (str) {
		let hash = 0x811c9dc5;
		for (let i = 0; i < str.length; i++) {
			hash ^= str.charCodeAt(i);
			hash = (hash >>> 0) * 0x01000193;
		}
		return hash >>> 0;
	},

	generateRoomHash: function (data) {
		return this.fnv1aHash(JSON.stringify(data));
	},

	roomNeedsUpdate: function (room, prevHash) {
		const memRoom = Memory.rooms[room.name];
		let storedLevel;

		if (memRoom && memRoom.controllerLevel !== undefined) {
			storedLevel = memRoom.controllerLevel;
		}

		const currentLevel = room.controller.level;

		if (storedLevel !== currentLevel) return true;

		if (Game.time % 10 === 0) return true;

		if (!prevHash) return true;

		return false;
	},

	setRoomMemory: function (room) {
		var structures = room.find(FIND_MY_STRUCTURES);
		var spawns = room.find(FIND_MY_SPAWNS);

		var containers = _.filter(room.find(FIND_STRUCTURES), function (structure) {
			return structure.structureType == STRUCTURE_CONTAINER;
		});

		var sourceContainerMaps = {};

		var sourceContainers = _.filter(containers, function (container) {
			var sources = container.pos.findInRange(FIND_SOURCES, 2);

			if (sources[0]) {
				sourceContainerMaps[sources[0].id] = container.id;
			}

			return sources.length != 0;
		});

		var recycleContainers = _.filter(containers, function (container) {
			var spawns = container.pos.findInRange(FIND_MY_SPAWNS, 1);

			return spawns.length != 0;
		});

		var generalContainers = _.filter(containers, function (container) {
			var matchContainers = [].concat(recycleContainers, sourceContainers);

			var matched = _.filter(matchContainers, function (mc) {
				return mc.id == container.id;
			});

			return matched.length == 0;
		});

		if (room.storage) {
			generalContainers.push(room.storage);
			var storageId = room.storage.id;
		} else {
			var storageId = undefined;
		}

		if (recycleContainers.length == 0 && room.controller.my && spawns.length != 0) {
			var firstSpawn = spawns[0];

			var pos = new RoomPosition(
				firstSpawn.pos.x - 1,
				firstSpawn.pos.y,
				room.name
			);

			// room.createConstructionSite(pos, STRUCTURE_CONTAINER)
		}

		var extensions = _.filter(structures, function (structure) {
			return structure.structureType == STRUCTURE_EXTENSION;
		});

		var towers = _.filter(structures, function (structure) {
			return structure.structureType == STRUCTURE_TOWER;
		});

		var extractors = _.filter(structures, function (structure) {
			return structure.structureType == STRUCTURE_EXTRACTOR;
		});

		var terminalId;

		if (room.terminal) {
			terminalId = room.terminal.id;
		}

		var links = _.filter(structures, function (structure) {
			return structure.structureType == STRUCTURE_LINK;
		});

		var sourceLinkMaps = {};

		var sourceLinks = _.filter(links, function (link) {
			var sources = link.pos.findInRange(FIND_SOURCES, 2);

			if (sources[0]) {
				sourceLinkMaps[sources[0].id] = link.id;
			}

			return sources.length != 0;
		});

		var coreLinks = _.filter(links, function (link) {
			var sources = link.pos.findInRange(FIND_SOURCES, 2);

			return sources.length == 0;
		});

		return {
			coreLinks: Utils.deflate(coreLinks),
			energyAvailable: room.energyAvailable,
			energyCapacityAvailable: room.energyCapacityAvailable,
			extensions: Utils.deflate(extensions),
			extractors: Utils.deflate(extractors),
			generalContainers: Utils.deflate(generalContainers),
			links: Utils.deflate(links),
			minerals: Utils.deflate(room.find(FIND_MINERALS)),
			mine: room.controller.my,
			name: room.name,
			rcl: room.controller.level,
			recycleContainers: Utils.deflate(recycleContainers),
			sources: Utils.deflate(room.find(FIND_SOURCES)),
			sourceContainers: Utils.deflate(sourceContainers),
			sourceContainerMaps: sourceContainerMaps,
			sourceLinkMaps: sourceLinkMaps,
			sourceLinks: Utils.deflate(sourceLinks),
			spawns: Utils.deflate(spawns),
			spawnable: spawns.length > 0,
			storage: storageId,
			structures: Utils.deflate(structures),
			terminal: terminalId,
			towers: Utils.deflate(towers)
		};
	},
	updateDefcon: function(room) {
		const memRoom = Memory.rooms[room.name] || {};

		if (memRoom.defcon === undefined) memRoom.defcon = 5;
		if (memRoom.escalationTicks === undefined) memRoom.escalationTicks = 0;

		const hostile = Utils.findHostileCreeps(room)
		let hostiles = hostile.length
		let defcon = memRoom.defcon;
		let ticks = memRoom.escalationTicks;

		let totalAttack = 0;
		let totalRanged = 0;
		let totalHeal = 0;
		let anyBoosted = false;

		for (const creep of hostile) {
			for (const part of creep.body) {
				if (part.boost) anyBoosted = true;

				if (part.type === ATTACK) totalAttack++;
				else if (part.type === RANGED_ATTACK) totalRanged++;
				else if (part.type === HEAL) totalHeal++;
			}
		}
		potentialAttackDam = totalAttack * 30
		potentialRangedDam = totalRanged * 10
		potentialHealing = totalHeal * 12

		if (hostiles > 0) {
			ticks++;
			if (ticks >= 300) {
				ticks = 0;
				if (defcon > 1) defcon--;
			}
		} else {
			ticks--;
			if (ticks <= 0) {
				ticks = 0;
				defcon = 5;
			}
		}
		let neededDefenders = 0;
		let needsAid = false;
		let haulerTowerPriority = false

		if (defcon === 1) {
			if (room.controller.safeModeAvailable) {
				room.controller.activateSafeMode();
			} else {
				neededDefenders = 5;
			}
		} else if (defcon === 2) {
			neededDefenders = 5;
		} else if (defcon === 3) {
			needsAid = true;
			neededDefenders = 3;
		} else if (defcon === 4) {
			neededDefenders = 2;
			haulerTowerPriority = true
		} else if (defcon === 5) {
			if (hostiles > 3) neededDefenders = 1;
			else neededDefenders = 0;
		}

		memRoom.defcon = defcon;
		memRoom.escalationTicks = ticks;
		memRoom.neededDefenders = neededDefenders;
		memRoom.needsAid = needsAid;

		Memory.rooms[room.name] = memRoom;
	},
};

module.exports = roomManager;