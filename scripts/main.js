/*
	Copyright (c) DeltaNedas 2020

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
(() => {

const ui = require("ui-lib/library");

const toast = text => {
	Vars.ui.showInfoToast(text, 5);
};

// array of int-packed positions
const reactors = [];

const suffices = ['K', 'M', 'B', 'T'];

function suffix(n) {
	var thresh;
	for (var i = suffices.length - 1; i > 0; i--) {
		thresh = Math.pow(10, i * 3);
		if (n >= thresh) {
			return Math.round(n / thresh * 10) / 10 + suffices[i - 1];
		}
	}
	return Math.round(n);
}

const frag = extend(Fragment, {
	build(parent) {
		this.content.touchable(Touchable.childrenOnly);

		parent.fill(cons(cont => {
			cont.visible(boolp(() => this.visible));
			cont.touchable(Touchable.childrenOnly);
			cont.update(run(() => {
				if (Vars.state.is(GameState.State.menu)) {
					this.visible = false;
					return;
				}
			}));
			cont.table(Tex.buttonTrans, cons(pane => {
				pane.label(prov(() => "Reactors")).get().touchable(Touchable.disabled);
				pane.row();
				pane.pane(this.content).grow()
					.touchable(Touchable.childrenOnly)
					.get().setScrollingDisabled(true, false);
				pane.row();

				// Add reactor player is above
				pane.addImageButton(Icon.upgrade, Styles.clearPartiali, 32, run(() => {
					toast("Click a reactor");
					ui.click((pos, tile) => {
						this.set(tile && tile.link());
					}, true);
				})).margin(8);
			}));
			cont.bottom();
		}));
		this.rebuild();
	},

	toggle() {
		this.visible = !this.visible;
	},

	rebuild() {
		this.content.clear();

		for (var i in reactors) {
			this.add(i);
		}
	},

	add(i) {
		var reactor = Vars.world.tile(reactors[i]);
		if (!reactor || !(reactor.block() instanceof NuclearReactor)) {
			return;
		}

		const safe = func => prov(() => {
			if (!reactor.entity || !reactor.entity.items) {
				reactors.splice(i, 1);
				this.rebuild();
				return "";
			}
			return func();
		});

		var table = new Table();
		table.touchable(Touchable.childrenOnly);
		table.label(safe(() => reactor.x + "," + reactor.y
			+ " | F " + suffix(reactor.entity.items.total())
			+ " | C " + Math.round(this.getCryo(reactor.ent()) * 100) + "%"
			+ " | H " + Math.round(reactor.entity.heat * 100) + "%"
			+ " | P " + suffix(reactor.block().getPowerProduction(reactor) * 60 * reactor.entity.timeScale))).touchable(Touchable.disabled);

		// SCRAM button
		table.addImageButton(Icon.cancel, Styles.clearPartiali, run(() => {
			// Take out 300
			for (var i = 0; i < 20; i++) {
				// 15 at a time, smallest inventory fits this
				Call.requestItem(Vars.player, reactor, Items.thorium, 15);
			}
		})).margin(4).visible(boolp(() => {
			// Only show when reactor is low on cryo
			return reactor.entity != null && reactor.entity.liquids != null && reactor.entity.liquids.total() < 28;
		}));
		this.content.add(table);
		this.content.row();
	},

	set(tile) {
		const pos = this.reactorCenter(tile, false);
		if (pos !== null) {
			const index = reactors.indexOf(pos);
			if (index >= 0) {
				reactors.splice(index, 1);
				toast("Removed reactor");
			} else {
				reactors.push(pos);
				toast("Added reactor");
			}
			this.rebuild();
		} else {
			toast("[red]Not a reactor");
		}
	},

	reactorCenter(tile, tried) {
		if (!tile) return null;
		const block = tile.block();
		if (!block) return null;
		return block instanceof NuclearReactor ? tile.pos() : null;
	},

	/* Total cryo in adjacent tanks */
	getCryo(ent) {
		var max = ent.block.liquidCapacity;
		var count = ent.liquids.get(Liquids.cryofluid);

		if (ent.block instanceof NuclearReactor) {
			const prox = ent.proximity();
			for (var i = 0; i < prox.size; i++) {
				var near = prox.get(i).ent();
				/* Only consider tanks valid */
				if (!(near.block instanceof LiquidRouter)) {
					continue;
				}

				max += near.block.liquidCapacity;
				count += near.liquids.get(Liquids.cryofluid);
			}
		}

		return Math.min(count / max, 1);
	}
});
frag.visible = false;
frag.content = new Table().marginLeft(10).marginRight(10);

ui.onLoad(() => {
	frag.build(Vars.ui.hudGroup);
});

Events.on(EventType.WorldLoadEvent, run(() => {
	frag.rebuild();
}));

ui.addButton("reactor-overview", Blocks.thoriumReactor, button => {
	frag.toggle();
}, button => {
	// don't fill the button with the icon
	button.get().resizeImage(47.2 - 8);
});

})()
