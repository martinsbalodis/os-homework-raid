
window.Disk = function(data) {
	this.id = data.id;
	this.blockCount = data.size;
	this.data = [];
	this.enabled = true;
};

window.Disk.prototype = {
	isRaid: function() {
		return false;
	},
	getBlockCount: function() {
		return this.blockCount;
	},
	write: function(data) {
		this.data.push(data);
		this.text(this.data.join(""));
	},
	text: function(text) {
		d3.select(this.text_node).text(this.id+" ["+this.data.join("")+"]")
	},
	read: function(read_sector, callback) {
		var sector_value = this.data[read_sector];
		callback(sector_value);
	},
	toggle: function() {
		
		this.enabled = !this.enabled;
		var circle = d3.select(this.el).select('circle');
		
		// disabled
		if(!this.enabled) {
			circle.classed("enabled", false).classed("disabled", true);
			this.parent.diskTurnedOff(this);
		}
		// enabled
		else {
			circle.classed("enabled", true).classed("disabled", false);
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
	write: function(disk, data) {
		
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
			.duration(500)
			.delay(100)
			.each("end", function() {
				disk.write(data);
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
			.duration(500)
			.delay(100)
			.each("end", function() {
				block.remove();
				callback(data);
			});
		});
	},
	toggle: window.Disk.prototype.toggle
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
	write: function(data) {
		
		for(var i in this.children) {
			var disk = this.children[i];
			Raid.prototype.write.call(this, disk, data);
		}
	},
	read: function(read_sector, callback) {
		
		var disk = this.children[this.readId%this.children.length];
		Raid.prototype.read.call(this, disk, read_sector, callback);
		this.readId++;
	},
	diskTurnedOff: function(disk) {
		for(var i in this.children) {
			var disk = this.children[i];
			if(disk.enabled) return;
		}
		// no valid disks
		this.toggle();
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