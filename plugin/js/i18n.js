/**
 * i18n.js - Multilingual Translation System for Deadlock Match Scanner
 * Supports: English (en), Portuguese (pt-BR), Spanish (es), Russian (ru)
 */

const I18N = {
    currentLang: 'pt-BR',
    storageKey: 'deadlock_scanner_lang',

    translations: {
        'pt-BR': {
            langName: 'Português (BR)',
            flag: '🇧🇷',
            searchPlaceholder: 'Digite ou cole o ID da Partida...',
            searchBtn: 'Buscar',
            searchingBtn: 'Buscando...',
            recentMatches: '🕒 Partidas Recentes:',
            clearHistory: 'Limpar ✕',
            historyCleared: 'Histórico limpo.',
            matchSummaryTitle: 'Resumo da Partida',
            matchLabel: 'Partida',
            durationLabel: 'Duração',
            resultLabel: 'Resultado',
            winnerTeamSapphire: 'Vitória: Sapphire Flame',
            winnerTeamAmber: 'Vitória: Amber Hand',
            teamSapphire: 'Sapphire Flame (Time 1)',
            teamAmber: 'Amber Hand (Time 2)',
            selectHeroTip: 'Clique em um herói para carregar a timeline',
            totalActions: 'Total Ações',
            souls: 'Souls',
            kda: 'K / D / A',
            damage: 'Dano',
            level: 'Nível',
            
            // Tabs
            tabAll: 'Todas',
            tabAbilities: '⚡ Habilidades',
            tabItems: '🛒 Itens',
            tabCombat: '💀 Kills & Mortes',

            // Pause Sync
            pauseCardTitle: '⏸️ Compensação de Pausas no Jogo',
            pauseBadge: 'Smart Sync',
            pauseStatusActive: 'Ativo',
            pauseStatusDisabled: 'Desativado',
            pauseSourceLabel: 'Origem dos Marcadores de Pausa',
            pauseSourceSeq: '⏱️ Linha de Tempo (Sequência)',
            pauseSourceClip: '🎬 Vídeo Selecionado (Clipe)',
            pauseSourceBoth: '🔄 Ambos (Timeline e Vídeo)',
            pauseSourceDisabled: '🚫 Desativado (Sem compensação)',
            pauseCriteriaLabel: 'Reconhecer como Pausa',
            pauseCritDuration: 'Marcadores com Duração (Início ➔ Fim)',
            pauseCritKeyword: 'Marcador com Nome "Pausa" / "Pause"',
            pauseCritAny: 'Qualquer Marcador (Com ou Sem Duração)',
            pauseTip: '💡 <strong>Como funciona a pausa:</strong> No Premiere Pro, crie um marcador com duração (arrastando as pontas do marker) cobrindo o período da pausa na timeline ou no clipe de vídeo. O plugin ignora o tempo de pausa e ajusta a sincronia dos itens, habilidades e abates automaticamente!',

            // Settings Card
            settingsTitle: 'Configurações Gerais',
            fontSizeLabel: 'Tamanho das Fontes',
            fontSizeReset: '100% (Padrão)',
            licenseProLabel: 'Licença Pro',
            assetsFolderLabel: 'Pasta de Assets',
            languageLabel: 'Idioma da Interface',
            pluginVersionLabel: 'Versão do Plugin',

            // Custom Colors
            colorsCardTitle: '🎨 Cores dos Marcadores',
            colorsBadge: 'Personalizável',
            resetDefault: 'Restaurar Padrão',
            colorT0: '⚡ Desbloqueio (T0)',
            colorT1: '⚡ Tier 1 (T1)',
            colorT2: '⚡ Tier 2 (T2)',
            colorT3: '⚡ Tier 3 (T3)',
            colorKill: '💀 Abates (Kills)',
            colorAssist: '🤝 Assistências (Assists)',
            colorDeath: '☠️ Mortes (Deaths)',
            colorItem: '🛒 Itens Comprados',

            // Color Names
            colorGreen: 'Verde',
            colorRed: 'Vermelho',
            colorPurple: 'Roxo',
            colorOrange: 'Laranja',
            colorYellow: 'Amarelo',
            colorWhite: 'Branco',
            colorBlue: 'Azul',
            colorCyan: 'Ciano',

            // Premiere Settings
            premiereSettingsTitle: 'Configurações no Premiere Pro',
            markerTargetLabel: 'Destino dos Marcadores',
            targetClip: '🎬 No Vídeo Selecionado (Clipe)',
            targetBoth: '🎬 No Vídeo + ⏱️ Linha de Tempo (Ambos)',
            targetSequence: '⏱️ Apenas na Linha de Tempo (Sequência)',
            targetTrackLabel: 'Camada de Vídeo (Itens)',
            targetTrackLabelIcons: 'Camada de Vídeo (Item Cards)',
            secondaryTrackLabel: 'Camada do 2º Item (Item Description)',
            itemStyleLabel: 'Estilo Visual dos Itens',
            itemStyleCardPtNew: '🃏 Item Card (Atual) - PT-BR',
            itemStyleCardEnNew: '🃏 Item Card (Atual) - EN',
            itemStyleCardPtOld: '🃏 Item Card (Antigo) - PT-BR',
            itemStyleCardEnOld: '🃏 Item Card (Antigo) - EN',
            itemStyleDescEn: '📜 Item Description - EN',
            itemStyleBoth: '✨ Inserir Ambos (Item Card + Item Description)',
            offsetModeLabel: 'Ponto de Início da Partida',
            offsetPlayhead: '📍 Posição Atual da Agulha (Playhead) (Recomendado)',
            offsetClipStart: '🎬 Início do Vídeo Selecionado',
            offsetZero: '⏱️ Início da Timeline (00:00:00)',
            pngDurationLabel: 'Duração do PNG (s)',
            gameStartTimeLabel: 'Coletar Dados a Partir de (Jogo)',
            gameStartTimeHint: 'Ignora eventos anteriores e alinha com o corte do vídeo (ex: 00:10).',
            gameStartTimeIgnoring: 'Ignorando eventos antes de {time}',
            gameStartTimeFromStart: 'Coletando dados desde o início (00:00)',

            // Checkboxes
            checkTier: '⚡ Criar marcadores para <strong>Upgrades de Tier (T1, T2, T3)</strong>',
            checkKill: '💀 Criar marcadores para <strong>Kills / Abates</strong>',
            checkAssist: '🤝 Criar marcadores para <strong>Assistências / Fights</strong>',
            checkDeath: '☠️ Criar marcadores para <strong>Mortes</strong>',
            checkInsertItems: '🛒 Inserir PNGs dos <strong>Itens Comprados</strong> na camada',
            checkUnlock: '🟢 Criar marcadores para <strong>Desbloqueio Inicial (T0)</strong>',
            checkItemMarkers: '🏷️ Criar marcadores para compras de itens também',
            premiereTip: '💡 <strong>Dica:</strong> Marcadores de clipe aparecem diretamente na barra do vídeo na timeline e no Source Monitor. Certifique-se de que a faixa V1 tenha altura suficiente para visualizá-los.',

            // Action Button & Sync
            syncBtn: '⚡ Aplicar na Timeline do Premiere',
            syncBtnDownloading: 'Baixando PNGs em nuvem...',
            syncBtnApplying: 'Aplicando no Premiere Pro...',
            syncSuccess: 'Pronto! {markers} marcadores criados{dest} e {items} itens PNG inseridos na Camada V{track}.{pauseMsg}',
            pauseAdjustMsg: ' ⏸️ {count} pausas compensadas (+{sec}s ajustados).',
            r2Synced: '✅ Catálogo de itens em nuvem está 100% atualizado.',
            r2Updated: '🔄 {count} itens atualizados em nuvem!',
            r2Checking: 'Sincronizando em nuvem...',
            colorsResetNotif: 'Cores dos marcadores restauradas para o padrão!',
            selectMatchFirst: 'Selecione uma partida e um herói primeiro.',
            itemLabel: 'Item',
            upgradeLabel: 'Upgrade',
            unlockLabel: 'Desbloqueio',
            enemyLabel: 'Inimigo',
            allyLabel: 'Aliado',
            tierUnlock: 'Desbloqueio Inicial',
            tier1: 'Tier 1 (+1 Pt)',
            tier2: 'Tier 2 (+2 Pts)',
            tier3: 'Tier 3 (+5 Pts - Max)',
            markerKillName: '💀 Kill: {victim}',
            markerKillComment: 'Abateu {victim} aos {time}',
            markerAssistName: '🤝 Assist: {victim}',
            markerAssistComment: 'Assistência em {victim} (abate por {killer}) aos {time}',
            markerDeathName: '☠️ Morte: {killer}',
            markerDeathComment: 'Morto por {killer} aos {time}',
            markerAbilityName: '⚡ {name} ({shortTier})',
            markerAbilityComment: 'Habilidade: {name}\nNível: {tier}\nTempo de Partida: {time}',
            markerItemName: '🛒 {name} ({slotType})',
            markerItemComment: 'Item Comprado: {name}\nCusto: {cost} Souls\nTempo de Partida: {time}',

            // License Activation Modal
            licenseModalTitle: '🔐 Ativação de Licença',
            licenseModalSubtitle: 'Desbloqueie o Deadlock Toolkit no seu Premiere Pro',
            licenseModalDesc: 'Insira sua chave de licença para ativar o plugin neste computador.',
            licenseKeyPlaceholder: 'Ex: DEAD-XXXX-XXXX-XXXX',
            activateBtn: '⚡ Ativar Licença',
            activatingBtn: 'Validando Chave...',
            buyTitle: 'Ainda não tem uma chave de licença?',
            buyPixBtn: '💠 Assinar Plano Pro (R$ 15/mês)',
            buyStripeBtn: '💳 Cartão / Apple Pay ($15/mo)',
            licenseActiveBadge: 'Licença Ativa',
            licenseSuccessMsg: '✅ Licença ativada com sucesso neste computador!',
            licenseHwidMismatch: 'Esta chave já está ativada em outro computador.',
            deactivateBtn: 'Desativar Licença deste PC'
        },

        'en': {
            langName: 'English (US)',
            flag: '🇺🇸',
            searchPlaceholder: 'Enter or paste Match ID...',
            searchBtn: 'Search',
            searchingBtn: 'Searching...',
            recentMatches: '🕒 Recent Matches:',
            clearHistory: 'Clear ✕',
            historyCleared: 'History cleared.',
            matchSummaryTitle: 'Match Summary',
            matchLabel: 'Match',
            durationLabel: 'Duration',
            resultLabel: 'Result',
            winnerTeamSapphire: 'Victory: Sapphire Flame',
            winnerTeamAmber: 'Victory: Amber Hand',
            teamSapphire: 'Sapphire Flame (Team 1)',
            teamAmber: 'Amber Hand (Team 2)',
            selectHeroTip: 'Click a hero to load the timeline',
            totalActions: 'Total Actions',
            souls: 'Souls',
            kda: 'K / D / A',
            damage: 'Damage',
            level: 'Level',

            // Tabs
            tabAll: 'All',
            tabAbilities: '⚡ Abilities',
            tabItems: '🛒 Items',
            tabCombat: '💀 Kills & Deaths',

            // Pause Sync
            pauseCardTitle: '⏸️ In-Game Pause Compensation',
            pauseBadge: 'Smart Sync',
            pauseStatusActive: 'Active',
            pauseStatusDisabled: 'Disabled',
            pauseSourceLabel: 'Pause Markers Source',
            pauseSourceSeq: '⏱️ Timeline Sequence',
            pauseSourceClip: '🎬 Selected Video Clip',
            pauseSourceBoth: '🔄 Both (Timeline & Video Clip)',
            pauseSourceDisabled: '🚫 Disabled (No compensation)',
            pauseCriteriaLabel: 'Recognize as Pause',
            pauseCritDuration: 'Spanned Markers (In ➔ Out Duration)',
            pauseCritKeyword: 'Markers Named "Pause" / "Pausa"',
            pauseCritAny: 'Any Marker (With or Without Duration)',
            pauseTip: '💡 <strong>How pause works:</strong> In Premiere Pro, create a spanned marker with duration (dragging the marker handles) covering the paused gameplay. The plugin automatically skips pause time and shifts abilities, kills, and items to remain in 100% sync!',

            // Settings Card
            settingsTitle: 'General Settings',
            fontSizeLabel: 'Font Size (UI Scale)',
            fontSizeReset: '100% (Default)',
            licenseProLabel: 'Pro License',
            assetsFolderLabel: 'Local Assets Folder',
            languageLabel: 'UI Language',
            pluginVersionLabel: 'Plugin Version',

            // Custom Colors
            colorsCardTitle: '🎨 Marker Colors',
            colorsBadge: 'Customizable',
            resetDefault: 'Reset Default',
            colorT0: '⚡ Unlock (T0)',
            colorT1: '⚡ Tier 1 (T1)',
            colorT2: '⚡ Tier 2 (T2)',
            colorT3: '⚡ Tier 3 (T3)',
            colorKill: '💀 Kills',
            colorAssist: '🤝 Assists',
            colorDeath: '☠️ Deaths',
            colorItem: '🛒 Items Purchased',

            // Color Names
            colorGreen: 'Green',
            colorRed: 'Red',
            colorPurple: 'Purple',
            colorOrange: 'Orange',
            colorYellow: 'Yellow',
            colorWhite: 'White',
            colorBlue: 'Blue',
            colorCyan: 'Cyan',

            // Premiere Settings
            premiereSettingsTitle: 'Premiere Pro Settings',
            markerTargetLabel: 'Marker Destination',
            targetClip: '🎬 On Selected Video (Clip)',
            targetBoth: '🎬 On Video + ⏱️ Timeline (Both)',
            targetSequence: '⏱️ Timeline Sequence Only',
            targetTrackLabel: 'Video Track (Items)',
            targetTrackLabelIcons: 'Video Track (Item Cards)',
            secondaryTrackLabel: '2nd Item Track (Item Description)',
            itemStyleLabel: 'Visual Item Style',
            itemStyleCardPtNew: '🃏 Item Card (Current) - PT-BR',
            itemStyleCardEnNew: '🃏 Item Card (Current) - EN',
            itemStyleCardPtOld: '🃏 Item Card (Old) - PT-BR',
            itemStyleCardEnOld: '🃏 Item Card (Old) - EN',
            itemStyleDescEn: '📜 Item Description - EN',
            itemStyleBoth: '✨ Insert Both (Item Card + Item Description)',
            offsetModeLabel: 'Match Start Reference',
            offsetPlayhead: '📍 Playhead Position (Current Time) (Recommended)',
            offsetClipStart: '🎬 Selected Video Start',
            offsetZero: '⏱️ Timeline Start (00:00:00)',
            pngDurationLabel: 'PNG Duration (s)',
            gameStartTimeLabel: 'Collect In-Game Data From',
            gameStartTimeHint: 'Ignores earlier events and aligns with video cut (e.g. 00:10).',
            gameStartTimeIgnoring: 'Ignoring events prior to {time}',
            gameStartTimeFromStart: 'Collecting data from match start (00:00)',

            // Checkboxes
            checkTier: '⚡ Create markers for <strong>Tier Upgrades (T1, T2, T3)</strong>',
            checkKill: '💀 Create markers for <strong>Kills / Frags</strong>',
            checkAssist: '🤝 Create markers for <strong>Assists / Fights</strong>',
            checkDeath: '☠️ Create markers for <strong>Deaths</strong>',
            checkInsertItems: '🛒 Insert item PNGs onto <strong>Video Track</strong>',
            checkUnlock: '🟢 Create markers for <strong>Initial Unlocks (T0)</strong>',
            checkItemMarkers: '🏷️ Create markers for item purchases too',
            premiereTip: '💡 <strong>Tip:</strong> Clip markers appear directly on the video clip in the timeline and Source Monitor. Ensure track V1 is tall enough to view them.',

            // Action Button & Sync
            syncBtn: '⚡ Apply to Premiere Timeline',
            syncBtnDownloading: 'Downloading PNGs from cloud...',
            syncBtnApplying: 'Applying to Premiere Pro...',
            syncSuccess: 'Done! {markers} markers created{dest} and {items} item PNGs inserted on Track V{track}.{pauseMsg}',
            pauseAdjustMsg: ' ⏸️ {count} pauses compensated (+{sec}s adjusted).',
            r2Synced: '✅ Cloud items catalog is 100% up to date.',
            r2Updated: '🔄 {count} items updated from cloud!',
            r2Checking: 'Syncing from cloud...',
            itemLabel: 'Item',
            upgradeLabel: 'Upgrade',
            unlockLabel: 'Unlock',
            enemyLabel: 'Enemy',
            allyLabel: 'Ally',
            tierUnlock: 'Initial Unlock',
            tier1: 'Tier 1 (+1 Pt)',
            tier2: 'Tier 2 (+2 Pts)',
            tier3: 'Tier 3 (+5 Pts - Max)',
            markerKillName: '💀 Kill: {victim}',
            markerKillComment: 'Killed {victim} at {time}',
            markerAssistName: '🤝 Assist: {victim}',
            markerAssistComment: 'Assist on {victim} (killed by {killer}) at {time}',
            markerDeathName: '☠️ Death: {killer}',
            markerDeathComment: 'Killed by {killer} at {time}',
            markerAbilityName: '⚡ {name} ({shortTier})',
            markerAbilityComment: 'Ability: {name}\nLevel: {tier}\nMatch Time: {time}',
            markerItemName: '🛒 {name} ({slotType})',
            markerItemComment: 'Purchased Item: {name}\nCost: {cost} Souls\nMatch Time: {time}',

            // License Activation Modal
            licenseModalTitle: '🔐 License Activation',
            licenseModalSubtitle: 'Unlock Deadlock Toolkit in Adobe Premiere Pro',
            licenseModalDesc: 'Enter your license key to activate the plugin on this computer.',
            licenseKeyPlaceholder: 'e.g. DEAD-XXXX-XXXX-XXXX',
            activateBtn: '⚡ Activate License',
            activatingBtn: 'Verifying Key...',
            buyTitle: 'Don\'t have a license key yet?',
            buyPixBtn: '🇧🇷 Buy with Pix (R$ 15/mês)',
            buyStripeBtn: '💳 Card / Apple Pay ($15/mo)',
            licenseActiveBadge: 'Licensed',
            licenseSuccessMsg: '✅ License activated successfully on this computer!',
            licenseHwidMismatch: 'This license key is already activated on another computer.',
            deactivateBtn: 'Deactivate License on this PC'
        },

        'es': {
            langName: 'Español',
            flag: '🇪🇸',
            searchPlaceholder: 'Escriba o pegue el ID de Partida...',
            searchBtn: 'Buscar',
            searchingBtn: 'Buscando...',
            recentMatches: '🕒 Partidas Recientes:',
            clearHistory: 'Limpiar ✕',
            historyCleared: 'Historial borrado.',
            matchSummaryTitle: 'Resumen de la Partida',
            matchLabel: 'Partida',
            durationLabel: 'Duración',
            resultLabel: 'Resultado',
            winnerTeamSapphire: 'Victoria: Sapphire Flame',
            winnerTeamAmber: 'Victoria: Amber Hand',
            teamSapphire: 'Sapphire Flame (Equipo 1)',
            teamAmber: 'Amber Hand (Equipo 2)',
            selectHeroTip: 'Haga clic en un héroe para cargar la línea de tiempo',
            totalActions: 'Total Acciones',
            souls: 'Almas',
            kda: 'A / M / A',
            damage: 'Daño',
            level: 'Nivel',

            // Tabs
            tabAll: 'Todas',
            tabAbilities: '⚡ Habilidades',
            tabItems: '🛒 Objetos',
            tabCombat: '💀 Asesinatos y Muertes',

            // Pause Sync
            pauseCardTitle: '⏸️ Compensación de Pausas del Juego',
            pauseBadge: 'Smart Sync',
            pauseStatusActive: 'Activo',
            pauseStatusDisabled: 'Desactivado',
            pauseSourceLabel: 'Origen de Marcadores de Pausa',
            pauseSourceSeq: '⏱️ Línea de Tiempo (Secuencia)',
            pauseSourceClip: '🎬 Clip de Vídeo Seleccionado',
            pauseSourceBoth: '🔄 Ambos (Línea de Tiempo y Clip)',
            pauseSourceDisabled: '🚫 Desactivado (Sin compensación)',
            pauseCriteriaLabel: 'Reconocer como Pausa',
            pauseCritDuration: 'Marcadores con Duración (Inicio ➔ Fin)',
            pauseCritKeyword: 'Marcador con Nombre "Pausa" / "Pause"',
            pauseCritAny: 'Cualquier Marcador (Con o Sin Duración)',
            pauseTip: '💡 <strong>Cómo funciona la pausa:</strong> En Premiere Pro, cree un marcador con duración (arrastrando los extremos) que cubra el tiempo de pausa. El plugin omite automáticamente ese tiempo y ajusta todas las habilidades, muertes y objetos con sincronización perfecta!',

            // Settings Card
            settingsTitle: 'Configuración General',
            fontSizeLabel: 'Tamaño de Fuentes (Escala)',
            fontSizeReset: '100% (Predeterminado)',
            licenseProLabel: 'Licencia Pro',
            assetsFolderLabel: 'Carpeta de Assets',
            languageLabel: 'Idioma de la Interfaz',
            pluginVersionLabel: 'Versión del Plugin',

            // Custom Colors
            colorsCardTitle: '🎨 Colores de Marcadores',
            colorsBadge: 'Personalizable',
            resetDefault: 'Restaurar Predeterminado',
            colorT0: '⚡ Desbloqueo (T0)',
            colorT1: '⚡ Nivel 1 (T1)',
            colorT2: '⚡ Nivel 2 (T2)',
            colorT3: '⚡ Nivel 3 (T3)',
            colorKill: '💀 Asesinatos (Kills)',
            colorAssist: '🤝 Asistencias (Assists)',
            colorDeath: '☠️ Muertes (Deaths)',
            colorItem: '🛒 Objetos Comprados',

            // Color Names
            colorGreen: 'Verde',
            colorRed: 'Rojo',
            colorPurple: 'Púrpura',
            colorOrange: 'Naranja',
            colorYellow: 'Amarillo',
            colorWhite: 'Blanco',
            colorBlue: 'Azul',
            colorCyan: 'Cian',

            // Premiere Settings
            premiereSettingsTitle: 'Configuración en Premiere Pro',
            markerTargetLabel: 'Destino de los Marcadores',
            targetClip: '🎬 En el Vídeo Seleccionado (Clip)',
            targetBoth: '🎬 En el Vídeo + ⏱️ Línea de Tiempo',
            targetSequence: '⏱️ Solo en la Línea de Tiempo',
            targetTrackLabel: 'Pista de Vídeo (Objetos)',
            targetTrackLabelIcons: 'Pista de Vídeo (Item Cards)',
            secondaryTrackLabel: 'Pista del 2º Objeto (Item Description)',
            itemStyleLabel: 'Estilo Visual de los Objetos',
            itemStyleCardPtNew: '🃏 Item Card (Actual) - PT-BR',
            itemStyleCardEnNew: '🃏 Item Card (Actual) - EN',
            itemStyleCardPtOld: '🃏 Item Card (Antiguo) - PT-BR',
            itemStyleCardEnOld: '🃏 Item Card (Antiguo) - EN',
            itemStyleDescEn: '📜 Item Description - EN',
            itemStyleBoth: '✨ Insertar Ambos (Item Card + Item Description)',
            offsetModeLabel: 'Punto de Inicio de la Partida',
            offsetPlayhead: '📍 Posición del Cabezal (Playhead) (Recomendado)',
            offsetClipStart: '🎬 Inicio del Vídeo Seleccionado',
            offsetZero: '⏱️ Inicio de la Línea de Tiempo (00:00:00)',
            pngDurationLabel: 'Duración del PNG (s)',
            gameStartTimeLabel: 'Recopilar Datos a Partir de (Juego)',
            gameStartTimeHint: 'Omite eventos anteriores y alinea con el corte de vídeo (ej: 00:10).',
            gameStartTimeIgnoring: 'Omitiendo eventos antes de {time}',
            gameStartTimeFromStart: 'Recopilando desde el inicio (00:00)',

            // Checkboxes
            checkTier: '⚡ Crear marcadores para <strong>Mejoras de Nivel (T1, T2, T3)</strong>',
            checkKill: '💀 Crear marcadores para <strong>Asesinatos (Kills)</strong>',
            checkAssist: '🤝 Crear marcadores para <strong>Asistencias / Fights</strong>',
            checkDeath: '☠️ Crear marcadores para <strong>Muertes (Deaths)</strong>',
            checkInsertItems: '🛒 Insertar PNGs de <strong>Objetos Comprados</strong> en la pista',
            checkUnlock: '🟢 Crear marcadores para <strong>Desbloqueos Iniciales (T0)</strong>',
            checkItemMarkers: '🏷️ Crear marcadores para compras de objetos también',
            premiereTip: '💡 <strong>Consejo:</strong> Los marcadores de clip aparecen directamente en la barra del vídeo. Asegúrese de que la pista V1 tenga suficiente altura.',

            // Action Button & Sync
            syncBtn: '⚡ Aplicar en la Línea de Tiempo de Premiere',
            syncBtnDownloading: 'Descargando PNGs de la nube...',
            syncBtnApplying: 'Aplicando en Premiere Pro...',
            syncSuccess: '¡Listo! {markers} marcadores creados{dest} y {items} objetos PNG insertados en la Pista V{track}.{pauseMsg}',
            pauseAdjustMsg: ' ⏸️ {count} pausas compensadas (+{sec}s ajustados).',
            r2Synced: '✅ Catálogo en la nube está 100% actualizado.',
            r2Updated: '🔄 ¡{count} objetos actualizados desde la nube!',
            r2Checking: 'Sincronizando con la nube...',
            colorsResetNotif: '¡Colores de marcadores restaurados a los predeterminados!',
            selectMatchFirst: 'Seleccione una partida y un héroe primero.',
            noEventsSelected: 'No hay eventos u objetos seleccionados para importar.',
            itemLabel: 'Objeto',
            upgradeLabel: 'Mejora',
            unlockLabel: 'Desbloqueo',
            enemyLabel: 'Enemigo',
            allyLabel: 'Aliado',
            tierUnlock: 'Desbloqueo Inicial',
            tier1: 'Nivel 1 (+1 Pto)',
            tier2: 'Nivel 2 (+2 Ptos)',
            tier3: 'Nivel 3 (+5 Ptos - Max)',
            markerKillName: '💀 Asesinato: {victim}',
            markerKillComment: 'Eliminó a {victim} a los {time}',
            markerAssistName: '🤝 Asistencia: {victim}',
            markerAssistComment: 'Asistencia en {victim} (asesinado por {killer}) a los {time}',
            markerDeathName: '☠️ Muerte: {killer}',
            markerDeathComment: 'Eliminado por {killer} a los {time}',
            markerAbilityName: '⚡ {name} ({shortTier})',
            markerAbilityComment: 'Habilidad: {name}\nNivel: {tier}\nTiempo de Partida: {time}',
            markerItemName: '🛒 {name} ({slotType})',
            markerItemComment: 'Objeto Comprado: {name}\nCoste: {cost} Souls\nTiempo de Partida: {time}',

            // License Activation Modal
            licenseModalTitle: '🔐 Activación de Licencia',
            licenseModalSubtitle: 'Desbloquee Deadlock Toolkit en Premiere Pro',
            licenseModalDesc: 'Ingrese su clave de licencia para activar el plugin en esta computadora.',
            licenseKeyPlaceholder: 'Ej: DEAD-XXXX-XXXX-XXXX',
            activateBtn: '⚡ Activar Licencia',
            activatingBtn: 'Validando Clave...',
            buyTitle: '¿Aún no tienes una clave de licencia?',
            buyPixBtn: '🇧🇷 Comprar con Pix (R$ 15/mês)',
            buyStripeBtn: '💳 Tarjeta / Apple Pay ($15/mo)',
            licenseActiveBadge: 'Licencia Activa',
            licenseSuccessMsg: '✅ ¡Licencia activada con éxito en este equipo!',
            licenseHwidMismatch: 'Esta clave ya está activada en otro equipo.',
            deactivateBtn: 'Desactivar Licencia de este PC'
        },

        'ru': {
            langName: 'Русский',
            flag: '🇷🇺',
            searchPlaceholder: 'Введите или вставьте ID матча...',
            searchBtn: 'Поиск',
            searchingBtn: 'Поиск...',
            recentMatches: '🕒 Недавние матчи:',
            clearHistory: 'Очистить ✕',
            historyCleared: 'История очищена.',
            matchSummaryTitle: 'Сводка матча',
            matchLabel: 'Матч',
            durationLabel: 'Длительность',
            resultLabel: 'Результат',
            winnerTeamSapphire: 'Победа: Sapphire Flame',
            winnerTeamAmber: 'Победа: Amber Hand',
            teamSapphire: 'Sapphire Flame (Команда 1)',
            teamAmber: 'Amber Hand (Команда 2)',
            selectHeroTip: 'Выберите героя, чтобы загрузить таймлайн',
            totalActions: 'Всего действий',
            souls: 'Души',
            kda: 'У / С / П',
            damage: 'Урон',
            level: 'Уровень',

            // Tabs
            tabAll: 'Все',
            tabAbilities: '⚡ Способности',
            tabItems: '🛒 Предметы',
            tabCombat: '💀 Убийства и Смерти',

            // Pause Sync
            pauseCardTitle: '⏸️ Компенсация пауз в игре',
            pauseBadge: 'Smart Sync',
            pauseStatusActive: 'Активно',
            pauseStatusDisabled: 'Отключено',
            pauseSourceLabel: 'Источник маркеров паузы',
            pauseSourceSeq: '⏱️ Таймлайн (Секвенция)',
            pauseSourceClip: '🎬 Выбранный видеоклип',
            pauseSourceBoth: '🔄 Оба (Таймлайн и Клип)',
            pauseSourceDisabled: '🚫 Отключено (Без компенсации)',
            pauseCriteriaLabel: 'Распознавать как паузу',
            pauseCritDuration: 'Маркеры с длительностью (Вход ➔ Выход)',
            pauseCritKeyword: 'Маркер с именем "Pause" / "Пауза"',
            pauseCritAny: 'Любой маркер (С длительностью или без)',
            pauseTip: '💡 <strong>Как работает пауза:</strong> В Premiere Pro создайте маркер с длительностью (растянув маркер), покрывающий время паузы. Плагин автоматически пропустит время паузы и идеально синхронизирует все способности, предметы и убийства!',

            // Settings Card
            settingsTitle: 'Общие настройки',
            fontSizeLabel: 'Размер шрифтов (Масштаб)',
            fontSizeReset: '100% (По умолч.)',
            licenseProLabel: 'Лицензия Pro',
            assetsFolderLabel: 'Папка ресурсов (Assets)',
            languageLabel: 'Язык интерфейса',
            pluginVersionLabel: 'Версия плагина',

            // Custom Colors
            colorsCardTitle: '🎨 Цвета маркеров',
            colorsBadge: 'Настраиваемые',
            resetDefault: 'Сбросить по умолчанию',
            colorT0: '⚡ Разблокировка (T0)',
            colorT1: '⚡ Уровень 1 (T1)',
            colorT2: '⚡ Уровень 2 (T2)',
            colorT3: '⚡ Уровень 3 (T3)',
            colorKill: '💀 Убийства (Kills)',
            colorAssist: '🤝 Помощь (Assists)',
            colorDeath: '☠️ Смерти (Deaths)',
            colorItem: '🛒 Купленные предметы',

            // Color Names
            colorGreen: 'Зеленый',
            colorRed: 'Красный',
            colorPurple: 'Фиолетовый',
            colorOrange: 'Оранжевый',
            colorYellow: 'Желтый',
            colorWhite: 'Белый',
            colorBlue: 'Синий',
            colorCyan: 'Голубой',

            // Premiere Settings
            premiereSettingsTitle: 'Настройки Premiere Pro',
            markerTargetLabel: 'Назначение маркеров',
            targetClip: '🎬 На выбранном видео (Клип)',
            targetBoth: '🎬 На видео + ⏱️ Таймлайн (Оба)',
            targetSequence: '⏱️ Только на таймлайне секвенции',
            targetTrackLabel: 'Видеодорожка (Предметы)',
            targetTrackLabelIcons: 'Видеодорожка (Item Cards)',
            secondaryTrackLabel: 'Дорожка 2-го предмета (Item Description)',
            itemStyleLabel: 'Стиль отображения предметов',
            itemStyleCardPtNew: '🃏 Item Card (Текущий) - PT-BR',
            itemStyleCardEnNew: '🃏 Item Card (Текущий) - EN',
            itemStyleCardPtOld: '🃏 Item Card (Старый) - PT-BR',
            itemStyleCardEnOld: '🃏 Item Card (Старый) - EN',
            itemStyleDescEn: '📜 Item Description - EN',
            itemStyleBoth: '✨ Вставить оба (Item Card + Item Description)',
            offsetModeLabel: 'Точка начала матча',
            offsetPlayhead: '📍 Позиция ползунка (Playhead) (Рекомендуется)',
            offsetClipStart: '🎬 Начало выбранного видео',
            offsetZero: '⏱️ Начало таймлайна (00:00:00)',
            pngDurationLabel: 'Длительность PNG (с)',
            gameStartTimeLabel: 'Собирать данные игры начиная с',
            gameStartTimeHint: 'Игнорирует ранние события и синхронизирует с обрезанным видео (напр. 00:10).',
            gameStartTimeIgnoring: 'Игнорируются события до {time}',
            gameStartTimeFromStart: 'Сбор данных с начала матча (00:00)',

            // Checkboxes
            checkTier: '⚡ Маркеры для <strong>Улучшений уровней (T1, T2, T3)</strong>',
            checkKill: '💀 Маркеры для <strong>Убийств (Kills)</strong>',
            checkAssist: '🤝 Маркеры для <strong>Помощи (Assists)</strong>',
            checkDeath: '☠️ Маркеры для <strong>Смертей (Deaths)</strong>',
            checkInsertItems: '🛒 Вставлять PNG <strong>Купленных предметов</strong> на дорожку',
            checkUnlock: '🟢 Маркеры для <strong>Начальных разблокировок (T0)</strong>',
            checkItemMarkers: '🏷️ Маркеры для покупок предметов',
            premiereTip: '💡 <strong>Совет:</strong> Маркеры клипа отображаются прямо на полосе видео. Убедитесь, что высота дорожки V1 достаточна для их просмотра.',

            // Action Button & Sync
            syncBtn: '⚡ Применить на таймлайн Premiere',
            syncBtnDownloading: 'Загрузка PNG из облака...',
            syncBtnApplying: 'Применение в Premiere Pro...',
            syncSuccess: 'Готово! Создано маркеров: {markers}{dest}, вставлено PNG: {items} на дорожку V{track}.{pauseMsg}',
            pauseAdjustMsg: ' ⏸️ Скомпенсировано {count} пауз (+{sec}с скорректировано).',
            r2Synced: '✅ Каталог в облаке обновлен на 100%.',
            r2Updated: '🔄 Обновлено {count} предметов из облака!',
            r2Checking: 'Синхронизация с облаком...',
            colorsResetNotif: 'Цвета маркеров сброшены на стандартные!',
            selectMatchFirst: 'Сначала выберите матч и героя.',
            noEventsSelected: 'Не выбрано ни одного события для импорта.',
            itemLabel: 'Предмет',
            upgradeLabel: 'Улучшение',
            unlockLabel: 'Разблокировка',
            enemyLabel: 'Враг',
            allyLabel: 'Союзник',
            tierUnlock: 'Начальная разблокировка',
            tier1: 'Уровень 1 (+1 очк)',
            tier2: 'Уровень 2 (+2 очк)',
            tier3: 'Уровень 3 (+5 очк - Макс)',
            markerKillName: '💀 Убийство: {victim}',
            markerKillComment: 'Убил {victim} на {time}',
            markerAssistName: '🤝 Помощь: {victim}',
            markerAssistComment: 'Помощь против {victim} (убит {killer}) на {time}',
            markerDeathName: '☠️ Смерть: {killer}',
            markerDeathComment: 'Убит игроком {killer} на {time}',
            markerAbilityName: '⚡ {name} ({shortTier})',
            markerAbilityComment: 'Способность: {name}\nУровень: {tier}\nВремя матча: {time}',
            markerItemName: '🛒 {name} ({slotType})',
            markerItemComment: 'Купленный предмет: {name}\nСтоимость: {cost} Souls\nВремя матча: {time}',

            // License Activation Modal
            licenseModalTitle: '🔐 Активация лицензии',
            licenseModalSubtitle: 'Разблокируйте Deadlock Toolkit в Premiere Pro',
            licenseModalDesc: 'Введите лицензионный ключ для активации плагина на этом компьютере.',
            licenseKeyPlaceholder: 'Например: DEAD-XXXX-XXXX-XXXX',
            activateBtn: '⚡ Активировать лицензию',
            activatingBtn: 'Проверка ключа...',
            buyTitle: 'У вас еще нет ключа?',
            buyPixBtn: '🇧🇷 Купить через Pix (Бразилия)',
            buyStripeBtn: '💳 Карта / Apple Pay (Глобально)',
            licenseActiveBadge: 'Лицензия активна',
            licenseSuccessMsg: '✅ Лицензия успешно активирована на этом ПК!',
            licenseHwidMismatch: 'Этот ключ уже активирован на другом ПК.',
            deactivateBtn: 'Деактивировать лицензию на этом ПК'
        }
    },

    init() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved && this.translations[saved]) {
                this.currentLang = saved;
            } else {
                // Auto-detect browser/system language
                const sysLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
                if (sysLang.startsWith('pt')) this.currentLang = 'pt-BR';
                else if (sysLang.startsWith('es')) this.currentLang = 'es';
                else if (sysLang.startsWith('ru')) this.currentLang = 'ru';
                else this.currentLang = 'en';
            }
        } catch (e) {}

        return this.currentLang;
    },

    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            try {
                localStorage.setItem(this.storageKey, lang);
            } catch (e) {}
        }
    },

    t(key, params = {}) {
        const dict = this.translations[this.currentLang] || this.translations['en'];
        let str = dict[key] || this.translations['en'][key] || key;

        Object.keys(params).forEach(p => {
            str = str.replace(new RegExp(`\\{${p}\\}`, 'g'), params[p]);
        });

        return str;
    },

    getColorName(colorIndex) {
        const dict = this.translations[this.currentLang] || this.translations['en'];
        const map = {
            0: dict.colorGreen,
            1: dict.colorRed,
            2: dict.colorPurple,
            3: dict.colorOrange,
            4: dict.colorYellow,
            5: dict.colorWhite,
            6: dict.colorBlue,
            7: dict.colorCyan
        };
        return map[colorIndex] || dict.colorGreen;
    },

    getLocalizedTierLabel(shortTier, upgradeInfo) {
        if (shortTier === 'T0' || upgradeInfo === 65537) return this.t('tierUnlock');
        if (shortTier === 'T1' || upgradeInfo === 196609) return this.t('tier1');
        if (shortTier === 'T2' || upgradeInfo === 458753) return this.t('tier2');
        if (shortTier === 'T3' || upgradeInfo === 983041) return this.t('tier3');
        return this.t('upgradeLabel');
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = I18N;
}
if (typeof window !== 'undefined') {
    window.I18N = I18N;
}
