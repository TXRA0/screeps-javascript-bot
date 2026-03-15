//const RoomCache = require('../utils/roomCache');
const originalMoveTo = Creep.prototype.moveTo;

Creep.prototype.moveTo = function(target, opts = {}) {
    const newOpts = Object.assign({
        reusePath: 10,
        ignoreCreeps: false,
        visualizePathStyle: { stroke: '#ffaa00' },
        costCallback: (roomName, costMatrix) => {
            const room = Game.rooms[roomName];
            if (!room) return;

            const terrain = room.getTerrain();

            for (let x = 0; x < 50; x++) {
                for (let y = 0; y < 50; y++) {
                    const tile = terrain.get(x, y);
                    if (tile === TERRAIN_MASK_WALL) {
                        costMatrix.set(x, y, 0xff);
                    } else if (tile === TERRAIN_MASK_SWAMP) {
                        costMatrix.set(x, y, 5);
                    } else {
                        costMatrix.set(x, y, 2);
                    }
                }
            }

            room.find(FIND_STRUCTURES).forEach(struct => {
                if (struct.structureType === STRUCTURE_ROAD) {
                    costMatrix.set(struct.pos.x, struct.pos.y, 1);
                } else if (
                    struct.structureType !== STRUCTURE_CONTAINER &&
                    (struct.structureType !== STRUCTURE_RAMPART || !struct.my)
                ) {
                    costMatrix.set(struct.pos.x, struct.pos.y, 0xff);
                }
            });

            room.find(FIND_CONSTRUCTION_SITES).forEach(site => {
                costMatrix.set(site.pos.x, site.pos.y, 0xff);
            });

            if (!opts.ignoreCreeps) {
                room.find(FIND_CREEPS).forEach(c => {
                    if (c.id !== this.id) {
                        costMatrix.set(c.pos.x, c.pos.y, 0xff);
                    }
                });
                room.find(FIND_POWER_CREEPS).forEach(c => {
                    if (c.id !== this.id) {
                        costMatrix.set(c.pos.x, c.pos.y, 0xff);
                    }
                });
            }

            return costMatrix;
        }
    }, opts);

    return originalMoveTo.call(this, target, newOpts);
};
Creep.prototype.sayHello = function sayHello() {
    this.say("Hello", true);
}

Creep.prototype.findEnergySource = function() {
    const sources = RoomCache.getSources(this.room);
    if (sources.length) {
        this.memory.source = sources[0].id;
        return sources[0];
    }
};

Creep.prototype.findEnergySourceMiner = function() {
    const sources = RoomCache.getSources(this.room);

    const usedSources = _.map(
        _.filter(Game.creeps, c => c.memory.role === 'harvester' && c.memory.sourceId),
        c => c.memory.sourceId
    );

    const freeSource = _.find(sources, s => !usedSources.includes(s.id));

    if (freeSource) {
        this.memory.sourceId = freeSource.id;
        return freeSource;
    }

    return null;
};

Creep.prototype.findEnergySourceRemoteMiner = function() {
    const sources = RoomCache.getSources(this.room);

    const usedSources = _.map(
        _.filter(Game.creeps, c => c.memory.role === 'remoteHarvester' && c.memory.sourceId),
        c => c.memory.sourceId
    );

    const freeSource = _.find(sources, s =>
        !usedSources.includes(s.id) &&
        s.energy > 0
    );

    if (freeSource) {
        this.memory.sourceId = freeSource.id;
        return freeSource;
    }

    return null;
};

Creep.prototype.moveToRoom = function(roomName) {
    if (!roomName || typeof roomName !== "string") {
        console.log("moveToRoom called with invalid roomName:", roomName);
        this.say("no room", true);
        return;
    }
    this.moveTo(new RoomPosition(25, 25, roomName));
}

