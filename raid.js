
window.Disk = function(data) {
	this.id = data.id;
	this.blockCount = data.size;
	this.data = [];
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
	draw: function(){
		this.el = this.container.svg.append("rect")
			//.data(this)
			.attr("class", "disk")
			.attr("height", 20)
			.attr("width", 5)
			.style("fill", function() { return color(123); });
	},
	text: function(text) {
//		this.elGroup.select('text').text(text);
	}
};

window.Raid = function(data) {
	this.type = data.type
	this.id = data.id;
	this.children = data.children;
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
		
	},
	getBlockCount: function() {
		return this.blockCount;
	},
	// loads raid function stack
	loadRaid: function(){
		switch(this.type) {
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
		console.log(svg);
		
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
	draw: Disk.prototype.draw
};

Raid1 = {
	init:function() {
		Raid.prototype.init.call(this);
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
	}
};

window.DiskConnection = function(data){
	this.source = data.source;
	this.target = data.target;
};