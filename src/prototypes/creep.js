
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
	const sources = this.room.find(FIND_SOURCES);
	if (sources.length) {
		this.memory.source = sources[0].id;
		return sources[0];
	}
};
Creep.prototype.findEnergySourceMiner = function() {
    const sources = this.room.find(FIND_SOURCES);

    // Get all sourceIds currently used by harvesters
    const usedSources = _.map(
        _.filter(Game.creeps, c => c.memory.role === 'harvester' && c.memory.sourceId),
        c => c.memory.sourceId
    );

    // Find a source not already assigned
    const freeSource = _.find(sources, s => !usedSources.includes(s.id));

    if (freeSource) {
        this.memory.sourceId = freeSource.id;
        return freeSource;
    }

    return null;
};
Creep.prototype.moveToRoom = function moveToRoom(roomName) {
	this.moveTo(new RoomPosition(25, 25, roomName));
}
Creep.prototype.harvestEnergy = function harvestEnergy() {
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
Creep.prototype.harvestEnergyMiner = function harvestEnergyMiner() {
    let storedSource = Game.getObjectById(this.memory.sourceId);

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

Creep.prototype.getEnergyHaulTarget = function() {
    let porterCreeps = _.filter(Game.creeps, c => c.memory.role === 'porter' && c.room.name === this.room.name);
    let roomState = porterCreeps.length > 0 ? 'porter' : 'normal';

    let priorityTables = {
        normal: {
            STRUCTURE_SPAWN: 1,
            STRUCTURE_EXTENSION: 1,
            STRUCTURE_TOWER: 2,
            STRUCTURE_CONTAINER: 3,
            STRUCTURE_STORAGE: 4,
            STRUCTURE_LAB: 5
        },
        porter: {
            STRUCTURE_SPAWN: 2,
            STRUCTURE_EXTENSION: 2,
            STRUCTURE_TOWER: 3,
            STRUCTURE_CONTAINER: 2,
            STRUCTURE_STORAGE: 1,
            STRUCTURE_LAB: 3
        }
    };

	let allTargets = this.room.find(FIND_MY_STRUCTURES)
		.filter(s => s.store && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0);

	let essentialTypes = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER];
	let essentialTargets = allTargets.filter(s => essentialTypes.includes(s.structureType));

	if (essentialTargets.length > 0) {
		essentialTargets.sort((a, b) => this.pos.getRangeTo(a) - this.pos.getRangeTo(b));
		return essentialTargets[0];
	}

	if (allTargets.length > 0) {
		let minPriority = Math.min(...allTargets.map(t => priorityTables[roomState][t.structureType] || 99));
		let highPriorityTargets = allTargets.filter(t => (priorityTables[roomState][t.structureType] || 99) === minPriority);
		highPriorityTargets.sort((a, b) => this.pos.getRangeTo(a) - this.pos.getRangeTo(b));

		if (highPriorityTargets.length) {
			return highPriorityTargets[0];
		}
	}

	const upgraders = this.room.find(FIND_MY_CREEPS).filter(
		c => c.memory.role === "upgrader" && c.store.getFreeCapacity(RESOURCE_ENERGY) > 0
	);

	if (upgraders.length) {
		return this.pos.findClosestByRange(upgraders);
	}

	return null;
};

Creep.prototype.getEnergyHaulTargetPorter = function() {
    let roomState = 'normal';

    let priorityTables = {
        normal: {
            STRUCTURE_SPAWN: 1,
            STRUCTURE_EXTENSION: 1,
            STRUCTURE_TOWER: 2,
            STRUCTURE_CONTAINER: 3,
            STRUCTURE_LAB: 4,
        },
    };

    let allTargets = this.room.find(FIND_MY_STRUCTURES).filter(s => s.store && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0);

    if (allTargets.length === 0) return null;

    let essentialTypes = [STRUCTURE_SPAWN, STRUCTURE_EXTENSION, STRUCTURE_TOWER];
    let essentialTargets = allTargets.filter(s => essentialTypes.includes(s.structureType));

    if (essentialTargets.length > 0) {
        essentialTargets.sort((a, b) => this.pos.getRangeTo(a) - this.pos.getRangeTo(b));
        return essentialTargets[0];
    }

    let minPriority = Math.min(...allTargets.map(t => priorityTables[roomState][t.structureType] || 99));
    let highPriorityTargets = allTargets.filter(t => (priorityTables[roomState][t.structureType] || 99) === minPriority);
    highPriorityTargets.sort((a, b) => this.pos.getRangeTo(a) - this.pos.getRangeTo(b));

    return highPriorityTargets[0];
};
Creep.prototype.getEnergyTarget = function (sourceContainers = null) {
    let target = Game.getObjectById(this.memory.energyTarget);
    if (target) {
        let hasEnergy = false;
        if (target.store) {
            hasEnergy = target.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
        } else if (target.amount) {
            hasEnergy = target.amount > 0;
        }

        if (hasEnergy) {
            if (target.store) {
                if (this.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    this.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            } else {
                if (this.pickup(target) === ERR_NOT_IN_RANGE) {
                    this.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            }
            return target;
        } else {
            delete this.memory.energyTarget;
            target = null;
        }
    }

    //If no stored target, pick a new one
    if (sourceContainers && sourceContainers.length > 0) {
        const richest = _.max(sourceContainers, c => c.store.getUsedCapacity(RESOURCE_ENERGY));
        if (richest && richest.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            this.memory.energyTarget = richest.id;
            if (this.withdraw(richest, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.moveTo(richest, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
            return richest;
        }
    }

    const dropped = this.room.find(FIND_DROPPED_RESOURCES, {
        filter: r => r.resourceType === RESOURCE_ENERGY
    });
    if (dropped.length > 0) {
        const richestDrop = _.max(dropped, r => r.amount);
        this.memory.energyTarget = richestDrop.id;
        if (this.pickup(richestDrop) === ERR_NOT_IN_RANGE) {
            this.moveTo(richestDrop, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
        return richestDrop;
    }

    delete this.memory.energyTarget;
    return null;
};
Creep.prototype.getEnergyTargetOther = function (sourceContainers = null) {
    let target = Game.getObjectById(this.memory.energyTarget);

    if (target) {
        let hasEnergy = false;

        if (target.store) {
            hasEnergy = target.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
        } else if (target.amount) {
            hasEnergy = target.amount > 0;
        }

        if (hasEnergy) {
            if (target.store) {
                if (this.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    this.moveTo(target);
                }
            } else {
                if (this.pickup(target) === ERR_NOT_IN_RANGE) {
                    this.moveTo(target);
                }
            }
            return target;
        }

        delete this.memory.energyTarget;
    }

    if (this.room.storage && this.room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
        this.memory.energyTarget = this.room.storage.id;
        if (this.withdraw(this.room.storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            this.moveTo(this.room.storage);
        }
        return this.room.storage;
    }

    if (sourceContainers && sourceContainers.length > 0) {
        const richest = _.max(sourceContainers, c => c.store.getUsedCapacity(RESOURCE_ENERGY));
        if (richest.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            this.memory.energyTarget = richest.id;
            if (this.withdraw(richest, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.moveTo(richest);
            }
            return richest;
        }
    }

    const dropped = this.room.find(FIND_DROPPED_RESOURCES, {
        filter: r => r.resourceType === RESOURCE_ENERGY
    });

    if (dropped.length > 0) {
        const richestDrop = _.max(dropped, r => r.amount);
        this.memory.energyTarget = richestDrop.id;
        if (this.pickup(richestDrop) === ERR_NOT_IN_RANGE) {
            this.moveTo(richestDrop);
        }
        return richestDrop;
    }

    delete this.memory.energyTarget;
    return null;
};

Creep.prototype.getEnergyTargetPorter = function (sourceContainers = null) {
    let target = Game.getObjectById(this.memory.energyTarget);
    if (target) {
        let hasEnergy = false;
        if (target.store) {
            hasEnergy = target.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
        } else if (target.amount) {
            hasEnergy = target.amount > 0;
        }

        if (hasEnergy) {
            if (target.store) {
                if (this.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    this.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            } else {
                if (this.pickup(target) === ERR_NOT_IN_RANGE) {
                    this.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            }
            return target;
        } else {
            delete this.memory.energyTarget;
            target = null;
        }
    }
	if (this.room.storage && this.room.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
        this.memory.energyTarget = this.room.storage.id;
        if (this.withdraw(this.room.storage, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            this.moveTo(this.room.storage);
        }
        return this.room.storage;
    }
	delete this.memory.energyTarget;
    return null;
};
Creep.prototype.upgrade = function (creep) {
    const sites = creep.room.find(FIND_CONSTRUCTION_SITES);
    const controller = creep.room.controller;
    if (!controller) return;

    if (!controller.sign || controller.sign.username !== creep.owner.username) {
        const signText = `${creep.room.name} Is property of _TXR`;
        const signResult = creep.signController(controller, signText);
        if (signResult === ERR_NOT_IN_RANGE) {
            creep.moveTo(controller.pos, { maxRooms: 1 });
        }
        return;
    }

    // these bloody recursion loops break my CPU
    if (!creep.memory._triedUpgrade) {
        creep.memory._triedUpgrade = true;

        if (controller.ticksToDowngrade > 500 && sites.length > 0) {
            this.building(creep);
            return;
        }
    }

    const result = creep.upgradeController(controller);
    if (result === ERR_NOT_IN_RANGE) {
        creep.moveTo(controller.pos, { maxRooms: 1 });
    }

    creep.memory._triedUpgrade = false;
};