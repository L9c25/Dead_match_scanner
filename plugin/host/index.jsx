/**
 * Deadlock Match Scanner - ExtendScript Host Script for Adobe Premiere Pro
 * Compatible with Premiere Pro 13.0 to 2026+ (25.x, 26.x, etc.)
 */

// Safe JSON Polyfill for ExtendScript (ECMAScript 3 engine)
if (typeof JSON !== "object") {
    JSON = {};
}
(function () {
    "use strict";
    var rx_one = /^[\],:{}\s]*$/;
    var rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
    var rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
    var rx_four = /(?:^|:|,)(?:\s*\[)+/g;
    var rx_escapable = /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    var meta = { "\b": "\\b", "\t": "\\t", "\n": "\\n", "\f": "\\f", "\r": "\\r", "\"": "\\\"", "\\": "\\\\" };

    function quote(string) {
        rx_escapable.lastIndex = 0;
        return rx_escapable.test(string) ? "\"" + string.replace(rx_escapable, function (a) {
            var c = meta[a];
            return typeof c === "string" ? c : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
        }) + "\"" : "\"" + string + "\"";
    }

    function str(key, holder) {
        var value = holder[key];
        if (value && typeof value === "object" && typeof value.toJSON === "function") {
            value = value.toJSON(key);
        }
        switch (typeof value) {
        case "string": return quote(value);
        case "number": return isFinite(value) ? String(value) : "null";
        case "boolean":
        case "null": return String(value);
        case "object":
            if (!value) return "null";
            var partial = [];
            if (Object.prototype.toString.apply(value) === "[object Array]") {
                var length = value.length;
                for (var i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || "null";
                }
                return partial.length === 0 ? "[]" : "[" + partial.join(",") + "]";
            }
            for (var k in value) {
                if (Object.prototype.hasOwnProperty.call(value, k)) {
                    var v = str(k, value);
                    if (v) partial.push(quote(k) + ":" + v);
                }
            }
            return partial.length === 0 ? "{}" : "{" + partial.join(",") + "}";
        }
    }

    if (typeof JSON.stringify !== "function") {
        JSON.stringify = function (value) { return str("", { "": value }); };
    }
    if (typeof JSON.parse !== "function") {
        JSON.parse = function (text) {
            var j;
            text = String(text);
            rx_one.lastIndex = 0;
            if (rx_one.test(text.replace(rx_two, "@").replace(rx_three, "]").replace(rx_four, ""))) {
                j = eval("(" + text + ")");
                return j;
            }
            throw new SyntaxError("JSON.parse error");
        };
    }
}());

