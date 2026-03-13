var remoteHauler = {

    /** @param {Creep} creep **/
    run: function(creep) {

        const flag = Game.flags[`remoteRoom_${creep.memory.homeRoom}`];
        if (!flag) {
            creep.say("huh");
            return;
        }

        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
        }

        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
            delete creep.memory.energyTarget;
            delete creep.memory.target;
        }

        if (creep.memory.working) {

            if (creep.room.name !== creep.memory.homeRoom) {
                creep.moveToRoom(creep.memory.homeRoom);
                return;
            }

            let target = Game.getObjectById(creep.memory.target);

            if (!target || target.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                target = creep.getEnergyHaulTarget();

                if (target) {
                    creep.memory.target = target.id;
                } else {
                    creep.memory.target = null;
                }
            }

            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target);
                }
            }

        }

        else {

            if (creep.pos.roomName !== flag.pos.roomName) {
                creep.moveTo(flag, {
                    reusePath: 50,
                    maxOps: 5000,
                    maxRooms: 16
                });
                return;
            }

            creep.getEnergyTarget();
        }
    },

    spawn: function(room) {

        let flag = Game.flags[`remoteRoom_${room.name}`];
        if (!flag) return;

        let haulers = _.filter(
            Game.creeps,
            c => c.memory.role === 'remoteHauler' && c.memory.homeRoom === room.name
        );

        const queued = _.filter(
            room.memory.spawnQueue || [],
            r => r.role === 'remoteHauler'
        ).length;

        const neededHaulers = this.calculateNeededHaulers(room);

        if (haulers.length + queued < neededHaulers) {
            this.request(room);
        }
    },

    request: function(room) {

        room.memory.spawnQueue = room.memory.spawnQueue || [];

        if (!room.memory.spawnQueue.find(r => r.role === 'remoteHauler')) {
            room.memory.spawnQueue.push({
                role: "remoteHauler",
                priority: 5
            });
        }
    },

    getBody: function(room) {

        let segment = [CARRY, CARRY, MOVE, MOVE];

        let harvesters = _.filter(
            Game.creeps,
            c => c.memory.role === 'harvester' && c.room.name === room.name
        );

        let energyAvailable = harvesters.length ? room.energyCapacityAvailable : room.energyAvailable;

        let segmentCost = _.sum(segment, p => BODYPART_COST[p]);

        let maxSegments = Math.max(1, Math.floor(energyAvailable / segmentCost));
        maxSegments = Math.min(maxSegments, 12);

        let body = [];

        for (let i = 0; i < maxSegments; i++) {
            body.push(...segment);
        }

        return body;
    },

    getSpawnData: function(room) {
        return {
            name: "RemoteHauler" + Game.time,
            memory: {
                role: 'remoteHauler',
                homeRoom: room.name,
                working: false
            }
        };
    },

    calculateNeededHaulers: function(room) {

        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return 0;

        const flag = Game.flags[`remoteRoom_${room.name}`];
        if (!flag) return 0;

        let totalCarryPartsNeeded = 0;

        const remoteRoom = Game.rooms[flag.pos.roomName];
        if (!remoteRoom) return 1;

        remoteRoom.find(FIND_SOURCES).forEach(source => {

            const path = PathFinder.search(
                spawn.pos,
                { pos: source.pos, range: 1 },
                {
                    swampCost: 5,
                    plainCost: 2,
                    maxOps: 5000
                }
            );

            const distance = path.path.length;

            const energyPerTick = 10;

            const carryParts = Math.ceil((distance * 2 * energyPerTick) / 50);

            totalCarryPartsNeeded += carryParts;

        });

        const carryPerHauler =
            this.getBody(room).filter(p => p === CARRY).length || 1;

        return Math.ceil(totalCarryPartsNeeded / carryPerHauler);
    }

};

module.exports = remoteHauler;