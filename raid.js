
window.Disk = function(data) {
	this.id = data.id;
	this.blockCount = data.size;
	this.data = new Array(data.size);
	this.enabled = true;
};

window.Disk.prototype = {
	isRaid: function() {
		return false;
	},
	getBlockCount: function() {
		return this.blockCount;
	},
	write: function(sectorId, data, callback) {
		this.data[sectorId] = data;
		this.text(this.data.join(","));
		if(typeof callback === 'function') {
			callback();
		}
	},
	text: function() {
		d3.select(this.text_node).text(this.id+" ["+this.data.join("")+"]")
	},
	read: function(read_sector, callback) {
		var sector_value = this.data[read_sector];
		callback(sector_value);
	},
	toggle: function() {

		var circle = d3.select(this.el).select('circle');
		
		// disable disk
		if(this.enabled) {
			this.enabled = false;
			circle.classed("enabled", false).classed("disabled", true);
			this.parent.diskTurnedOff(this);
			this.clear();
		}
		// enable disk
		else {
			circle.classed("enabled", true).classed("disabled", false);
			this.parent.restoreDisk(this);
		}
	},
	clear: function(){
		this.data = new Array(this.blockCount);
		this.text();
	}
};

window.Raid = function(data) {
	this.type = data.type
	this.id = data.id;
	this.children = data.children;
	this.enabled = true;
	this.loadRaid();
	this.init();
}

window.Raid.prototype = {
	isRaid: function() {
		return true;
	},
	// Make this.disks an array of disk objects
	initDisks:function(diskHash) {
		var disks = [];
		for(var i in this.disks) {
			disks.push(diskHash[this.disks[i]]);
		}
		this.disks = disks;
	},
	init:function(){
		for(var i in this.children) {
			var disk = this.children[i]
			disk.parent = this;
		}
	},
	getBlockCount: function() {
		return this.blockCount;
	},
	// loads raid function stack
	loadRaid: function(){
		switch(this.type) {
			case 'R0':
				var functions = Raid0;
				break;
			case 'R1':
				var functions = Raid1;
				break;
			case 'R5':
				var functions = Raid5;
				break;
		}
		for(var fn in functions) {
			this[fn] = functions[fn];
		}
	},
	// Animate writing data to disk
	write: function(disk, sectorId, data, callback) {
		
		var group = d3.select("svg>g");
		
		var block = group.append("rect")
			.attr("x",this.x-8)
			.attr("y",this.y-8)
			.attr("width",16)
			.attr("height",16);
		
		block.transition()
			.attr({
				x: disk.x-8,
				y: disk.y-8
			})
			.duration(100)
			.delay(100)
			.each("end", function() {
				disk.write(sectorId, data, callback);
				block.remove();
			});
	},
	read: function(disk, read_sector, callback) {
		
		var me = this;
		
		disk.read(read_sector, function(data){
			var group = d3.select("svg>g");
		
			var block = group.append("rect")
				.attr("x",disk.x-8)
				.attr("y",disk.y-8)
				.attr("width",16)
				.attr("height",16);

			block.transition()
			.attr({
				x: me.x-8,
				y: me.y-8
			})
			.duration(100)
			.delay(100)
			.each("end", function() {
				block.remove();
				callback(data);
			});
		});
	},
	toggle: window.Disk.prototype.toggle,
	// iterate over child disks
	each: function(fn){
		for(var i in this.children) {
			var break_loop = fn.call(this, this.children[i]);
			if(break_loop === false) {
				break;
			}
		}
	},
	restoreSector: function(sectorId, disk, callback) {
		var controller = this;
		controller.read(sectorId, function(data){
			Raid.prototype.write.call(controller, disk, sectorId, data, callback);
		});
	},
	// clear disk data
	clear: function(){
		this.each(function(disk){
			disk.clear();
		});
	}
};

