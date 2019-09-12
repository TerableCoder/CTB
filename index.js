String.prototype.clr = function (hexColor){ return `<font color='#${hexColor}'>${this}</font>`};

module.exports = function CTB(mod){
	const command = mod.command || mod.require.command;
	mod.game.initialize("inventory");

	let hooks = [],
		enabled = false,
		loc = { x: 0, y: 0, z: 0 },
		w = 0,
		buy = false,
		dismantle = false,
		timeout = null;

	command.add('ctb', {
		$none(){
			enabled = !enabled;
			command.message('CTB ' + (enabled?'enabled.':'disabled.'));
			(enabled) ? load() : unload();
    	}
	});

	function hook(){ hooks.push(mod.hook(...arguments)); }
	
	function unload(){
		if(hooks.length){
			for (let h of hooks)
				mod.unhook(h);
			hooks = [];
			clearTimeout(timeout);
		}
	}

	function load(){
		if(!hooks.length){
			hook('C_PLAYER_LOCATION', 5, event => {
				Object.assign(loc, event.loc);
				w = event.w;
			});
			
			mod.hook('S_REQUEST_CONTRACT', 1, event => {
				if(event.type == 20 && buy){
					let delay = 200;
					
					for(let i = 0; i<18; i++){
						timeout = mod.setTimeout(() => {
							mod.send('C_MEDAL_STORE_BUY_ADD_BASKET', 1, {
								gameId: mod.game.me.gameId,
								contract: event.id,
								item: 181738,
								amount: 1
							});
						}, delay);
						delay += 200;
					}
					
					timeout = mod.setTimeout(() => {
						mod.toServer('C_MEDAL_STORE_COMMIT', 1, { gameId: mod.game.me.gameId, contract: event.id });
						buy = false;

						timeout = mod.setTimeout(() => {
							mod.toServer('C_CANCEL_CONTRACT', 1, {
								type: 20,
								id: event.id
							});
							mod.toServer('C_CANCEL_CONTRACT', 1, { // sends twice, idk
								type: 20,
								id: event.id
							});
							clearTimeout(timeout);
							timeout = setTimeout(startDismantling, 2000);
						}, 1000);
					}, delay+50);
					
				} else if(event.type == 90 && dismantle){
					let delay = 200;
					
					mod.game.inventory.findAllInBag(181738).forEach(item => {
						timeout = mod.setTimeout(() => {
							mod.toServer('C_RQ_ADD_ITEM_TO_DECOMPOSITION_CONTRACT', 1, {
								contract: event.id,
								dbid: item.dbid,
								id: 181738,
								count: 1
							});
						}, delay);
						delay += 200;
					});
					
					timeout = mod.setTimeout(() => {
						mod.toServer('C_RQ_START_SOCIAL_ON_PROGRESS_DECOMPOSITION', 1, { contract: event.id });
						dismantle = false;

						timeout = mod.setTimeout(() => {
							mod.toServer('C_CANCEL_CONTRACT', 1, {
								type: 90,
								id: event.id
							});
							clearTimeout(timeout);
							timeout = setTimeout(startBuying, 1000);
						}, 3000);
					}, delay+50);
				}
				
			});
			
			
			startBuying();
			
		}
	}

	function startBuying(){
		let foundCoupon = mod.game.inventory.findInBag(91344); // get Item
		if(foundCoupon && foundCoupon.amount > 0){
			buy = true;
			dismantle = false;
			
			mod.send('C_USE_ITEM', 3, {
				gameId: mod.game.me.gameId,
				id: 91344,
				dbid: 470154812,
				target: 0,
				amount: 1,
				dest: { x: 0, y: 0, z: 0 },
				loc: loc,
				w: 0,
				unk1: 0,
				unk2: 0,
				unk3: 0,
				unk4: true
			});
		}
	}

	function startDismantling(){
		dismantle = true;
		buy = false;
		mod.toServer('C_REQUEST_CONTRACT', 1, {
			type: 90,
			unk2: 0,
			unk3: 0,
			unk4: 0,
			name: "",
			data: Buffer.alloc(0)
		});
	}
};