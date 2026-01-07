import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const HadithLabel = GObject.registerClass(
class HadithLabel extends St.Label {
    _init(text) {
        super._init({
            x_align: Clutter.ActorAlign.START,
            y_align: Clutter.ActorAlign.START,
            reactive: true, // Enable mouse events
        });
        this.clutter_text.use_markup = true;
        this.clutter_text.line_wrap = true;
        if (text) {
            this.clutter_text.set_markup(text);
        }

        // Drag and drop variables
        this._dragging = false;
        this._dragStartX = 0;
        this._dragStartY = 0;
        this._widgetStartX = 0;
        this._widgetStartY = 0;
    }
});

const HadithIndicator = GObject.registerClass(
class HadithIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, 'Hadith Indicator', false);

        this._extension = extension;

        // Create icon for panel
        const icon = new St.Icon({
            gicon: Gio.icon_new_for_string(extension.path + '/icons/icon.svg'),
            style_class: 'system-status-icon',
        });
        this.add_child(icon);

        // Create menu items
        this._createMenu();
    }

    _createMenu() {
        // Refresh menu item
        const refreshItem = new PopupMenu.PopupMenuItem('Refresh Hadith');
        refreshItem.connect('activate', () => {
            this._extension._displayRandomHadith();
        });
        this.menu.addMenuItem(refreshItem);

        // Separator
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Settings menu item
        const settingsItem = new PopupMenu.PopupMenuItem('Settings');
        settingsItem.connect('activate', () => {
            try {
                this._extension.openPreferences();
            } catch (err) {
                log(`Hadith Extension: Error opening preferences: ${err}`);
            }
        });
        this.menu.addMenuItem(settingsItem);
    }
});