Raid1 = {
	init:function() {
		Raid.prototype.init.call(this);
		this.readId=0;
	},
	getBlockCount: function() {
		this.blockCount = this.disks[0].blockCount;
		for(var i in this.disks) {
			if(this.blockCount > this.disks[i].blockCount) {
				this.blockCount = this.disks[i].blockCount;
			}
		}
		return this.blockCount;
	},
	write: function(sectorId, data, callback) {
		
		for(var i in this.children) {
			var disk = this.children[i];
			if(disk.enabled) {
				Raid.prototype.write.call(this, disk, sectorId, data, callback);
			}
		}
	},
	read: function(read_sector, callback) {
		
		var disk = this.children[this.readId%this.children.length];
		this.readId++;
		// read only from an enabled disk
		if(!disk.enabled) {
			this.read.call(this, read_sector, callback);
			return;
		}
		
		Raid.prototype.read.call(this, disk, read_sector, callback);
		
	},
	diskTurnedOff: function(disk) {
		for(var i in this.children) {
			var disk = this.children[i];
			if(disk.enabled) return;
		}
		// no valid disks
		this.toggle();
	},
	restoreDisk: function(diskToRestore){
		
		// if the controller was disabled then enable it now
		if(!this.enabled) {
			diskToRestore.enabled = true;
			this.toggle();
		}
		else {
			// @TODO refactor
			var blockCount = this.children[0].blockCount;

			var controller = this;
			
			var restore_callback = (function(blockCount, sectorId){
				return function(){
					if(sectorId+1 < blockCount) {
						sectorId++;
						controller.restoreSector(sectorId, diskToRestore, restore_callback);
					}
					else {
						diskToRestore.enabled=true;
					}
				};
			})(blockCount, 0);
			this.restoreSector(0, diskToRestore, restore_callback);
		}
	}
};

Raid0 = {
	init:function() {
		Raid.prototype.init.call(this);
	},
	getBlockCount: function() {
		
		return this.disks[0].blockCount * this.children.length;
	},
	write: function(sectorId, data, callback) {
		
		//determinate in which disk to do the writing
		var disk_count = this.children.length;
		var disk = this.children[sectorId%disk_count];
		Raid.prototype.write.call(this, disk, sectorId, data, callback);
	},
	read: function(sectorId, callback) {
		
		var disk_count = this.children.length;
		var disk = this.children[sectorId%disk_count];
		Raid.prototype.read.call(this, disk, sectorId, callback);
	},
	// if one this fails thon whole array fails
	diskTurnedOff: function(disk) {
		
		// clear data on all disks
		this.each(function(disk){
			disk.clear();
		});
		
		if(this.enabled) {
			this.toggle();
		}
	},
	restoreDisk: function(diskToRestore){
		
		diskToRestore.enabled = true;
		
		// if all disks are working then raid can work again
		for(var i in this.children) {
			var disk = this.children[i]
			if(disk.enabled === false) return;
		}
		
		// restora data to disks
		this.toggle();
	}
};

Raid5 = {
	init:function() {
		Raid.prototype.init.call(this);
	},
	getBlockCount: function() {
		
		return this.disks[0].blockCount * this.children.length;
	},
	write: function(sectorId, data, callback) {
		
		// @TODO store data also here
		
		//determinate in which disk to do the writing
		var disk_count = this.children.length;
		var row = Math.floor((sectorId)/(disk_count-1));
		var parity_col = row % disk_count;
		var data_col = sectorId%(disk_count-1);
		if(data_col >= parity_col) {
			data_col++;
		}
		var parityDisk = this.children[parity_col];
		var dataDisk = this.children[data_col];
		
		// read from
		var controller = this;
		Raid.prototype.read.call(controller, parityDisk, row, function(parity){
			Raid.prototype.read.call(controller, dataDisk, row, function(originalData){
				Raid.prototype.write.call(controller, dataDisk, row, data, function(){
					Raid.prototype.write.call(controller, parityDisk, row, "p", callback);
				});
			});
		});
	},
	read: function(sectorId, callback) {
		
		var disk_count = this.children.length;
		var row = Math.floor((sectorId)/(disk_count-1));
		var parity_col = row % disk_count;
		var data_col = sectorId%(disk_count-1);
		if(data_col >= parity_col) {
			data_col++;
		}
		var dataDisk = this.children[data_col];
		
		Raid.prototype.read.call(this, dataDisk, row, callback);
	},
};