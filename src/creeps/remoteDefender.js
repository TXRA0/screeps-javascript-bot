var remoteDefender = {

    /** @param {Creep} creep **/
    run: function(creep) {
        let flag = Game.flags["remoteRoom_" + creep.memory.homeRoom];

        if (!flag) {
            creep.say("huh");
            return;
        }

        if (creep.pos.roomName !== flag.pos.roomName) {
            creep.moveTo(flag, {
                visualizePathStyle: { stroke: '#ffaa00' },
                reusePath: 50,
                maxOps: 5000,
                maxRooms: 16,
                range: 1
            });
            return;
        }

        let hostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (hostile) {
            if (creep.attack(hostile) === ERR_NOT_IN_RANGE) {
                creep.moveTo(hostile, { visualizePathStyle: { stroke: '#ff0000' } });
            }
            return;
        }

        creep.moveTo(flag, { range: 1 });
    },

	spawn: function(room) {
		let defenderAmount;
		let flag = _.find(Game.flags, f => f.name.startsWith("remoteRoom_"));

		if (!flag) return;

		let spawningRoomName = flag.name.split("_")[1];

		if (room.name !== spawningRoomName) return;

		let remoteRoomName = flag.pos.roomName;
		let remoteRoom = Game.rooms[remoteRoomName];
		if (!remoteRoom) return;

		let hostiles = remoteRoom.find(FIND_HOSTILE_CREEPS);

		if (hostiles.length) {
			defenderAmount = hostiles.length < 3 ? 1 : 2;
		} else {
			return;
		}

		let defenders = _.filter(
			Game.creeps,
			c => c.memory.role === 'remoteDefender' && c.memory.homeRoom === room.name
		);

		const queued = _.filter(room.memory.spawnQueue || [], r => r.role === 'remoteDefender').length;

		if (defenders.length + queued < defenderAmount) {
			this.request(room);
		}
	},

    request: function(room) {
        room.memory.spawnQueue = room.memory.spawnQueue || [];

        room.memory.spawnQueue.push({
            role: "remoteDefender",
            priority: 3
        });
    },

    getBody: function(room) {
        let segment = [ATTACK, MOVE];
        let segmentCost = BODYPART_COST[ATTACK] + BODYPART_COST[MOVE];

        let energyAvailable = room.energyCapacityAvailable;

        let maxSegments = Math.floor(energyAvailable / segmentCost);
        if (maxSegments < 1) maxSegments = 1;
        if (maxSegments > 16) maxSegments = 16;

        let body = [];
        for (let i = 0; i < maxSegments; i++) {
            body.push(ATTACK, MOVE);
        }

        return body;
    },

    getSpawnData: function(room) {
        return {
            name: "Remote_Defender" + Game.time,
            memory: {
                role: "remoteDefender",
                homeRoom: room.name,
                working: false
            }
        };
    }
};

module.exports = remoteDefender;