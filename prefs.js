import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class HadithPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        // Language Selection Page
        const languagePage = new Adw.PreferencesPage({
            title: 'Languages',
            icon_name: 'preferences-desktop-locale-symbolic',
        });
        window.add(languagePage);

        const languageGroup = new Adw.PreferencesGroup({
            title: 'Language Selection',
            description: 'Select which translation languages to display (Arabic is always shown)',
        });
        languagePage.add(languageGroup);

        // Note: Arabic is always displayed and cannot be disabled
        // This prevents layout shifting when toggling languages

        // Language toggles
        const languages = [
            { code: 'tr', name: 'Turkish', subtitle: 'Türkçe' },
            { code: 'en', name: 'English', subtitle: 'English' },
            { code: 'de', name: 'German', subtitle: 'Deutsch' },
            { code: 'fr', name: 'French', subtitle: 'Français' },
        ];

        languages.forEach(lang => {
            const row = new Adw.ActionRow({
                title: lang.name,
                subtitle: lang.subtitle,
            });
            const toggle = new Gtk.Switch({
                active: this._isLanguageEnabled(settings, lang.code),
                valign: Gtk.Align.CENTER,
            });
            toggle.connect('notify::active', () => {
                this._toggleLanguage(settings, lang.code, toggle.active);
            });
            row.add_suffix(toggle);
            row.activatable_widget = toggle;
            languageGroup.add(row);
        });

        // Display Settings Page
        const displayPage = new Adw.PreferencesPage({
            title: 'Display',
            icon_name: 'preferences-desktop-display-symbolic',
        });
        window.add(displayPage);

        const displayGroup = new Adw.PreferencesGroup({
            title: 'Display Settings',
        });
        displayPage.add(displayGroup);

        // Show Source
        const sourceRow = new Adw.ActionRow({
            title: 'Show Source',
            subtitle: 'Display the source of the hadith (Bukhari, Muslim, etc.)',
        });
        const sourceSwitch = new Gtk.Switch({
            active: settings.get_boolean('show-source'),
            valign: Gtk.Align.CENTER,
        });
        settings.bind('show-source', sourceSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
        sourceRow.add_suffix(sourceSwitch);
        sourceRow.activatable_widget = sourceSwitch;
        displayGroup.add(sourceRow);

        // Show Narrator
        const narratorRow = new Adw.ActionRow({
            title: 'Show Narrator',
            subtitle: 'Display who narrated the hadith',
        });
        const narratorSwitch = new Gtk.Switch({
            active: settings.get_boolean('show-narrator'),
            valign: Gtk.Align.CENTER,
        });
        settings.bind('show-narrator', narratorSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
        narratorRow.add_suffix(narratorSwitch);
        narratorRow.activatable_widget = narratorSwitch;
        displayGroup.add(narratorRow);

        // Refresh Interval
        const refreshRow = new Adw.ActionRow({
            title: 'Refresh Interval',
            subtitle: 'Time in minutes between hadith changes',
        });
        const refreshSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 5,
                upper: 1440,
                step_increment: 5,
                page_increment: 60,
            }),
            value: settings.get_int('refresh-interval'),
            valign: Gtk.Align.CENTER,
        });
        settings.bind('refresh-interval', refreshSpin, 'value', Gio.SettingsBindFlags.DEFAULT);
        refreshRow.add_suffix(refreshSpin);
        displayGroup.add(refreshRow);

        // Always on Top
        const alwaysOnTopRow = new Adw.ActionRow({
            title: 'Always Show Above Windows',
            subtitle: 'Keep hadith above windows (default: false, stays on desktop)',
        });
        const alwaysOnTopSwitch = new Gtk.Switch({
            active: settings.get_boolean('always-on-top'),
            valign: Gtk.Align.CENTER,
        });
        settings.bind('always-on-top', alwaysOnTopSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);
        alwaysOnTopRow.add_suffix(alwaysOnTopSwitch);
        alwaysOnTopRow.activatable_widget = alwaysOnTopSwitch;
        displayGroup.add(alwaysOnTopRow);

        // Appearance Settings
        const appearanceGroup = new Adw.PreferencesGroup({
            title: 'Appearance',
        });
        displayPage.add(appearanceGroup);

        // Font Size
        const fontSizeRow = new Adw.ActionRow({
            title: 'Font Size',
            subtitle: 'Size of the hadith text',
        });
        const fontSizeSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 8,
                upper: 48,
                step_increment: 1,
                page_increment: 4,
            }),
            value: settings.get_int('font-size'),
            valign: Gtk.Align.CENTER,
        });
        settings.bind('font-size', fontSizeSpin, 'value', Gio.SettingsBindFlags.DEFAULT);
        fontSizeRow.add_suffix(fontSizeSpin);
        appearanceGroup.add(fontSizeRow);

        // Maximum Width
        const maxWidthRow = new Adw.ActionRow({
            title: 'Maximum Width',
            subtitle: 'Maximum width of hadith display (400-2000 pixels)',
        });
        const maxWidthSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 400,
                upper: 2000,
                step_increment: 50,
                page_increment: 100,
            }),
            value: settings.get_int('max-width'),
            valign: Gtk.Align.CENTER,
        });
        settings.bind('max-width', maxWidthSpin, 'value', Gio.SettingsBindFlags.DEFAULT);
        maxWidthRow.add_suffix(maxWidthSpin);
        appearanceGroup.add(maxWidthRow);

        // Background Opacity
        const opacityRow = new Adw.ActionRow({
            title: 'Background Opacity',
            subtitle: 'Transparency of the background (0 = transparent, 1 = opaque)',
        });
        const opacityScale = new Gtk.Scale({
            orientation: Gtk.Orientation.HORIZONTAL,
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 1,
                step_increment: 0.1,
                page_increment: 0.2,
            }),
            draw_value: true,
            value_pos: Gtk.PositionType.RIGHT,
            digits: 1,
            hexpand: true,
            valign: Gtk.Align.CENTER,
            width_request: 200,
        });
        settings.bind('background-opacity', opacityScale.adjustment, 'value', Gio.SettingsBindFlags.DEFAULT);
        appearanceGroup.add(opacityRow);
        opacityRow.add_suffix(opacityScale);

        // Color Settings Group
        const colorGroup = new Adw.PreferencesGroup({
            title: 'Colors',
            description: 'Customize colors for background and each language',
        });
        displayPage.add(colorGroup);

        // Background Color
        const bgColorRow = new Adw.ActionRow({
            title: 'Background Color',
            subtitle: 'Color of the hadith display background',
        });
        const bgColorButton = new Gtk.ColorButton({
            valign: Gtk.Align.CENTER,
        });
        this._bindColorButton(settings, 'background-color', bgColorButton);
        bgColorRow.add_suffix(bgColorButton);
        colorGroup.add(bgColorRow);

        // Arabic Background Color
        const arabicBgColorRow = new Adw.ActionRow({
            title: 'Arabic Text Background Color',
            subtitle: 'Background color behind Arabic text',
        });
        const arabicBgColorButton = new Gtk.ColorButton({
            valign: Gtk.Align.CENTER,
        });
        this._bindColorButton(settings, 'arabic-background-color', arabicBgColorButton);
        arabicBgColorRow.add_suffix(arabicBgColorButton);
        colorGroup.add(arabicBgColorRow);

        // Note: Arabic text color setting removed - Arabic text appears in default color (black)
        // due to GNOME Shell theme CSS override on first line

        // Turkish Color
        const turkishColorRow = new Adw.ActionRow({
            title: 'Turkish Text Color',
            subtitle: 'Color for Turkish text',
        });
        const turkishColorButton = new Gtk.ColorButton({
            valign: Gtk.Align.CENTER,
        });
        this._bindColorButton(settings, 'turkish-color', turkishColorButton);
        turkishColorRow.add_suffix(turkishColorButton);
        colorGroup.add(turkishColorRow);

        // English Color
        const englishColorRow = new Adw.ActionRow({
            title: 'English Text Color',
            subtitle: 'Color for English text',
        });
        const englishColorButton = new Gtk.ColorButton({
            valign: Gtk.Align.CENTER,
        });
        this._bindColorButton(settings, 'english-color', englishColorButton);
        englishColorRow.add_suffix(englishColorButton);
        colorGroup.add(englishColorRow);

        // German Color
        const germanColorRow = new Adw.ActionRow({
            title: 'German Text Color',
            subtitle: 'Color for German text',
        });
        const germanColorButton = new Gtk.ColorButton({
            valign: Gtk.Align.CENTER,
        });
        this._bindColorButton(settings, 'german-color', germanColorButton);
        germanColorRow.add_suffix(germanColorButton);
        colorGroup.add(germanColorRow);

        // French Color
        const frenchColorRow = new Adw.ActionRow({
            title: 'French Text Color',
            subtitle: 'Color for French text',
        });
        const frenchColorButton = new Gtk.ColorButton({
            valign: Gtk.Align.CENTER,
        });
        this._bindColorButton(settings, 'french-color', frenchColorButton);
        frenchColorRow.add_suffix(frenchColorButton);
        colorGroup.add(frenchColorRow);

        // Source/Narrator Color
        const sourceColorRow = new Adw.ActionRow({
            title: 'Source/Narrator Color',
            subtitle: 'Color for source and narrator information',
        });
        const sourceColorButton = new Gtk.ColorButton({
            valign: Gtk.Align.CENTER,
        });
        this._bindColorButton(settings, 'source-color', sourceColorButton);
        sourceColorRow.add_suffix(sourceColorButton);
        colorGroup.add(sourceColorRow);

        // Position Settings
        const positionGroup = new Adw.PreferencesGroup({
            title: 'Position',
            description: 'Set the position of the hadith on your desktop',
        });
        displayPage.add(positionGroup);

        // Position X
        const posXRow = new Adw.ActionRow({
            title: 'Horizontal Position (X)',
        });
        const posXSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 3840,
                step_increment: 10,
                page_increment: 100,
            }),
            value: settings.get_int('position-x'),
            valign: Gtk.Align.CENTER,
        });
        settings.bind('position-x', posXSpin, 'value', Gio.SettingsBindFlags.DEFAULT);
        posXRow.add_suffix(posXSpin);
        positionGroup.add(posXRow);

        // Position Y
        const posYRow = new Adw.ActionRow({
            title: 'Vertical Position (Y)',
        });
        const posYSpin = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 2160,
                step_increment: 10,
                page_increment: 100,
            }),
            value: settings.get_int('position-y'),
            valign: Gtk.Align.CENTER,
        });
        settings.bind('position-y', posYSpin, 'value', Gio.SettingsBindFlags.DEFAULT);
        posYRow.add_suffix(posYSpin);
        positionGroup.add(posYRow);
    }

    _isLanguageEnabled(settings, langCode) {
        const enabledLanguages = settings.get_strv('enabled-languages');
        return enabledLanguages.includes(langCode);
    }

    _toggleLanguage(settings, langCode, enabled) {
        let enabledLanguages = settings.get_strv('enabled-languages');

        if (enabled && !enabledLanguages.includes(langCode)) {
            enabledLanguages.push(langCode);
        } else if (!enabled && enabledLanguages.includes(langCode)) {
            enabledLanguages = enabledLanguages.filter(code => code !== langCode);
        }

        settings.set_strv('enabled-languages', enabledLanguages);
    }

    _bindColorButton(settings, key, colorButton) {
        // Set initial color from settings
        const hexColor = settings.get_string(key);
        const rgba = this._hexToRgba(hexColor);
        colorButton.set_rgba(rgba);

        // Connect color button to settings
        colorButton.connect('color-set', () => {
            const rgba = colorButton.get_rgba();
            const hex = this._rgbaToHex(rgba);
            settings.set_string(key, hex);
        });
    }

    _hexToRgba(hex) {
        const rgba = new Gdk.RGBA();
        rgba.parse(hex);
        return rgba;
    }

    _rgbaToHex(rgba) {
        const r = Math.round(rgba.red * 255).toString(16).padStart(2, '0');
        const g = Math.round(rgba.green * 255).toString(16).padStart(2, '0');
        const b = Math.round(rgba.blue * 255).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }
}
