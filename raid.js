window.R = function(data){
	this.data = data;
	this.disks = [];
	this.connections = [];
	this.diskHash = {};
	
	// init disks
	for(var i in data.disks) {
		var disk = new Disk(data.disks[i]);
		this.disks.push(disk);
		this.diskHash[disk.id] = disk;
	}
	
	// init raid controllers
	for(i in data.controllers) {
		var raid = new Raid(data.controllers[i]);
		this.disks.push(raid);
		this.diskHash[raid.id] = raid;
		raid.initDisks(this.diskHash);
	}
	
	// init disk-raid connections
	for(i in this.disks) {
		var raid = this.disks[i];
		if(!raid.isRaid()) continue;
		
		for(var j in raid.disks) {
			var disk = raid.disks[j];
			var connection = new DiskConnection({
				source: raid,
				target: disk
			});
			this.connections.push(connection);
		}
	}
};

R.prototype = {
	drawTo: function(parent, width, height) {

		this.width = width;
		this.height = height;
		this.svg = parent.append("svg")
		.attr("width", this.width)
		.attr("height", this.height);

		this.draw();
		this.initForce();
	},
	initForce: function() {
		
		var me = this;
		
		this.force = d3.layout.force()
			.charge(-120)
			.linkDistance(60)
			.size([this.width, this.height]);
		
		this.force
			.nodes(this.disks)
			.links(this.connections)
			.start();
			
		this.force.on("tick", function() {
			me.d3Connections.attr("x1", function(d) { return d.source.x; })
				.attr("y1", function(d) { return d.source.y; })
				.attr("x2", function(d) { return d.target.x; })
				.attr("y2", function(d) { return d.target.y; });

			me.d3Disks.attr("cx", function(d) { return d.x; })
				.attr("cy", function(d) { return d.y; });
			});
			
	},
	draw: function() {
		
		this.d3Disks = this.svg.selectAll(".disk")
			.data(this.disks)
			.enter().append("circle")
			.attr("class", "disk")
			.attr("r", 20)
			.style("fill", function(d) {
				return color(d.id);
			});
		
		this.d3Connections = this.svg.selectAll(".link")
			.data(this.connections)
			.enter().append("line")
			.attr("class", "link")
			.style("stroke-width", 1);
	}
};

window.Disk = function(data) {
	this.id = data.id;
	this.blockCount = data.blockCount;
	
	// d3.force
	this.weight = 1;
};

window.Disk.prototype = {
	isRaid: function() {
		return false;
	}
};

window.Raid = function(data) {
	this.type = data.type
	this.id = data.id;
	this.disks = data.disks;
	
	// d3.force
	this.weight = 1;
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
	}
};

window.DiskConnection = function(data){
	this.source = data.source;
	this.target = data.target;
};