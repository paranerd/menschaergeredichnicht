var action = 0; // 0 == roll, 1 == select
var activePiece = null;
var activePlayer = null;
var players = [];
var toGo = 2;
var tries = 3;
var rollAgain = false;
var homes = [52, 10, 24, 38];

$(document).ready(function() {
	var test = [true, true, null, null];
	init(test);
});

$("#dice").click(function(e) {
	roll();
});

$(".piece").click(function(e) {
	if (action == 0) {
		$("#info").text("Roll dice first!");
		return;
	}

	if (this.id.substr(1,1) != activePlayer) {
		$("#info").text("Not your turn!");
		return;
	}

	activePiece = this.id.substr(2,1);

	if (canGo(activePlayer, activePiece)) {
		move(getPath(activePlayer, activePiece, toGo));
	}
});

$(".field").mouseover(function(e) {
	if ($(this).children().length == 0 || ($(this).children()[0]).id.substr(1,1) != activePlayer || toGo == 0) {
		return;
	}

	var player = ($(this).children()[0]).id.substr(1,1);
	var piece = ($(this).children()[0]).id.substr(2,1);

	if (canGo(player, piece)) {
		highlightPath(getPath(player, piece, toGo));
	}
}).mouseout(function(e) {
	$(".field").removeClass("highlight");
});

function init(p) {
	for (var i = 0; i < p.length; i++) {
		if (p[i] != null) {
			players.push(new Player(i, homes[i], p[i]));
		}
	}

	next();
}

function next() {
	var found = false;

	for (var i = 0; i < players.length; i++) {
		activePlayer = (activePlayer != null && activePlayer < players.length - 1) ? ++activePlayer : 0;

		if (!players[activePlayer].isFinished()) {
			found = true;
			break;
		}
	}

	if (found) {
		tries = 3;
		action = 0;

		$("#info").text("Player " + (activePlayer + 1) + ": Roll!");
		$(".baseContainer").removeClass("active");
		$("#b" + activePlayer).addClass("active");

		if (players[activePlayer].auto) {
			roll();
		}
	}
	else {
		console.log("Game Over");
	}
}

function roll() {
	if (action != 0) {
		return;
	}

	toGo = Math.floor(Math.random() * 6 + 1);

	$("#dice").text(toGo);

	// May roll again if rolled a 6
	rollAgain = (toGo == 6) ? true : false;

	// If player has pieces out, he has only one draw
	tries = (players[activePlayer].hasPieceOut()) ? 0 : --tries;

	// If any piece can move, player must select
	if (canAnyPieceGo(activePlayer)) {
		$("#info").text("Player " + (activePlayer + 1) + ": Draw!");
		action = 1;

		if (players[activePlayer].auto) {
			AISelect();
		}
	}
	else {
		if (!rollAgain && tries == 0) {
			next();
		}
		else {
			$("#info").text("Player " + (activePlayer + 1) + ": Roll!");
			action = 0;

			if (players[activePlayer].auto) {
				roll();
			}
		}
	}
}

function move(path) {
	if (action != 1) {
		return;
	}

	var pos = path.shift();
	players[activePlayer].pieces[activePiece] = pos;

	toGo--;

	$("#p" + activePlayer + "" + activePiece).appendTo($("#f" + pos));

	if (path.length > 0) {
		setTimeout(function() {
			move(path);
		}, 250);
	}
	else {
		$("#dice").text("");
		//checkAndKick(pos);
		canKick(activePlayer, activePiece, pos, true);
		var finished = players[activePlayer].isFinished();

		if (!rollAgain || finished) {
			next();
		}
		else if (!finished) {
			action = 0;

			if (players[activePlayer].auto) {
				roll();
			}
		}
	}
}

function getPath(player, piece, distance) {
	var pos = players[player].pieces[piece];
	var path = [];

	if (pos == null) {
		if (distance == 6 && isFree(player, player * 14)) {
			path.push(player * 14);
		}
		return path;
	}

	while (distance > 0) {
		if ((player == 0 && pos == 55) || pos == player * 14 - 1) {
			return [];
		}

		pos = (pos == 55) ? 0 : ++pos;

		// Don't count foreign homes
		if (!($("#f" + pos).is('[class*="home"]') && !$("#f" + pos).hasClass("player" + player))) {
			path.push(pos);
			distance--;
		}
	}

	return path;
}

function highlightPath(path) {
	for (var i = 0; i < path.length; i++) {
		$("#f" + path[i]).addClass("highlight");
	}
}

function canAnyPieceGo(player) {
	for (var i = 0; i < players[player].pieces.length; i++) {
		if (canGo(player, i)) {
			return true;
		}
	}

	return false;
}

function canGo(player, piece) {
	var path = getPath(player, piece, toGo);

	return (path.length > 0 && isFree(player, path[path.length - 1]));
}

// Checks if piece can kick other player (and optionally does the kick)
function canKick(player, piece, pos, doKick) {
	if (pos == null) {
		var path = getPath(player, piece, toGo);

		if (path.length == 0 || players[player].pieces[piece] == null) {
			return null;
		}

		pos = path[path.length - 1];
	}

	for (var i = 0; i < players.length; i++) {
		if (i == activePlayer) {
			continue;
		}

		for (var j = 0; j < players[i].pieces.length; j++) {
			if (players[i].pieces[j] == pos) {
				if (doKick) {
					$("#p" + i + "" + j).appendTo($("#b" + i + "" + j));
					players[i].pieces[j] = null;
				}
				return players[i].pieces[j];
			}
		}
	}

	return null;
}

function isFree(player, pos) {
	for (var i = 0; i < players.length; i++) {
		for (var j = 0; j < players[i].pieces.length; j++) {
			if (players[i].pieces[j] == pos) {
				return (i != player);
			}
		}
	}

	return true;
}

function Player(id, home, auto) {
	this.id				= id;
	this.home			= home;
	this.pieces			= [null, null, null, null];
	this.auto			= auto;

	this.hasPieceOut	= function() {
		for (var i = 0; i < this.pieces.length; i++) {
			if (this.pieces[i] != null) {
				return true;
			}
		}
		return false;
	}

	// If any of the player's pieces is at base or not in home, player is not finished
	this.isFinished = function() {
		for (var i = 0; i < this.pieces.length; i++) {
			var pos = this.pieces[i];

			if (pos == null ||
				pos < this.home ||
				pos > this.home + 3)
			{
				return false;
			}
		}
		return true;
	}
}

function AISelect() {
	activePiece = AIChoosePiece();

	move(getPath(activePlayer, activePiece, toGo));
}

function AIComparePriorities(a, b) {
	if (a.priority > b.priority) return 1;
	if (a.priority < b.priority) return -1;
	return 0;
}

function AIChoosePiece() {
	var priorities = [];

	for (var i = 0; i < 4; i++) {
		if (canGo(activePlayer, i)) {
			// Leave starter
			if (players[activePlayer].pieces[i] == activePlayer * 14) {
				priorities.push({id: i, priority: 0});
			}
			// Leave base
			else if (players[activePlayer].pieces[i] == null) {
				priorities.push({id: i, priority: 1});
			}
			// Kick other player
			else if (canKick(activePlayer, i, null, false)) {
				priorities.push({id: i, priority: 2});
			}
			else {
				priorities.push({id: i, priority: 3});
			}
		}
	}

	priorities.sort(AIComparePriorities);
	return priorities[0].id;
}