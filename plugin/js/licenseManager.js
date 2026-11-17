/**
 * licenseManager.js - Hardware-Locked License Activation & Verification System
 * Integrated with Supabase (PostgreSQL & RPC)
 */

const SUPABASE_CONFIG = {
    url: 'https://mhuaevxnbvnsozstpkza.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1odWFldnhuYnZuc296c3Rwa3phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNjA5NzAsImV4cCI6MjEwMzkzNjk3MH0.V8v-DCsb4z5GLQ13htg6paO_3I-F4-Zeg7hJJy59Yvg'
};

const LicenseManager = {
    supabaseUrl: SUPABASE_CONFIG.url,
    anonKey: SUPABASE_CONFIG.anonKey,
    cachedLicense: null,

    /**
     * Get unique Windows Hardware ID (MachineGuid)
     */
    getMachineHardwareId() {
        let child_process = null;
        let crypto = null;
        try {
            if (typeof window !== 'undefined' && window.require) {
                child_process = window.require('child_process');
                crypto = window.require('crypto');
            } else if (typeof require !== 'undefined') {
                child_process = require('child_process');
                crypto = require('crypto');
            }
        } catch (e) {}

        if (!child_process || !crypto) {
            return 'BROWSER_DEMO_HWID_998877';
        }

        try {
            // Read unique Windows Cryptography MachineGuid
            const output = child_process.execSync(
                'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
                { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
            );
            const match = output.match(/MachineGuid\s+REG_SZ\s+(.*)/i);
            const rawGuid = match ? match[1].trim() : 'DEFAULT_WINDOWS_MACHINE_GUID';
            return crypto.createHash('sha256').update(rawGuid).digest('hex').substring(0, 32).toUpperCase();
        } catch (err) {
            return 'WIN_HWID_FALLBACK_DEFAULT';
        }
    },

    getMachineName() {
        if (typeof process !== 'undefined' && process.env && process.env.COMPUTERNAME) {
            return process.env.COMPUTERNAME;
        }
        return 'Windows PC';
    },

    getLicenseFilePath() {
        let path = null;
        let os = null;
        try {
            if (typeof window !== 'undefined' && window.require) {
                path = window.require('path');
                os = window.require('os');
            } else if (typeof require !== 'undefined') {
                path = require('path');
                os = require('os');
            }
        } catch (e) {}

        if (!path) return null;
        const appData = (typeof process !== 'undefined' && process.env && process.env.APPDATA) || (os && typeof os.homedir === 'function' ? path.join(os.homedir(), 'AppData', 'Roaming') : null);
        return appData ? path.join(appData, 'DeadlockMatchScanner', 'license.json') : null;
    },

    loadLocalLicense() {
        try {
            let fs = null;
            if (typeof window !== 'undefined' && window.require) fs = window.require('fs');
            else if (typeof require !== 'undefined') fs = require('fs');

            const lPath = this.getLicenseFilePath();
            if (fs && lPath && fs.existsSync(lPath)) {
                const data = JSON.parse(fs.readFileSync(lPath, 'utf8'));
                const curHwid = this.getMachineHardwareId();
                if (data && data.licenseKey && data.hwid === curHwid) {
                    this.cachedLicense = data;
                    return data;
                }
            }
        } catch (e) {}
        this.cachedLicense = null;
        return null;
    },

    saveLocalLicense(licenseData) {
        try {
            let fs = null;
            let path = null;
            if (typeof window !== 'undefined' && window.require) {
                fs = window.require('fs');
                path = window.require('path');
            } else if (typeof require !== 'undefined') {
                fs = require('fs');
                path = require('path');
            }

            const lPath = this.getLicenseFilePath();
            if (fs && path && lPath) {
                const dir = path.dirname(lPath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(lPath, JSON.stringify(licenseData, null, 2), 'utf8');
                this.cachedLicense = licenseData;
            }
        } catch (e) {}
    },

    clearLocalLicense() {
        try {
            let fs = null;
            if (typeof window !== 'undefined' && window.require) fs = window.require('fs');
            else if (typeof require !== 'undefined') fs = require('fs');

            const lPath = this.getLicenseFilePath();
            if (fs && lPath && fs.existsSync(lPath)) {
                fs.unlinkSync(lPath);
            }
        } catch (e) {}
        this.cachedLicense = null;
    },

    /**
     * Check synchronously if user has an active Pro license
     */
    isPro() {
        const local = this.loadLocalLicense();
        if (!local || !local.licenseKey) return false;
        
        // Se tiver expiração gravada, checa se ainda é válida
        if (local.expiresAt) {
            const expDate = new Date(local.expiresAt);
            if (expDate.getTime() < Date.now()) {
                return false;
            }
        }
        return true;
    },

    getLicenseInfo() {
        const local = this.loadLocalLicense();
        if (!local || !local.licenseKey) {
            return { isPro: false, planType: 'free' };
        }

        let isExpired = false;
        let daysLeft = null;
        if (local.expiresAt) {
            const diff = new Date(local.expiresAt).getTime() - Date.now();
            daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
            if (diff < 0) isExpired = true;
        }

        return {
            isPro: !isExpired,
            licenseKey: local.licenseKey,
            customerEmail: local.customerEmail || '',
            planType: local.planType || 'monthly',
            expiresAt: local.expiresAt || null,
            daysLeft: daysLeft,
            hwid: local.hwid || ''
        };
    },

    /**
     * Check if currently licensed
     */
    async checkLicenseStatus() {
        const local = this.loadLocalLicense();
        if (local && local.licenseKey) {
            const proStatus = this.isPro();
            // Background verification with Supabase
            setTimeout(() => {
                this.verifyWithServer(local.licenseKey).catch(() => {});
            }, 1000);
            return { isLicensed: proStatus, isPro: proStatus, license: local };
        }
        return { isLicensed: false, isPro: false, license: null };
    },

    getRateLimitFilePath() {
        let path = null;
        let os = null;
        try {
            if (typeof window !== 'undefined' && window.require) {
                path = window.require('path');
                os = window.require('os');
            } else if (typeof require !== 'undefined') {
                path = require('path');
                os = require('os');
            }
        } catch (e) {}

        if (!path) return null;
        const appData = (typeof process !== 'undefined' && process.env && process.env.APPDATA) || (os && typeof os.homedir === 'function' ? path.join(os.homedir(), 'AppData', 'Roaming') : null);
        return appData ? path.join(appData, 'DeadlockMatchScanner', 'rate_limit.json') : null;
    },

    getRateLimitState() {
        // Tenta ler do arquivo local (%APPDATA%) primeiro
        try {
            let fs = null;
            if (typeof window !== 'undefined' && window.require) fs = window.require('fs');
            else if (typeof require !== 'undefined') fs = require('fs');

            const rPath = this.getRateLimitFilePath();
            if (fs && rPath && fs.existsSync(rPath)) {
                const content = fs.readFileSync(rPath, 'utf8');
                if (content) return JSON.parse(content);
            }
        } catch (e) {}

        // Fallback para localStorage
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const stored = window.localStorage.getItem('deadlock_activation_ratelimit');
                if (stored) return JSON.parse(stored);
            }
        } catch (e) {}

        return { consecutiveFailures: 0, blockedUntil: 0, currentPenaltySec: 0 };
    },

    saveRateLimitState(state) {
        // Grava no arquivo (%APPDATA%)
        try {
            let fs = null;
            let path = null;
            if (typeof window !== 'undefined' && window.require) {
                fs = window.require('fs');
                path = window.require('path');
            } else if (typeof require !== 'undefined') {
                fs = require('fs');
                path = require('path');
            }

            const rPath = this.getRateLimitFilePath();
            if (fs && path && rPath) {
                const dir = path.dirname(rPath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(rPath, JSON.stringify(state, null, 2), 'utf8');
            }
        } catch (e) {}

        // Grava no localStorage como redundância
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.setItem('deadlock_activation_ratelimit', JSON.stringify(state));
            }
        } catch (e) {}
    },

    clearRateLimitState() {
        try {
            let fs = null;
            if (typeof window !== 'undefined' && window.require) fs = window.require('fs');
            else if (typeof require !== 'undefined') fs = require('fs');

            const rPath = this.getRateLimitFilePath();
            if (fs && rPath && fs.existsSync(rPath)) {
                fs.unlinkSync(rPath);
            }
        } catch (e) {}

        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                window.localStorage.removeItem('deadlock_activation_ratelimit');
            }
        } catch (e) {}
    },

    calculatePenaltySeconds(failures) {
        if (failures < 4) return 0;
        // Escala Exponencial Progressiva:
        // Falha 4: 60s
        // Falha 5: 120s
        // Falha 6: 240s
        // Falha 7: 480s
        // Falha 8+: 960s
        const step = failures - 4;
        const base = 60;
        return base * Math.pow(2, Math.min(step, 4));
    },

    isRateLimited() {
        const state = this.getRateLimitState();
        if (!state || !state.blockedUntil) {
            return { blocked: false, remainingSec: 0, consecutiveFailures: (state && state.consecutiveFailures) || 0 };
        }
        const now = Date.now();
        if (now < state.blockedUntil) {
            const remainingSec = Math.max(1, Math.ceil((state.blockedUntil - now) / 1000));
            return {
                blocked: true,
                remainingSec: remainingSec,
                consecutiveFailures: state.consecutiveFailures || 0,
                penaltySeconds: state.currentPenaltySec || remainingSec
            };
        }
        return {
            blocked: false,
            remainingSec: 0,
            consecutiveFailures: state.consecutiveFailures || 0
        };
    },

    recordActivationFailure(serverPenaltySec) {
        const state = this.getRateLimitState() || { consecutiveFailures: 0 };
        state.consecutiveFailures = (state.consecutiveFailures || 0) + 1;
        state.lastAttemptAt = new Date().toISOString();

        let penaltySec = this.calculatePenaltySeconds(state.consecutiveFailures);
        if (serverPenaltySec && Number(serverPenaltySec) > penaltySec) {
            penaltySec = Number(serverPenaltySec);
        }

        if (penaltySec > 0) {
            state.blockedUntil = Date.now() + (penaltySec * 1000);
            state.currentPenaltySec = penaltySec;
        } else {
            state.blockedUntil = 0;
            state.currentPenaltySec = 0;
        }

        this.saveRateLimitState(state);
        return {
            blocked: penaltySec > 0,
            remainingSec: penaltySec,
            consecutiveFailures: state.consecutiveFailures,
            attemptsLeft: Math.max(0, 4 - state.consecutiveFailures)
        };
    },

    recordActivationSuccess() {
        this.clearRateLimitState();
    },

    /**
     * Activate License with Supabase RPC + Anti-Bruteforce Defense
     */
    async activate(rawKey) {
        // 1. Checa trava local de rate limit antes de enviar requisição
        const lockStatus = this.isRateLimited();
        if (lockStatus.blocked) {
            const err = new Error(`Muitas tentativas incorretas. Computador bloqueado temporariamente.`);
            err.code = 'RATE_LIMITED';
            err.remainingSec = lockStatus.remainingSec;
            err.penaltySeconds = lockStatus.penaltySeconds;
            throw err;
        }

        const licenseKey = (rawKey || '').trim().toUpperCase();
        if (!licenseKey) {
            throw new Error('Por favor, digite a chave de licença.');
        }

        const hwid = this.getMachineHardwareId();
        const machineName = this.getMachineName();

        const endpoint = `${this.supabaseUrl}/rest/v1/rpc/activate_license`;
        let res;
        try {
            res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.anonKey,
                    'Authorization': `Bearer ${this.anonKey}`
                },
                body: JSON.stringify({
                    p_license_key: licenseKey,
                    p_hwid: hwid,
                    p_machine_name: machineName
                })
            });
        } catch (networkErr) {
            throw new Error(`Falha na comunicação com o servidor: ${networkErr.message}`);
        }

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Falha na comunicação com o servidor de licença (${res.status}): ${errText}`);
        }

        const data = await res.json();
        if (!data || !data.success) {
            // Registra falha e calcula timeout progressivo (60s, 120s, 240s...)
            const serverPenalty = data && (data.penalty_seconds || data.seconds_left);
            const failInfo = this.recordActivationFailure(serverPenalty);

            const err = new Error(data && data.error ? data.error : 'Chave de licença inválida.');
            err.code = (data && data.code === 'RATE_LIMITED') ? 'RATE_LIMITED' : (failInfo.blocked ? 'RATE_LIMITED' : (data?.code || 'INVALID_KEY'));
            err.remainingSec = (data && data.seconds_left) ? data.seconds_left : failInfo.remainingSec;
            err.attemptsLeft = failInfo.attemptsLeft;
            err.consecutiveFailures = failInfo.consecutiveFailures;
            throw err;
        }

        // Sucesso: zera o contador de falhas
        this.recordActivationSuccess();

        const localRecord = {
            licenseKey: data.licenseKey,
            customerEmail: data.customerEmail,
            customerName: data.customerName,
            planType: data.planType || 'monthly',
            expiresAt: data.expiresAt || null,
            isPro: true,
            hwid: hwid,
            activatedAt: data.activatedAt || new Date().toISOString(),
            lastVerifiedAt: new Date().toISOString()
        };

        this.saveLocalLicense(localRecord);
        return { success: true, record: localRecord, message: data.message };
    },

    /**
     * Verify license on startup
     */
    async verifyWithServer(licenseKey) {
        try {
            const hwid = this.getMachineHardwareId();
            const cleanKey = encodeURIComponent((licenseKey || '').trim().toUpperCase());
            const res = await fetch(`${this.supabaseUrl}/rest/v1/licenses?license_key=eq.${cleanKey}&select=status,expires_at,plan_type,hwid`, {
                headers: {
                    'apikey': this.anonKey
                }
            });

            if (res.ok) {
                const lics = await res.json();
                if (lics && lics.length > 0) {
                    const lic = lics[0];
                    const local = this.loadLocalLicense() || {};
                    const isExpired = lic.expires_at ? (new Date(lic.expires_at).getTime() < Date.now()) : false;
                    const isCancelledStillValid = lic.status === 'cancelled' && !isExpired;
                    const isActive = lic.status === 'active' || isCancelledStillValid;

                    if (isActive && (!lic.hwid || lic.hwid === hwid)) {
                        local.expiresAt = lic.expires_at || null;
                        local.planType = lic.plan_type || 'monthly';
                        local.lastVerifiedAt = new Date().toISOString();
                        this.saveLocalLicense(local);
                    } else if (isExpired || lic.status === 'expired') {
                        local.expiresAt = new Date(Date.now() - 1000).toISOString();
                        this.saveLocalLicense(local);
                    } else if (lic.hwid && lic.hwid !== hwid) {
                        this.clearLocalLicense();
                    }
                }
            }
        } catch (e) {}
    },

    /**
     * Deactivate License (transfer to another PC)
     */
    async deactivate() {
        const local = this.loadLocalLicense();
        if (!local || !local.licenseKey) {
            this.clearLocalLicense();
            return { success: true };
        }

        const hwid = this.getMachineHardwareId();
        const endpoint = `${this.supabaseUrl}/rest/v1/rpc/deactivate_license`;

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.anonKey,
                    'Authorization': `Bearer ${this.anonKey}`
                },
                body: JSON.stringify({
                    p_license_key: local.licenseKey,
                    p_hwid: hwid
                })
            });
            const data = await res.json();
            this.clearLocalLicense();
            return data;
        } catch (e) {
            this.clearLocalLicense();
            return { success: true };
        }
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LicenseManager;
}
if (typeof window !== 'undefined') {
    window.LicenseManager = LicenseManager;
}
