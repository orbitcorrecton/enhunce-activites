/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

const GETTEXT_DOMAIN = 'enhunce-activities';

const { Atk, Clutter, GLib, GObject, Meta, Shell, St, Gio } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;

var PANEL_ICON_SIZE = 16;
var PANEL_ICON_MARGIN = 0;


const ActivitiesIndicator = GObject.registerClass(
class ActivitiesIndicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, _('Enhunce Activities'));
        this.accessible_role = Atk.Role.TOGGLE_BUTTON;
        
        this.name = 'panelActivities';
        
        /* Translators: If there is no suitable word for "Activities"
           in your language, you can use the word for "Overview". */
        let bin = new St.Bin({ name: 'panelActivitiesbutton' });
        this.add_actor(bin);
        
        this._container = new St.BoxLayout({ style_class: 'activities-box-layout' });
        bin.set_child(this._container);
        
        this._iconBox = new St.Bin({
            style_class: 'activities-icon',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._container.add_actor(this._iconBox);
        
        let icon = new St.Icon({
        //icon_name: 'start-here-symbolic',
        gicon : Gio.icon_new_for_string( Me.dir.get_path() + '/icons/start-here-symbolic.svg' ),
        icon_size: PANEL_ICON_SIZE - PANEL_ICON_MARGIN,
        style_class: 'activities-icon',
        });
        this._iconBox.set_child(icon);
        
        this._label = new St.Label({
            text: _('Ubuntu'),
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._container.add_actor(this._label);

        this.label_actor = this._label;

        Main.overview.connect('showing', () => {
            this.add_style_pseudo_class('overview');
            this.add_accessible_state(Atk.StateType.CHECKED);
        });
        Main.overview.connect('hiding', () => {
            this.remove_style_pseudo_class('overview');
            this.remove_accessible_state(Atk.StateType.CHECKED);
        });

        this._xdndTimeOut = 0;
    }

    handleDragOver(source, _actor, _x, _y, _time) {
        if (source != Main.xdndHandler)
            return DND.DragMotionResult.CONTINUE;

        if (this._xdndTimeOut != 0)
            GLib.source_remove(this._xdndTimeOut);
        this._xdndTimeOut = GLib.timeout_add(GLib.PRIORITY_DEFAULT, BUTTON_DND_ACTIVATION_TIMEOUT, () => {
            this._xdndToggleOverview();
        });
        GLib.Source.set_name_by_id(this._xdndTimeOut, '[gnome-shell] this._xdndToggleOverview');

        return DND.DragMotionResult.CONTINUE;
    }

    vfunc_captured_event(event) {
        if (event.type() == Clutter.EventType.BUTTON_PRESS ||
            event.type() == Clutter.EventType.TOUCH_BEGIN) {
            if (!Main.overview.shouldToggleByCornerOrButton())
                return Clutter.EVENT_STOP;
        }
        return Clutter.EVENT_PROPAGATE;
    }

    vfunc_event(event) {
        if (event.type() == Clutter.EventType.TOUCH_END ||
            event.type() == Clutter.EventType.BUTTON_RELEASE) {
            if (Main.overview.shouldToggleByCornerOrButton())
                Main.overview.toggle();
        }

        return Clutter.EVENT_PROPAGATE;
    }

    vfunc_key_release_event(keyEvent) {
        let symbol = keyEvent.keyval;
        if (symbol == Clutter.KEY_Return || symbol == Clutter.KEY_space) {
            if (Main.overview.shouldToggleByCornerOrButton()) {
                Main.overview.toggle();
                return Clutter.EVENT_STOP;
            }
        }

        return Clutter.EVENT_PROPAGATE;
    }

    _xdndToggleOverview() {
        let [x, y] = global.get_pointer();
        let pickedActor = global.stage.get_actor_at_pos(Clutter.PickMode.REACTIVE, x, y);

        if (pickedActor == this && Main.overview.shouldToggleByCornerOrButton())
            Main.overview.toggle();

        GLib.source_remove(this._xdndTimeOut);
        this._xdndTimeOut = 0;
        return GLib.SOURCE_REMOVE;
    }
});

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
    }

    enable() {
        Main.panel.statusArea.activities.container.hide();
        this._indicator = new ActivitiesIndicator();
        Main.panel.addToStatusArea(this._uuid, this._indicator, 0, 'left');
    }

    disable() {
        this._indicator.destroy();
        this._indicator = null;
        if(Main.sessionMode.currentMode !== 'unlock-dialog') {
        Main.panel.statusArea.activities.container.show();
        }
    }
}

function init(meta) {
    return new Extension(meta.uuid);
}