Creep.prototype.harvestEnergy = function() {
    let storedSource = Game.getObjectById(this.memory.source);

    if (!storedSource || (!storedSource.pos.getOpenPositions().length && !this.pos.isNearTo(storedSource))) {
        delete this.memory.source;
        storedSource = this.findEnergySource();
    } 
    if (storedSource) {
        if (this.pos.isNearTo(storedSource)) {
            this.harvest(storedSource);
        } else {
            this.moveTo(storedSource);
        }
    }
}

Creep.prototype.harvestEnergyMiner = function() {
    let storedSource = _.find(RoomCache.getSources(this.room), s => s.id === this.memory.sourceId);

    if (!storedSource) {
        delete this.memory.sourceId;
        storedSource = this.findEnergySourceMiner();
    }

    if (storedSource) {
        if (this.pos.isNearTo(storedSource)) {
            this.harvest(storedSource);
        } else {
            this.moveTo(storedSource);
        }
    }
}

Creep.prototype.harvestEnergyRemoteMiner = function() {
    let storedSource = _.find(RoomCache.getSources(this.room), s => s.id === this.memory.sourceId);

    if (!storedSource) {
        delete this.memory.sourceId;
        storedSource = this.findEnergySourceRemoteMiner();
    }

    if (storedSource) {
        if (this.pos.isNearTo(storedSource)) {
            this.harvest(storedSource);
        } else {
            this.moveTo(storedSource);
        }
    }
}

Creep.prototype.harvestEnergyPioneer = function() {
    let storedSource = _.find(RoomCache.getSources(this.room), s => s.id === this.memory.sourceId);

    if (!storedSource) {
        delete this.memory.sourceId;
        storedSource = this.findEnergySourcePioneer();
    }

    if (storedSource) {
        if (this.pos.isNearTo(storedSource)) {
            this.harvest(storedSource);
        } else {
            this.moveTo(storedSource);
        }
    }
}
Creep.prototype.getEnergyHaulTarget = function(isRemote = false) {
    const porterCreeps = _.filter(Game.creeps, c => c.memory.role === 'porter' && c.room.name === this.room.name);
    const roomState = porterCreeps.length > 0 || isRemote ? 'porter' : 'normal';

    const priorityTables = {
        normal: { STRUCTURE_SPAWN: 1, STRUCTURE_EXTENSION: 1, STRUCTURE_TOWER: 2, STRUCTURE_CONTAINER: 3, STRUCTURE_STORAGE: 4, STRUCTURE_LAB: 5 },
        porter: { STRUCTURE_SPAWN: 2, STRUCTURE_EXTENSION: 2, STRUCTURE_TOWER: 3, STRUCTURE_CONTAINER: 2, STRUCTURE_STORAGE: 1, STRUCTURE_LAB: 3 }
    };

    const allTargets = RoomCache.getStructures(this.room)
        .filter(s => s.store && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0);

    const essentialTypes = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER];
    const essentialTargets = allTargets.filter(s => essentialTypes.includes(s.structureType));

    if (essentialTargets.length > 0 && !isRemote) {
        essentialTargets.sort((a,b)=>this.pos.getRangeTo(a)-this.pos.getRangeTo(b));
        return essentialTargets[0];
    }

    if (allTargets.length > 0) {
        const minPriority = Math.min(...allTargets.map(t => priorityTables[roomState][t.structureType] || 99));
        const highPriorityTargets = allTargets.filter(t => (priorityTables[roomState][t.structureType] || 99) === minPriority);
        highPriorityTargets.sort((a,b)=>this.pos.getRangeTo(a)-this.pos.getRangeTo(b));
        return highPriorityTargets[0] || null;
    }

    return null;
};

