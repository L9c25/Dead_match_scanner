/**
 * App.js - Deadlock Match Scanner Controller
 */

(function () {
    'use strict';
    // =========================================================================
    // 🛡️ ANTI-TAMPER & ANTI-BYPASS SECURITY ENGINE
    // =========================================================================
    (function initAntiBypass() {
        // Block F12, DevTools shortcuts, View Source, and Save
        window.addEventListener('keydown', function (e) {
            // F12
            if (e.key === 'F12' || e.keyCode === 123) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            // Ctrl+Shift+I / J / C (DevTools)
            if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c' || e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            // Ctrl+U (View Source)
            if (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.keyCode === 85)) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }, true);

        // Block Right-Click Context Menu
        window.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            return false;
        }, true);
    })();


    let csInterface = null;
    try {
        if (typeof CSInterface !== 'undefined') {
            csInterface = new CSInterface();
        }
    } catch (e) {
        console.warn('CSInterface não pôde ser instanciado:', e);
    }

    // 8 Premiere Pro Native Marker Colors
    const PREMIERE_MARKER_COLORS = [
        { index: 0, name: 'Verde', hex: '#22c55e', emoji: '🟢' },
        { index: 1, name: 'Vermelho', hex: '#ef4444', emoji: '🔴' },
        { index: 2, name: 'Roxo', hex: '#a855f7', emoji: '🟣' },
        { index: 3, name: 'Laranja', hex: '#f97316', emoji: '🟠' },
        { index: 4, name: 'Amarelo', hex: '#eab308', emoji: '🟡' },
        { index: 5, name: 'Branco', hex: '#ffffff', emoji: '⚪' },
        { index: 6, name: 'Azul', hex: '#3b82f6', emoji: '🔵' },
        { index: 7, name: 'Ciano', hex: '#06b6d4', emoji: '🔷' }
    ];

    const DEFAULT_MARKER_COLORS = {
        t0: 5,     // Branco (Desbloqueio)
        t1: 5,     // Branco (Tier 1)
        t2: 5,     // Branco (Tier 2)
        t3: 5,     // Branco (Tier 3)
        kill: 7,   // Ciano (Kills)
        assist: 3, // Laranja (Assists)
        death: 1,  // Vermelho (Mortes)
        item: 4    // Amarelo (Itens)
    };

    const COLORS_STORAGE_KEY = 'deadlock_custom_marker_colors';
    const PAUSE_SOURCE_KEY = 'deadlock_pause_source_pref';
    const GAME_START_TIME_KEY = 'deadlock_game_start_time_pref';
    const FONT_SCALE_KEY = 'deadlock_ui_font_scale';

    // Application State
    const state = {
        currentMatch: null,
        selectedPlayerIndex: null,
        activeTab: 'all', // 'all', 'abilities', 'items'
        localPngCount: 0,
        gameStartTimeSec: 0, // Início da coleta de dados em segundos do jogo
        timelineData: [], // array of { type: 'ability'|'item'|'kill'|'death', raw: {...}, enabled: true }
        markerColors: { ...DEFAULT_MARKER_COLORS },
        fontScale: 100
    };

    // DOM Elements
    const elements = {
        pngStatusText: document.getElementById('png-count-text'),
        searchForm: document.getElementById('search-form'),
        matchInput: document.getElementById('match-id-input'),
        searchBtn: document.getElementById('search-btn'),
        searchBtnText: document.getElementById('search-btn-text'),
        historyContainer: document.getElementById('search-history-container'),
        historyChipsList: document.getElementById('history-chips-list'),
        clearHistoryBtn: document.getElementById('clear-history-btn'),

        matchSummary: document.getElementById('match-summary'),
        footerMatchSummary: document.getElementById('footer-match-summary'),
        summaryMatchId: document.getElementById('summary-match-id'),
        summaryDuration: document.getElementById('summary-duration'),
        summaryWinner: document.getElementById('summary-winner'),

        // Settings Drawer & Font Scaling
        headerSettingsBtn: document.getElementById('header-settings-btn'),
        generalSettingsCard: document.getElementById('general-settings-card'),
        btnCloseSettingsCard: document.getElementById('btn-close-settings-card'),
        btnFontScaleDown: document.getElementById('btn-font-scale-down'),
        btnFontScaleUp: document.getElementById('btn-font-scale-up'),
        btnFontScaleReset: document.getElementById('btn-font-scale-reset'),
        fontScaleValue: document.getElementById('font-scale-value'),

        // Accordion Stage Elements
        heroesSection: document.getElementById('heroes-section'),
        toggleHeroesHeader: document.getElementById('toggle-heroes-header'),
        heroesCollapsibleBody: document.getElementById('heroes-collapsible-body'),
        heroesToggleIcon: document.getElementById('heroes-toggle-icon'),
        sapphireGrid: document.getElementById('sapphire-heroes-grid'),
        amberGrid: document.getElementById('amber-heroes-grid'),

        heroDetailsSection: document.getElementById('hero-details-section'),
        selectedHeroAvatar: document.getElementById('selected-hero-avatar'),
        selectedHeroName: document.getElementById('selected-hero-name'),
        selectedHeroStats: document.getElementById('selected-hero-stats'),
        totalActionsCount: document.getElementById('total-actions-count'),

        tabButtons: document.querySelectorAll('.tab-btn'),
        tabCountAll: document.getElementById('tab-count-all'),
        tabCountAbilities: document.getElementById('tab-count-abilities'),
        tabCountItems: document.getElementById('tab-count-items'),
        tabCountCombat: document.getElementById('tab-count-combat'),
        timelineList: document.getElementById('timeline-items-list'),

        // Pause Compensation Elements
        pauseCard: document.getElementById('pause-card'),
        togglePauseHeader: document.getElementById('toggle-pause-header'),
        pauseCollapsibleBody: document.getElementById('pause-collapsible-body'),
        pauseToggleIcon: document.getElementById('pause-toggle-icon'),
        pauseSourceSelect: document.getElementById('pause-source-select'),
        pauseCriteriaSelect: document.getElementById('pause-criteria-select'),
        pauseStatusBadge: document.getElementById('pause-status-badge'),

        // Premiere Pro Settings & Accordion
        premiereSettingsCard: document.getElementById('premiere-settings-card'),
        togglePremiereHeader: document.getElementById('toggle-premiere-header'),
        premiereSettingsCollapsibleBody: document.getElementById('premiere-settings-collapsible-body'),
        premiereToggleIcon: document.getElementById('premiere-toggle-icon'),
        targetTrackSelect: document.getElementById('target-track-select'),
        itemStyleSelect: document.getElementById('item-style-select'),
        secondaryTrackGroup: document.getElementById('secondary-track-group'),
        secondaryTrackSelect: document.getElementById('secondary-track-select'),
        targetTrackLabel: document.getElementById('i18n-target-track-label'),
        markerTargetSelect: document.getElementById('marker-target-select'),
        itemDurationInput: document.getElementById('item-duration-input'),
        offsetModeSelect: document.getElementById('offset-mode-select'),

        // Color Customization Elements
        resetColorsBtn: document.getElementById('reset-colors-btn'),
        dynamicColorLegend: document.getElementById('dynamic-color-legend'),
        colorSelects: document.querySelectorAll('.color-select'),

        // Game Start Time Elements
        gameStartTimeInput: document.getElementById('game-start-time-input'),
        resetStartTimeBtn: document.getElementById('reset-start-time-btn'),
        gameStartTimeStatusText: document.getElementById('game-start-time-status-text'),
        gameStartTimeStatus: document.getElementById('game-start-time-status'),

        checkTierMarkers: document.getElementById('check-tier-markers'),
        checkKillMarkers: document.getElementById('check-kill-markers'),
        checkAssistMarkers: document.getElementById('check-assist-markers'),
        checkDeathMarkers: document.getElementById('check-death-markers'),
        checkUnlockMarkers: document.getElementById('check-unlock-markers'),
        checkInsertItems: document.getElementById('check-insert-items'),
        checkItemMarkers: document.getElementById('check-item-markers'),

        syncPremiereBtn: document.getElementById('sync-premiere-btn'),
        notifToast: document.getElementById('notification-toast'),
        notifIcon: document.getElementById('notif-icon'),
        notifMessage: document.getElementById('notif-message'),

        // Pro & Assets Header Actions
        headerProBtn: document.getElementById('header-pro-btn'),
        headerProIcon: document.getElementById('header-pro-icon'),
        headerProText: document.getElementById('header-pro-text'),
        headerFolderBtn: document.getElementById('header-folder-btn'),
        headerAssetsCount: document.getElementById('header-assets-count'),

        // Local Assets Setup Banner & Modal
        assetsSetupBanner: document.getElementById('assets-setup-banner'),
        btnOpenAssetsModal: document.getElementById('btn-open-assets-modal'),
        assetsModalOverlay: document.getElementById('assets-modal-overlay'),
        btnCloseAssetsModal: document.getElementById('btn-close-assets-modal'),
        assetsDirInput: document.getElementById('assets-dir-input'),
        btnBrowseAssetsDir: document.getElementById('btn-browse-assets-dir'),
        btnSaveAssetsDir: document.getElementById('btn-save-assets-dir'),
        assetsDirFeedback: document.getElementById('assets-dir-feedback'),
        assetsDetectedCount: document.getElementById('assets-detected-count'),
        btnResetDefaultAssets: document.getElementById('btn-reset-default-assets'),

        // License Modal Elements
        licenseModalOverlay: document.getElementById('license-modal-overlay'),
        btnCloseLicenseModal: document.getElementById('btn-close-license-modal'),
        licenseProActiveBox: document.getElementById('license-pro-active-box'),
        proDetailsText: document.getElementById('pro-details-text'),
        btnDeactivateLicense: document.getElementById('btn-deactivate-license'),
        licenseFormContainer: document.getElementById('license-form-container')
    };

    /**
     * Parse string representation of time to seconds
     * Supports: MM:SS (e.g. 00:10, 1:30), HH:MM:SS, 10s, 1m30s, or plain seconds
     */
    function parseTimeToSeconds(inputStr) {
        if (!inputStr) return 0;
        const s = String(inputStr).trim().toLowerCase();
        if (!s || s === '0' || s === '00:00' || s === '0:00') return 0;

        if (s.includes(':')) {
            const parts = s.split(':').map(p => parseFloat(p) || 0);
            if (parts.length === 3) {
                return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
            } else if (parts.length === 2) {
                return Math.max(0, parts[0] * 60 + parts[1]);
            }
        }

        let total = 0;
        let matched = false;
        const mMatch = s.match(/(\d+(?:\.\d+)?)\s*m/);
        if (mMatch) {
            total += parseFloat(mMatch[1]) * 60;
            matched = true;
        }
        const sMatch = s.match(/(\d+(?:\.\d+)?)\s*s/);
        if (sMatch) {
            total += parseFloat(sMatch[1]);
            matched = true;
        }
        if (matched) return Math.max(0, total);

        const num = parseFloat(s);
        return isNaN(num) ? 0 : Math.max(0, num);
    }

    /**
     * Format seconds into MM:SS or HH:MM:SS string
     */
    function formatSecondsToTime(seconds) {
        const sec = Math.max(0, Math.round(seconds || 0));
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        if (h > 0) {
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    /**
     * Update Game Start Time UI & Status Badge
     */
    function updateGameStartTimeDisplay() {
        const sec = state.gameStartTimeSec || 0;
        const formatted = formatSecondsToTime(sec);

        if (elements.gameStartTimeInput && document.activeElement !== elements.gameStartTimeInput) {
            elements.gameStartTimeInput.value = formatted;
        }

        if (elements.gameStartTimeStatusText) {
            if (sec > 0) {
                const msg = (typeof I18N !== 'undefined') ?
                    I18N.t('gameStartTimeIgnoring', { time: formatted }) :
                    `Ignorando eventos antes de ${formatted}`;
                elements.gameStartTimeStatusText.textContent = msg;
                if (elements.gameStartTimeStatus) {
                    elements.gameStartTimeStatus.style.color = '#f6c042';
                    elements.gameStartTimeStatus.style.borderColor = 'rgba(246, 192, 66, 0.3)';
                    elements.gameStartTimeStatus.style.background = 'rgba(246, 192, 66, 0.08)';
                }
            } else {
                const msg = (typeof I18N !== 'undefined') ?
                    I18N.t('gameStartTimeFromStart') :
                    'Coletando dados desde o início (00:00)';
                elements.gameStartTimeStatusText.textContent = msg;
                if (elements.gameStartTimeStatus) {
                    elements.gameStartTimeStatus.style.color = '#94a3b8';
                    elements.gameStartTimeStatus.style.borderColor = 'rgba(255, 255, 255, 0.07)';
                    elements.gameStartTimeStatus.style.background = 'rgba(255, 255, 255, 0.03)';
                }
            }
        }
    }

    /**
     * Initialize Game Start Time from saved preferences
     */
    function initGameStartTimeSettings() {
        try {
            const saved = localStorage.getItem(GAME_START_TIME_KEY);
            if (saved !== null && saved !== '') {
                state.gameStartTimeSec = parseTimeToSeconds(saved);
            }
        } catch (e) { }
        updateGameStartTimeDisplay();
    }

    /**
     * Show notification toast
     */
    function showNotification(message, type = 'success', duration = 4000) {
        elements.notifToast.className = `notification ${type}`;
        elements.notifIcon.textContent = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
        elements.notifMessage.textContent = message;
        elements.notifToast.style.display = 'flex';

        clearTimeout(elements.notifToast._timer);
        elements.notifToast._timer = setTimeout(() => {
            elements.notifToast.style.display = 'none';
        }, duration);
    }

    /**
     * Initialize Cloudflare R2 and Local PNG Items silently
     */
    function initLocalItems() {
        const mgr = (typeof ItemsManager !== 'undefined') ? ItemsManager : (typeof window !== 'undefined' ? window.ItemsManager : null);
        if (mgr) {
            const res = mgr.indexDirectory();
            if (res && res.success) {
                state.localPngCount = res.count;
            }

            // Check local assets status & update UI headers/banners
            if (typeof mgr.checkLocalAssetsStatus === 'function') {
                const status = mgr.checkLocalAssetsStatus();
                if (elements.headerAssetsCount) {
                    elements.headerAssetsCount.textContent = status.itemCount || status.cachedCount || 0;
                }
                if (elements.assetsSetupBanner) {
                    elements.assetsSetupBanner.style.display = status.hasAssets ? 'none' : 'flex';
                }
                if (elements.headerFolderBtn) {
                    if (status.hasAssets) {
                        elements.headerFolderBtn.classList.remove('missing-assets');
                        elements.headerFolderBtn.classList.add('found-assets');
                    } else {
                        elements.headerFolderBtn.classList.remove('found-assets');
                        elements.headerFolderBtn.classList.add('missing-assets');
                    }
                }
            }
            if (elements.assetsDirInput && typeof mgr.getCustomAssetsDir === 'function') {
                elements.assetsDirInput.value = mgr.getCustomAssetsDir() || '';
            }
        }
    }

    /**
     * Apply Language to all UI text elements dynamically
     */
    function applyLanguage(lang) {
        if (typeof I18N === 'undefined') return;
        I18N.setLanguage(lang);

        const langSelect = document.getElementById('lang-select');
        if (langSelect) {
            langSelect.value = lang;
        }

        // 1. Search Bar
        if (elements.matchInput) elements.matchInput.placeholder = I18N.t('searchPlaceholder');
        if (elements.searchBtnText) elements.searchBtnText.textContent = I18N.t('searchBtn');

        // 2. History & Summary Labels
        const elRecent = document.getElementById('i18n-recent-matches');
        if (elRecent) elRecent.textContent = I18N.t('recentMatches');
        if (elements.clearHistoryBtn) elements.clearHistoryBtn.textContent = I18N.t('clearHistory');

        const elMatchLabel = document.getElementById('i18n-match-label');
        if (elMatchLabel) elMatchLabel.textContent = I18N.t('matchLabel');
        const elDurationLabel = document.getElementById('i18n-duration-label');
        if (elDurationLabel) elDurationLabel.textContent = I18N.t('durationLabel');
        const elResultLabel = document.getElementById('i18n-result-label');
        if (elResultLabel) elResultLabel.textContent = I18N.t('resultLabel');

        // 3. Team Headers & Hero Selection
        const elHeroTitle = document.getElementById('i18n-select-hero-title');
        if (elHeroTitle) elHeroTitle.textContent = I18N.t('selectHeroTip');
        const elTeamSaph = document.getElementById('i18n-team-sapphire-header');
        if (elTeamSaph) elTeamSaph.textContent = I18N.t('teamSapphire');
        const elTeamAmb = document.getElementById('i18n-team-amber-header');
        if (elTeamAmb) elTeamAmb.textContent = I18N.t('teamAmber');
        const elTotalActions = document.getElementById('i18n-total-actions-label');
        if (elTotalActions) elTotalActions.textContent = I18N.t('totalActions');

        // 4. Tabs
        const tabAll = document.getElementById('i18n-tab-all');
        if (tabAll) tabAll.textContent = I18N.t('tabAll');
        const tabAbilities = document.getElementById('i18n-tab-abilities');
        if (tabAbilities) tabAbilities.textContent = I18N.t('tabAbilities');
        const tabItems = document.getElementById('i18n-tab-items');
        if (tabItems) tabItems.textContent = I18N.t('tabItems');
        const tabCombat = document.getElementById('i18n-tab-combat');
        if (tabCombat) tabCombat.textContent = I18N.t('tabCombat');

        // Settings Drawer Labels
        const elSettingsTitle = document.getElementById('i18n-settings-title');
        if (elSettingsTitle) elSettingsTitle.textContent = I18N.t('settingsTitle') || 'Configurações Gerais';
        const elFontSizeLabel = document.getElementById('i18n-font-size-label');
        if (elFontSizeLabel) elFontSizeLabel.textContent = I18N.t('fontSizeLabel') || 'Tamanho das Fontes';
        const elLangLabel = document.getElementById('i18n-language-label');
        if (elLangLabel) elLangLabel.textContent = I18N.t('languageLabel') || 'Idioma da Interface';
        const elLicenseLabel = document.getElementById('i18n-license-label');
        if (elLicenseLabel) elLicenseLabel.textContent = I18N.t('licenseProLabel') || 'Licença Pro';
        const elAssetsLabel = document.getElementById('i18n-assets-label');
        if (elAssetsLabel) elAssetsLabel.textContent = I18N.t('assetsFolderLabel') || 'Pasta de Assets Locais';

        // 5. Pause Card
        const elPauseTitle = document.getElementById('i18n-pause-title');
        if (elPauseTitle) elPauseTitle.textContent = I18N.t('pauseCardTitle');
        const elPauseSourceLabel = document.getElementById('i18n-pause-source-label');
        if (elPauseSourceLabel) elPauseSourceLabel.textContent = I18N.t('pauseSourceLabel');
        const elPauseCritLabel = document.getElementById('i18n-pause-criteria-label');
        if (elPauseCritLabel) elPauseCritLabel.textContent = I18N.t('pauseCriteriaLabel');
        const elPauseTip = document.getElementById('i18n-pause-tip');
        if (elPauseTip) elPauseTip.innerHTML = I18N.t('pauseTip');

        // Pause options (both first, any first)
        if (elements.pauseSourceSelect && elements.pauseSourceSelect.options.length >= 4) {
            elements.pauseSourceSelect.options[0].textContent = I18N.t('pauseSourceBoth');
            elements.pauseSourceSelect.options[1].textContent = I18N.t('pauseSourceClip');
            elements.pauseSourceSelect.options[2].textContent = I18N.t('pauseSourceSeq');
            elements.pauseSourceSelect.options[3].textContent = I18N.t('pauseSourceDisabled');
        }
        if (elements.pauseCriteriaSelect && elements.pauseCriteriaSelect.options.length >= 3) {
            elements.pauseCriteriaSelect.options[0].textContent = I18N.t('pauseCritAny');
            elements.pauseCriteriaSelect.options[1].textContent = I18N.t('pauseCritDuration');
            elements.pauseCriteriaSelect.options[2].textContent = I18N.t('pauseCritKeyword');
        }

        // 6. Custom Colors Card
        const elColorsTitle = document.getElementById('i18n-colors-title');
        if (elColorsTitle) elColorsTitle.textContent = I18N.t('colorsCardTitle');
        const elColorsBadge = document.getElementById('i18n-colors-badge');
        if (elColorsBadge) elColorsBadge.textContent = I18N.t('colorsBadge');
        if (elements.resetColorsBtn) elements.resetColorsBtn.textContent = I18N.t('resetDefault');

        const elT0 = document.getElementById('i18n-label-t0');
        if (elT0) elT0.textContent = I18N.t('colorT0');
        const elT1 = document.getElementById('i18n-label-t1');
        if (elT1) elT1.textContent = I18N.t('colorT1');
        const elT2 = document.getElementById('i18n-label-t2');
        if (elT2) elT2.textContent = I18N.t('colorT2');
        const elT3 = document.getElementById('i18n-label-t3');
        if (elT3) elT3.textContent = I18N.t('colorT3');
        const elKill = document.getElementById('i18n-label-kill');
        if (elKill) elKill.textContent = I18N.t('colorKill');
        const elAssist = document.getElementById('i18n-label-assist');
        if (elAssist) elAssist.textContent = I18N.t('colorAssist');
        const elDeath = document.getElementById('i18n-label-death');
        if (elDeath) elDeath.textContent = I18N.t('colorDeath');
        const elItem = document.getElementById('i18n-label-item');
        if (elItem) elItem.textContent = I18N.t('colorItem');

        // 7. Premiere Pro Settings
        const elPremTitle = document.getElementById('i18n-premiere-settings-title');
        if (elPremTitle) elPremTitle.textContent = I18N.t('premiereSettingsTitle');
        const elMarkTargLabel = document.getElementById('i18n-marker-target-label');
        if (elMarkTargLabel) elMarkTargLabel.textContent = I18N.t('markerTargetLabel');
        const elTargTrackLabel = document.getElementById('i18n-target-track-label');
        if (elTargTrackLabel) elTargTrackLabel.textContent = I18N.t('targetTrackLabel');
        const elOffModeLabel = document.getElementById('i18n-offset-mode-label');
        if (elOffModeLabel) elOffModeLabel.textContent = I18N.t('offsetModeLabel');
        const elPngDurLabel = document.getElementById('i18n-png-duration-label');
        if (elPngDurLabel) elPngDurLabel.textContent = I18N.t('pngDurationLabel');
        const elGameStartLabel = document.getElementById('i18n-game-start-time-label');
        if (elGameStartLabel) elGameStartLabel.textContent = I18N.t('gameStartTimeLabel');

        updateGameStartTimeDisplay();

        if (elements.markerTargetSelect && elements.markerTargetSelect.options.length >= 3) {
            elements.markerTargetSelect.options[0].textContent = I18N.t('targetClip');
            elements.markerTargetSelect.options[1].textContent = I18N.t('targetBoth');
            elements.markerTargetSelect.options[2].textContent = I18N.t('targetSequence');
        }
        if (elements.offsetModeSelect && elements.offsetModeSelect.options.length >= 3) {
            elements.offsetModeSelect.options[0].textContent = I18N.t('offsetPlayhead');
            elements.offsetModeSelect.options[1].textContent = I18N.t('offsetClipStart');
            elements.offsetModeSelect.options[2].textContent = I18N.t('offsetZero');
        }
        const elItemStyleLabel = document.getElementById('i18n-item-style-label');
        if (elItemStyleLabel) elItemStyleLabel.textContent = I18N.t('itemStyleLabel');
        if (elements.itemStyleSelect && elements.itemStyleSelect.options.length >= 6) {
            elements.itemStyleSelect.options[0].textContent = I18N.t('itemStyleCardPtNew');
            elements.itemStyleSelect.options[1].textContent = I18N.t('itemStyleCardEnNew');
            elements.itemStyleSelect.options[2].textContent = I18N.t('itemStyleCardPtOld');
            elements.itemStyleSelect.options[3].textContent = I18N.t('itemStyleCardEnOld');
            elements.itemStyleSelect.options[4].textContent = I18N.t('itemStyleDescEn');
            elements.itemStyleSelect.options[5].textContent = I18N.t('itemStyleBoth');
        }
        const elSecTrackLabel = document.getElementById('i18n-secondary-track-label');
        if (elSecTrackLabel) elSecTrackLabel.textContent = '📜 ' + I18N.t('secondaryTrackLabel');

        // Checkbox labels
        const elChkTier = document.getElementById('i18n-check-tier');
        if (elChkTier) elChkTier.innerHTML = I18N.t('checkTier');
        const elChkKill = document.getElementById('i18n-check-kill');
        if (elChkKill) elChkKill.innerHTML = I18N.t('checkKill');
        const elChkAssist = document.getElementById('i18n-check-assist');
        if (elChkAssist) elChkAssist.innerHTML = I18N.t('checkAssist');
        const elChkDeath = document.getElementById('i18n-check-death');
        if (elChkDeath) elChkDeath.innerHTML = I18N.t('checkDeath');
        const elChkInsItems = document.getElementById('i18n-check-insert-items');
        if (elChkInsItems) elChkInsItems.innerHTML = I18N.t('checkInsertItems');
        const elChkUnlock = document.getElementById('i18n-check-unlock');
        if (elChkUnlock) elChkUnlock.innerHTML = I18N.t('checkUnlock');
        const elChkItemMarks = document.getElementById('i18n-check-item-markers');
        if (elChkItemMarks) elChkItemMarks.innerHTML = I18N.t('checkItemMarkers');
        const elPremTip = document.getElementById('i18n-premiere-tip');
        if (elPremTip) elPremTip.innerHTML = I18N.t('premiereTip');

        const elSyncBtnText = document.getElementById('i18n-sync-btn-text');
        if (elSyncBtnText) elSyncBtnText.textContent = I18N.t('syncBtn');

        // License Modal
        const elLicTitle = document.getElementById('i18n-license-title');
        if (elLicTitle) elLicTitle.textContent = I18N.t('licenseModalTitle');
        const elLicSub = document.getElementById('i18n-license-subtitle');
        if (elLicSub) elLicSub.textContent = I18N.t('licenseModalSubtitle');
        const elLicDesc = document.getElementById('i18n-license-desc');
        if (elLicDesc) elLicDesc.textContent = I18N.t('licenseModalDesc');
        const elLicInput = document.getElementById('license-key-input');
        if (elLicInput) elLicInput.placeholder = I18N.t('licenseKeyPlaceholder');
        const elActBtnText = document.getElementById('i18n-activate-btn-text');
        if (elActBtnText) elActBtnText.textContent = I18N.t('activateBtn');
        const elBuyTitle = document.getElementById('i18n-buy-title');
        if (elBuyTitle) elBuyTitle.textContent = I18N.t('buyTitle');
        const elBuyPix = document.getElementById('i18n-buy-pix-text');
        if (elBuyPix) elBuyPix.textContent = I18N.t('buyPixBtn');
        const elBuyStripe = document.getElementById('i18n-buy-stripe-text');
        if (elBuyStripe) elBuyStripe.textContent = I18N.t('buyStripeBtn');

        // Re-render color selects options and legend
        initMarkerColors();
        renderColorLegend();
        if (state.selectedPlayerIndex !== null) {
            renderTimelineList();
        }
    }

    /**
     * Initialize Customizable Marker Colors
     */
    function initMarkerColors() {
        // Load saved colors from localStorage
        try {
            const saved = localStorage.getItem(COLORS_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                state.markerColors = { ...DEFAULT_MARKER_COLORS, ...parsed };
            }
        } catch (e) { }

        const colorKeys = ['t0', 't1', 't2', 't3', 'kill', 'assist', 'death', 'item'];

        colorKeys.forEach(key => {
            const select = document.getElementById(`color-select-${key}`);
            const dot = document.getElementById(`dot-color-${key}`);
            if (!select) return;

            select.innerHTML = '';
            PREMIERE_MARKER_COLORS.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.index;
                const translatedColorName = (typeof I18N !== 'undefined') ? I18N.getColorName(c.index) : c.name;
                opt.textContent = `${c.emoji} ${translatedColorName} (${c.index})`;
                if (state.markerColors[key] === c.index) {
                    opt.selected = true;
                }
                select.appendChild(opt);
            });

            // Update initial dot color
            const curColor = PREMIERE_MARKER_COLORS.find(c => c.index === state.markerColors[key]);
            if (dot && curColor) {
                dot.style.backgroundColor = curColor.hex;
            }

            // Change listener
            if (!select._bound) {
                select._bound = true;
                select.addEventListener('change', (e) => {
                    const newIdx = parseInt(e.target.value, 10);
                    state.markerColors[key] = newIdx;
                    const updated = PREMIERE_MARKER_COLORS.find(c => c.index === newIdx);
                    if (dot && updated) {
                        dot.style.backgroundColor = updated.hex;
                    }
                    saveMarkerColors();
                    renderColorLegend();
                });
            }
        });

        // Toggle accordion for marker colors panel (recolhido por padrão)
        const toggleHeader = document.getElementById('toggle-colors-header');
        const configPanel = document.getElementById('colors-config-panel');
        const toggleIcon = document.getElementById('colors-toggle-icon');
        const resetBtn = document.getElementById('reset-colors-btn');

        if (toggleHeader && !toggleHeader._bound) {
            toggleHeader._bound = true;
            toggleHeader.addEventListener('click', (e) => {
                if (e.target && e.target.id === 'reset-colors-btn') return;

                const isCollapsed = !configPanel || configPanel.style.display === 'none';
                if (configPanel) {
                    configPanel.style.display = isCollapsed ? 'flex' : 'none';
                }
                if (toggleIcon) {
                    toggleIcon.textContent = isCollapsed ? '▼' : '▶';
                }
                if (resetBtn) {
                    resetBtn.style.display = isCollapsed ? 'inline-block' : 'none';
                }
            });
        }

        // Reset colors button
        if (resetBtn && !resetBtn._bound) {
            resetBtn._bound = true;
            resetBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                state.markerColors = { ...DEFAULT_MARKER_COLORS };
                saveMarkerColors();
                colorKeys.forEach(key => {
                    const select = document.getElementById(`color-select-${key}`);
                    const dot = document.getElementById(`dot-color-${key}`);
                    if (select) select.value = state.markerColors[key];
                    const cur = PREMIERE_MARKER_COLORS.find(c => c.index === state.markerColors[key]);
                    if (dot && cur) dot.style.backgroundColor = cur.hex;
                });
                renderColorLegend();
                const resetMsg = (typeof I18N !== 'undefined') ? I18N.t('colorsResetNotif') : 'Cores dos marcadores restauradas para o padrão!';
                showNotification(resetMsg, 'info', 3000);
            });
        }

        renderColorLegend();
    }

    function saveMarkerColors() {
        try {
            localStorage.setItem(COLORS_STORAGE_KEY, JSON.stringify(state.markerColors));
        } catch (e) { }
    }

    function renderColorLegend() {
        if (!elements.dynamicColorLegend) return;

        const labels = [
            { key: 't1', label: 'T1' },
            { key: 't2', label: 'T2' },
            { key: 't3', label: 'T3' },
            { key: 'kill', label: 'Kill' },
            { key: 'assist', label: 'Assist' },
            { key: 'death', label: (typeof I18N !== 'undefined' ? I18N.t('colorDeath').replace(/[^a-zA-Zа-яА-ЯёЁ]/g, '').slice(0, 5) : 'Morte') },
            { key: 'item', label: (typeof I18N !== 'undefined' ? I18N.t('itemLabel') : 'Itens') },
            { key: 't0', label: 'T0' }
        ];

        let html = '';
        labels.forEach(item => {
            const colorIdx = state.markerColors[item.key] !== undefined ? state.markerColors[item.key] : DEFAULT_MARKER_COLORS[item.key];
            const colorObj = PREMIERE_MARKER_COLORS.find(c => c.index === colorIdx) || PREMIERE_MARKER_COLORS[0];
            const translatedColorName = (typeof I18N !== 'undefined') ? I18N.getColorName(colorIdx) : colorObj.name;
            html += `
                <div class="color-legend-item" style="display: flex; align-items: center; gap: 4px;">
                    <span style="width: 9px; height: 9px; border-radius: 50%; background: ${colorObj.hex}; display: inline-block; box-shadow: 0 0 4px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.2);"></span>
                    <span>${item.label} (${translatedColorName})</span>
                </div>
            `;
        });
        elements.dynamicColorLegend.innerHTML = html;
    }

    /**
     * Initialize Pause Compensation Settings
     */
    function initPauseSettings() {
        if (!elements.pauseSourceSelect) return;

        try {
            const savedSrc = localStorage.getItem(PAUSE_SOURCE_KEY);
            elements.pauseSourceSelect.value = savedSrc || 'both';
        } catch (e) { }

        try {
            const savedCrit = localStorage.getItem(PAUSE_CRITERIA_KEY);
            if (elements.pauseCriteriaSelect) {
                elements.pauseCriteriaSelect.value = savedCrit || 'any';
            }
        } catch (e) { }

        function updatePauseStatus() {
            const val = elements.pauseSourceSelect.value;
            if (val === 'disabled') {
                if (elements.pauseStatusBadge) {
                    elements.pauseStatusBadge.textContent = 'Desativado';
                    elements.pauseStatusBadge.style.color = '#ef4444';
                }
            } else {
                if (elements.pauseStatusBadge) {
                    elements.pauseStatusBadge.textContent = 'Ativo';
                    elements.pauseStatusBadge.style.color = '#4ade80';
                }
            }
        }

        elements.pauseSourceSelect.addEventListener('change', () => {
            updatePauseStatus();
            try {
                localStorage.setItem(PAUSE_SOURCE_KEY, elements.pauseSourceSelect.value);
            } catch (e) { }
        });

        if (elements.pauseCriteriaSelect) {
            elements.pauseCriteriaSelect.addEventListener('change', () => {
                try {
                    localStorage.setItem(PAUSE_CRITERIA_KEY, elements.pauseCriteriaSelect.value);
                } catch (e) { }
            });
        }

        updatePauseStatus();
    }

    /* ==============================================================================
       FONT SCALE / UI ZOOM CONTROL
       ============================================================================== */
    function initFontScale() {
        let scale = 100;
        try {
            const saved = localStorage.getItem(FONT_SCALE_KEY);
            if (saved) {
                const parsed = parseInt(saved, 10);
                if (!isNaN(parsed) && parsed >= 80 && parsed <= 160) {
                    scale = parsed;
                }
            }
        } catch (e) { }

        applyFontScale(scale);

        if (elements.btnFontScaleDown) {
            elements.btnFontScaleDown.addEventListener('click', () => {
                const current = parseInt(elements.fontScaleValue ? elements.fontScaleValue.textContent : '100', 10) || 100;
                applyFontScale(Math.max(80, current - 10));
            });
        }
        if (elements.btnFontScaleUp) {
            elements.btnFontScaleUp.addEventListener('click', () => {
                const current = parseInt(elements.fontScaleValue ? elements.fontScaleValue.textContent : '100', 10) || 100;
                applyFontScale(Math.min(160, current + 10));
            });
        }
        if (elements.btnFontScaleReset) {
            elements.btnFontScaleReset.addEventListener('click', () => {
                applyFontScale(100);
            });
        }
    }

    function applyFontScale(percent) {
        if (elements.fontScaleValue) {
            elements.fontScaleValue.textContent = `${percent}%`;
        }
        // In Chromium / Adobe CEP, body zoom scales UI fonts and layouts fluidly
        document.body.style.zoom = (percent / 100);
        try {
            localStorage.setItem(FONT_SCALE_KEY, String(percent));
        } catch (e) { }
    }

    /* ==============================================================================
       GENERAL SETTINGS DRAWER TOGGLE
       ============================================================================== */
    function initSettingsDrawer() {
        if (elements.headerSettingsBtn && elements.generalSettingsCard) {
            elements.headerSettingsBtn.addEventListener('click', () => {
                const isHidden = elements.generalSettingsCard.style.display === 'none' || !elements.generalSettingsCard.style.display;
                elements.generalSettingsCard.style.display = isHidden ? 'flex' : 'none';
            });
        }
        if (elements.btnCloseSettingsCard && elements.generalSettingsCard) {
            elements.btnCloseSettingsCard.addEventListener('click', () => {
                elements.generalSettingsCard.style.display = 'none';
            });
        }
    }

    /* ==============================================================================
       STAGE ACCORDIONS (COLLAPSIBLE PANELS)
       ============================================================================== */
    function toggleAccordion(cardEl, bodyEl, iconEl) {
        if (!cardEl || !bodyEl) return;
        const isOpen = cardEl.classList.contains('active');
        if (isOpen) {
            cardEl.classList.remove('active');
            bodyEl.style.display = 'none';
            if (iconEl) iconEl.textContent = '▶';
        } else {
            cardEl.classList.add('active');
            bodyEl.style.display = 'block';
            if (iconEl) iconEl.textContent = '▼';
        }
    }

    function initStageAccordions() {
        if (elements.toggleHeroesHeader && elements.heroesCollapsibleBody) {
            elements.toggleHeroesHeader.addEventListener('click', () => {
                toggleAccordion(elements.heroesSection, elements.heroesCollapsibleBody, elements.heroesToggleIcon);
            });
        }

        if (elements.togglePauseHeader && elements.pauseCollapsibleBody) {
            elements.togglePauseHeader.addEventListener('click', () => {
                toggleAccordion(elements.pauseCard, elements.pauseCollapsibleBody, elements.pauseToggleIcon);
            });
        }

        if (elements.togglePremiereHeader && elements.premiereSettingsCollapsibleBody) {
            elements.togglePremiereHeader.addEventListener('click', () => {
                toggleAccordion(elements.premiereSettingsCard, elements.premiereSettingsCollapsibleBody, elements.premiereToggleIcon);
            });
        }
    }

    const HISTORY_KEY = 'deadlock_search_history';

    /**
     * Get search history from localStorage
     */
    function getSearchHistory() {
        try {
            const raw = localStorage.getItem(HISTORY_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Add match ID to search history
     */
    function addToSearchHistory(matchId, durationFormatted) {
        try {
            let history = getSearchHistory();
            const strId = String(matchId).trim();
            history = history.filter(item => (typeof item === 'string' ? item : item.id) !== strId);
            history.unshift({
                id: strId,
                duration: durationFormatted || ''
            });
            if (history.length > 8) history = history.slice(0, 8);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
            renderSearchHistory();
        } catch (e) { }
    }

    /**
     * Clear search history
     */
    function clearSearchHistory() {
        try {
            localStorage.removeItem(HISTORY_KEY);
            renderSearchHistory();
        } catch (e) { }
    }

    /**
     * Render Search History Chips
     */
    function renderSearchHistory() {
        if (!elements.historyContainer || !elements.historyChipsList) return;
        const history = getSearchHistory();

        if (history.length === 0) {
            elements.historyContainer.style.display = 'none';
            return;
        }

        elements.historyChipsList.innerHTML = '';
        history.forEach(item => {
            const id = typeof item === 'string' ? item : item.id;
            const dur = typeof item === 'object' && item.duration ? ` (${item.duration})` : '';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'chip-btn';
            btn.innerHTML = `<span>#${id}${dur}</span>`;
            btn.addEventListener('click', () => {
                elements.matchInput.value = id;
                handleSearch(id);
            });
            elements.historyChipsList.appendChild(btn);
        });

        elements.historyContainer.style.display = 'flex';
    }

    /**
     * Handle Match Search
     */
    async function handleSearch(matchId) {
        if (!matchId) return;

        elements.searchBtn.disabled = true;
        elements.searchBtnText.innerHTML = '<span class="loading-spinner"></span>';

        try {
            const match = await DeadlockApi.fetchMatch(matchId);
            state.currentMatch = match;
            addToSearchHistory(match.matchId, match.durationFormatted);
            renderMatch(match);
            showNotification(`Partida #${match.matchId} carregada com sucesso! (${match.players.length} jogadores)`, 'success');
        } catch (err) {
            console.error('Erro ao buscar partida:', err);
            showNotification(`Erro: ${err.message}`, 'error', 5000);
        } finally {
            elements.searchBtn.disabled = false;
            elements.searchBtnText.textContent = 'Buscar';
        }
    }

    /**
     * Render Match Summary and 12 Hero Cards
     */
    function renderMatch(match) {
        // Summary in Footer and/or top
        if (elements.summaryMatchId) elements.summaryMatchId.textContent = `#${match.matchId}`;
        if (elements.summaryDuration) elements.summaryDuration.textContent = match.durationFormatted;
        if (elements.summaryWinner) {
            elements.summaryWinner.textContent = match.winningTeam === 0 ? 'The Sapphire Flame' : (match.winningTeam === 1 ? 'The Amber Hand' : 'Indefinido');
            elements.summaryWinner.style.color = match.winningTeam === 0 ? 'var(--team-sapphire)' : 'var(--team-amber)';
        }
        if (elements.footerMatchSummary) elements.footerMatchSummary.style.display = 'flex';
        if (elements.matchSummary) elements.matchSummary.style.display = 'flex';

        // Render Hero grids
        elements.sapphireGrid.innerHTML = '';
        elements.amberGrid.innerHTML = '';

        match.players.forEach(p => {
            const card = document.createElement('div');
            card.className = 'hero-card';
            card.dataset.playerIndex = p.playerIndex;
            card.innerHTML = `
                <img class="hero-avatar" src="${p.heroImage}" alt="${p.heroName}" onerror="this.src='https://assets.deadlock-api.com/v1/heroes/unknown/icon.png'" />
                <div class="hero-info">
                    <span class="hero-name" title="${p.heroName}">${p.heroName}</span>
                    <div class="hero-stats">
                        <span>${p.kills}/${p.deaths}/${p.assists}</span>
                        <span class="hero-networth">${(p.netWorth / 1000).toFixed(1)}k</span>
                    </div>
                </div>
            `;

            card.addEventListener('click', () => {
                selectHero(p.playerIndex);
            });

            if (p.team === 0) {
                elements.sapphireGrid.appendChild(card);
            } else {
                elements.amberGrid.appendChild(card);
            }
        });

        if (elements.heroesSection) {
            elements.heroesSection.style.display = 'block';
            elements.heroesSection.classList.add('active');
            if (elements.heroesCollapsibleBody) elements.heroesCollapsibleBody.style.display = 'block';
            if (elements.heroesToggleIcon) elements.heroesToggleIcon.textContent = '▼';
        }

        // Select first player by default
        if (match.players.length > 0) {
            selectHero(0);
        }
    }

    /**
     * Select Hero and Render Timeline
     */
    function selectHero(playerIndex) {
        state.selectedPlayerIndex = playerIndex;
        const player = state.currentMatch.players.find(p => p.playerIndex === playerIndex);
        if (!player) return;

        // Highlight selected card
        document.querySelectorAll('.hero-card').forEach(c => {
            c.classList.toggle('selected', parseInt(c.dataset.playerIndex, 10) === playerIndex);
        });

        // Update profile header
        elements.selectedHeroAvatar.src = player.heroImage;
        elements.selectedHeroName.textContent = `${player.heroName} (Slot ${player.playerSlot})`;
        elements.selectedHeroStats.textContent = `KDA: ${player.kills}/${player.deaths}/${player.assists} • Net Worth: ${player.netWorth.toLocaleString()} Souls • Nível ${player.level}`;

        // Build combined timeline data
        const list = [];
        const startSec = state.gameStartTimeSec || 0;

        const tierChecked = elements.checkTierMarkers ? elements.checkTierMarkers.checked : true;
        const unlockChecked = elements.checkUnlockMarkers ? elements.checkUnlockMarkers.checked : false;
        const killChecked = elements.checkKillMarkers ? elements.checkKillMarkers.checked : true;
        const assistChecked = elements.checkAssistMarkers ? elements.checkAssistMarkers.checked : true;
        const deathChecked = elements.checkDeathMarkers ? elements.checkDeathMarkers.checked : true;
        const itemsChecked = elements.checkInsertItems ? elements.checkInsertItems.checked : true;

        // 1. Abilities
        player.abilitiesTimeline.forEach(ab => {
            if (ab.timeSeconds < startSec) return;
            const isUnlock = ab.shortTier === 'T0' || ab.upgradeInfo === 65537;
            const isEnabled = isUnlock ? unlockChecked : tierChecked;

            list.push({
                type: 'ability',
                timeSeconds: ab.timeSeconds,
                timeFormatted: ab.timeFormatted,
                name: ab.name,
                tierLabel: ab.tierLabel,
                shortTier: ab.shortTier,
                isUnlock: isUnlock,
                markerColorIndex: state.markerColors.t1 !== undefined ? state.markerColors.t1 : 5,
                image: ab.image,
                slot: 'ability',
                enabled: isEnabled,
                raw: ab
            });
        });

        // 2. Items
        player.itemsTimeline.forEach(it => {
            if (it.timeSeconds < startSec) return;

            const mgr = (typeof ItemsManager !== 'undefined') ? ItemsManager : (typeof window !== 'undefined' ? window.ItemsManager : null);
            const currentItem = mgr ? mgr.findItem(it.name || it.rawName) : null;
            const activeImage = currentItem ? currentItem.url : it.image;
            const activeLocalPath = currentItem ? (currentItem.fullPath || currentItem.localPngPath) : it.localPngPath;
            const activeFound = currentItem ? currentItem.isCached : it.localFound;

            list.push({
                type: 'item',
                timeSeconds: it.timeSeconds,
                timeFormatted: it.timeFormatted,
                name: it.name,
                slotType: it.slotType,
                cost: it.cost,
                tier: it.tier,
                image: activeImage,
                localFound: activeFound,
                localPngPath: activeLocalPath,
                enabled: itemsChecked,
                raw: it
            });
        });

        // 3. Kills
        (player.killsTimeline || []).forEach(k => {
            if (k.timeSeconds < startSec) return;
            list.push({
                type: 'kill',
                timeSeconds: k.timeSeconds,
                timeFormatted: k.timeFormatted,
                name: `💀 Abate: ${k.victimHero}`,
                victimHero: k.victimHero,
                victimSlot: k.victimSlot,
                tierLabel: `Abateu ${k.victimHero}`,
                shortTier: 'KILL',
                markerColorIndex: state.markerColors.kill !== undefined ? state.markerColors.kill : 7,
                image: 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%2306b6d4\'><path d=\'M12 2a9 9 0 0 0-9 9c0 3.87 2.44 7.18 5.86 8.44l-.36 2.56h7l-.36-2.56C18.56 18.18 21 14.87 21 11a9 9 0 0 0-9-9zm-3 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z\'/></svg>',
                slot: 'kill',
                enabled: killChecked,
                raw: k
            });
        });

        // 4. Assists
        (player.assistsTimeline || []).forEach(a => {
            if (a.timeSeconds < startSec) return;
            list.push({
                type: 'assist',
                timeSeconds: a.timeSeconds,
                timeFormatted: a.timeFormatted,
                name: `🤝 Assist: ${a.victimHero} (por ${a.killerHero})`,
                victimHero: a.victimHero,
                killerHero: a.killerHero,
                victimSlot: a.victimSlot,
                killerSlot: a.killerSlot,
                tierLabel: `Assistência em ${a.victimHero}`,
                shortTier: 'ASSIST',
                markerColorIndex: state.markerColors.assist !== undefined ? state.markerColors.assist : 3,
                image: 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%23f97316\'><path d=\'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z\'/></svg>',
                slot: 'assist',
                enabled: assistChecked,
                raw: a
            });
        });

        // 5. Deaths
        (player.deathsTimeline || []).forEach(d => {
            if (d.timeSeconds < startSec) return;
            const respawnText = (d.deathDurationS > 0) ? ` (${d.deathDurationS}s respawn)` : '';
            list.push({
                type: 'death',
                timeSeconds: d.timeSeconds,
                deathDurationS: d.deathDurationS || d.durationSeconds || 0,
                durationSeconds: d.deathDurationS || d.durationSeconds || 0,
                timeFormatted: d.timeFormatted,
                name: `☠️ Morte: ${d.killerHero}`,
                killerHero: d.killerHero,
                killerSlot: d.killerSlot,
                tierLabel: `Morto por ${d.killerHero}${respawnText}`,
                shortTier: 'MORTE',
                markerColorIndex: state.markerColors.death !== undefined ? state.markerColors.death : 1,
                image: 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%23ef4444\'><path d=\'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z\'/></svg>',
                slot: 'death',
                enabled: deathChecked,
                raw: d
            });
        });

        // Sort all events by time ascending
        list.sort((a, b) => a.timeSeconds - b.timeSeconds);
        state.timelineData = list;

        // Update tab counts
        const visibleAbilities = player.abilitiesTimeline.filter(ab => ab.timeSeconds >= startSec);
        const visibleItems = player.itemsTimeline.filter(it => it.timeSeconds >= startSec);
        const visibleKills = (player.killsTimeline || []).filter(k => k.timeSeconds >= startSec);
        const visibleAssists = (player.assistsTimeline || []).filter(a => a.timeSeconds >= startSec);
        const visibleDeaths = (player.deathsTimeline || []).filter(d => d.timeSeconds >= startSec);
        const combatCount = visibleKills.length + visibleAssists.length + visibleDeaths.length;

        elements.tabCountAll.textContent = list.length;
        elements.tabCountAbilities.textContent = visibleAbilities.length;
        elements.tabCountItems.textContent = visibleItems.length;
        if (elements.tabCountCombat) elements.tabCountCombat.textContent = combatCount;
        elements.totalActionsCount.textContent = list.length;

        // Render timeline
        renderTimelineList();

        // Ensure events list is collapsed by default
        const timelineEventsContainer = document.getElementById('timeline-events-container');
        const timelineToggleIcon = document.getElementById('timeline-toggle-icon');
        if (timelineEventsContainer) timelineEventsContainer.style.display = 'none';
        if (timelineToggleIcon) timelineToggleIcon.textContent = '▶';

        elements.heroDetailsSection.style.display = 'flex';
    }

    /**
     * Render Timeline List based on active tab
     */
    function renderTimelineList() {
        elements.timelineList.innerHTML = '';

        const filtered = state.timelineData.filter(item => {
            if (state.activeTab === 'abilities') return item.type === 'ability';
            if (state.activeTab === 'items') return item.type === 'item';
            if (state.activeTab === 'combat') return item.type === 'kill' || item.type === 'death' || item.type === 'assist';
            return true;
        });

        if (filtered.length === 0) {
            elements.timelineList.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-dim);">Nenhum item nesta categoria.</div>';
            return;
        }

        const fragment = document.createDocumentFragment();

        filtered.forEach(item => {
            const row = document.createElement('div');
            row.className = 'timeline-row';

            const isAbility = item.type === 'ability';
            const isKill = item.type === 'kill';
            const isAssist = item.type === 'assist';
            const isDeath = item.type === 'death';

            let badgeClass = 'weapon';
            let badgeLabel = item.shortTier || 'ITEM';
            let subtitle = '';

            if (isAbility) {
                badgeClass = 'ability';
                badgeLabel = item.shortTier;
                subtitle = (typeof I18N !== 'undefined') ? 
                    I18N.getLocalizedTierLabel(item.shortTier, item.raw?.upgradeInfo) : (item.tierLabel || '');
            } else if (isKill) {
                badgeClass = 'kill';
                badgeLabel = 'KILL';
                subtitle = (typeof I18N !== 'undefined') ?
                    I18N.t('markerKillComment', { victim: item.victimHero || 'Enemy', time: item.timeFormatted }) :
                    `Abate em ${item.victimHero}`;
            } else if (isAssist) {
                badgeClass = 'assist';
                badgeLabel = 'ASSIST';
                subtitle = (typeof I18N !== 'undefined') ?
                    I18N.t('markerAssistComment', { victim: item.victimHero || 'Enemy', killer: item.killerHero || 'Ally', time: item.timeFormatted }) :
                    `Assistência em ${item.victimHero} (por ${item.killerHero})`;
            } else if (isDeath) {
                badgeClass = 'death';
                badgeLabel = 'MORTE';
                const respawnSec = item.deathDurationS || item.durationSeconds || item.raw?.deathDurationS || 0;
                const respawnInfo = respawnSec > 0 ? ` • Respawn: ${respawnSec}s` : '';
                subtitle = (typeof I18N !== 'undefined') ?
                    (I18N.t('markerDeathComment', { killer: item.killerHero || 'Enemy', time: item.timeFormatted }) + (respawnSec > 0 ? ` (Respawn: ${respawnSec}s)` : '')) :
                    `Morto por ${item.killerHero}${respawnInfo}`;
            } else {
                badgeClass = item.slotType || 'weapon';
                badgeLabel = item.slotType;
                subtitle = `${item.cost} Souls • Tier ${item.tier || 1}`;
            }

            const pngBadge = (item.type === 'item') ? (
                item.localFound ?
                    `<span class="png-status found" title="PNG Encontrado: ${item.localPngPath}">✓ PNG</span>` :
                    `<span class="png-status missing" title="PNG não encontrado no diretório local">⚠️ Sem PNG</span>`
            ) : '';

            row.innerHTML = `
                <input type="checkbox" class="timeline-checkbox" ${item.enabled ? 'checked' : ''} />
                <span class="timeline-time-badge">${item.timeFormatted}</span>
                <img class="timeline-icon" src="${item.image}" alt="${item.name}" onerror="this.style.display='none'" />
                <div class="timeline-content">
                    <span class="timeline-title">${item.name}</span>
                    <span class="timeline-subtitle">${subtitle}</span>
                </div>
                <span class="badge-slot ${badgeClass}">${badgeLabel}</span>
                ${pngBadge}
            `;

            const checkbox = row.querySelector('.timeline-checkbox');
            checkbox.addEventListener('change', (e) => {
                item.enabled = e.target.checked;
            });

            fragment.appendChild(row);
        });

        elements.timelineList.appendChild(fragment);
    }

    /**
     * Sync with Adobe Premiere Pro Timeline
     */
    async function syncWithPremiere() {
        try {
            if (!state.currentMatch || state.selectedPlayerIndex === null) {
                showNotification('Selecione uma partida e um herói primeiro.', 'error');
                return;
            }

            const player = state.currentMatch.players.find(p => p.playerIndex === state.selectedPlayerIndex);
            if (!player) return;

            const itemStyle = elements.itemStyleSelect ? elements.itemStyleSelect.value : 'icon';
            const targetTrack = parseInt(elements.targetTrackSelect ? elements.targetTrackSelect.value : '2', 10) || 2;
            const secondaryTargetTrack = parseInt(elements.secondaryTrackSelect ? elements.secondaryTrackSelect.value : '3', 10) || 3;
            const insertBothItemTypes = (itemStyle === 'both');
            const markerTarget = elements.markerTargetSelect ? elements.markerTargetSelect.value : 'clip';
            const clipDuration = parseFloat(elements.itemDurationInput ? elements.itemDurationInput.value : '3.0') || 3.0;
            const offsetMode = elements.offsetModeSelect ? elements.offsetModeSelect.value : 'playhead';
            const customOffset = (elements.customOffsetInput && elements.customOffsetInput.value) ? (parseFloat(elements.customOffsetInput.value) || 0) : 0;
            const createTierMarkers = elements.checkTierMarkers ? elements.checkTierMarkers.checked : true;
            const createKillMarkers = elements.checkKillMarkers ? elements.checkKillMarkers.checked : true;
            const createDeathMarkers = elements.checkDeathMarkers ? elements.checkDeathMarkers.checked : true;
            const createUnlockMarkers = elements.checkUnlockMarkers ? elements.checkUnlockMarkers.checked : false;
            const insertItemClips = elements.checkInsertItems ? elements.checkInsertItems.checked : true;
            const createItemMarkers = elements.checkItemMarkers ? elements.checkItemMarkers.checked : false;

            // Fallback names in active language
            const fallbackEnemy = (typeof I18N !== 'undefined') ? I18N.t('enemyLabel') : 'Inimigo';
            const fallbackAlly = (typeof I18N !== 'undefined') ? I18N.t('allyLabel') : 'Aliado';

            // Filter active abilities, items, kills, assists, and deaths with localized marker texts
            const abilitiesToSend = state.timelineData
                .filter(d => d.type === 'ability' && d.enabled)
                .map(d => {
                    const rawObj = d.raw ? { ...d.raw } : {};
                    const localizedTier = (typeof I18N !== 'undefined') ? 
                        I18N.getLocalizedTierLabel(d.shortTier, d.raw?.upgradeInfo) : (d.tierLabel || 'Upgrade');

                    rawObj.markerName = (typeof I18N !== 'undefined') ?
                        I18N.t('markerAbilityName', { name: d.name, shortTier: d.shortTier || 'UP' }) :
                        `⚡ ${d.name} (${d.shortTier || 'UP'})`;
                    rawObj.markerComments = (typeof I18N !== 'undefined') ?
                        I18N.t('markerAbilityComment', { name: d.name, tier: localizedTier, time: d.timeFormatted }) :
                        `Habilidade: ${d.name}\nNível: ${d.tierLabel || 'Upgrade'}\nTempo de Partida: ${d.timeFormatted}`;
                    return rawObj;
                });

            const itemsToSend = state.timelineData
                .filter(d => d.type === 'item' && d.enabled)
                .map((d, itemIdx) => {
                    const rawObj = d.raw ? { ...d.raw } : {};
                    rawObj.name = d.name || rawObj.name;
                    rawObj.rawName = rawObj.rawName || d.name || rawObj.name;
                    rawObj.localPngPath = d.localPngPath || rawObj.localPngPath;
                    rawObj.localDescPngPath = d.localDescPngPath || rawObj.localDescPngPath;
                    rawObj.image = d.image || rawObj.image;
                    rawObj.timeSeconds = d.timeSeconds;
                    rawObj.timeFormatted = d.timeFormatted;
                    rawObj.slotType = d.slotType || rawObj.slotType;
                    rawObj.cost = d.cost || rawObj.cost;
                    rawObj.tier = d.tier || rawObj.tier;

                    const itemNum = (itemIdx + 1 < 10 ? '0' : '') + (itemIdx + 1);
                    rawObj.markerName = (typeof I18N !== 'undefined') ?
                        I18N.t('markerItemName', { name: `${itemNum} - ${rawObj.name}`, slotType: rawObj.slotType || 'Item' }) :
                        `🛒 ${itemNum} - ${rawObj.name} (${rawObj.slotType || 'Item'})`;
                    rawObj.markerComments = (typeof I18N !== 'undefined') ?
                        I18N.t('markerItemComment', { name: rawObj.name, cost: rawObj.cost || 0, time: rawObj.timeFormatted }) :
                        `Item Comprado: ${rawObj.name}\nCusto: ${rawObj.cost || 0} Souls\nTempo de Partida: ${rawObj.timeFormatted}`;
                    return rawObj;
                });

            const killsToSend = state.timelineData
                .filter(d => d.type === 'kill' && d.enabled)
                .map(d => {
                    const rawObj = d.raw ? { ...d.raw } : {};
                    const victim = d.victimHero || rawObj.victimHero || fallbackEnemy;
                    rawObj.markerName = (typeof I18N !== 'undefined') ?
                        I18N.t('markerKillName', { victim }) :
                        `💀 Kill: ${victim}`;
                    rawObj.markerComments = (typeof I18N !== 'undefined') ?
                        I18N.t('markerKillComment', { victim, time: d.timeFormatted }) :
                        `Abateu ${victim} aos ${d.timeFormatted}`;
                    return rawObj;
                });

            const assistsToSend = state.timelineData
                .filter(d => d.type === 'assist' && d.enabled)
                .map(d => {
                    const rawObj = d.raw ? { ...d.raw } : {};
                    const victim = d.victimHero || rawObj.victimHero || fallbackEnemy;
                    const killer = d.killerHero || rawObj.killerHero || fallbackAlly;
                    rawObj.markerName = (typeof I18N !== 'undefined') ?
                        I18N.t('markerAssistName', { victim }) :
                        `🤝 Assist: ${victim}`;
                    rawObj.markerComments = (typeof I18N !== 'undefined') ?
                        I18N.t('markerAssistComment', { victim, killer, time: d.timeFormatted }) :
                        `Assistência em ${victim} (abate por ${killer}) aos ${d.timeFormatted}`;
                    return rawObj;
                });

            const deathsToSend = state.timelineData
                .filter(d => d.type === 'death' && d.enabled)
                .map(d => {
                    const rawObj = d.raw ? { ...d.raw } : {};
                    const killer = d.killerHero || rawObj.killerHero || fallbackEnemy;
                    const durationS = d.deathDurationS || d.durationSeconds || rawObj.deathDurationS || rawObj.death_duration_s || 0;
                    const respawnSuffix = durationS > 0 ? ` (${durationS}s)` : '';

                    rawObj.timeSeconds = d.timeSeconds;
                    rawObj.deathDurationS = durationS;
                    rawObj.durationSeconds = durationS;
                    rawObj.markerName = (typeof I18N !== 'undefined') ?
                        (I18N.t('markerDeathName', { killer }) + respawnSuffix) :
                        `☠️ Morte: ${killer}${respawnSuffix}`;
                    rawObj.markerComments = (typeof I18N !== 'undefined') ?
                        (I18N.t('markerDeathComment', { killer, time: d.timeFormatted }) + (durationS > 0 ? `\nTempo de Respawn: ${durationS}s` : '')) :
                        `Morto por ${killer} aos ${d.timeFormatted}${durationS > 0 ? `\nTempo de Respawn: ${durationS}s` : ''}`;
                    return rawObj;
                });

            if (abilitiesToSend.length === 0 && itemsToSend.length === 0 && killsToSend.length === 0 && assistsToSend.length === 0 && deathsToSend.length === 0) {
                showNotification('Nenhum evento ou item selecionado para importar.', 'error');
                return;
            }

            elements.syncPremiereBtn.disabled = true;
            elements.syncPremiereBtn.innerHTML = `<span class="loading-spinner"></span> ${typeof I18N !== 'undefined' ? I18N.t('syncBtnDownloading') : 'Baixando PNGs da nuvem...'}`;

            // Ensure all item PNGs are downloaded from cloud cache to local disk before Premiere import
            if (insertItemClips && itemsToSend.length > 0) {
                const itemsMgr = (typeof ItemsManager !== 'undefined') ? ItemsManager : (typeof window !== 'undefined' ? window.ItemsManager : null);
                if (itemsMgr && typeof itemsMgr.cacheAllMatchItems === 'function') {
                    try {
                        await itemsMgr.cacheAllMatchItems(itemsToSend, (done, total) => {
                            elements.syncPremiereBtn.innerHTML = `<span class="loading-spinner"></span> Nuvem: ${done}/${total} PNGs...`;
                        });
                    } catch (e) {
                        console.warn('Aviso no cache da nuvem:', e);
                    }
                }
            }

            // Pause Compensation Settings
            const pauseSource = elements.pauseSourceSelect ? elements.pauseSourceSelect.value : 'sequence';
            const pauseCriteria = elements.pauseCriteriaSelect ? elements.pauseCriteriaSelect.value : 'all_spanned';

            const createAssistMarkers = elements.checkAssistMarkers ? elements.checkAssistMarkers.checked : true;

            const payload = {
                matchId: state.currentMatch.matchId,
                heroName: player.heroName,
                binName: `Deadlock - ${player.heroName} (${state.currentMatch.matchId})`,
                markerTarget,
                targetTrack,
                secondaryTargetTrack,
                insertBothItemTypes,
                clipDuration,
                offsetMode,
                customOffset,
                gameStartTimeSec: state.gameStartTimeSec || 0,
                startMatchTimeSec: state.gameStartTimeSec || 0,
                createTierMarkers,
                createKillMarkers,
                createAssistMarkers,
                createDeathMarkers,
                createUnlockMarkers,
                createAbilityMarkers: createTierMarkers || createUnlockMarkers,
                insertItemClips,
                createItemMarkers,
                pauseSource,
                pauseCriteria,
                markerColors: { ...state.markerColors },
                abilities: abilitiesToSend,
                items: itemsToSend,
                kills: killsToSend,
                assists: assistsToSend,
                deaths: deathsToSend
            };

            elements.syncPremiereBtn.innerHTML = `<span class="loading-spinner"></span> ${typeof I18N !== 'undefined' ? I18N.t('syncBtnApplying') : 'Aplicando no Premiere Pro...'}`;

            if (csInterface) {
                let scriptCall = '';
                let tempFilePath = null;

                if (typeof require !== 'undefined') {
                    try {
                        const os = require('os');
                        const path = require('path');
                        const fs = require('fs');
                        tempFilePath = path.join(os.tmpdir(), `deadlock_match_${Date.now()}.json`);
                        fs.writeFileSync(tempFilePath, JSON.stringify(payload), 'utf8');
                        const safePath = tempFilePath.replace(/\\/g, '/');
                        scriptCall = `deadlockScanner.applyMatchDataFromFile(${JSON.stringify(safePath)})`;
                    } catch (eFs) {
                        console.warn('Fallback para payload inline:', eFs);
                        scriptCall = `deadlockScanner.applyMatchData(${JSON.stringify(JSON.stringify(payload))})`;
                    }
                } else {
                    scriptCall = `deadlockScanner.applyMatchData(${JSON.stringify(JSON.stringify(payload))})`;
                }

                let isHandled = false;
                const watchdogTimer = setTimeout(() => {
                    if (!isHandled) {
                        isHandled = true;
                        elements.syncPremiereBtn.disabled = false;
                        elements.syncPremiereBtn.innerHTML = `<span>${typeof I18N !== 'undefined' ? I18N.t('syncBtn') : '⚡ Aplicar na Timeline do Premiere'}</span>`;
                        showNotification('O Premiere Pro demorou para responder. Verifique se há uma sequência aberta e tente novamente.', 'error', 8000);
                    }
                }, 25000);

                csInterface.evalScript(scriptCall, (resultStr) => {
                    if (isHandled) return;
                    isHandled = true;
                    clearTimeout(watchdogTimer);

                    elements.syncPremiereBtn.disabled = false;
                    elements.syncPremiereBtn.innerHTML = `<span>${typeof I18N !== 'undefined' ? I18N.t('syncBtn') : '⚡ Aplicar na Timeline do Premiere'}</span>`;

                    try {
                        const res = JSON.parse(resultStr);
                        if (res && res.success) {
                            const targetDesc = res.destinationDescription ? ` ${res.destinationDescription}` : '';
                            const pauseSummary = (res.pausesDetectedCount > 0 && typeof I18N !== 'undefined') ?
                                I18N.t('pauseAdjustMsg', { count: res.pausesDetectedCount, sec: Math.round(res.totalPauseDurationSec) }) :
                                ((res.pausesDetectedCount > 0) ? ` ⏸️ ${res.pausesDetectedCount} pausas compensadas (+${Math.round(res.totalPauseDurationSec)}s ajustados).` : '');

                            let summary = '';
                            if (res.insertBothItemTypes && typeof I18N !== 'undefined') {
                                summary = I18N.t('syncSuccessBoth', {
                                    markers: res.markersCreated,
                                    dest: targetDesc,
                                    items: res.itemsInserted,
                                    track1: res.targetTrack,
                                    track2: res.secondaryTargetTrack,
                                    pauseMsg: pauseSummary
                                });
                            } else if (typeof I18N !== 'undefined') {
                                summary = I18N.t('syncSuccess', {
                                    markers: res.markersCreated,
                                    dest: targetDesc,
                                    items: res.itemsInserted,
                                    track: res.targetTrack,
                                    pauseMsg: pauseSummary
                                });
                            } else {
                                summary = res.insertBothItemTypes
                                    ? `Pronto! ${res.markersCreated} marcadores criados${targetDesc} e ${res.itemsInserted} itens inseridos em modo Duplo (V${res.targetTrack} e V${res.secondaryTargetTrack}).${pauseSummary}`
                                    : `Pronto! ${res.markersCreated} marcadores criados${targetDesc} e ${res.itemsInserted} itens PNG inseridos na Camada V${res.targetTrack}.${pauseSummary}`;
                            }

                            showNotification(summary, 'success', 8000);
                        } else {
                            showNotification(`Erro no Premiere Pro: ${res ? res.error : 'Falha desconhecida'}`, 'error', 7000);
                        }
                    } catch (e) {
                        console.error('Erro ao interpretar resposta do ExtendScript:', e, resultStr);
                        showNotification(`Resposta: ${resultStr}`, 'info', 6000);
                    }
                });
            } else {
                // CEP host not active (standalone browser test)
                setTimeout(() => {
                    elements.syncPremiereBtn.disabled = false;
                    elements.syncPremiereBtn.innerHTML = `<span>${typeof I18N !== 'undefined' ? I18N.t('syncBtn') : '⚡ Aplicar na Timeline do Premiere'}</span>`;
                    const pauseMsg = pauseSource !== 'disabled' ? ' (com compensação de pausas ativa)' : '';
                    showNotification(`[Modo Simulação CEP]: ${abilitiesToSend.length} habilidades, ${killsToSend.length} kills, ${deathsToSend.length} mortes e ${itemsToSend.length} itens preparados para ${markerTarget === 'clip' ? 'Vídeo Selecionado' : 'Sequência'}${pauseMsg}.`, 'info', 5000);
                }, 600);
            }
        } catch (err) {
            console.error('Erro ao executar sincronização com Premiere Pro:', err);
            if (elements.syncPremiereBtn) {
                elements.syncPremiereBtn.disabled = false;
                elements.syncPremiereBtn.innerHTML = `<span>${typeof I18N !== 'undefined' ? I18N.t('syncBtn') : '⚡ Aplicar na Timeline do Premiere'}</span>`;
            }
            showNotification(`Erro ao sincronizar: ${err.message}`, 'error', 7000);
        }
    }

    /**
     * Setup Event Listeners
     */
    function setupEventListeners() {
        // Language selector
        const langSelect = document.getElementById('lang-select');
        if (langSelect) {
            langSelect.addEventListener('change', (e) => {
                applyLanguage(e.target.value);
            });
        }

        // Search submit
        elements.searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = elements.matchInput.value.trim();
            if (id) handleSearch(id);
        });

        // Clear history button
        if (elements.clearHistoryBtn) {
            elements.clearHistoryBtn.addEventListener('click', clearSearchHistory);
        }

        // Tabs switching
        elements.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.activeTab = btn.dataset.tab;
                renderTimelineList();
            });
        });

        // Offset mode change
        if (elements.offsetModeSelect && elements.customOffsetGroup) {
            elements.offsetModeSelect.addEventListener('change', (e) => {
                elements.customOffsetGroup.style.display = e.target.value === 'custom' ? 'flex' : 'none';
            });
        }

        // Item Style change (Item Card [Novo/Antigo, PT/EN] vs Item Description vs Ambos)
        if (elements.itemStyleSelect) {
            const currentStyle = (typeof ItemsManager !== 'undefined' && typeof ItemsManager.getItemStyle === 'function') ? ItemsManager.getItemStyle() : 'card_pt_new';
            elements.itemStyleSelect.value = currentStyle;

            const updateItemStyleUI = (style) => {
                if (elements.secondaryTrackGroup) {
                    elements.secondaryTrackGroup.style.display = (style === 'both') ? 'block' : 'none';
                }
                if (elements.targetTrackLabel && typeof I18N !== 'undefined') {
                    if (style === 'both') {
                        elements.targetTrackLabel.textContent = I18N.t('targetTrackLabelIcons') || 'Camada de Vídeo (Item Cards)';
                    } else {
                        elements.targetTrackLabel.textContent = I18N.t('targetTrackLabel') || 'Camada de Vídeo (Itens)';
                    }
                }
            };

            updateItemStyleUI(currentStyle);

            elements.itemStyleSelect.addEventListener('change', (e) => {
                const newStyle = e.target.value;
                if (typeof ItemsManager !== 'undefined' && typeof ItemsManager.setItemStyle === 'function') {
                    ItemsManager.setItemStyle(newStyle);
                }
                updateItemStyleUI(newStyle);
                initLocalItems();
                // If a hero is already selected, re-render timeline with new item icons/descriptions
                if (state.currentMatch && state.selectedPlayerIndex !== null) {
                    selectHero(state.selectedPlayerIndex);
                }
                let msg = 'Estilo alterado para ' + (elements.itemStyleSelect.options[elements.itemStyleSelect.selectedIndex]?.text || newStyle);
                showNotification(msg, 'info', 3000);
            });
        }

        // Game Start Time Controls (Filtro e sincronia a partir de X minutos do jogo)
        if (elements.gameStartTimeInput) {
            const handleStartTimeChange = (applyFormatting = true) => {
                const rawVal = elements.gameStartTimeInput.value;
                const sec = parseTimeToSeconds(rawVal);
                state.gameStartTimeSec = sec;

                try {
                    localStorage.setItem(GAME_START_TIME_KEY, rawVal);
                } catch (e) { }

                if (applyFormatting) {
                    elements.gameStartTimeInput.value = formatSecondsToTime(sec);
                }

                updateGameStartTimeDisplay();

                // Re-filtrar timeline se um herói já estiver selecionado
                if (state.currentMatch && state.selectedPlayerIndex !== null) {
                    selectHero(state.selectedPlayerIndex);
                }
            };

            elements.gameStartTimeInput.addEventListener('change', () => handleStartTimeChange(true));
            elements.gameStartTimeInput.addEventListener('blur', () => handleStartTimeChange(true));
            elements.gameStartTimeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    elements.gameStartTimeInput.blur();
                }
            });
        }

        if (elements.resetStartTimeBtn) {
            elements.resetStartTimeBtn.addEventListener('click', () => {
                state.gameStartTimeSec = 0;
                if (elements.gameStartTimeInput) elements.gameStartTimeInput.value = '00:00';
                try {
                    localStorage.setItem(GAME_START_TIME_KEY, '00:00');
                } catch (e) { }
                updateGameStartTimeDisplay();
                if (state.currentMatch && state.selectedPlayerIndex !== null) {
                    selectHero(state.selectedPlayerIndex);
                }
            });
        }

        // Tier markers toggle
        if (elements.checkTierMarkers) {
            elements.checkTierMarkers.addEventListener('change', (e) => {
                state.timelineData.forEach(d => {
                    if (d.type === 'ability' && !d.isUnlock) d.enabled = e.target.checked;
                });
                renderTimelineList();
            });
        }

        // Kill markers toggle
        if (elements.checkKillMarkers) {
            elements.checkKillMarkers.addEventListener('change', (e) => {
                state.timelineData.forEach(d => {
                    if (d.type === 'kill') d.enabled = e.target.checked;
                });
                renderTimelineList();
            });
        }

        // Assist markers toggle
        if (elements.checkAssistMarkers) {
            elements.checkAssistMarkers.addEventListener('change', (e) => {
                state.timelineData.forEach(d => {
                    if (d.type === 'assist') d.enabled = e.target.checked;
                });
                renderTimelineList();
            });
        }

        // Death markers toggle
        if (elements.checkDeathMarkers) {
            elements.checkDeathMarkers.addEventListener('change', (e) => {
                state.timelineData.forEach(d => {
                    if (d.type === 'death') d.enabled = e.target.checked;
                });
                renderTimelineList();
            });
        }

        // Unlock markers toggle
        if (elements.checkUnlockMarkers) {
            elements.checkUnlockMarkers.addEventListener('change', (e) => {
                state.timelineData.forEach(d => {
                    if (d.type === 'ability' && d.isUnlock) d.enabled = e.target.checked;
                });
                renderTimelineList();
            });
        }

        // Insert items toggle
        if (elements.checkInsertItems) {
            elements.checkInsertItems.addEventListener('change', (e) => {
                state.timelineData.forEach(d => {
                    if (d.type === 'item') d.enabled = e.target.checked;
                });
                renderTimelineList();
            });
        }

        // Toggle accordion for Timeline Events List (recolhido por padrão)
        const toggleTimelineHeader = document.getElementById('toggle-timeline-header');
        const timelineEventsContainer = document.getElementById('timeline-events-container');
        const timelineToggleIcon = document.getElementById('timeline-toggle-icon');

        if (toggleTimelineHeader && !toggleTimelineHeader._bound) {
            toggleTimelineHeader._bound = true;
            toggleTimelineHeader.addEventListener('click', () => {
                const isCollapsed = !timelineEventsContainer || timelineEventsContainer.style.display === 'none';
                if (timelineEventsContainer) {
                    timelineEventsContainer.style.display = isCollapsed ? 'flex' : 'none';
                }
                if (timelineToggleIcon) {
                    timelineToggleIcon.textContent = isCollapsed ? '▼' : '▶';
                }
            });
        }

        // Pro & Assets Header Action Modals
        if (elements.headerProBtn && !elements.headerProBtn._bound) {
            elements.headerProBtn._bound = true;
            elements.headerProBtn.addEventListener('click', () => {
                if (elements.licenseModalOverlay) {
                    elements.licenseModalOverlay.dataset.userOpened = 'true';
                    elements.licenseModalOverlay.style.display = 'flex';
                }
            });
        }
        if (elements.btnCloseLicenseModal && !elements.btnCloseLicenseModal._bound) {
            elements.btnCloseLicenseModal._bound = true;
            elements.btnCloseLicenseModal.addEventListener('click', () => {
                const isPro = typeof LicenseManager !== 'undefined' && LicenseManager.isPro();
                if (isPro && elements.licenseModalOverlay) {
                    elements.licenseModalOverlay.dataset.userOpened = 'false';
                    elements.licenseModalOverlay.style.display = 'none';
                }
            });
        }
        if (elements.btnDeactivateLicense && !elements.btnDeactivateLicense._bound) {
            elements.btnDeactivateLicense._bound = true;
            elements.btnDeactivateLicense.addEventListener('click', async () => {
                if (typeof LicenseManager !== 'undefined') {
                    await LicenseManager.deactivate();
                    updateLicenseUI(false);
                    enforcePaywallState();
                    showNotification('Licença Pro desativada deste computador.', 'info');
                }
            });
        }

        // Local Assets Directory Setup Modal
        const openAssetsModal = () => {
            if (elements.assetsModalOverlay) {
                const mgr = (typeof ItemsManager !== 'undefined') ? ItemsManager : null;
                if (mgr && elements.assetsDirInput) {
                    elements.assetsDirInput.value = mgr.getCustomAssetsDir() || '';
                }
                elements.assetsModalOverlay.style.display = 'flex';
            }
        };
        if (elements.headerFolderBtn && !elements.headerFolderBtn._bound) {
            elements.headerFolderBtn._bound = true;
            elements.headerFolderBtn.addEventListener('click', openAssetsModal);
        }
        if (elements.btnOpenAssetsModal && !elements.btnOpenAssetsModal._bound) {
            elements.btnOpenAssetsModal._bound = true;
            elements.btnOpenAssetsModal.addEventListener('click', openAssetsModal);
        }
        if (elements.btnCloseAssetsModal && !elements.btnCloseAssetsModal._bound) {
            elements.btnCloseAssetsModal._bound = true;
            elements.btnCloseAssetsModal.addEventListener('click', () => {
                if (elements.assetsModalOverlay) {
                    elements.assetsModalOverlay.style.display = 'none';
                }
            });
        }
        // Native folder picker button
        const handleFolderSelection = (selectedPath) => {
            if (!selectedPath) return;
            const mgr = (typeof ItemsManager !== 'undefined') ? ItemsManager : null;
            if (elements.assetsDirInput) {
                elements.assetsDirInput.value = selectedPath;
            }
            if (mgr) {
                mgr.setCustomAssetsDir(selectedPath);
                initLocalItems();
                const status = mgr.checkLocalAssetsStatus();
                const count = status.itemCount || status.cachedCount || 0;
                if (elements.assetsDirFeedback) {
                    elements.assetsDirFeedback.style.display = 'block';
                    if (status.hasAssets) {
                        elements.assetsDirFeedback.style.color = '#4ade80';
                        elements.assetsDirFeedback.textContent = `✅ Pasta configurada! ${count} itens encontrados.`;
                    } else {
                        elements.assetsDirFeedback.style.color = '#fbbf24';
                        elements.assetsDirFeedback.textContent = '⚠️ Nenhum item PNG reconhecido nesta pasta. Certifique-se de selecionar a pasta Deadlock_Assets.';
                    }
                }
                if (elements.assetsDetectedCount) {
                    elements.assetsDetectedCount.textContent = `Itens encontrados: ${count}`;
                }
                showNotification(`Pasta selecionada! (${count} itens detectados)`, status.hasAssets ? 'success' : 'info');
            }
        };

        if (elements.btnBrowseAssetsDir && !elements.btnBrowseAssetsDir._bound) {
            elements.btnBrowseAssetsDir._bound = true;
            elements.btnBrowseAssetsDir.addEventListener('click', () => {
                if (csInterface) {
                    csInterface.evalScript('deadlockScanner.selectFolderDialog("Selecione a pasta Deadlock_Assets extraída no seu computador:")', (resStr) => {
                        try {
                            const res = JSON.parse(resStr);
                            if (res && res.success && res.path) {
                                handleFolderSelection(res.path);
                            }
                        } catch (e) {
                            console.warn('Erro ao processar seleção de pasta:', e);
                        }
                    });
                } else {
                    // Fallback for standalone browser testing: prompt input
                    const current = (elements.assetsDirInput ? elements.assetsDirInput.value : '') || 'C:\\Users\\Administrador\\Downloads\\Vibe coding\\Dead_match_scanner\\assets\\Deadlock_Assets';
                    const userTyped = prompt('Selecione / Digite o caminho da pasta Deadlock_Assets:', current);
                    if (userTyped && userTyped.trim()) {
                        handleFolderSelection(userTyped.trim());
                    }
                }
            });
        }

        if (elements.btnSaveAssetsDir && !elements.btnSaveAssetsDir._bound) {
            elements.btnSaveAssetsDir._bound = true;
            elements.btnSaveAssetsDir.addEventListener('click', () => {
                const newDir = (elements.assetsDirInput ? elements.assetsDirInput.value : '').trim();
                handleFolderSelection(newDir || null);
            });
        }
        if (elements.btnResetDefaultAssets && !elements.btnResetDefaultAssets._bound) {
            elements.btnResetDefaultAssets._bound = true;
            elements.btnResetDefaultAssets.addEventListener('click', () => {
                const mgr = (typeof ItemsManager !== 'undefined') ? ItemsManager : null;
                if (mgr) {
                    mgr.setCustomAssetsDir(null);
                    if (elements.assetsDirInput) elements.assetsDirInput.value = '';
                    initLocalItems();
                    const status = mgr.checkLocalAssetsStatus();
                    if (elements.assetsDirFeedback) {
                        elements.assetsDirFeedback.style.display = 'block';
                        elements.assetsDirFeedback.style.color = '#94a3b8';
                        elements.assetsDirFeedback.textContent = `Restaurado para padrão da extensão (${status.itemCount} itens).`;
                    }
                    showNotification('Caminho padrão restaurado', 'info');
                }
            });
        }

        // Handle external link clicks (Google Drive download, Checkout, etc.) in system browser
        const btnDownloadDrive = document.getElementById('btn-download-assets-drive');
        if (btnDownloadDrive && !btnDownloadDrive._bound) {
            btnDownloadDrive._bound = true;
            btnDownloadDrive.addEventListener('click', (e) => {
                e.preventDefault();
                const url = 'https://drive.google.com/drive/folders/1GRmIoyQYiQSb__f9Uwny2vs3aARCBwLd?usp=sharing';
                openExternalUrl(url);
            });
        }

        const btnBuyLicense = document.getElementById('btn-buy-license-pix');
        if (btnBuyLicense && !btnBuyLicense._bound) {
            btnBuyLicense._bound = true;
            btnBuyLicense.addEventListener('click', (e) => {
                e.preventDefault();
                openExternalUrl('https://www.lucentry.shop/');
            });
        }

        // Sync button
        elements.syncPremiereBtn.addEventListener('click', syncWithPremiere);
    }

    // =========================================================================
    // License Enforcement & Activation Flow (Free vs Pro Tier)
    // =========================================================================
    function enforcePaywallState() {
        const isPro = typeof LicenseManager !== 'undefined' && LicenseManager.isPro();
        const overlay = elements.licenseModalOverlay || document.getElementById('license-modal-overlay');
        const appContainer = document.getElementById('app');
        const closeBtn = elements.btnCloseLicenseModal || document.getElementById('btn-close-license-modal');

        if (isPro) {
            if (overlay) {
                overlay.classList.remove('mandatory-lock');
                if (overlay.dataset.userOpened !== 'true') {
                    overlay.style.display = 'none';
                }
            }
            if (closeBtn) {
                closeBtn.style.display = 'block';
            }
            if (appContainer) {
                appContainer.classList.remove('app-locked');
            }
        } else {
            if (overlay) {
                overlay.style.display = 'flex';
                overlay.classList.add('mandatory-lock');
            }
            if (closeBtn) {
                closeBtn.style.display = 'none';
            }
            if (appContainer) {
                appContainer.classList.add('app-locked');
            }
        }
    }

    function updateLicenseUI(isPro, details) {
        if (elements.headerProBtn) {
            if (isPro) {
                elements.headerProBtn.classList.add('active-pro');
                if (elements.headerProIcon) elements.headerProIcon.textContent = '⚡';
                if (elements.headerProText) elements.headerProText.textContent = 'PRO Ativo';
            } else {
                elements.headerProBtn.classList.remove('active-pro');
                if (elements.headerProIcon) elements.headerProIcon.textContent = '🔑';
                if (elements.headerProText) elements.headerProText.textContent = 'Ativar Pro';
            }
        }
        if (elements.licenseProActiveBox) {
            elements.licenseProActiveBox.style.display = isPro ? 'block' : 'none';
        }
        if (elements.licenseFormContainer) {
            elements.licenseFormContainer.style.display = isPro ? 'none' : 'block';
        }
        if (elements.proDetailsText && isPro) {
            let info = '⚡ Sua licença Pro está ativa com sincronização automática em nuvem de novos itens a cada patch.';
            if (details && details.expiresAt) {
                const expDate = new Date(details.expiresAt);
                info += ` Válida até: ${expDate.toLocaleDateString('pt-BR')}.`;
            }
            elements.proDetailsText.textContent = info;
        }
    }

    async function initLicenseCheck() {
        return;
    }

    async function __unusedInitLicenseCheck() {
        if (typeof LicenseManager === 'undefined') return;

        const hwidEl = document.getElementById('license-hwid-display');
        if (hwidEl) {
            const hwid = LicenseManager.getMachineHardwareId();
            hwidEl.textContent = 'HWID: ' + (hwid.length > 16 ? hwid.substring(0, 16) + '...' : hwid);
        }

        const overlay = document.getElementById('license-modal-overlay');
        const form = document.getElementById('license-activation-form');
        const keyInput = document.getElementById('license-key-input');
        const btn = document.getElementById('btn-activate-license');
        const errBanner = document.getElementById('license-error-banner');

        // Check Pro status without blocking free tier users
        try {
            const status = await LicenseManager.checkLicenseStatus();
            const isPro = Boolean(status && status.isLicensed && status.isPro);
            updateLicenseUI(isPro, status);
        } catch (e) {
            updateLicenseUI(false);
        }

        // Enforce paywall on startup: strictly lock if not Pro
        enforcePaywallState();

        // Anti-tamper Observer: detect if unauthorized user tries to remove or hide overlay
        try {
            const antiTamperObserver = new MutationObserver(() => {
                const isPro = typeof LicenseManager !== 'undefined' && LicenseManager.isPro();
                if (!isPro) {
                    const o = document.getElementById('license-modal-overlay');
                    const a = document.getElementById('app');
                    if (!o || o.style.display === 'none' || !o.classList.contains('mandatory-lock')) {
                        enforcePaywallState();
                    }
                    if (a && !a.classList.contains('app-locked')) {
                        a.classList.add('app-locked');
                    }
                }
            });
            antiTamperObserver.observe(document.body, { attributes: true, childList: true, subtree: true });
        } catch (e) {}


        let rateLimitTimerInterval = null;

        function applyRateLimitCountdown(secondsLeft) {
            if (rateLimitTimerInterval) {
                clearInterval(rateLimitTimerInterval);
                rateLimitTimerInterval = null;
            }

            let sec = Math.max(1, Math.ceil(secondsLeft));

            if (keyInput) {
                keyInput.disabled = true;
                keyInput.style.cursor = 'not-allowed';
                keyInput.style.opacity = '0.5';
                keyInput.style.borderColor = '#ef4444';
            }
            if (btn) {
                btn.disabled = true;
                btn.style.cursor = 'not-allowed';
                btn.style.opacity = '0.7';
            }

            function updateCountdownUI() {
                if (sec <= 0) {
                    clearInterval(rateLimitTimerInterval);
                    rateLimitTimerInterval = null;

                    if (keyInput) {
                        keyInput.disabled = false;
                        keyInput.style.cursor = 'text';
                        keyInput.style.opacity = '1';
                        keyInput.style.borderColor = '';
                        keyInput.focus();
                    }
                    if (btn) {
                        btn.disabled = false;
                        btn.style.cursor = 'pointer';
                        btn.style.opacity = '1';
                        btn.innerHTML = '<span>⚡ Ativar Licença Pro</span>';
                    }
                    if (errBanner) {
                        errBanner.style.display = 'block';
                        errBanner.style.background = 'rgba(234, 179, 8, 0.15)';
                        errBanner.style.borderColor = 'rgba(234, 179, 8, 0.4)';
                        errBanner.style.color = '#fde047';
                        errBanner.innerHTML = '⚠️ <strong>Cooldown finalizado.</strong> Digite a chave com atenção.';
                    }
                    return;
                }

                if (btn) {
                    btn.innerHTML = `<span>⏳ Bloqueado (${sec}s)</span>`;
                }
                if (errBanner) {
                    errBanner.style.display = 'block';
                    errBanner.style.background = 'rgba(239, 68, 68, 0.18)';
                    errBanner.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                    errBanner.style.color = '#fca5a5';
                    errBanner.innerHTML = `⛔ <strong>Proteção Anti-Bruteforce Ativa</strong><br>Muitas tentativas incorretas. Aguarde <strong>${sec}s</strong> para tentar novamente.`;
                }

                sec--;
            }

            updateCountdownUI();
            rateLimitTimerInterval = setInterval(updateCountdownUI, 1000);
        }

        // Verifica imediatamente se já há bloqueio cumulativo persistido ao abrir o plugin
        const initialLock = LicenseManager.isRateLimited();
        if (initialLock && initialLock.blocked) {
            applyRateLimitCountdown(initialLock.remainingSec);
        }

        if (keyInput && !keyInput._bound) {
            keyInput._bound = true;
            keyInput.addEventListener('input', () => {
                const curLock = LicenseManager.isRateLimited();
                if (!curLock.blocked) {
                    if (errBanner) errBanner.style.display = 'none';
                    keyInput.style.borderColor = '';
                    keyInput.style.boxShadow = '';
                }
            });
        }

        if (form && !form._bound) {
            form._bound = true;
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                // Checa trava antes de tentar
                const lockCheck = LicenseManager.isRateLimited();
                if (lockCheck.blocked) {
                    applyRateLimitCountdown(lockCheck.remainingSec);
                    return;
                }

                const key = (keyInput ? keyInput.value : '').trim().toUpperCase();
                if (!key) {
                    if (errBanner) {
                        errBanner.textContent = '❌ Por favor, digite uma chave de licença.';
                        errBanner.style.display = 'block';
                    }
                    if (keyInput) keyInput.style.borderColor = '#ef4444';
                    return;
                }

                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = '<span>Validando Chave...</span>';
                }
                if (errBanner) errBanner.style.display = 'none';

                try {
                    const res = await LicenseManager.activate(key);
                    showNotification('🎉 Licença Pro ativada com sucesso! Sincronização em nuvem liberada.', 'success', 5000);
                    updateLicenseUI(true, res);
                    enforcePaywallState();
                } catch (err) {
                    if (err.code === 'RATE_LIMITED' && err.remainingSec > 0) {
                        applyRateLimitCountdown(err.remainingSec);
                        showNotification(`⛔ Computador bloqueado por tentativas excessivas (${err.remainingSec}s).`, 'error', 6000);
                    } else {
                        if (errBanner) {
                            let msg = '❌ ' + (err.message || 'Chave de licença inválida ou expirada.');
                            if (typeof err.attemptsLeft === 'number' && err.attemptsLeft > 0) {
                                msg += `<br><span style="font-size: 10px; color: #fde047;">⚠️ Tentativas restantes antes do bloqueio: <strong>${err.attemptsLeft}</strong></span>`;
                            }
                            errBanner.innerHTML = msg;
                            errBanner.style.display = 'block';
                        }
                        if (keyInput) {
                            keyInput.style.borderColor = '#ef4444';
                            keyInput.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.4)';
                        }
                        showNotification(err.message || 'Chave de licença inválida.', 'error');
                    }
                } finally {
                    const finalLock = LicenseManager.isRateLimited();
                    if (!finalLock.blocked && btn) {
                        btn.disabled = false;
                        btn.innerHTML = '<span>⚡ Ativar Licença Pro</span>';
                    }
                }
            });
        }
    }

    // =========================================================================
    // External Browser Link Helper (CEP Compatible)
    // =========================================================================
    function openExternalUrl(url) {
        if (!url) return;

        // 1. Try Node.js child_process (very reliable on Windows CEP with Node enabled)
        try {
            if (typeof require === 'function') {
                const { exec } = require('child_process');
                if (exec) {
                    exec(`start "" "${url}"`);
                    return;
                }
            }
        } catch (eNode) {}

        // 2. Try CEP Native util
        try {
            if (typeof window !== 'undefined' && window.cep && window.cep.util && typeof window.cep.util.openURLInDefaultBrowser === 'function') {
                window.cep.util.openURLInDefaultBrowser(url);
                return;
            }
            if (typeof cep !== 'undefined' && cep.util && typeof cep.util.openURLInDefaultBrowser === 'function') {
                cep.util.openURLInDefaultBrowser(url);
                return;
            }
        } catch (eCep) {}

        // 3. Try CSInterface
        try {
            if (csInterface && typeof csInterface.openURLInDefaultBrowser === 'function') {
                csInterface.openURLInDefaultBrowser(url);
                return;
            }
        } catch (eCs) {}

        // 4. Try Electron shell
        try {
            if (typeof require === 'function') {
                const { shell } = require('electron');
                if (shell && typeof shell.openExternal === 'function') {
                    shell.openExternal(url);
                    return;
                }
            }
        } catch (eEl) {}

        // 5. Standard Web fallback
        try {
            window.open(url, '_blank');
        } catch (eWin) {}
    }
    window.openExternalUrl = openExternalUrl;

    // =========================================================================
    // Auto-Updater Silencioso & Automático no Premiere Pro (CEP)
    // =========================================================================
    async function checkForUpdates() {
        const CURRENT_VERSION = '1.1.0';
        const VERSION_URL = 'https://pub-3d2e50a01e2e4fd5af92763dd84d26a6.r2.dev/version.json';

        function isNewerVersion(remote, local) {
            if (!remote || !local) return false;
            const rParts = remote.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
            const lParts = local.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
            const maxLen = Math.max(rParts.length, lParts.length);
            for (let i = 0; i < maxLen; i++) {
                const r = rParts[i] || 0;
                const l = lParts[i] || 0;
                if (r > l) return true;
                if (r < l) return false;
            }
            return false;
        }

        try {
            const res = await fetch(VERSION_URL, { cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();

            if (data && data.version && isNewerVersion(data.version, CURRENT_VERSION)) {
                const downloadTarget = data.downloadUrl || data.versionDownloadUrl || 'https://pub-3d2e50a01e2e4fd5af92763dd84d26a6.r2.dev/Deadlock_Toolkit_Latest.zip';
                
                const updateBar = document.getElementById('update-notification-bar');
                const updateTxt = document.getElementById('update-msg-text');
                const updateBtn = document.getElementById('btn-download-update');
                if (updateBar && updateTxt) {
                    updateBar.style.display = 'flex';
                    updateTxt.innerHTML = `🚀 <b>Atualizando Deadlock Toolkit para v${data.version}...</b> (aguarde alguns segundos)`;
                    if (updateBtn) updateBtn.style.display = 'none';
                }

                // Executar auto-update nativo se Node.js estiver disponível no CEP
                const req = (typeof window.require !== 'undefined') ? window.require : (typeof require !== 'undefined' ? require : null);
                if (req) {
                    const fs = req('fs');
                    const path = req('path');
                    const os = req('os');
                    const { exec } = req('child_process');

                    // Determinar destino da extensão instalada
                    let targetDir = path.join(process.env.APPDATA || (process.env.USERPROFILE + '\\AppData\\Roaming'), 'Adobe', 'CEP', 'extensions', 'com.deadlock.toolkit');
                    try {
                        if (typeof CSInterface !== 'undefined') {
                            const cs = new CSInterface();
                            const extP = cs.getSystemPath(SystemPath.EXTENSION);
                            if (extP && fs.existsSync(extP)) targetDir = extP;
                        }
                    } catch (ePath) {}

                    const tempZip = path.join(os.tmpdir(), `deadlock_update_${Date.now()}.zip`);
                    const tempExtract = path.join(os.tmpdir(), `deadlock_ext_${Date.now()}`);

                    // 1. Baixar pacote silenciosamente
                    const zipRes = await fetch(downloadTarget);
                    if (!zipRes.ok) throw new Error('Falha no download da versão');
                    const zipBuffer = Buffer.from(await zipRes.arrayBuffer());
                    fs.writeFileSync(tempZip, zipBuffer);

                    // 2. Extrair
                    fs.mkdirSync(tempExtract, { recursive: true });
                    const extractCmd = `tar -xf "${tempZip}" -C "${tempExtract}"`;
                    exec(extractCmd, (err) => {
                        try {
                            if (err) {
                                // Fallback powershell
                                const psCmd = `powershell -NoProfile -Command "Expand-Archive -Path '${tempZip}' -DestinationPath '${tempExtract}' -Force"`;
                                exec(psCmd, (errPs) => {
                                    if (errPs) return;
                                    applyExtractedFiles(tempExtract, targetDir, data.version);
                                });
                            } else {
                                applyExtractedFiles(tempExtract, targetDir, data.version);
                            }
                        } catch (eExtract) {}
                    });

                    function applyExtractedFiles(sourceDir, destDir, newVer) {
                        try {
                            let srcPlugin = path.join(sourceDir, 'com.deadlock.toolkit');
                            if (!fs.existsSync(srcPlugin)) {
                                srcPlugin = sourceDir;
                            }
                            const items = ['CSXS', 'host', 'js', 'css', 'assets', 'icons', 'index.html'];
                            for (const item of items) {
                                const s = path.join(srcPlugin, item);
                                const d = path.join(destDir, item);
                                if (fs.existsSync(s)) {
                                    if (fs.statSync(s).isDirectory()) {
                                        fs.cpSync(s, d, { recursive: true, force: true });
                                    } else {
                                        fs.copyFileSync(s, d);
                                    }
                                }
                            }
                            if (updateTxt) {
                                updateTxt.innerHTML = `✅ <b>Deadlock Toolkit atualizado para v${newVer}!</b> Recarregando...`;
                            }
                            setTimeout(() => {
                                window.location.reload(true);
                            }, 1500);
                        } catch (eApply) {
                            console.error('Erro ao aplicar atualização:', eApply);
                        }
                    }
                }
            } else {
                const updateBar = document.getElementById('update-notification-bar');
                if (updateBar) updateBar.style.display = 'none';
            }
        } catch (e) {
            // Silencioso para nunca travar a inicialização do Premiere
        }
    }

    // Run on startup
    const initialLang = (typeof I18N !== 'undefined') ? I18N.init() : 'pt-BR';
    initFontScale();
    initSettingsDrawer();
    initStageAccordions();
    initLocalItems();
    initMarkerColors();
    initPauseSettings();
    initGameStartTimeSettings();
    renderSearchHistory();
    setupEventListeners();
    applyLanguage(initialLang);
    initLicenseCheck();
    checkForUpdates();

})();