export default class HadithExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._hadithLabel = null;
        this._indicator = null;
        this._timeout = null;
        this._settings = null;
        this._hadiths = [];
    }

    enable() {
        // Load settings
        this._settings = this.getSettings();

        // Load hadith data
        this._loadHadithData();

        // Create label
        this._hadithLabel = new HadithLabel('');
        this._updateLabelStyle();

        // Setup drag and drop
        this._setupDragAndDrop();

        // Add to appropriate layer based on settings
        this._updateLayer();

        // Position the label
        this._updatePosition();

        // Display initial hadith
        this._displayRandomHadith();

        // Setup refresh timer
        this._setupRefreshTimer();

        // Connect to settings changes
        this._settings.connect('changed', () => {
            this._onSettingsChanged();
        });

        // Create and add panel indicator
        this._indicator = new HadithIndicator(this);
        Main.panel.addToStatusArea('hadith-indicator', this._indicator);
    }

    disable() {
        // Remove timeout
        if (this._timeout) {
            GLib.Source.remove(this._timeout);
            this._timeout = null;
        }

        // Remove label
        if (this._hadithLabel) {
            const parent = this._hadithLabel.get_parent();
            if (parent) {
                parent.remove_child(this._hadithLabel);
            }
            this._hadithLabel.destroy();
            this._hadithLabel = null;
        }

        // Remove indicator
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        // Cleanup settings
        this._settings = null;
        this._hadiths = [];
    }

    _loadHadithData() {
        try {
            const hadithFile = this.dir.get_child('hadith_list.json');
            const [success, contents] = hadithFile.load_contents(null);

            if (success) {
                const decoder = new TextDecoder('utf-8');
                const jsonString = decoder.decode(contents);
                this._hadiths = JSON.parse(jsonString);
            }
        } catch (error) {
            log(`Hadith Extension: Error loading hadith data: ${error}`);
            this._hadiths = [];
        }
    }

    _escapeMarkup(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    _displayRandomHadith() {
        if (this._hadiths.length === 0) {
            this._hadithLabel.set_text('No hadiths available');
            return;
        }

        // Select random hadith
        const randomIndex = Math.floor(Math.random() * this._hadiths.length);
        const hadith = this._hadiths[randomIndex];

        // Get enabled languages
        const enabledLanguages = this._settings.get_strv('enabled-languages');
        const showSource = this._settings.get_boolean('show-source');
        const showNarrator = this._settings.get_boolean('show-narrator');

        // Get colors
        const arabicColor = this._settings.get_string('arabic-color');
        const arabicBgColor = this._settings.get_string('arabic-background-color');
        const turkishColor = this._settings.get_string('turkish-color');
        const englishColor = this._settings.get_string('english-color');
        const germanColor = this._settings.get_string('german-color');
        const frenchColor = this._settings.get_string('french-color');
        const sourceColor = this._settings.get_string('source-color');
        const fontSize = this._settings.get_int('font-size');

        // Build hadith markup
        let hadithMarkup = '';
        const LTR_MARK = '\u200E'; // Unicode Left-to-Right Mark (defined once at top)

        // Add Arabic FIRST (will be black due to CSS override, but that's acceptable)
        // Arabic is ALWAYS shown to prevent layout shifting
        if (hadith.arabic) {
            const escapedText = this._escapeMarkup(hadith.arabic);
            const arabicSize = Math.round(fontSize * 1.1 * 1024);
            // NOTE: First line will be black due to GNOME Shell theme CSS override
            // Add separate background color for Arabic text
            hadithMarkup += `<span size="${arabicSize}" background="${arabicBgColor}">${escapedText}</span>\n\n`;
        }

        // Add translations in fixed order: English, Turkish, German, French
        const languageOrder = [
            { code: 'en', field: 'english', color: englishColor },
            { code: 'tr', field: 'turkish', color: turkishColor },
            { code: 'de', field: 'german', color: germanColor },
            { code: 'fr', field: 'french', color: frenchColor }
        ];

        const normalSize = Math.round(fontSize * 1024);
        languageOrder.forEach((langInfo) => {
            // Check if this language is enabled
            if (enabledLanguages.includes(langInfo.code) && hadith[langInfo.field]) {
                // Skip if it's a placeholder
                if (hadith[langInfo.field] !== 'Not available on the source page') {
                    const escapedText = this._escapeMarkup(hadith[langInfo.field]);
                    // Add multiple LTR marks to force left-to-right direction strongly
                    hadithMarkup += `<span foreground="${langInfo.color}"><span size="${normalSize}" foreground="${langInfo.color}">${LTR_MARK}${LTR_MARK}${escapedText}${LTR_MARK}</span></span>\n\n`;
                }
            }
        });

        // Check if we have any content
        if (hadithMarkup.trim().length === 0) {
            hadithMarkup = '<span foreground="#FF0000">Please enable at least one language in settings</span>';
        }

        // Add narrator if enabled and available
        const metaSize = Math.round((fontSize - 2) * 1024);
        if (showNarrator && hadith.narrator && hadith.narrator.length > 0) {
            const escapedNarrator = this._escapeMarkup(hadith.narrator);
            // Multiple LTR marks + LTR text to force left alignment
            hadithMarkup += `\n<span foreground="${sourceColor}"><span size="${metaSize}" foreground="${sourceColor}">${LTR_MARK}${LTR_MARK}${LTR_MARK}📖 Narrator: ${escapedNarrator}${LTR_MARK}</span></span>`;
        }

        // Add source if enabled
        if (showSource && hadith.source) {
            const escapedSource = this._escapeMarkup(hadith.source);
            // Multiple LTR marks + LTR text to force left alignment
            hadithMarkup += `\n<span foreground="${sourceColor}"><span size="${metaSize}" foreground="${sourceColor}">${LTR_MARK}${LTR_MARK}${LTR_MARK}📚 Source: ${escapedSource}${LTR_MARK}</span></span>`;
        }

        // Apply the final markup
        this._hadithLabel.clutter_text.set_markup(hadithMarkup.trim());
    }

    _updateLabelStyle() {
        const fontSize = this._settings.get_int('font-size');
        const maxWidth = this._settings.get_int('max-width');
        const bgColor = this._settings.get_string('background-color');
        const bgOpacity = this._settings.get_double('background-opacity');

        // Parse hex color and add opacity
        const hexColor = bgColor.replace('#', '');
        const r = parseInt(hexColor.substr(0, 2), 16);
        const g = parseInt(hexColor.substr(2, 2), 16);
        const b = parseInt(hexColor.substr(4, 2), 16);
        const bgColorRGBA = `rgba(${r}, ${g}, ${b}, ${bgOpacity})`;

        // Set style with explicit color reset to prevent theme override
        this._hadithLabel.set_style(
            `background-color: ${bgColorRGBA}; ` +
            `padding: 20px; ` +
            `border-radius: 12px; ` +
            `max-width: ${maxWidth}px; ` +
            `min-width: 400px; ` +
            `line-height: 1.5;`
        );
    }

    _updatePosition() {
        const x = this._settings.get_int('position-x');
        const y = this._settings.get_int('position-y');
        this._hadithLabel.set_position(x, y);
    }

    _updateLayer() {
        const alwaysOnTop = this._settings.get_boolean('always-on-top');

        // First, safely remove from any current parent
        const parent = this._hadithLabel.get_parent();
        if (parent) {
            parent.remove_child(this._hadithLabel);
        }

        // Remove from chrome tracking if it was tracked
        try {
            Main.layoutManager._untrackActor(this._hadithLabel);
        } catch (e) {
            // Ignore if not tracked
        }

        if (alwaysOnTop) {
            // Add to chrome layer (above windows)
            Main.layoutManager.addChrome(this._hadithLabel, {
                affectsInputRegion: false,
                trackFullscreen: false
            });
        } else {
            // Add to background group (below windows, above wallpaper)
            Main.layoutManager._backgroundGroup.add_child(this._hadithLabel);
        }
    }

    _setupRefreshTimer() {
        if (this._timeout) {
            GLib.Source.remove(this._timeout);
        }

        const interval = this._settings.get_int('refresh-interval');
        const intervalMs = interval * 60 * 1000; // Convert minutes to milliseconds

        this._timeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, intervalMs, () => {
            this._displayRandomHadith();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _setupDragAndDrop() {
        // Connect mouse button press event (start dragging)
        this._hadithLabel.connect('button-press-event', (actor, event) => {
            if (event.get_button() === 1) { // Left mouse button
                this._hadithLabel._dragging = true;
                [this._hadithLabel._dragStartX, this._hadithLabel._dragStartY] = event.get_coords();
                [this._hadithLabel._widgetStartX, this._hadithLabel._widgetStartY] = actor.get_position();

                // Change cursor to indicate dragging
                global.display.set_cursor(Meta.Cursor.MOVE_OR_RESIZE_WINDOW);

                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        // Connect mouse motion event (during dragging)
        this._hadithLabel.connect('motion-event', (actor, event) => {
            if (this._hadithLabel._dragging) {
                const [currentX, currentY] = event.get_coords();
                const deltaX = currentX - this._hadithLabel._dragStartX;
                const deltaY = currentY - this._hadithLabel._dragStartY;

                const newX = this._hadithLabel._widgetStartX + deltaX;
                const newY = this._hadithLabel._widgetStartY + deltaY;

                actor.set_position(Math.round(newX), Math.round(newY));

                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });

        // Connect mouse button release event (stop dragging)
        this._hadithLabel.connect('button-release-event', (actor, event) => {
            if (event.get_button() === 1 && this._hadithLabel._dragging) {
                this._hadithLabel._dragging = false;

                // Reset cursor
                global.display.set_cursor(Meta.Cursor.DEFAULT);

                // Save new position to settings
                const [newX, newY] = actor.get_position();
                this._settings.set_int('position-x', Math.round(newX));
                this._settings.set_int('position-y', Math.round(newY));

                return Clutter.EVENT_STOP;
            }
            return Clutter.EVENT_PROPAGATE;
        });
    }

    _onSettingsChanged() {
        this._updateLabelStyle();
        this._updatePosition();
        this._updateLayer();
        this._displayRandomHadith();
        this._setupRefreshTimer();
    }
}