Creep.prototype.getEnergyHaulTargetPorter = function() {
    const roomState = 'normal';
    const priorityTables = { normal: { STRUCTURE_SPAWN: 1, STRUCTURE_EXTENSION: 1, STRUCTURE_TOWER: 2, STRUCTURE_CONTAINER: 3, STRUCTURE_LAB: 4 } };

    const allTargets = RoomCache.getStructures(this.room)
        .filter(s => s.store && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
    if (!allTargets.length) return null;

    const essentialTypes = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER];
    const essentialTargets = allTargets.filter(s => essentialTypes.includes(s.structureType));
    if (essentialTargets.length > 0) {
        essentialTargets.sort((a,b)=>this.pos.getRangeTo(a)-this.pos.getRangeTo(b));
        return essentialTargets[0];
    }

    const minPriority = Math.min(...allTargets.map(t => priorityTables[roomState][t.structureType] || 99));
    const highPriorityTargets = allTargets.filter(t => (priorityTables[roomState][t.structureType] || 99) === minPriority);
    highPriorityTargets.sort((a,b)=>this.pos.getRangeTo(a)-this.pos.getRangeTo(b));
    return highPriorityTargets[0] || null;
};

Creep.prototype.getEnergyHaulTargetRemote = function() {
    if (!this.room) return null;

    const porterCreeps = _.filter(Game.creeps, c => c.memory.role === 'porter' && c.room.name === this.room.name);
    const hasPorter = porterCreeps.length > 0;

    const allTargets = RoomCache.getStructures(this.room)
        .filter(s => s.store && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0);
    if (!allTargets.length) return null;

    const priorityOrder = hasPorter
        ? [STRUCTURE_STORAGE, STRUCTURE_CONTAINER, STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER, STRUCTURE_LAB]
        : [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER, STRUCTURE_STORAGE];

    for (const type of priorityOrder) {
        const targets = allTargets.filter(s => s.structureType === type);
        if (targets.length > 0) {
            targets.sort((a,b)=>this.pos.getRangeTo(a)-this.pos.getRangeTo(b));
            return targets[0];
        }
    }

    const upgraders = _.filter(RoomCache.getCreeps(this.room), c => c.memory.role === "upgrader" && c.store.getUsedCapacity(RESOURCE_ENERGY) === 0);
    if (upgraders.length) return this.pos.findClosestByRange(upgraders);

    return null;
};

