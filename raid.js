
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
			this.data = [];
			if(typeof this.text !== 'undefined') {
				this.text();
			}
		}
		// enable disk
		else {
			circle.classed("enabled", true).classed("disabled", false);
			this.parent.restoreDisk(this);
		}
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
					if(sectorId < blockCount) {
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
	},
	restoreSector: function(sectorId, disk, callback) {
		var controller = this;
		controller.read(sectorId, function(data){
			Raid.prototype.write.call(controller, disk, sectorId, data, callback);
		});
	}
};

Raid0 = {
	init:function() {
		Raid.prototype.init.call(this);
		this.writeCounter=0;
	},
	getBlockCount: function() {
		
		return this.disks[0].blockCount * this.children.length;
	},
	write: function(data) {
		
		//determinate in which disk to do the writing
		var disk_count = this.children.length;
		var disk = this.children[this.writeCounter%disk_count];
		Raid.prototype.write.call(this, disk, data);
		this.writeCounter++;
	}
};