var deadlockScanner = {
    /**
     * Get active sequence information (name, playhead position, framerate, video tracks)
     */
    getSequenceInfo: function() {
        try {
            var activeSeq = app.project.activeSequence;
            if (!activeSeq) {
                return JSON.stringify({
                    hasActiveSequence: false,
                    error: "Nenhuma sequência ativa encontrada no Premiere Pro."
                });
            }

            var playhead = activeSeq.getPlayerPosition();
            var playheadSec = playhead ? playhead.seconds : 0;
            var numTracks = activeSeq.videoTracks ? activeSeq.videoTracks.numTracks : 0;
            var selectedClip = this.getSelectedVideoClip(activeSeq);

            return JSON.stringify({
                hasActiveSequence: true,
                sequenceName: activeSeq.name,
                playheadSeconds: playheadSec,
                videoTrackCount: numTracks,
                timecode: activeSeq.getHeadPosition ? activeSeq.getHeadPosition() : "",
                hasSelectedClip: !!selectedClip,
                selectedClipName: selectedClip ? selectedClip.name : ""
            });
        } catch (e) {
            return JSON.stringify({
                hasActiveSequence: false,
                error: "Erro ao obter informações da sequência: " + e.message
            });
        }
    },

    /**
     * Get the currently selected video clip from timeline, with fallback to clip under playhead or first clip on V1
     */
    getSelectedVideoClip: function(activeSeq) {
        if (!activeSeq) {
            activeSeq = app.project.activeSequence;
        }
        if (!activeSeq) return null;

        // 1. Try activeSeq.getSelection() (Premiere Pro 12.0+)
        try {
            if (typeof activeSeq.getSelection === "function") {
                var sel = activeSeq.getSelection();
                if (sel && sel.length > 0) {
                    for (var i = 0; i < sel.length; i++) {
                        var item = sel[i];
                        if (item && item.projectItem) {
                            var cStart = item.start ? item.start.seconds : 0;
                            var cIn = item.inPoint ? item.inPoint.seconds : 0;
                            var cEnd = item.end ? item.end.seconds : 0;
                            var cOut = item.outPoint ? item.outPoint.seconds : 0;
                            return {
                                clip: item,
                                projectItem: item.projectItem,
                                name: item.name || item.projectItem.name,
                                startSeconds: cStart,
                                inPointSeconds: cIn,
                                endSeconds: cEnd,
                                outPointSeconds: cOut,
                                durationSeconds: (cEnd - cStart) || (cOut - cIn),
                                source: "selected_clip"
                            };
                        }
                    }
                }
            }
        } catch (eSel) {}

        // 2. Iterate through all video tracks checking isSelected()
        try {
            if (activeSeq.videoTracks) {
                for (var t = 0; t < activeSeq.videoTracks.numTracks; t++) {
                    var track = activeSeq.videoTracks[t];
                    if (track && track.clips) {
                        for (var c = 0; c < track.clips.numItems; c++) {
                            var clip = track.clips[c];
                            if (clip && typeof clip.isSelected === "function" && clip.isSelected()) {
                                if (clip.projectItem) {
                                    var cStart = clip.start ? clip.start.seconds : 0;
                                    var cIn = clip.inPoint ? clip.inPoint.seconds : 0;
                                    var cEnd = clip.end ? clip.end.seconds : 0;
                                    var cOut = clip.outPoint ? clip.outPoint.seconds : 0;
                                    return {
                                        clip: clip,
                                        projectItem: clip.projectItem,
                                        name: clip.name || clip.projectItem.name,
                                        startSeconds: cStart,
                                        inPointSeconds: cIn,
                                        endSeconds: cEnd,
                                        outPointSeconds: cOut,
                                        durationSeconds: (cEnd - cStart) || (cOut - cIn),
                                        source: "track_selected"
                                    };
                                }
                            }
                        }
                    }
                }
            }
        } catch (eTracks) {}

        // 3. Fallback: Find clip currently under playhead on video tracks (starting from V1)
        try {
            var playheadTime = activeSeq.getPlayerPosition();
            var playheadSec = playheadTime ? playheadTime.seconds : 0;
            if (activeSeq.videoTracks && activeSeq.videoTracks.numTracks > 0) {
                for (var t = 0; t < activeSeq.videoTracks.numTracks; t++) {
                    var track = activeSeq.videoTracks[t];
                    if (track && track.clips && track.clips.numItems > 0) {
                        for (var c = 0; c < track.clips.numItems; c++) {
                            var clip = track.clips[c];
                            if (clip && clip.projectItem) {
                                var cStart = clip.start ? clip.start.seconds : 0;
                                var cEnd = clip.end ? clip.end.seconds : 0;
                                if (playheadSec >= cStart && playheadSec <= cEnd) {
                                    var cIn = clip.inPoint ? clip.inPoint.seconds : 0;
                                    var cOut = clip.outPoint ? clip.outPoint.seconds : 0;
                                    return {
                                        clip: clip,
                                        projectItem: clip.projectItem,
                                        name: clip.name || clip.projectItem.name,
                                        startSeconds: cStart,
                                        inPointSeconds: cIn,
                                        endSeconds: cEnd,
                                        outPointSeconds: cOut,
                                        durationSeconds: (cEnd - cStart) || (cOut - cIn),
                                        source: "playhead_clip"
                                    };
                                }
                            }
                        }
                    }
                }
            }
        } catch (ePlayhead) {}

        // 4. Fallback: First video clip on V1
        try {
            if (activeSeq.videoTracks && activeSeq.videoTracks.numTracks > 0) {
                var firstTrack = activeSeq.videoTracks[0];
                if (firstTrack && firstTrack.clips && firstTrack.clips.numItems > 0) {
                    var firstClip = firstTrack.clips[0];
                    if (firstClip && firstClip.projectItem) {
                        var cStart = firstClip.start ? firstClip.start.seconds : 0;
                        var cIn = firstClip.inPoint ? firstClip.inPoint.seconds : 0;
                        var cEnd = firstClip.end ? firstClip.end.seconds : 0;
                        var cOut = firstClip.outPoint ? firstClip.outPoint.seconds : 0;
                        return {
                            clip: firstClip,
                            projectItem: firstClip.projectItem,
                            name: firstClip.name || firstClip.projectItem.name,
                            startSeconds: cStart,
                            inPointSeconds: cIn,
                            endSeconds: cEnd,
                            outPointSeconds: cOut,
                            durationSeconds: (cEnd - cStart) || (cOut - cIn),
                            source: "first_clip_v1"
                        };
                    }
                }
            }
        } catch (eFirst) {}

        // 5. Fallback: Project Panel selection
        try {
            if (app.project.selection && app.project.selection.length > 0) {
                for (var p = 0; p < app.project.selection.length; p++) {
                    var pItem = app.project.selection[p];
                    if (pItem && (pItem.type === ProjectItemType.CLIP || pItem.type === ProjectItemType.FILE)) {
                        return {
                            clip: null,
                            projectItem: pItem,
                            name: pItem.name,
                            startSeconds: 0,
                            inPointSeconds: 0,
                            endSeconds: 0,
                            outPointSeconds: 0,
                            durationSeconds: 0,
                            source: "project_panel"
                        };
                    }
                }
            }
        } catch (eProj) {}

        return null;
    },

    /**
     * Recursively scan local folder for PNG files using ExtendScript Folder API
     */
    scanLocalFolder: function(folderPath) {
        try {
            var targetFolder = new Folder(folderPath);
            if (!targetFolder.exists) {
                return JSON.stringify({
                    success: false,
                    error: "Diretório não encontrado: " + folderPath,
                    items: []
                });
            }

            var results = [];
            function walk(f) {
                var files = f.getFiles();
                for (var i = 0; i < files.length; i++) {
                    var item = files[i];
                    if (item instanceof Folder) {
                        walk(item);
                    } else if (item instanceof File) {
                        var name = item.displayName;
                        if (name.toLowerCase().indexOf(".png") !== -1) {
                            var rawName = name.substring(0, name.lastIndexOf("."));
                            results.push({
                                rawName: rawName,
                                fullPath: item.fsName,
                                fileName: name
                            });
                        }
                    }
                }
            }

            walk(targetFolder);
            return JSON.stringify({
                success: true,
                count: results.length,
                items: results
            });
        } catch (e) {
            return JSON.stringify({
                success: false,
                error: "Erro ao escanear pasta: " + e.message,
                items: []
            });
        }
    },

    /**
     * Find or create a bin in project root
     */
    getOrCreateBin: function(binName) {
        var root = app.project.rootItem;
        for (var i = 0; i < root.children.numItems; i++) {
            var child = root.children[i];
            if (child.type === ProjectItemType.BIN && child.name === binName) {
                return child;
            }
        }
        return root.createBin(binName);
    },

    /**
     * Find project item by file path recursively inside a bin
     */
    findProjectItemByPath: function(parentBin, fullPath) {
        for (var i = 0; i < parentBin.children.numItems; i++) {
            var item = parentBin.children[i];
            if (item.type === ProjectItemType.BIN) {
                var found = this.findProjectItemByPath(item, fullPath);
                if (found) return found;
            } else if (item.type === ProjectItemType.CLIP || item.type === ProjectItemType.FILE) {
                var mediaPath = item.getMediaPath();
                if (mediaPath && mediaPath.toLowerCase() === fullPath.toLowerCase()) {
                    return item;
                }
            }
        }
        return null;
    },

    /**
     * Ensure video track exists, creating tracks if necessary
     */
    ensureVideoTrack: function(activeSeq, trackIndex) {
        if (!activeSeq || !activeSeq.videoTracks) return null;

        var numTracks = activeSeq.videoTracks.numTracks;
        if (trackIndex < numTracks) {
            return activeSeq.videoTracks[trackIndex];
        }

        // Try to add tracks using QE DOM
        try {
            app.enableQE();
            if (typeof qe !== "undefined" && qe.project) {
                var qeSeq = qe.project.getActiveSequence();
                if (qeSeq && typeof qeSeq.addTracks === "function") {
                    var tracksToAdd = (trackIndex - numTracks) + 1;
                    qeSeq.addTracks(tracksToAdd, 0);
                }
            }
        } catch (qeErr) {
            // QE addTracks might fail if not supported
        }

        // Re-check tracks
        if (trackIndex < activeSeq.videoTracks.numTracks) {
            return activeSeq.videoTracks[trackIndex];
        }

        // Fallback to highest available track
        if (activeSeq.videoTracks.numTracks > 0) {
            return activeSeq.videoTracks[activeSeq.videoTracks.numTracks - 1];
        }

        return null;
    },

    /**
     * Detect Pause markers on Sequence and/or Selected Clip in Premiere Pro
     * Allows seamless time compensation for match events when game pauses occur.
     */
    detectPauseIntervals: function(activeSeq, selectedClip, pauseSource, pauseCriteria) {
        if (!pauseSource || pauseSource === "disabled" || !activeSeq) {
            return [];
        }

        var checkSeq = (pauseSource === "sequence" || pauseSource === "both");
        var checkClip = (pauseSource === "clip" || pauseSource === "both");
        var rawIntervals = [];

        var clipStartSec = selectedClip ? selectedClip.startSeconds : 0;
        var clipInSec = selectedClip ? selectedClip.inPointSeconds : 0;

        function isPauseMarker(name, comments, startSec, endSec) {
            var duration = endSec - startSec;
            var hasDuration = duration > 0.05;
            var text = ((name || "") + " " + (comments || "")).toLowerCase();
            var hasKeyword = text.indexOf("pause") !== -1 || text.indexOf("pausa") !== -1 || text.indexOf("parada") !== -1 || text.indexOf("freeze") !== -1;

            if (pauseCriteria === "keyword") {
                return hasKeyword;
            } else if (pauseCriteria === "all_spanned") {
                return hasDuration;
            } else {
                // "any" or default
                return hasDuration || hasKeyword;
            }
        }

        // 1. Scan Sequence Timeline Markers
        if (checkSeq && activeSeq.markers) {
            try {
                var m = activeSeq.markers.getFirstMarker();
                var mCount = 0;
                while (m && mCount < 1000) {
                    mCount++;
                    var s = m.start ? m.start.seconds : 0;
                    var e = m.end ? m.end.seconds : s;
                    var name = m.name || "";
                    var comments = m.comments || "";
                    if (isPauseMarker(name, comments, s, e)) {
                        var endVal = (e > s) ? e : (s + 1.0);
                        rawIntervals.push({
                            source: "sequence",
                            name: name || "Pausa na Timeline",
                            startSec: s,
                            endSec: endVal,
                            durationSec: endVal - s
                        });
                    }
                    m = activeSeq.markers.getNextMarker(m);
                }
            } catch (eSeq) {}
        }

        // 2. Scan Selected Clip Markers
        if (checkClip && selectedClip && selectedClip.projectItem) {
            try {
                var cMarkers = null;
                if (typeof selectedClip.projectItem.getMarkers === "function") {
                    cMarkers = selectedClip.projectItem.getMarkers();
                } else if (selectedClip.projectItem.markers) {
                    cMarkers = selectedClip.projectItem.markers;
                }

                if (cMarkers) {
                    var cm = cMarkers.getFirstMarker();
                    var cmCount = 0;
                    while (cm && cmCount < 1000) {
                        cmCount++;
                        var cs = cm.start ? cm.start.seconds : 0;
                        var ce = cm.end ? cm.end.seconds : cs;
                        var cName = cm.name || "";
                        var cComments = cm.comments || "";
                        if (isPauseMarker(cName, cComments, cs, ce)) {
                            var cEndVal = (ce > cs) ? ce : (cs + 1.0);
                            // Convert clip media coordinates to sequence timeline coordinates
                            var tlS = clipStartSec + (cs - clipInSec);
                            var tlE = clipStartSec + (cEndVal - clipInSec);
                            if (tlE > tlS && tlE > 0) {
                                rawIntervals.push({
                                    source: "clip",
                                    name: cName || "Pausa no Clipe",
                                    startSec: Math.max(0, tlS),
                                    endSec: Math.max(0, tlE),
                                    durationSec: tlE - tlS
                                });
                            }
                        }
                        cm = cMarkers.getNextMarker(cm);
                    }
                }
            } catch (eClip) {}
        }

        if (rawIntervals.length === 0) {
            return [];
        }

        // Sort by startSec
        rawIntervals.sort(function(a, b) {
            return a.startSec - b.startSec;
        });

        // Merge overlapping pause intervals
        var merged = [];
        var current = rawIntervals[0];

        for (var i = 1; i < rawIntervals.length; i++) {
            var next = rawIntervals[i];
            if (next.startSec <= current.endSec + 0.1) {
                current.endSec = Math.max(current.endSec, next.endSec);
                current.durationSec = current.endSec - current.startSec;
            } else {
                merged.push(current);
                current = next;
            }
        }
        merged.push(current);

        return merged;
    },

    /**
     * Read payload from temporary JSON file to avoid IPC buffer limits in Premiere 25/26
     */
    applyMatchDataFromFile: function(filePath) {
        try {
            var f = new File(filePath);
            if (!f.exists) {
                return JSON.stringify({
                    success: false,
                    error: "Arquivo de dados temporário não encontrado: " + filePath
                });
            }
            f.encoding = "UTF-8";
            f.open("r");
            var jsonStr = f.read();
            f.close();
            try { f.remove(); } catch(eRem) {}
            return this.applyMatchData(jsonStr);
        } catch (e) {
            return JSON.stringify({
                success: false,
                error: "Erro ao ler arquivo temporário de dados: " + e.message
            });
        }
    },

    /**
     * Main function to apply abilities markers and items onto Premiere Pro selected video
     */
    applyMatchData: function(payloadJson) {
        try {
            try { app.enableQE(); } catch(eQE) {}

            var activeSeq = app.project.activeSequence;
            if (!activeSeq) {
                return JSON.stringify({
                    success: false,
                    error: "Nenhuma sequência ativa selecionada. Abra ou crie uma sequência no Premiere Pro."
                });
            }

            var payload = JSON.parse(payloadJson);
            var heroName = payload.heroName || "Hero";
            var matchId = payload.matchId || "0";
            var markerTarget = payload.markerTarget || "clip"; // "clip", "both", "sequence"
            var offsetMode = payload.offsetMode || "clip_start"; // "clip_start", "playhead", "zero", "custom"
            var customOffset = Number(payload.customOffset) || 0;
            var gameStartTimeSec = Math.max(0, Number(payload.gameStartTimeSec || payload.startMatchTimeSec || 0));
            var targetTrackNum = Number(payload.targetTrack) || 2; // 1-based (2 = V2)
            var secondaryTrackNum = Number(payload.secondaryTargetTrack) || 3; // 1-based (3 = V3)
            var insertBothItemTypes = !!payload.insertBothItemTypes;
            var clipDurationSec = Number(payload.clipDuration) || 3.0;
            var createAbilityMarkers = payload.createAbilityMarkers !== false;
            var createItemMarkers = !!payload.createItemMarkers;
            var insertItemClips = payload.insertItemClips !== false;
            var abilities = payload.abilities || [];
            var items = payload.items || [];
            var kills = payload.kills || [];
            var assists = payload.assists || [];
            var deaths = payload.deaths || [];

            // Marker Colors Customization (0=Green, 1=Red, 2=Purple, 3=Orange, 4=Yellow, 5=White, 6=Blue, 7=Cyan)
            var markerColors = payload.markerColors || {};
            var colorT0 = (markerColors.t0 !== undefined) ? Number(markerColors.t0) : 5;       // White (Habilidades em Branco)
            var colorT1 = (markerColors.t1 !== undefined) ? Number(markerColors.t1) : 5;       // White
            var colorT2 = (markerColors.t2 !== undefined) ? Number(markerColors.t2) : 5;       // White
            var colorT3 = (markerColors.t3 !== undefined) ? Number(markerColors.t3) : 5;       // White
            var colorKill = (markerColors.kill !== undefined) ? Number(markerColors.kill) : 7; // Cyan (Abates em Ciano)
            var colorAssist = (markerColors.assist !== undefined) ? Number(markerColors.assist) : 3; // Orange (Assistências em Laranja)
            var colorDeath = (markerColors.death !== undefined) ? Number(markerColors.death) : 1; // Red
            var colorItem = (markerColors.item !== undefined) ? Number(markerColors.item) : 4;   // Yellow

            // Pause Compensation Configuration
            var pauseSource = payload.pauseSource || "sequence"; // "sequence", "clip", "both", "disabled"
            var pauseCriteria = payload.pauseCriteria || "all_spanned"; // "all_spanned", "keyword", "any"

            // Detect selected video clip
            var selectedClip = this.getSelectedVideoClip(activeSeq);

            // Detect Pauses on Timeline or Video
            var pauseIntervals = this.detectPauseIntervals(activeSeq, selectedClip, pauseSource, pauseCriteria);
            var totalPauseSec = 0;
            for (var p = 0; p < pauseIntervals.length; p++) {
                totalPauseSec += pauseIntervals[p].durationSec;
            }

            // Determine Target Markers Collection(s)
            var applyToClip = (markerTarget === "clip" || markerTarget === "both");
            var applyToSeq = (markerTarget === "sequence" || markerTarget === "both");

            var clipMarkers = null;
            var targetClipName = "";

            if (applyToClip) {
                if (selectedClip && selectedClip.projectItem) {
                    targetClipName = selectedClip.name || selectedClip.projectItem.name;
                    var pItem = selectedClip.projectItem;
                    if (typeof pItem.getMarkers === "function") {
                        clipMarkers = pItem.getMarkers();
                    }
                    if (!clipMarkers && pItem.markers) {
                        clipMarkers = pItem.markers;
                    }
                } else {
                    // Fallback to sequence if no video found
                    applyToSeq = true;
                    applyToClip = false;
                }
            }

            var seqMarkers = activeSeq.markers;

            // Helper to calculate (timelineTimeSec, mediaMarkerTimeSec) for any game event
            var playheadTime = activeSeq.getPlayerPosition();
            var playheadSec = playheadTime ? playheadTime.seconds : 0;
            var clipStartSec = selectedClip ? selectedClip.startSeconds : 0;
            var clipInSec = selectedClip ? selectedClip.inPointSeconds : 0;

            // Clip duration boundary limits (prevent inserting events after the video ends)
            var clipEndTimelineSec = (selectedClip && selectedClip.endSeconds && selectedClip.endSeconds > 0) ? selectedClip.endSeconds : 0;
            var clipEndMediaSec = (selectedClip && selectedClip.outPointSeconds && selectedClip.outPointSeconds > 0) ? selectedClip.outPointSeconds : 0;

            // Calculate Base Start Time T0
            var baseT0 = 0;
            if (offsetMode === "clip_start" && selectedClip) {
                baseT0 = clipStartSec;
            } else if (offsetMode === "playhead") {
                baseT0 = playheadSec;
            } else if (offsetMode === "custom") {
                baseT0 = customOffset;
            } else {
                baseT0 = 0;
            }

            // Pre-calculate relevant pauses once for all events (O(P) instead of O(P * E))
            var relevantPauses = [];
            if (pauseIntervals.length > 0) {
                for (var pi = 0; pi < pauseIntervals.length; pi++) {
                    var pz = pauseIntervals[pi];
                    if (pz.endSec > baseT0) {
                        var pStart = Math.max(baseT0, pz.startSec);
                        var pEnd = pz.endSec;
                        if (pEnd > pStart) {
                            relevantPauses.push({
                                startSec: pStart,
                                endSec: pEnd,
                                duration: pEnd - pStart
                            });
                        }
                    }
                }
            }

            /**
             * Convert Game Time Seconds into Timeline Seconds with Pause Compensation and Game Start Offset
             */
            function calculateEventTimes(eventSec) {
                var currentTlSec = baseT0;
                var rawSec = Number(eventSec);
                var remainingGameSec = Math.max(0, rawSec - gameStartTimeSec);

                if (relevantPauses.length > 0) {
                    for (var i = 0; i < relevantPauses.length; i++) {
                        var pause = relevantPauses[i];
                        var playableTimeBeforePause = pause.startSec - currentTlSec;

                        if (remainingGameSec < playableTimeBeforePause) {
                            currentTlSec = currentTlSec + remainingGameSec;
                            remainingGameSec = 0;
                            break;
                        }

                        remainingGameSec -= playableTimeBeforePause;
                        currentTlSec = pause.endSec;
                    }

                    if (remainingGameSec > 0) {
                        currentTlSec += remainingGameSec;
                    }
                } else {
                    currentTlSec = baseT0 + remainingGameSec;
                }

                var tlSec = Math.max(0, currentTlSec);
                var mediaSec = selectedClip ? Math.max(0, clipInSec + (tlSec - clipStartSec)) : tlSec;

                return {
                    timelineSec: tlSec,
                    mediaMarkerSec: mediaSec
                };
            }

            var markersCreated = 0;
            var itemsInserted = 0;
            var itemsSkipped = 0;
            var logMessages = [];

            if (gameStartTimeSec > 0) {
                logMessages.push("⏱️ Dados coletados a partir dos " + gameStartTimeSec + "s da partida (anteriores ignorados).");
            }

            if (pauseIntervals.length > 0) {
                logMessages.push("⏸️ " + pauseIntervals.length + " pausas detectadas (" + Math.round(totalPauseSec) + "s compensados).");
            }

            if (clipEndTimelineSec > 0) {
                logMessages.push("🎬 Respeitando fim do clipe: nenhum marcador/item após " + Math.round(clipEndTimelineSec) + "s.");
            }

            // Helper to create marker on clip and/or sequence
            function addMarker(name, comments, colorIndex, times, endTimes) {
                var created = false;
                var targetMediaSec = Number(times.mediaMarkerSec) || 0;
                var targetTimelineSec = Number(times.timelineSec) || 0;

                // Check clip boundary for media
                if (clipEndTimelineSec > 0 && targetTimelineSec > (clipEndTimelineSec + 0.05)) {
                    return false;
                }

                // 1. Create on Selected Clip
                if (applyToClip && clipMarkers) {
                    if (!(clipEndMediaSec > 0 && targetMediaSec > (clipEndMediaSec + 0.05))) {
                        try {
                            var cMarker = clipMarkers.createMarker(targetMediaSec);
                            if (cMarker) {
                                try { cMarker.name = name; } catch(eN) {}
                                try { cMarker.comments = comments; } catch(eC) {}
                                try { cMarker.setColorByIndex(colorIndex); } catch (eColor) {}
                                if (endTimes) {
                                    var endMedia = Number(endTimes.mediaMarkerSec) || 0;
                                    if (clipEndMediaSec > 0 && endMedia > clipEndMediaSec) {
                                        endMedia = clipEndMediaSec;
                                    }
                                    if (endMedia > targetMediaSec) {
                                        try { cMarker.end = endMedia; } catch(eEnd1) {}
                                        try { cMarker.end.seconds = endMedia; } catch(eEnd2) {}
                                    }
                                }
                                markersCreated++;
                                created = true;
                            }
                        } catch (eClipM) {}
                    }
                }

                // 2. Create on Sequence Timeline (or fallback if clip marker failed)
                if ((applyToSeq || !created) && seqMarkers) {
                    try {
                        var sMarker = seqMarkers.createMarker(targetTimelineSec);
                        if (sMarker) {
                            try { sMarker.name = name; } catch(eN) {}
                            try { sMarker.comments = comments; } catch(eC) {}
                            try { sMarker.setColorByIndex(colorIndex); } catch (eColor) {}
                            if (endTimes) {
                                var endTl = Number(endTimes.timelineSec) || 0;
                                if (clipEndTimelineSec > 0 && endTl > clipEndTimelineSec) {
                                    endTl = clipEndTimelineSec;
                                }
                                if (endTl > targetTimelineSec) {
                                    try { sMarker.end = endTl; } catch(eEnd3) {}
                                    try { sMarker.end.seconds = endTl; } catch(eEnd4) {}
                                }
                            }
                            if (!created) markersCreated++;
                            created = true;
                        }
                    } catch (eSeqM) {}
                }

                return created;
            }

            // Pause auto-save during batch marker creation to avoid locking Premiere's UI thread
            var prevPauseAutoSave = false;
            try {
                if (app.project && typeof app.project.pauseAutoSave !== 'undefined') {
                    prevPauseAutoSave = app.project.pauseAutoSave;
                    app.project.pauseAutoSave = true;
                }
            } catch (eAs) {}

            // 1. Create Bin for imported items
            var binName = payload.binName || ("Deadlock - " + heroName + " (Partida " + matchId + ")");
            var targetBin = this.getOrCreateBin(binName);

            // 2. Process Ability Markers
            if (createAbilityMarkers && abilities.length > 0) {
                var abCreated = 0;
                for (var a = 0; a < abilities.length; a++) {
                    var ab = abilities[a];
                    if (ab.enabled === false) continue;
                    if (Number(ab.timeSeconds) < gameStartTimeSec) continue;

                    var eventTimes = calculateEventTimes(Number(ab.timeSeconds));
                    if (clipEndTimelineSec > 0 && eventTimes.timelineSec > (clipEndTimelineSec + 0.05)) {
                        continue;
                    }

                    var colorIdx = colorT0;
                    if (ab.shortTier === "T3") colorIdx = colorT3;
                    else if (ab.shortTier === "T2") colorIdx = colorT2;
                    else if (ab.shortTier === "T1") colorIdx = colorT1;
                    else colorIdx = colorT0;

                    var markerName = ab.markerName || ("⚡ " + ab.name + " (" + (ab.shortTier || "UP") + ")");
                    var markerComments = ab.markerComments || ("Habilidade: " + ab.name + "\nNível: " + (ab.tierLabel || "Upgrade") + "\nTempo de Partida: " + ab.timeFormatted);

                    if (addMarker(markerName, markerComments, colorIdx, eventTimes)) {
                        abCreated++;
                    }
                }
                logMessages.push(abCreated + " marcadores de habilidade criados.");
            }

            // 3. Process Item Purchases
            if (items.length > 0) {
                var trackIndex = Math.max(0, targetTrackNum - 1);
                var targetTrack = insertItemClips ? this.ensureVideoTrack(activeSeq, trackIndex) : null;
                
                var secondaryTrackIndex = Math.max(0, secondaryTrackNum - 1);
                var secondaryTargetTrack = (insertItemClips && insertBothItemTypes) ? this.ensureVideoTrack(activeSeq, secondaryTrackIndex) : null;

                var currentItemIndex = 0;

                for (var i = 0; i < items.length; i++) {
                    var it = items[i];
                    if (it.enabled === false) continue;
                    if (Number(it.timeSeconds) < gameStartTimeSec) continue;

                    var itTimes = calculateEventTimes(Number(it.timeSeconds));
                    var itemTimelineSec = itTimes.timelineSec;

                    // Respect clip duration limit
                    if (clipEndTimelineSec > 0 && itemTimelineSec > (clipEndTimelineSec + 0.05)) {
                        continue;
                    }

                    currentItemIndex++;
                    var itemNumPrefix = (currentItemIndex < 10 ? "0" : "") + currentItemIndex;
                    var itemDisplayName = itemNumPrefix + " - " + it.name;

                    // Create item marker if requested
                    if (createItemMarkers) {
                        var itMarkerName = it.markerName || ("🛒 " + itemDisplayName + " (" + (it.slotType || "Item") + ")");
                        var itMarkerComments = it.markerComments || ("Item Comprado: " + it.name + "\nCusto: " + (it.cost || 0) + " Souls\nTempo de Partida: " + it.timeFormatted);
                        addMarker(itMarkerName, itMarkerComments, colorItem, itTimes);
                    }

                    // 1. Insert item clip on primary target track (Icons or default style)
                    if (insertItemClips && it.localPngPath && targetTrack) {
                        var pngFile = new File(it.localPngPath);
                        if (pngFile.exists) {
                            var projectItem = this.findProjectItemByPath(targetBin, pngFile.fsName);
                            if (!projectItem) {
                                try {
                                    app.project.importFiles([pngFile.fsName], false, targetBin, false);
                                    projectItem = this.findProjectItemByPath(targetBin, pngFile.fsName);
                                } catch(eImp) {}
                            }

                            if (projectItem) {
                                try {
                                    projectItem.name = itemDisplayName + (insertBothItemTypes ? " (Ícone)" : "");
                                } catch (eName) {}

                                try {
                                    projectItem.setInPoint(0, 4);
                                    projectItem.setOutPoint(clipDurationSec, 4);
                                } catch (eInOut) {}

                                var insertTime = new Time();
                                insertTime.seconds = itemTimelineSec;

                                var inserted = false;
                                try {
                                    targetTrack.overwriteClip(projectItem, insertTime);
                                    inserted = true;
                                } catch (eOv1) {
                                    try {
                                        targetTrack.overwriteClip(projectItem, itemTimelineSec);
                                        inserted = true;
                                    } catch (eOv2) {}
                                }

                                if (inserted) {
                                    itemsInserted++;
                                } else {
                                    itemsSkipped++;
                                }
                            } else {
                                itemsSkipped++;
                                logMessages.push("Item não pôde ser importado: " + it.name);
                            }
                        } else {
                            itemsSkipped++;
                            logMessages.push("Arquivo PNG não encontrado no disco: " + it.name);
                        }
                    } else if (insertItemClips && !it.localPngPath) {
                        itemsSkipped++;
                    }

                    // 2. Insert secondary item clip on secondary track (Cards Detalhados when 'both' is selected)
                    if (insertItemClips && insertBothItemTypes && it.localDescPngPath && secondaryTargetTrack) {
                        var descPngFile = new File(it.localDescPngPath);
                        if (descPngFile.exists) {
                            var descProjectItem = this.findProjectItemByPath(targetBin, descPngFile.fsName);
                            if (!descProjectItem) {
                                try {
                                    app.project.importFiles([descPngFile.fsName], false, targetBin, false);
                                    descProjectItem = this.findProjectItemByPath(targetBin, descPngFile.fsName);
                                } catch(eImp2) {}
                            }

                            if (descProjectItem) {
                                try {
                                    descProjectItem.name = itemDisplayName + " (Card)";
                                } catch (eName2) {}

                                try {
                                    descProjectItem.setInPoint(0, 4);
                                    descProjectItem.setOutPoint(clipDurationSec, 4);
                                } catch (eInOut2) {}

                                var insertTime2 = new Time();
                                insertTime2.seconds = itemTimelineSec;

                                try {
                                    secondaryTargetTrack.overwriteClip(descProjectItem, insertTime2);
                                } catch (eOv3) {
                                    try {
                                        secondaryTargetTrack.overwriteClip(descProjectItem, itemTimelineSec);
                                    } catch (eOv4) {}
                                }
                            }
                        }
                    }
                }

                if (insertItemClips) {
                    if (insertBothItemTypes && secondaryTargetTrack) {
                        logMessages.push(itemsInserted + " itens inseridos em modo Duplo (Ícones na V" + (trackIndex + 1) + " e Cards na V" + (secondaryTrackIndex + 1) + ").");
                    } else {
                        logMessages.push(itemsInserted + " itens PNG inseridos na Camada V" + (trackIndex + 1) + ".");
                    }
                }
            }

            // 4. Process Kill Markers
            var createKillMarkers = payload.createKillMarkers !== false;
            if (createKillMarkers && kills.length > 0) {
                var killsCreated = 0;
                for (var ki = 0; ki < kills.length; ki++) {
                    var k = kills[ki];
                    if (k.enabled === false) continue;
                    if (Number(k.timeSeconds) < gameStartTimeSec) continue;

                    var kTimes = calculateEventTimes(Number(k.timeSeconds));
                    if (clipEndTimelineSec > 0 && kTimes.timelineSec > (clipEndTimelineSec + 0.05)) {
                        continue;
                    }

                    var kMarkerName = k.markerName || ("💀 Kill: " + (k.victimHero || "Inimigo"));
                    var kMarkerComments = k.markerComments || ("Abateu " + (k.victimHero || "Inimigo") + " aos " + (k.timeFormatted || ""));

                    if (addMarker(kMarkerName, kMarkerComments, colorKill, kTimes)) {
                        killsCreated++;
                    }
                }
                if (killsCreated > 0) {
                    logMessages.push(killsCreated + " marcadores de Kill criados.");
                }
            }

            // 5. Process Assist Markers
            var createAssistMarkers = payload.createAssistMarkers !== false;
            if (createAssistMarkers && assists.length > 0) {
                var assistsCreated = 0;
                for (var ai = 0; ai < assists.length; ai++) {
                    var a = assists[ai];
                    if (a.enabled === false) continue;
                    if (Number(a.timeSeconds) < gameStartTimeSec) continue;

                    var aTimes = calculateEventTimes(Number(a.timeSeconds));
                    if (clipEndTimelineSec > 0 && aTimes.timelineSec > (clipEndTimelineSec + 0.05)) {
                        continue;
                    }

                    var aMarkerName = a.markerName || ("🤝 Assist: " + (a.victimHero || "Inimigo"));
                    var aMarkerComments = a.markerComments || ("Assistência em " + (a.victimHero || "Inimigo") + " (abate por " + (a.killerHero || "Aliado") + ") aos " + (a.timeFormatted || ""));

                    if (addMarker(aMarkerName, aMarkerComments, colorAssist, aTimes)) {
                        assistsCreated++;
                    }
                }
                if (assistsCreated > 0) {
                    logMessages.push(assistsCreated + " marcadores de Assistência criados.");
                }
            }

            // 6. Process Death Markers
            var createDeathMarkers = payload.createDeathMarkers !== false;
            if (createDeathMarkers && deaths.length > 0) {
                var deathsCreated = 0;
                for (var di = 0; di < deaths.length; di++) {
                    var d = deaths[di];
                    if (d.enabled === false) continue;
                    if (Number(d.timeSeconds) < gameStartTimeSec) continue;

                    var dStartSec = Number(d.timeSeconds);
                    var dDurationSec = Number(d.deathDurationS || d.durationSeconds || 0);
                    var dTimes = calculateEventTimes(dStartSec);
                    if (clipEndTimelineSec > 0 && dTimes.timelineSec > (clipEndTimelineSec + 0.05)) {
                        continue;
                    }

                    var dEndTimes = (dDurationSec > 0) ? calculateEventTimes(dStartSec + dDurationSec) : null;

                    var dMarkerName = d.markerName || ("☠️ Morte: " + (d.killerHero || "Inimigo") + (dDurationSec > 0 ? (" (" + dDurationSec + "s)") : ""));
                    var dMarkerComments = d.markerComments || ("Morto por " + (d.killerHero || "Inimigo") + " aos " + (d.timeFormatted || "") + (dDurationSec > 0 ? ("\nTempo de Respawn: " + dDurationSec + "s") : ""));

                    if (addMarker(dMarkerName, dMarkerComments, colorDeath, dTimes, dEndTimes)) {
                        deathsCreated++;
                    }
                }
                if (deathsCreated > 0) {
                    logMessages.push(deathsCreated + " marcadores de Morte criados.");
                }
            }

            // Restore Premiere Pro AutoSave
            try {
                if (app.project && typeof app.project.pauseAutoSave !== 'undefined') {
                    app.project.pauseAutoSave = prevPauseAutoSave;
                }
            } catch (eAsRestore) {}

            // Force timeline redraw in Premiere Pro
            try {
                var pPos = activeSeq.getPlayerPosition();
                if (pPos) {
                    activeSeq.setPlayerPosition(pPos);
                }
            } catch (eRedraw) {}

            var destDescription = applyToClip ? ("no vídeo \"" + targetClipName + "\"") : "na linha de tempo da sequência";
            if (markerTarget === "both") {
                destDescription = "no vídeo \"" + targetClipName + "\" e na linha de tempo";
            }

            return JSON.stringify({
                success: true,
                heroName: heroName,
                matchId: matchId,
                targetName: targetClipName || activeSeq.name,
                destinationDescription: destDescription,
                markerTarget: markerTarget,
                markersCreated: markersCreated,
                itemsInserted: itemsInserted,
                itemsSkipped: itemsSkipped,
                targetTrack: targetTrackNum,
                secondaryTargetTrack: secondaryTrackNum,
                insertBothItemTypes: insertBothItemTypes,
                pausesDetectedCount: pauseIntervals.length,
                totalPauseDurationSec: totalPauseSec,
                messages: logMessages
            });

        } catch (err) {
            try {
                if (app.project && typeof app.project.pauseAutoSave !== 'undefined') {
                    app.project.pauseAutoSave = prevPauseAutoSave;
                }
            } catch (eAsCatch) {}
            return JSON.stringify({
                success: false,
                error: "Erro na execução do script do Premiere Pro: " + err.message
            });
        }
    },

    /**
     * Open native OS Folder Picker Dialog in Premiere Pro
     */
    selectFolderDialog: function(promptText) {
        try {
            var promptStr = promptText || "Selecione a pasta Deadlock_Assets:";
            var folder = Folder.selectDialog(promptStr);
            if (folder) {
                return JSON.stringify({
                    success: true,
                    path: folder.fsName
                });
            } else {
                return JSON.stringify({
                    success: false,
                    canceled: true
                });
            }
        } catch (e) {
            return JSON.stringify({
                success: false,
                error: e.message
            });
        }
    }
};