Creep.prototype.getEnergyTarget = function(sourceContainers = null) {
    let target = Game.getObjectById(this.memory.energyTarget);

    if (target) {
        const hasEnergy = target.store ? target.store.getUsedCapacity(RESOURCE_ENERGY) > 0 : (target.amount > 0);
        if (hasEnergy) {
            if (target.store) {
                if (this.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) this.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
            } else {
                if (this.pickup(target) === ERR_NOT_IN_RANGE) this.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
            return target;
        } else {
            delete this.memory.energyTarget;
            target = null;
        }
    }

    if (sourceContainers && sourceContainers.length > 0) {
        const richest = _.max(sourceContainers, c => c.store.getUsedCapacity(RESOURCE_ENERGY));
        if (richest && richest.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            this.memory.energyTarget = richest.id;
            if (this.withdraw(richest, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) this.moveTo(richest, { visualizePathStyle: { stroke: '#ffaa00' } });
            return richest;
        }
    }

    const dropped = this.room.find(FIND_DROPPED_RESOURCES, { filter: r => r.resourceType === RESOURCE_ENERGY });
    if (dropped.length > 0) {
        const richestDrop = _.max(dropped, r => r.amount);
        this.memory.energyTarget = richestDrop.id;
        if (this.pickup(richestDrop) === ERR_NOT_IN_RANGE) this.moveTo(richestDrop, { visualizePathStyle: { stroke: '#ffaa00' } });
        return richestDrop;
    }

    delete this.memory.energyTarget;
    return null;
};

Creep.prototype.getEnergyTargetOther = function(sourceContainers = null) {
    let target = Game.getObjectById(this.memory.energyTarget);

    if (target) {
        const hasEnergy = target.store ? target.store.getUsedCapacity(RESOURCE_ENERGY) > 0 : (target.amount > 0);
        if (hasEnergy) {
            if (target.store) {
                if (this.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) this.moveTo(target);
            } else {
                if (this.pickup(target) === ERR_NOT_IN_RANGE) this.moveTo(target);
            }
            return target;
        }
        delete this.memory.energyTarget;
    }

    const storage = RoomCache.getStorage(this.room);
    if (storage && storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
        this.memory.energyTarget = storage.id;
        if (this.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) this.moveTo(storage);
        return storage;
    }

    if (sourceContainers && sourceContainers.length > 0) {
        const richest = _.max(sourceContainers, c => c.store.getUsedCapacity(RESOURCE_ENERGY));
        if (richest && richest.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            this.memory.energyTarget = richest.id;
            if (this.withdraw(richest, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) this.moveTo(richest);
            return richest;
        }
    }

    const dropped = this.room.find(FIND_DROPPED_RESOURCES, { filter: r => r.resourceType === RESOURCE_ENERGY });
    if (dropped.length > 0) {
        const richestDrop = _.max(dropped, r => r.amount);
        this.memory.energyTarget = richestDrop.id;
        if (this.pickup(richestDrop) === ERR_NOT_IN_RANGE) this.moveTo(richestDrop);
        return richestDrop;
    }

    delete this.memory.energyTarget;
    return null;
};

Creep.prototype.getEnergyTargetPorter = function(sourceContainers = null) {
    let target = Game.getObjectById(this.memory.energyTarget);

    if (target) {
        const hasEnergy = target.store ? target.store.getUsedCapacity(RESOURCE_ENERGY) > 0 : (target.amount > 0);
        if (hasEnergy) {
            if (target.store) {
                if (this.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) this.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
            } else {
                if (this.pickup(target) === ERR_NOT_IN_RANGE) this.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
            return target;
        } else {
            delete this.memory.energyTarget;
            target = null;
        }
    }

    const storage = RoomCache.getStorage(this.room);
    if (storage && storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
        this.memory.energyTarget = storage.id;
        if (this.withdraw(storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) this.moveTo(storage);
        return storage;
    }

    delete this.memory.energyTarget;
    return null;
};
Creep.prototype.upgrade = function () {
	const sites = this.room.find(FIND_CONSTRUCTION_SITES);
	const controller = this.room.controller;
	if (!controller) return;

	if (!controller.sign || controller.sign.username !== this.owner.username) {
		const signText = `${this.room.name} Is property of _TXR`;
		const signResult = this.signController(controller, signText);
		if (signResult === ERR_NOT_IN_RANGE) {
			this.moveTo(controller.pos, { maxRooms: 1 });
		}
		return;
	}
	if (controller.ticksToDowngrade > 500 && sites.length > 0) {
		this.building();
		return;
	}

	const result = this.upgradeController(controller);
	if (result === ERR_NOT_IN_RANGE) {
		this.moveTo(controller.pos, { maxRooms: 1 });
	}
};
Creep.prototype.building = function() {
	var controller = this.room.controller
	const sites = this.room.find(FIND_CONSTRUCTION_SITES);
	if (!sites.length) {
		if (this.memory.role === "builder" && !this.memory._triedUpgrade) {
			const result = this.upgradeController(controller);
			if (result === ERR_NOT_IN_RANGE) {
				this.moveTo(controller.pos, { maxRooms: 1 });
			}
		}
		return;
	}

	let prioritySite = null;
	for (let i = 0; i < sites.length; i++) {
		if (sites[i].structureType === STRUCTURE_STORAGE) {
			prioritySite = sites[i];
			break;
		}
	}
	const target = this.pos.findClosestByPath(prioritySite ? [prioritySite] : sites);
	if (!target) return;

	const result = this.build(target);
	if (result === ERR_NOT_IN_RANGE) {
		this.moveTo(target, { reusePath: 10, visualizePathStyle: { stroke: '#ffffff' } });
		return;
	}

	if (
		(target.structureType === STRUCTURE_WALL || target.structureType === STRUCTURE_RAMPART) &&
		target.hits < 10000
		) {
		if (this.repair(target) === ERR_NOT_IN_RANGE) {
			this.moveTo(target, { reusePath: 10, visualizePathStyle: { stroke: '#ffaa00' } });
		}
	}
}
Creep.prototype.defend = function() {
	const hostiles = this.room.find(FIND_HOSTILE_CREEPS);
	if (hostiles.length) {
		const target = this.pos.findClosestByRange(hostiles);
	if (target && this.attack(target) === ERR_NOT_IN_RANGE) this.moveTo(target);
		return;
	}

	const onRampart = this.pos.lookFor(LOOK_STRUCTURES)
	.some(s => s.structureType === STRUCTURE_RAMPART);
	if (onRampart) return;

	const ramparts = this.room.find(FIND_MY_STRUCTURES)
	.filter(s => s.structureType === STRUCTURE_RAMPART &&
		!s.pos.lookFor(LOOK_CREEPS).length);

	if (ramparts.length) {
		const rampart = this.pos.findClosestByRange(ramparts);
	if (rampart) this.moveTo(rampart);
	}
}
Creep.prototype.ranger = function() {
	let flag = Game.flags[`trio_${this.memory.homeRoom}`];
	
	if (!flag) {
		this.say("huh");
		return;
	}

	if (this.pos.roomName !== flag.pos.roomName) {
		this.moveTo(flag, {
			visualizePathStyle: { stroke: '#ffaa00' },
			reusePath: 50,
			maxOps: 5000,
			maxRooms: 16
		});
		this.rangedMassAttack();
		this.say("move in!", true);
		return;
	}

	const enemyCreeps = this.room.find(FIND_HOSTILE_CREEPS);
	const dangerousEnemies = enemyCreeps.filter(e =>
		e.getActiveBodyparts(ATTACK) > 0 || e.getActiveBodyparts(RANGED_ATTACK) > 0
	);

	const enemyStructures = this.room.find(FIND_HOSTILE_STRUCTURES, {
		filter: s => s.structureType !== STRUCTURE_CONTROLLER
	});

	const towers = enemyStructures.filter(s => s.structureType === STRUCTURE_TOWER);
	const spawns = enemyStructures.filter(s => s.structureType === STRUCTURE_SPAWN);
	const otherStructures = enemyStructures.filter(s =>
		s.structureType !== STRUCTURE_TOWER && s.structureType !== STRUCTURE_SPAWN
	);

	const hasAttack = this.getActiveBodyparts(ATTACK) > 0;
	const hasRanged = this.getActiveBodyparts(RANGED_ATTACK) > 0;

	if (dangerousEnemies.length > 0) {
		const closestDanger = this.pos.findClosestByRange(dangerousEnemies);
		const dist = this.pos.getRangeTo(closestDanger);

		if (dist < 3) {
			const fleePos = this.getFleePath(closestDanger.pos, 3);
			if (fleePos.length > 0) {
				this.moveTo(fleePos[0], { visualizePathStyle: { stroke: '#ff0000' } });
				this.say("parry", true);
				this.rangedAttack(closestDanger);
			} else {
				const dx = this.pos.x - closestDanger.pos.x;
				const dy = this.pos.y - closestDanger.pos.y;
				const fallbackPos = new RoomPosition(
					this.pos.x + dx,
					this.pos.y + dy,
					this.room.name
				);
				this.moveTo(fallbackPos);
				this.say("fallback!", true);
			}
			return;
		}
	}

	const priorityGroups = [towers, spawns, enemyCreeps, otherStructures];

	if (priorityGroups.length > 0) {

		let target = null;
		for (const group of priorityGroups) {
			if (group.length > 0) {
				target = this.pos.findClosestByRange(group);
				if (target) break;
			}
		}
		if (hasRanged && target && this.pos.inRangeTo(target, 3)) {
			this.rangedAttack(target);
			this.say("pew!", true);
		}
		if (hasRanged && target) {
			this.rangedAttack(target);
			this.say("pew!", true);
			if (this.pos.inRangeTo(target, 1)) {
				this.rangedAttack(target);
				this.say("pew!", true);
			} else {
				this.moveTo(target, {
					range: 1,
					visualizePathStyle: { stroke: '#ff8800' }
				});
				this.say("move in!", true);
			}
		} else if (hasAttack && target) {
			if (this.pos.isNearTo(target)) {
				this.attack(target);
			} else {
				this.moveTo(target, { visualizePathStyle: { stroke: '#0000ff' } });
				this.say("move in!", true);
			}
		}
		return;
	}

	if (this.signController(this.room.controller, "lol get cooked") === ERR_NOT_IN_RANGE) {
		this.moveTo(this.room.controller);
	}
}

Creep.prototype.getFleePath = function(enemyPos, desiredRange) {
	const positions = [];

	for (let dx = -desiredRange; dx <= desiredRange; dx++) {
		for (let dy = -desiredRange; dy <= desiredRange; dy++) {
			const x = this.pos.x + dx;
			const y = this.pos.y + dy;
			if (x < 0 || x > 49 || y < 0 || y > 49) continue;

			const pos = new RoomPosition(x, y, this.room.name);
			if (pos.getRangeTo(enemyPos) >= desiredRange && this.isPositionWalkable(pos)) {
				positions.push(pos);
			}
		}
	}

	positions.sort((a, b) => this.pos.getRangeTo(a) - this.pos.getRangeTo(b));
	return positions;
}

Creep.prototype.isPositionWalkable = function(pos) {
	const terrain = Game.map.getRoomTerrain(pos.roomName);
	if (terrain.get(pos.x, pos.y) === TERRAIN_MASK_WALL) return false;

	const structures = pos.lookFor(LOOK_STRUCTURES);
	if (structures.some(s => OBSTACLE_OBJECT_TYPES.includes(s.structureType))) return false;

	const creeps = pos.lookFor(LOOK_CREEPS);
	if (creeps.length > 0) return false;

	return true;
}
Creep.prototype.healer = function() {
	let flag = Game.flags[`trio_${this.memory.homeRoom}`];
	if (!flag) {
		this.say("huh");
		return;
	}

	if (this.pos.roomName !== flag.pos.roomName) {
		this.moveTo(flag, {
			visualizePathStyle: { stroke: '#ffaa00' },
			reusePath: 50,
			maxOps: 5000,
			maxRooms: 16
		});
		this.say("move in!", true);
		return;
	}

	const myCreeps = this.room.find(FIND_MY_CREEPS);

	if (!myCreeps || myCreeps.length === 0) {
		this.heal(this);
		this.say("heal self", true);
		return;
	}
	if (this.hits < this.hitsMax) {
		this.heal(this);
	}

	const rangedHealTarget = this.pos.findInRange(myCreeps.filter(c => c.hits < c.hitsMax), 3).find(c => this.pos.getRangeTo(c) > 1);
	if (rangedHealTarget) {
		this.rangedHeal(rangedHealTarget);
	}

	const needsHeal = myCreeps.filter(c => c.hits < c.hitsMax);
	if (needsHeal.length > 0) {
		needsHeal.sort((a, b) => a.hits - b.hits);
		const target = needsHeal[0];
		if (this.pos.isNearTo(target)) {
			this.heal(target);
			this.say("here!", true);
		} else {
			this.moveTo(target);
			this.say("move in!", true);
		}
	} else {
		const beserker = myCreeps.find(c => c.memory.role === 'beserker');
		const ranger = myCreeps.find(c => c.memory.role === 'ranger');
		if (beserker) {
			if (this.pos.isNearTo(beserker)) {
				this.heal(beserker);
				this.say("here!", true);
			} else {
				this.moveTo(beserker);
				this.say("move in!");
			}
		} else if (ranger) {
			if (this.pos.isNearTo(ranger)) {
				this.heal(ranger);
				this.say("here!", true);
			} else {
				this.moveTo(ranger);
				this.say("move in!");
			}
		}
	}
}

Creep.prototype.berserker = function() {
	let flag = Game.flags[`trio_${this.memory.homeRoom}`];
	if (!flag) {
		this.say("huh");
		return;
	}

	if (this.pos.roomName !== flag.pos.roomName) {
		this.moveTo(flag, {
			visualizePathStyle: { stroke: '#ffaa00' },
			reusePath: 50,
			maxOps: 5000,
			maxRooms: 16
		});
		this.say("move in!", true);
		return;
	}

	const enemyCreeps = this.room.find(FIND_HOSTILE_CREEPS);
	const enemyStructures = this.room.find(FIND_STRUCTURES, {
		filter: struct => struct.structureType !== STRUCTURE_WALL
	});
	const enemies = enemyCreeps.concat(enemyStructures);

	if (enemies.length) {
		const closestEnemy = this.pos.findClosestByRange(enemies);
		if (this.attack(closestEnemy) === ERR_NOT_IN_RANGE) {
			this.moveTo(closestEnemy, { visualizePathStyle: { stroke: '#ff0000' } });
			this.say("move in!", true);
		}
	} else {
		this.say("yay", true);
	}
}
Creep.prototype.wallBuild = function() {
    if (!this.memory.working) return;

    const room = this.room;
    const mem = Memory.rooms[room.name] || (Memory.rooms[room.name] = {});
    const threshold = mem.wallRepairThreshold || (mem.wallRepairThreshold = 10000);

    let target = Game.getObjectById(this.memory.repairTargetId);
    if (target && (target.hits >= threshold || target.structureType !== STRUCTURE_WALL && target.structureType !== STRUCTURE_RAMPART)) {
        target = null;
        this.memory.repairTargetId = null;
    }

    if (!target) {
        const walls = room.find(FIND_STRUCTURES, {
            filter: s =>
                (s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART) &&
                s.hits < threshold
        });

        if (walls.length) {
            target = walls.reduce((lowest, s) => s.hits < lowest.hits ? s : lowest, walls[0]);
            this.memory.repairTargetId = target.id;
        } else {
            mem.wallRepairThreshold += 10000;
            this.say(`⬆️ ${mem.wallRepairThreshold}`);
            return;
        }
    }

    if (this.repair(target) === ERR_NOT_IN_RANGE) {
        this.moveTo(target, { visualizePathStyle: { stroke: '#ffffff' } });
    }
}
Creep.prototype.claim = function() {
    let flag = _.find(Game.flags, f => f.name.startsWith("claimRoom_"));
    if (!flag) {
        this.say("huh");
        return;
    }

    if (this.pos.roomName !== flag.pos.roomName) {
        this.moveTo(flag, {
            visualizePathStyle: { stroke: '#ffaa00' },
            reusePath: 50
        });
        return;
    }

    const controller = this.room.controller;
    if (!controller) return;

    const result = this.claimController(controller);

    if (result === ERR_NOT_IN_RANGE) {
        this.moveTo(controller, {range: 1});
    } else if (result === ERR_GCL_NOT_ENOUGH) {
        this.say("GCL low");
        this.reserveController(controller);
    } else if (result === OK) {
        this.signController(controller, `${this.room.name} is property of _TXR`);
    } else {
        this.say(result);
    }
};
Creep.prototype.pioneer = function() {
    const controller = this.room.controller;
    if (!controller) return;

    if (this.room.find(FIND_CONSTRUCTION_SITES).length > 0) {
        this.building();
        return;
    }

    if (controller.level < 2) {
        this.upgrade();
        return;
    }

    if (controller.level >= 2) {
		let target = Game.getObjectById(this.memory.target);

		if (!target || target.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
			target = this.getEnergyHaulTarget();

			if (target) {
				this.memory.target = target.id;
			} else {
				this.memory.target = null;
			}
		}

		if (target) {
			if (this.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
				this.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
			}
		} else {
			this.say('sleep', true);
		}
    }
};
Creep.prototype.reserve = function() {
    if (this.room.name !== this.memory.remoteRoom) {
        this.moveToRoom(this.memory.remoteRoom);
        return;
    }

    const controller = this.room.controller;
    if (!controller) return;

    const result = this.reserveController(controller);

    if (result === ERR_NOT_IN_RANGE) {
        this.moveTo(controller, { reusePath: 50 });
        return;
    }

    if (result < 0) {
        this.say(result.toString());
    }
};
