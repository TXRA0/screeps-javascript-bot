var utils = {
	inflate: function(ids) {
		if (!Array.isArray(ids)) ids = [ids];
		return ids.map(Game.getObjectById).filter(obj => obj);
	},

	deflate: function(objects){
		return _.transform(objects, function(result, object){
			result.push(object.id);
		}, []);
	},

	workRate: function(creeps){
		var workRate = 0;

		_.forEach(creeps, function(creep){
			_.forEach(creep.body, function(part){
				if(part.type == WORK){
					workRate += 2;
				}
			});
		});

		return workRate;
	},

	myNearestRoom: function(roomName, rooms){
		var myRooms = rooms.where({mine: true}, {spawnable: true});

		var nearestRoom;
		var nearestRoomDistance = 999;

		_.forEach(myRooms, function(room){
			var distance = Game.map.getRoomLinearDistance(roomName, room.name);

			if(distance < nearestRoomDistance){
				nearestRoomDistance = distance;
				nearestRoom = room.name;
			}
		});

		return nearestRoom;
	},
	findHostileCreeps(room) {
		if (room._hostileCreeps) {
			return room._hostileCreeps
		}

		const hostileCreeps = room.find(FIND_HOSTILE_CREEPS) 

		room._hostileCreeps = hostileCreeps
		return room._hostileCreeps
	},
	clamp(value, min, max) {
		if (value < min) {
			return min
		}

		if (value > max) {
			return max
		}

		return value
	},
	getTowerDamage(range) {
		return this.clamp(750 - 30 * range, 150, 600)
	},
};

module.exports = utils;