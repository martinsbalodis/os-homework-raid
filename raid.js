/**
 * Main container. Also known as a computer
 */
window.R = function(data){
	this.data = data;
	this.disks = [];
	this.connections = [];
	this.diskHash = {};
	
	// init disks
	for(var i in data.disks) {
		var disk = new Disk(data.disks[i]);
		disk.container = this;
		this.disks.push(disk);
		this.diskHash[disk.id] = disk;
	}
	
	// init raid controllers
	for(i in data.controllers) {
		var raid = new Raid(data.controllers[i]);
		raid.container = this;
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
			disk.parentConnection = connection;
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
			.linkDistance(150)
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

			me.d3Disks.attr("x", function(d) { return d.x; })
				//.attr("y", function(d) { return d.y-10; });
				.attr("transform", function(d) { return "translate("+d.x+","+d.y+")"; });
		});
			
	},
	draw: function() {
		
//		for(var i in this.disks) {
//			var disk = this.disks[i];
//			disk.draw();
//		}
		
		this.d3Disks = this.svg.selectAll("g")
			.data(this.disks)
			.enter().append("g")
			.each(function(disk){
				disk.elGroup = d3.select(this);
				
				disk.elGroup.append("rect")
				.attr("class", "disk")
				.attr("height", 20)
				.attr("width", function(d) { return d.getBlockCount()*20; })
				.style("fill", function(d) { return color(d.id); })
				
				disk.elGroup.append('text')
				.attr('fill', 'black')
				.attr('x', '0')
				.attr('y', '15');
				
			});
//		this.svg.append('text')
//				.text('ASDASDSaaaaaaaaaaaaaAD')
//				.attr('fill', 'red')
//				.attr('x', '0')
//				.attr('y', '15')
		
		
		this.d3Connections = this.svg.selectAll(".link")
			.data(this.connections)
			.enter().append("line")
			.attr("class", "link")
			.style("stroke-width", 1);
	},
	getDisk: function(id){
		for(var i in this.disks) {
			if(this.disks[i].id === id) {
				return this.disks[i];
			}
		}
	}
};

window.Disk = function(data) {
	this.id = data.id;
	this.blockCount = data.blockCount;
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
		this.elGroup.select('text').text(text);
	}
};

window.Raid = function(data) {
	this.type = data.type
	this.id = data.id;
	this.disks = data.disks;
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
		var connection = disk.parentConnection;
		var block = this.container.svg.append("rect")
			.attr("x",connection.source.x)
			.attr("y",connection.source.y)
			.attr("width",15)
			.attr("height",15);
		
		block.transition()
			.attr({
				x: connection.target.x,
				y: connection.target.y
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
		
		for(var i in this.disks) {
			var disk = this.disks[i];
			Raid.prototype.write.call(this, disk, data);
		}
	}
};

window.DiskConnection = function(data){
	this.source = data.source;
	this.target = data.target;
};