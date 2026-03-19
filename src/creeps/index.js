const mineralMiner = require('./mineralMiner');

let creepLogic = {
    harvester:     require('./harvester'),
	upgrader:	require('./upgrader'),
    builder:	require('./builder'),
	hauler:		require('./hauler'),
	porter:		require('./porter'),
	wallBuilder: require('./wallBuilder'),
	berserker: require('./berserker'),
	healer: require('./healer'),
	ranger: require('./ranger'),
	claimer: require('./claimer'),
	pioneer: require('./pioneer'),
	defender: require('./defender'),
	remoteHarvester: require('./remoteHarvester'),
	remoteHauler: require('./remoteHauler'),
	reserver: require('./reserver'),
	remoteDefender: require('./remoteDefender'),
	mineralMiner: require('./mineralMiner')
}

module.exports = creepLogic;