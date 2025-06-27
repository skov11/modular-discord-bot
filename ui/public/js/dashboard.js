class BotDashboard {
    constructor() {
        this.config = {};
        this.originalConfig = {};
        this.websocket = null;
        this.availablePlugins = [];
        this.hasUnsavedChanges = false;
        this.lastModifiedSection = null;
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.setupWebSocket();
        await this.loadConfig();
        await this.loadPlugins();
        this.updateBotStatus();
        
        // Update status every 30 seconds
        setInterval(() => this.updateBotStatus(), 30000);
    }
    
    setupEventListeners() {
        // Section navigation
        document.querySelectorAll('[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(e.target.dataset.section);
            });
        });
        
        // Save configuration
        document.getElementById('save-config').addEventListener('click', () => {
            this.saveConfiguration();
        });
        
        // Restart bot
        document.getElementById('restart-bot').addEventListener('click', () => {
            this.restartBot();
        });
        
        // Plugin reload buttons (use event delegation since buttons are added dynamically)
        document.addEventListener('click', (e) => {
            if (e.target.matches('.reload-plugin-btn') || e.target.closest('.reload-plugin-btn')) {
                const button = e.target.matches('.reload-plugin-btn') ? e.target : e.target.closest('.reload-plugin-btn');
                const pluginName = button.getAttribute('data-plugin');
                if (pluginName) {
                    this.reloadPlugin(pluginName);
                }
            }
        });
        
        // Form change detection
        this.setupFormChangeDetection();
        
        // Setup collapse handlers
        this.setupCollapseHandlers();
    }
    
    setupFormChangeDetection() {
        // Add change listeners to all form inputs
        document.addEventListener('change', (e) => {
            if (e.target.matches('input, select, textarea')) {
                this.updateConfigFromForm();
                this.checkForChanges();
                this.trackModifiedSection(e.target);
            }
        });
        
        document.addEventListener('input', (e) => {
            if (e.target.matches('input[type="text"], input[type="password"], textarea')) {
                this.updateConfigFromForm();
                this.checkForChanges();
                this.trackModifiedSection(e.target);
            }
        });
    }
    
    setupCollapseHandlers() {
        // Handle collapse button state changes using Bootstrap's collapse events
        document.addEventListener('shown.bs.collapse', (e) => {
            const button = document.querySelector(`[data-bs-target="#${e.target.id}"]`);
            if (button) {
                button.classList.remove('collapsed');
                button.setAttribute('aria-expanded', 'true');
            }
        });
        
        document.addEventListener('hidden.bs.collapse', (e) => {
            const button = document.querySelector(`[data-bs-target="#${e.target.id}"]`);
            if (button) {
                button.classList.add('collapsed');
                button.setAttribute('aria-expanded', 'false');
            }
        });
        
        // Initialize collapsed state for buttons that start collapsed
        document.addEventListener('DOMContentLoaded', () => {
            document.querySelectorAll('[data-bs-toggle="collapse"]').forEach(button => {
                const target = document.querySelector(button.dataset.bsTarget);
                if (target && !target.classList.contains('show')) {
                    button.classList.add('collapsed');
                    button.setAttribute('aria-expanded', 'false');
                } else {
                    button.classList.remove('collapsed');
                    button.setAttribute('aria-expanded', 'true');
                }
            });
        });
    }
    
    trackModifiedSection(element) {
        // Find which plugin section was modified
        const pluginSection = element.closest('[id$="-config"]');
        if (pluginSection) {
            this.lastModifiedSection = pluginSection.id;
        } else if (element.closest('#bot-config-form')) {
            this.lastModifiedSection = 'bot-section';
        }
    }
    
    checkForChanges() {
        const currentConfigStr = JSON.stringify(this.config);
        const originalConfigStr = JSON.stringify(this.originalConfig);
        this.hasUnsavedChanges = currentConfigStr !== originalConfigStr;
        this.updateSaveButtonState();
    }
    
    updateSaveButtonState() {
        const saveButton = document.getElementById('save-config');
        if (saveButton) {
            saveButton.disabled = !this.hasUnsavedChanges;
            
            if (this.hasUnsavedChanges) {
                saveButton.innerHTML = '<i class="fas fa-save"></i> Save Changes';
                saveButton.classList.remove('btn-primary');
                saveButton.classList.add('btn-warning');
            } else {
                saveButton.innerHTML = '<i class="fas fa-check"></i> No Changes';
                saveButton.classList.remove('btn-warning');
                saveButton.classList.add('btn-primary');
            }
        }
    }
    
    setupWebSocket() {
        const wsPort = parseInt(window.location.port) + 1 || 3001;
        const wsUrl = `ws://${window.location.hostname}:${wsPort}`;
        
        try {
            this.websocket = new WebSocket(wsUrl);
            
            this.websocket.onopen = () => {
                console.log('WebSocket connected');
                this.showAlert('Connected to bot', 'success');
            };
            
            this.websocket.onmessage = (event) => {
                const message = JSON.parse(event.data);
                this.handleWebSocketMessage(message);
            };
            
            this.websocket.onclose = () => {
                console.log('WebSocket disconnected');
                this.showAlert('Disconnected from bot', 'warning');
                
                // Attempt to reconnect after 5 seconds
                setTimeout(() => this.setupWebSocket(), 5000);
            };
            
            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.showAlert('Connection error', 'danger');
            };
        } catch (error) {
            console.error('Failed to setup WebSocket:', error);
            this.showAlert('Failed to connect to bot', 'danger');
        }
    }
    
    handleWebSocketMessage(message) {
        switch (message.type) {
            case 'configChanged':
                this.config = message.config;
                this.populateConfigForm();
                this.showAlert('Configuration updated from bot', 'info');
                break;
            case 'botStatus':
                this.updateBotStatusDisplay(message.status);
                break;
            default:
                console.log('Unknown WebSocket message:', message);
        }
    }
    
    async loadConfig() {
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                this.config = await response.json();
                this.originalConfig = JSON.parse(JSON.stringify(this.config)); // Deep copy
                this.populateConfigForm();
                this.updateSaveButtonState();
            } else {
                throw new Error('Failed to load configuration');
            }
        } catch (error) {
            console.error('Error loading config:', error);
            this.showAlert('Failed to load configuration', 'danger');
            
            // Initialize with empty config if loading fails
            this.config = {
                bot: {
                    token: '',
                    clientId: '',
                    guildId: ''
                },
                plugins: {}
            };
            this.originalConfig = JSON.parse(JSON.stringify(this.config));
            this.populateConfigForm();
            this.updateSaveButtonState();
        }
    }
    
    async loadPlugins() {
        try {
            const response = await fetch('/api/plugins');
            if (response.ok) {
                this.availablePlugins = await response.json();
                this.renderPluginConfiguration();
            } else {
                throw new Error('Failed to load plugins');
            }
        } catch (error) {
            console.error('Error loading plugins:', error);
            this.showAlert('Failed to load available plugins', 'warning');
        }
    }
    
    populateConfigForm() {
        // Bot configuration
        document.getElementById('bot-token').value = this.config.bot?.token || '';
        document.getElementById('client-id').value = this.config.bot?.clientId || '';
        document.getElementById('guild-id').value = this.config.bot?.guildId || '';
        
        // Re-render plugin configuration
        this.renderPluginConfiguration();
        
        // Reset change tracking after initial population
        setTimeout(() => {
            this.hasUnsavedChanges = false;
            this.updateSaveButtonState();
        }, 100);
    }
    
    renderPluginConfiguration() {
        const container = document.getElementById('plugins-container');
        container.innerHTML = '';
        
        this.availablePlugins.forEach(plugin => {
            const pluginConfig = this.config.plugins?.[plugin.name] || {};
            const pluginCard = this.createPluginCard(plugin, pluginConfig);
            container.appendChild(pluginCard);
        });
    }
    
    createPluginCard(plugin, config) {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        
        // Special handling for verification plugin
        if (plugin.name === 'verification') {
            card.innerHTML = this.createVerificationPluginForm(config);
        } else {
            card.innerHTML = this.createGenericPluginForm(plugin, config);
        }
        
        return card;
    }
    
    createVerificationPluginForm(config) {
        return `
            <div class="card-header d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center">
                    <h6 class="mb-0 me-3"><i class="fas fa-shield-alt"></i> Verification Plugin</h6>
                    <button class="btn btn-sm btn-outline-secondary collapse-toggle collapsed" type="button" data-bs-toggle="collapse" 
                            data-bs-target="#verification-config" aria-expanded="false" aria-controls="verification-config"
                            title="Toggle configuration section">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info ms-2 reload-plugin-btn" type="button" 
                            data-plugin="verification" title="Reload plugin">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="verification-enabled" 
                           ${config.enabled !== false ? 'checked' : ''}>
                    <label class="form-check-label" for="verification-enabled">Enabled</label>
                </div>
            </div>
            <div class="collapse" id="verification-config">
                <div class="card-body">
                <div class="row">
                    <div class="col-md-6">
                        <h6>Channels</h6>
                        <div class="mb-3">
                            <label for="verify-channel-id" class="form-label">Verify Channel ID *</label>
                            <input type="text" class="form-control" id="verify-channel-id" 
                                   value="${config.channels?.verifyChannelId || ''}" required>
                        </div>
                        <div class="mb-3">
                            <label for="verify-command-channel-id" class="form-label">Verify Command Channel ID *</label>
                            <input type="text" class="form-control" id="verify-command-channel-id" 
                                   value="${config.channels?.verifyCommandChannelId || ''}" required>
                        </div>
                        <div class="mb-3">
                            <label for="log-channel-id" class="form-label">Log Channel ID</label>
                            <input type="text" class="form-control" id="log-channel-id" 
                                   value="${config.channels?.logChannelId || ''}">
                        </div>
                        <div class="mb-3">
                            <label for="how-to-verify-id" class="form-label">How To Verify Channel ID</label>
                            <input type="text" class="form-control" id="how-to-verify-id" 
                                   value="${config.channels?.howToVerifyID || ''}">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <h6>Roles</h6>
                        <div class="mb-3">
                            <label for="verified-role-id" class="form-label">Verified Role ID *</label>
                            <input type="text" class="form-control" id="verified-role-id" 
                                   value="${config.roles?.verifiedRoleId || ''}" required>
                        </div>
                        <div class="mb-3">
                            <label for="verifier-role-ids" class="form-label">Verifier Role IDs *</label>
                            <input type="text" class="form-control" id="verifier-role-ids" 
                                   value="${config.roles?.verifierRoleIds?.join(', ') || ''}" 
                                   placeholder="Comma-separated role IDs" required>
                            <div class="form-text">Enter multiple role IDs separated by commas</div>
                        </div>
                        
                        <h6>Settings</h6>
                        <div class="mb-3">
                            <label for="screenshot-count" class="form-label">Screenshot Count</label>
                            <select class="form-select" id="screenshot-count">
                                <option value="0" ${config.settings?.screenshotCount === 0 ? 'selected' : ''}>0 - No screenshots</option>
                                <option value="1" ${config.settings?.screenshotCount === 1 ? 'selected' : ''}>1 - Single screenshot</option>
                                <option value="2" ${config.settings?.screenshotCount === 2 || !config.settings?.screenshotCount ? 'selected' : ''}>2 - Dual screenshots</option>
                            </select>
                        </div>
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="checkbox" id="require-character-name" 
                                   ${config.settings?.requireCharacterName !== false ? 'checked' : ''}>
                            <label class="form-check-label" for="require-character-name">
                                Require Character Name
                            </label>
                        </div>
                        <div class="form-check mb-3">
                            <input class="form-check-input" type="checkbox" id="require-guild-name" 
                                   ${config.settings?.requireGuildName !== false ? 'checked' : ''}>
                            <label class="form-check-label" for="require-guild-name">
                                Require Guild Name
                            </label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="debug-mode" 
                                   ${config.settings?.debugMode ? 'checked' : ''}>
                            <label class="form-check-label" for="debug-mode">
                                Debug Mode
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="row mt-3">
                    <div class="col-md-12">
                        <h6>Messages</h6>
                        <div class="mb-3">
                            <label for="approval-message" class="form-label">Approval Message</label>
                            <textarea class="form-control" id="approval-message" rows="2">${config.messages?.approvalMessage || '✅ Thank you for verifying! You have been approved.'}</textarea>
                        </div>
                        <div class="mb-3">
                            <label for="denial-message-prefix" class="form-label">Denial Message Prefix</label>
                            <textarea class="form-control" id="denial-message-prefix" rows="2">${config.messages?.denialMessagePrefix || '❌ Your verification has been denied.'}</textarea>
                        </div>
                    </div>
                </div>
                </div>
            </div>
        `;
    }
    
    createGenericPluginForm(plugin, config) {
        const pluginId = `${plugin.name}-config`;
        return `
            <div class="card-header d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center">
                    <h6 class="mb-0 me-3"><i class="fas fa-puzzle-piece"></i> ${plugin.name} Plugin</h6>
                    <button class="btn btn-sm btn-outline-secondary collapse-toggle collapsed" type="button" data-bs-toggle="collapse" 
                            data-bs-target="#${pluginId}" aria-expanded="false" aria-controls="${pluginId}"
                            title="Toggle configuration section">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info ms-2 reload-plugin-btn" type="button" 
                            data-plugin="${plugin.name}" title="Reload plugin">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                </div>
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="${plugin.name}-enabled" 
                           ${config.enabled !== false ? 'checked' : ''}>
                    <label class="form-check-label" for="${plugin.name}-enabled">Enabled</label>
                </div>
            </div>
            <div class="collapse" id="${pluginId}">
                <div class="card-body">
                    <p class="text-muted">Plugin configuration will be available when the plugin is loaded.</p>
                    <textarea class="form-control" rows="10" placeholder="Plugin configuration (JSON format)">${JSON.stringify(config, null, 2)}</textarea>
                </div>
            </div>
        `;
    }
    
    updateConfigFromForm() {
        // Update bot configuration (preserve existing settings)
        if (!this.config.bot) this.config.bot = {};
        
        // Only update the form fields, preserve other settings like enableUI, uiPort, uiAuth
        this.config.bot.token = document.getElementById('bot-token').value;
        this.config.bot.clientId = document.getElementById('client-id').value;
        this.config.bot.guildId = document.getElementById('guild-id').value;
        
        // Update plugin configurations
        if (!this.config.plugins) this.config.plugins = {};
        
        // Update verification plugin (preserve existing settings)
        const verificationEnabled = document.getElementById('verification-enabled');
        if (verificationEnabled) {
            if (!this.config.plugins.verification) {
                this.config.plugins.verification = {};
            }
            
            // Preserve existing configuration and only update form fields
            this.config.plugins.verification.enabled = verificationEnabled.checked;
            
            // Update channels (preserve existing structure)
            if (!this.config.plugins.verification.channels) {
                this.config.plugins.verification.channels = {};
            }
            this.config.plugins.verification.channels.verifyChannelId = document.getElementById('verify-channel-id')?.value || '';
            this.config.plugins.verification.channels.verifyCommandChannelId = document.getElementById('verify-command-channel-id')?.value || '';
            this.config.plugins.verification.channels.logChannelId = document.getElementById('log-channel-id')?.value || '';
            this.config.plugins.verification.channels.howToVerifyID = document.getElementById('how-to-verify-id')?.value || '';
            
            // Update roles (preserve existing structure)
            if (!this.config.plugins.verification.roles) {
                this.config.plugins.verification.roles = {};
            }
            this.config.plugins.verification.roles.verifiedRoleId = document.getElementById('verified-role-id')?.value || '';
            this.config.plugins.verification.roles.verifierRoleIds = document.getElementById('verifier-role-ids')?.value.split(',').map(id => id.trim()).filter(id => id);
            
            // Update messages (preserve existing structure)
            if (!this.config.plugins.verification.messages) {
                this.config.plugins.verification.messages = {};
            }
            this.config.plugins.verification.messages.approvalMessage = document.getElementById('approval-message')?.value || '';
            this.config.plugins.verification.messages.denialMessagePrefix = document.getElementById('denial-message-prefix')?.value || '';
            
            // Update settings (preserve existing structure)
            if (!this.config.plugins.verification.settings) {
                this.config.plugins.verification.settings = {};
            }
            this.config.plugins.verification.settings.debugMode = document.getElementById('debug-mode')?.checked || false;
            this.config.plugins.verification.settings.screenshotCount = parseInt(document.getElementById('screenshot-count')?.value) || 0;
            this.config.plugins.verification.settings.requireCharacterName = document.getElementById('require-character-name')?.checked !== false;
            this.config.plugins.verification.settings.requireGuildName = document.getElementById('require-guild-name')?.checked !== false;
        }
    }
    
    async saveConfiguration() {
        if (!this.hasUnsavedChanges) return;
        
        try {
            this.updateConfigFromForm();
            
            const response = await fetch('/api/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.config)
            });
            
            if (response.ok) {
                const result = await response.json();
                
                if (result.warning) {
                    this.showAlert(`${result.message} Warning: ${result.warning}`, 'warning');
                } else {
                    this.showAlert(result.message, 'success');
                }
                
                // Update original config to reflect saved state
                this.originalConfig = JSON.parse(JSON.stringify(this.config));
                this.hasUnsavedChanges = false;
                this.updateSaveButtonState();
                
                // Keep the last modified section expanded
                if (this.lastModifiedSection) {
                    this.preventSectionCollapse(this.lastModifiedSection);
                }
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save configuration');
            }
        } catch (error) {
            console.error('Error saving config:', error);
            this.showAlert(`Failed to save configuration: ${error.message}`, 'danger');
        }
    }
    
    preventSectionCollapse(sectionId) {
        const section = document.getElementById(sectionId);
        if (section && !section.classList.contains('show')) {
            // Expand the section if it's collapsed
            const button = document.querySelector(`[data-bs-target="#${sectionId}"]`);
            if (button) {
                button.click();
            }
        }
    }
    
    async reloadPlugin(pluginName) {
        try {
            const response = await fetch(`/api/plugins/${pluginName}/reload`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showAlert(result.message, 'success');
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to reload plugin');
            }
        } catch (error) {
            console.error('Error reloading plugin:', error);
            this.showAlert(`Failed to reload plugin ${pluginName}: ${error.message}`, 'danger');
        }
    }
    
    async restartBot() {
        if (!confirm('Are you sure you want to restart the bot? This will temporarily disconnect it from Discord.')) {
            return;
        }
        
        try {
            const response = await fetch('/api/bot/restart', {
                method: 'POST'
            });
            
            if (response.ok) {
                this.showAlert('Bot restart initiated', 'info');
                // Update status after a delay
                setTimeout(() => this.updateBotStatus(), 5000);
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to restart bot');
            }
        } catch (error) {
            console.error('Error restarting bot:', error);
            this.showAlert(`Failed to restart bot: ${error.message}`, 'danger');
        }
    }
    
    async updateBotStatus() {
        try {
            const response = await fetch('/api/bot/status');
            if (response.ok) {
                const status = await response.json();
                this.updateBotStatusDisplay(status);
            }
        } catch (error) {
            console.error('Error fetching bot status:', error);
            this.updateBotStatusDisplay({ running: false, status: 'error' });
        }
    }
    
    updateBotStatusDisplay(status) {
        const statusElement = document.getElementById('bot-status');
        statusElement.textContent = status.status || 'Unknown';
        
        // Update badge color based on status
        statusElement.className = 'badge ' + (status.running ? 'bg-success' : 'bg-danger');
    }
    
    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.config-section').forEach(section => {
            section.style.display = 'none';
        });
        
        // Show requested section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.style.display = 'block';
        }
        
        // Update navigation
        document.querySelectorAll('[data-section]').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
    }
    
    showAlert(message, type = 'info') {
        const alertsContainer = document.getElementById('alerts');
        const alertId = Date.now();
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        alertsContainer.appendChild(alert);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BotDashboard();
});