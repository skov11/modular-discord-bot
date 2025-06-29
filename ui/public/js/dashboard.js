class BotDashboard {
    constructor() {
        this.config = {};
        this.originalConfig = {};
        this.websocket = null;
        this.availablePlugins = [];
        this.availableChannels = [];
        this.availableRoles = [];
        this.hasUnsavedChanges = false;
        this.lastModifiedSection = null;
        
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        this.setupWebSocket();
        
        // Load all data first before populating the form
        await this.loadConfig(false); // Don't populate form yet
        await this.loadPlugins();
        await this.loadChannels();
        await this.loadRoles();
        
        // Now populate the form with all data available
        this.populateConfigForm();
        this.updateSaveButtonState();
        
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
        
        // Refresh channels
        document.getElementById('refresh-channels').addEventListener('click', async () => {
            const btn = document.getElementById('refresh-channels');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            
            await Promise.all([
                this.loadChannels(),
                this.loadRoles()
            ]);
            
            // Re-populate the form with updated channels and roles
            this.populateConfigForm();
            
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sync"></i> Refresh Channels & Roles';
            this.showAlert('Channels and roles refreshed successfully', 'success');
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
        
        // Setup verifier roles dropdown
        this.setupVerifierRolesDropdown();
        
        // Setup moderation logs event listeners
        this.setupModerationLogsEventListeners();
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
    
    setupVerifierRolesDropdown() {
        // Handle checkbox changes in the verifier roles dropdown
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('verifier-role-checkbox')) {
                this.updateVerifierRolesSelection();
            } else if (e.target.classList.contains('moderator-role-checkbox')) {
                this.updateModeratorRolesSelection();
            } else if (e.target.classList.contains('exempt-role-checkbox')) {
                this.updateExemptRolesSelection();
            } else if (e.target.classList.contains('exempt-channel-checkbox')) {
                this.updateExemptChannelsSelection();
            } else if (e.target.classList.contains('spam-exempt-role-checkbox')) {
                this.updateSpamExemptRolesSelection();
            } else if (e.target.classList.contains('caps-exempt-role-checkbox')) {
                this.updateCapsExemptRolesSelection();
            } else if (e.target.classList.contains('links-exempt-role-checkbox')) {
                this.updateLinksExemptRolesSelection();
            } else if (e.target.classList.contains('profanity-exempt-role-checkbox')) {
                this.updateProfanityExemptRolesSelection();
            } else if (e.target.classList.contains('moderation-exempt-role-checkbox')) {
                this.updateModerationExemptRolesSelection();
            } else if (e.target.classList.contains('moderation-exempt-channel-checkbox')) {
                this.updateModerationExemptChannelsSelection();
            } else if (e.target.classList.contains('auto-kick-subject-role-checkbox')) {
                this.updateAutoKickSubjectRolesSelection();
            } else if (e.target.classList.contains('auto-kick-exempt-role-checkbox')) {
                this.updateAutoKickExemptRolesSelection();
            } else if (e.target.id === 'automod-enabled') {
                this.toggleAutoModerationSettings(e.target.checked);
            }
        });
        
        // Prevent dropdown from closing when clicking inside checkbox areas
        document.addEventListener('click', (e) => {
            // More specific targeting - only prevent if clicking on checkbox, label, or form-check div
            if (e.target.matches('.form-check-input[type="checkbox"]') ||
                e.target.closest('.form-check') ||
                e.target.matches('.form-check-label')) {
                
                const dropdownMenu = e.target.closest('.dropdown-menu');
                if (dropdownMenu) {
                    e.stopPropagation();
                }
            }
        });
    }
    
    updateVerifierRolesSelection() {
        const checkboxes = document.querySelectorAll('.verifier-role-checkbox:checked');
        const hiddenSelect = document.getElementById('verifier-role-ids');
        const displayText = document.getElementById('verifier-roles-text');
        
        if (!hiddenSelect || !displayText) return;
        
        // Clear hidden select
        Array.from(hiddenSelect.options).forEach(option => option.selected = false);
        
        // Update hidden select and get role names
        const selectedRoles = [];
        checkboxes.forEach(checkbox => {
            const option = hiddenSelect.querySelector(`option[value="${checkbox.value}"]`);
            if (option) {
                option.selected = true;
                selectedRoles.push(option.textContent.trim());
            }
        });
        
        // Update display text
        if (selectedRoles.length === 0) {
            displayText.textContent = 'Select roles...';
        } else if (selectedRoles.length === 1) {
            displayText.textContent = selectedRoles[0];
        } else {
            displayText.textContent = `${selectedRoles.length} roles selected`;
        }
        
        // Trigger change event for form change detection
        hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    updateModeratorRolesSelection() {
        const checkboxes = document.querySelectorAll('.moderator-role-checkbox:checked');
        const hiddenSelect = document.getElementById('moderator-role-ids');
        const displayText = document.getElementById('moderator-roles-text');
        
        if (!hiddenSelect || !displayText) return;
        
        // Clear hidden select
        Array.from(hiddenSelect.options).forEach(option => option.selected = false);
        
        // Update hidden select and get role names
        const selectedRoles = [];
        checkboxes.forEach(checkbox => {
            const option = hiddenSelect.querySelector(`option[value="${checkbox.value}"]`);
            if (option) {
                option.selected = true;
                selectedRoles.push(option.textContent.trim());
            }
        });
        
        // Update display text
        if (selectedRoles.length === 0) {
            displayText.textContent = 'Select roles...';
        } else if (selectedRoles.length === 1) {
            displayText.textContent = selectedRoles[0];
        } else {
            displayText.textContent = `${selectedRoles.length} roles selected`;
        }
        
        // Trigger change event for form change detection
        hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    toggleAutoModerationSettings(enabled) {
        const automodSettings = document.getElementById('automod-settings');
        if (automodSettings) {
            automodSettings.style.display = enabled ? 'block' : 'none';
        }
    }

    updateExemptRolesSelection() {
        const checkboxes = document.querySelectorAll('.exempt-role-checkbox:checked');
        const hiddenSelect = document.getElementById('exempt-roles');
        const displayText = document.getElementById('exempt-roles-text');
        
        if (!hiddenSelect || !displayText) return;
        
        // Clear hidden select
        Array.from(hiddenSelect.options).forEach(option => option.selected = false);
        
        // Update hidden select and get role names
        const selectedRoles = [];
        checkboxes.forEach(checkbox => {
            const option = hiddenSelect.querySelector(`option[value="${checkbox.value}"]`);
            if (option) {
                option.selected = true;
                selectedRoles.push(option.textContent.trim());
            }
        });
        
        // Update display text
        if (selectedRoles.length === 0) {
            displayText.textContent = 'Select roles...';
        } else if (selectedRoles.length === 1) {
            displayText.textContent = selectedRoles[0];
        } else {
            displayText.textContent = `${selectedRoles.length} roles selected`;
        }
        
        // Trigger change event for form change detection
        hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    updateExemptChannelsSelection() {
        const checkboxes = document.querySelectorAll('.exempt-channel-checkbox:checked');
        const hiddenSelect = document.getElementById('exempt-channels');
        const displayText = document.getElementById('exempt-channels-text');
        
        if (!hiddenSelect || !displayText) return;
        
        // Clear hidden select
        Array.from(hiddenSelect.options).forEach(option => option.selected = false);
        
        // Update hidden select and get channel names
        const selectedChannels = [];
        checkboxes.forEach(checkbox => {
            const option = hiddenSelect.querySelector(`option[value="${checkbox.value}"]`);
            if (option) {
                option.selected = true;
                selectedChannels.push(option.textContent.trim());
            }
        });
        
        // Update display text
        if (selectedChannels.length === 0) {
            displayText.textContent = 'Select channels...';
        } else if (selectedChannels.length === 1) {
            displayText.textContent = selectedChannels[0];
        } else {
            displayText.textContent = `${selectedChannels.length} channels selected`;
        }
        
        // Trigger change event for form change detection
        hiddenSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    updateSpamExemptRolesSelection() {
        const checkboxes = document.querySelectorAll('.spam-exempt-role-checkbox:checked');
        const displayText = document.getElementById('spam-exempt-roles-text');
        
        if (!displayText) return;
        
        if (checkboxes.length === 0) {
            displayText.textContent = 'Select roles...';
        } else if (checkboxes.length === 1) {
            const roleId = checkboxes[0].value;
            const role = this.availableRoles.find(r => r.id === roleId);
            displayText.textContent = role ? role.name : '1 role selected';
        } else {
            displayText.textContent = `${checkboxes.length} roles selected`;
        }
    }

    updateCapsExemptRolesSelection() {
        const checkboxes = document.querySelectorAll('.caps-exempt-role-checkbox:checked');
        const displayText = document.getElementById('caps-exempt-roles-text');
        
        if (!displayText) return;
        
        if (checkboxes.length === 0) {
            displayText.textContent = 'Select roles...';
        } else if (checkboxes.length === 1) {
            const roleId = checkboxes[0].value;
            const role = this.availableRoles.find(r => r.id === roleId);
            displayText.textContent = role ? role.name : '1 role selected';
        } else {
            displayText.textContent = `${checkboxes.length} roles selected`;
        }
    }

    updateLinksExemptRolesSelection() {
        const checkboxes = document.querySelectorAll('.links-exempt-role-checkbox:checked');
        const displayText = document.getElementById('links-exempt-roles-text');
        
        if (!displayText) return;
        
        if (checkboxes.length === 0) {
            displayText.textContent = 'Select roles...';
        } else if (checkboxes.length === 1) {
            const roleId = checkboxes[0].value;
            const role = this.availableRoles.find(r => r.id === roleId);
            displayText.textContent = role ? role.name : '1 role selected';
        } else {
            displayText.textContent = `${checkboxes.length} roles selected`;
        }
    }

    updateProfanityExemptRolesSelection() {
        const checkboxes = document.querySelectorAll('.profanity-exempt-role-checkbox:checked');
        const displayText = document.getElementById('profanity-exempt-roles-text');
        
        if (!displayText) return;
        
        if (checkboxes.length === 0) {
            displayText.textContent = 'Select roles...';
        } else if (checkboxes.length === 1) {
            const roleId = checkboxes[0].value;
            const role = this.availableRoles.find(r => r.id === roleId);
            displayText.textContent = role ? role.name : '1 role selected';
        } else {
            displayText.textContent = `${checkboxes.length} roles selected`;
        }
    }
    
    updateModerationExemptRolesSelection() {
        const checkboxes = document.querySelectorAll('.moderation-exempt-role-checkbox:checked');
        const displayText = document.getElementById('moderation-exempt-roles-text');
        
        if (!displayText) return;
        
        if (checkboxes.length === 0) {
            displayText.textContent = 'Select roles...';
        } else if (checkboxes.length === 1) {
            const roleId = checkboxes[0].value;
            const role = this.availableRoles.find(r => r.id === roleId);
            displayText.textContent = role ? role.name : '1 role selected';
        } else {
            displayText.textContent = `${checkboxes.length} roles selected`;
        }
    }
    
    updateModerationExemptChannelsSelection() {
        const checkboxes = document.querySelectorAll('.moderation-exempt-channel-checkbox:checked');
        const displayText = document.getElementById('moderation-exempt-channels-text');
        
        if (!displayText) return;
        
        if (checkboxes.length === 0) {
            displayText.textContent = 'Select channels...';
        } else if (checkboxes.length === 1) {
            const channelId = checkboxes[0].value;
            const channel = this.availableChannels.find(c => c.id === channelId);
            displayText.textContent = channel ? `#${channel.name}` : '1 channel selected';
        } else {
            displayText.textContent = `${checkboxes.length} channels selected`;
        }
    }
    
    updateAutoKickSubjectRolesSelection() {
        const checkboxes = document.querySelectorAll('.auto-kick-subject-role-checkbox:checked');
        const displayText = document.getElementById('auto-kick-subject-roles-text');
        
        if (!displayText) return;
        
        if (checkboxes.length === 0) {
            displayText.textContent = 'Select roles...';
        } else if (checkboxes.length === 1) {
            const roleId = checkboxes[0].value;
            if (roleId === '@norole') {
                displayText.textContent = 'No Role (Users with no roles)';
            } else {
                const role = this.availableRoles.find(r => r.id === roleId);
                displayText.textContent = role ? role.name : '1 role selected';
            }
        } else {
            displayText.textContent = `${checkboxes.length} roles selected`;
        }
    }
    
    updateAutoKickExemptRolesSelection() {
        const checkboxes = document.querySelectorAll('.auto-kick-exempt-role-checkbox:checked');
        const displayText = document.getElementById('auto-kick-exempt-roles-text');
        
        if (!displayText) return;
        
        if (checkboxes.length === 0) {
            displayText.textContent = 'Select roles...';
        } else if (checkboxes.length === 1) {
            const roleId = checkboxes[0].value;
            if (roleId === '@norole') {
                displayText.textContent = 'No Role (Users with no roles)';
            } else {
                const role = this.availableRoles.find(r => r.id === roleId);
                displayText.textContent = role ? role.name : '1 role selected';
            }
        } else {
            displayText.textContent = `${checkboxes.length} roles selected`;
        }
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
                // Only populate form if channels and roles are loaded
                if (this.availableChannels.length > 0 && this.availableRoles.length > 0) {
                    this.populateConfigForm();
                } else {
                    console.log('Delaying config population until channels and roles are loaded');
                }
                this.showAlert('Configuration updated from bot', 'info');
                break;
            case 'botStatus':
                this.updateBotStatusDisplay(message.status);
                break;
            default:
                console.log('Unknown WebSocket message:', message);
        }
    }
    
    async loadConfig(populateForm = true) {
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                this.config = await response.json();
                this.originalConfig = JSON.parse(JSON.stringify(this.config)); // Deep copy
                if (populateForm) {
                    this.populateConfigForm();
                    this.updateSaveButtonState();
                }
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
            if (populateForm) {
                this.populateConfigForm();
                this.updateSaveButtonState();
            }
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
    
    async loadChannels() {
        try {
            const response = await fetch('/api/channels');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.availableChannels = data.channels;
                    console.log('Loaded channels:', this.availableChannels.length);
                } else {
                    console.warn('Bot not connected, channels unavailable');
                    this.availableChannels = [];
                }
            } else {
                throw new Error('Failed to load channels');
            }
        } catch (error) {
            console.error('Error loading channels:', error);
            this.availableChannels = [];
        }
    }
    
    async loadRoles() {
        try {
            const response = await fetch('/api/roles');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.availableRoles = data.roles;
                    console.log('Loaded roles:', this.availableRoles.length);
                    // Re-render plugin configuration to update dropdowns after roles are loaded
                    if (this.availablePlugins.length > 0 && this.availableChannels.length > 0) {
                        this.renderPluginConfiguration();
                    }
                } else {
                    console.warn('Bot not connected, roles unavailable');
                    this.availableRoles = [];
                }
            } else {
                throw new Error('Failed to load roles');
            }
        } catch (error) {
            console.error('Error loading roles:', error);
            this.availableRoles = [];
        }
    }
    
    populateConfigForm() {
        // Bot configuration
        document.getElementById('bot-token').value = this.config.bot?.token || '';
        document.getElementById('client-id').value = this.config.bot?.clientId || '';
        document.getElementById('guild-id').value = this.config.bot?.guildId || '';
        
        // Re-render plugin configuration
        this.renderPluginConfiguration();
        
        // Update all multi-select dropdowns display after render
        setTimeout(() => {
            this.updateVerifierRolesSelection();
            this.updateModeratorRolesSelection();
            this.updateExemptRolesSelection();
            this.updateExemptChannelsSelection();
            this.updateSpamExemptRolesSelection();
            this.updateCapsExemptRolesSelection();
            this.updateLinksExemptRolesSelection();
            this.updateProfanityExemptRolesSelection();
            this.updateModerationExemptRolesSelection();
            this.updateModerationExemptChannelsSelection();
            this.updateAutoKickSubjectRolesSelection();
            this.updateAutoKickExemptRolesSelection();
        }, 50);
        
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
        
        // Setup event listeners for purge plugin schedules
        setTimeout(() => {
            this.setupAllPurgeScheduleEventListeners();
        }, 50);
    }
    
    setupAllPurgeScheduleEventListeners() {
        // Find all existing schedule forms and setup event listeners
        document.querySelectorAll('.purge-schedule').forEach((scheduleElement, index) => {
            this.setupScheduleEventListeners(index);
        });
    }
    
    createPluginCard(plugin, config) {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        
        // Special handling for specific plugins
        if (plugin.name === 'verification') {
            card.innerHTML = this.createVerificationPluginForm(config);
        } else if (plugin.name === 'purge') {
            card.innerHTML = this.createPurgePluginForm(config);
        } else if (plugin.name === 'moderation') {
            card.innerHTML = this.createModerationPluginForm(config);
        } else {
            card.innerHTML = this.createGenericPluginForm(plugin, config);
        }
        
        return card;
    }
    
    createVerificationPluginForm(config) {
        return `
            <div class="card-header d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center flex-grow-1">
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
                    <div class="ms-auto me-3">
                        <span class="badge bg-secondary">/verify</span>
                    </div>
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
                            <label for="verify-channel-id" class="form-label">Verify Channel *</label>
                            <select class="form-select" id="verify-channel-id" required>
                                <option value="">Select a channel...</option>
                                ${this.availableChannels.map(channel => 
                                    `<option value="${channel.id}" ${config.channels?.verifyChannelId === channel.id ? 'selected' : ''}>
                                        ${channel.category} / #${channel.name}
                                    </option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="mb-3">
                            <label for="verify-command-channel-id" class="form-label">Verify Command Channel *</label>
                            <select class="form-select" id="verify-command-channel-id" required>
                                <option value="">Select a channel...</option>
                                ${this.availableChannels.map(channel => 
                                    `<option value="${channel.id}" ${config.channels?.verifyCommandChannelId === channel.id ? 'selected' : ''}>
                                        ${channel.category} / #${channel.name}
                                    </option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="mb-3">
                            <label for="log-channel-id" class="form-label">Log Channel</label>
                            <select class="form-select" id="log-channel-id">
                                <option value="">Select a channel...</option>
                                ${this.availableChannels.map(channel => 
                                    `<option value="${channel.id}" ${config.channels?.logChannelId === channel.id ? 'selected' : ''}>
                                        ${channel.category} / #${channel.name}
                                    </option>`
                                ).join('')}
                            </select>
                        </div>
                        <div class="mb-3">
                            <label for="how-to-verify-id" class="form-label">How To Verify Channel</label>
                            <select class="form-select" id="how-to-verify-id">
                                <option value="">Select a channel...</option>
                                ${this.availableChannels.map(channel => 
                                    `<option value="${channel.id}" ${config.channels?.howToVerifyID === channel.id ? 'selected' : ''}>
                                        ${channel.category} / #${channel.name}
                                    </option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <h6>Roles</h6>
                        <div class="mb-3">
                            <label for="verified-role-id" class="form-label">Verified Role *</label>
                            <select class="form-select" id="verified-role-id" required>
                                <option value="">Select a role...</option>
                                ${this.availableRoles.map(role => 
                                    `<option value="${role.id}" ${config.roles?.verifiedRoleId === role.id ? 'selected' : ''} 
                                            style="color: ${role.color}">
                                        ${role.name}${role.managed ? ' (Bot Role)' : ''}
                                    </option>`
                                ).join('')}
                            </select>
                            <div class="form-text">Role to assign to verified users</div>
                        </div>
                        <div class="mb-3">
                            <label for="verifier-role-ids" class="form-label">Verifier Roles *</label>
                            <div class="dropdown">
                                <button class="btn btn-outline-secondary dropdown-toggle w-100 text-start" type="button" 
                                        id="verifier-roles-dropdown" data-bs-toggle="dropdown" data-bs-auto-close="false" aria-expanded="false">
                                    <span id="verifier-roles-text">Select roles...</span>
                                </button>
                                <div class="dropdown-menu w-100 p-2" aria-labelledby="verifier-roles-dropdown" 
                                     style="max-height: 300px; overflow-y: auto;">
                                    ${this.availableRoles.map(role => 
                                        `<div class="form-check">
                                            <input class="form-check-input verifier-role-checkbox" type="checkbox" 
                                                   value="${role.id}" id="verifier-${role.id}"
                                                   ${config.roles?.verifierRoleIds?.includes(role.id) ? 'checked' : ''}>
                                            <label class="form-check-label d-flex align-items-center" for="verifier-${role.id}">
                                                <span class="role-color-dot me-2" style="background-color: ${role.color}; 
                                                      width: 12px; height: 12px; border-radius: 50%; display: inline-block;"></span>
                                                ${role.name}${role.managed ? ' (Bot Role)' : ''}
                                            </label>
                                        </div>`
                                    ).join('')}
                                </div>
                            </div>
                            <select class="form-select d-none" id="verifier-role-ids" multiple required>
                                ${this.availableRoles.map(role => 
                                    `<option value="${role.id}" ${config.roles?.verifierRoleIds?.includes(role.id) ? 'selected' : ''}>
                                        ${role.name}
                                    </option>`
                                ).join('')}
                            </select>
                            <div class="form-text">Select roles that can approve verifications</div>
                        </div>
                        
                        <h6>Settings</h6>
                        <div class="mb-3">
                            <label for="screenshot-count" class="form-label">Screenshot Count</label>
                            <select class="form-select" id="screenshot-count">
                                <option value="0" ${config.settings?.screenshotCount == 0 ? 'selected' : ''}>0 - No screenshots</option>
                                <option value="1" ${config.settings?.screenshotCount == 1 ? 'selected' : ''}>1 - Single screenshot</option>
                                <option value="2" ${config.settings?.screenshotCount == 2 || config.settings?.screenshotCount === undefined ? 'selected' : ''}>2 - Dual screenshots</option>
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
                        <h6>Auto-Kick Settings</h6>
                        <div class="form-check mb-3">
                            <input class="form-check-input" type="checkbox" id="auto-kick-enabled" 
                                   ${config.settings?.autoKick?.enabled ? 'checked' : ''}>
                            <label class="form-check-label" for="auto-kick-enabled">
                                Enable Auto-Kick for Unverified Users
                            </label>
                        </div>
                        <div class="row">
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <label for="auto-kick-time" class="form-label">Time Before Kick</label>
                                    <input type="number" class="form-control" id="auto-kick-time" 
                                           value="${config.settings?.autoKick?.time || 24}" min="1">
                                </div>
                            </div>
                            <div class="col-md-4">
                                <div class="mb-3">
                                    <label for="auto-kick-unit" class="form-label">Time Unit</label>
                                    <select class="form-select" id="auto-kick-unit">
                                        <option value="minutes" ${config.settings?.autoKick?.unit === 'minutes' ? 'selected' : ''}>Minutes</option>
                                        <option value="hours" ${config.settings?.autoKick?.unit === 'hours' || !config.settings?.autoKick?.unit ? 'selected' : ''}>Hours</option>
                                        <option value="days" ${config.settings?.autoKick?.unit === 'days' ? 'selected' : ''}>Days</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="auto-kick-subject-roles" class="form-label">Roles Subject to Auto-Kick</label>
                                    <div class="dropdown">
                                        <button class="btn btn-outline-secondary dropdown-toggle w-100 text-start" type="button" 
                                                id="auto-kick-subject-roles-dropdown" data-bs-toggle="dropdown" data-bs-auto-close="false" aria-expanded="false">
                                            <span id="auto-kick-subject-roles-text">Select roles...</span>
                                        </button>
                                        <div class="dropdown-menu w-100 p-2" aria-labelledby="auto-kick-subject-roles-dropdown" 
                                             style="max-height: 300px; overflow-y: auto;">
                                            <div class="form-check">
                                                <input class="form-check-input auto-kick-subject-role-checkbox" type="checkbox" 
                                                       value="@norole" id="auto-kick-subject-norole"
                                                       ${config.settings?.autoKick?.subjectRoles?.includes('@norole') ? 'checked' : ''}>
                                                <label class="form-check-label d-flex align-items-center" for="auto-kick-subject-norole">
                                                    <span class="role-color-dot me-2" style="background-color: #808080; 
                                                          width: 12px; height: 12px; border-radius: 50%; display: inline-block;"></span>
                                                    <em>No Role (Users with no roles)</em>
                                                </label>
                                            </div>
                                            <hr class="my-2">
                                            ${this.availableRoles.map(role => 
                                                `<div class="form-check">
                                                    <input class="form-check-input auto-kick-subject-role-checkbox" type="checkbox" 
                                                           value="${role.id}" id="auto-kick-subject-${role.id}"
                                                           ${config.settings?.autoKick?.subjectRoles?.includes(role.id) ? 'checked' : ''}>
                                                    <label class="form-check-label d-flex align-items-center" for="auto-kick-subject-${role.id}">
                                                        <span class="role-color-dot me-2" style="background-color: ${role.color}; 
                                                              width: 12px; height: 12px; border-radius: 50%; display: inline-block;"></span>
                                                        ${role.name}${role.managed ? ' (Bot Role)' : ''}
                                                    </label>
                                                </div>`
                                            ).join('')}
                                        </div>
                                    </div>
                                    <select class="form-select d-none" id="auto-kick-subject-roles" multiple>
                                        <option value="@norole" ${config.settings?.autoKick?.subjectRoles?.includes('@norole') ? 'selected' : ''}>No Role</option>
                                        ${this.availableRoles.map(role => 
                                            `<option value="${role.id}" ${config.settings?.autoKick?.subjectRoles?.includes(role.id) ? 'selected' : ''}>
                                                ${role.name}
                                            </option>`
                                        ).join('')}
                                    </select>
                                    <div class="form-text">Users with these roles will be kicked if not verified</div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="mb-3">
                                    <label for="auto-kick-exempt-roles" class="form-label">Roles Exempt from Auto-Kick</label>
                                    <div class="dropdown">
                                        <button class="btn btn-outline-secondary dropdown-toggle w-100 text-start" type="button" 
                                                id="auto-kick-exempt-roles-dropdown" data-bs-toggle="dropdown" data-bs-auto-close="false" aria-expanded="false">
                                            <span id="auto-kick-exempt-roles-text">Select roles...</span>
                                        </button>
                                        <div class="dropdown-menu w-100 p-2" aria-labelledby="auto-kick-exempt-roles-dropdown" 
                                             style="max-height: 300px; overflow-y: auto;">
                                            <div class="form-check">
                                                <input class="form-check-input auto-kick-exempt-role-checkbox" type="checkbox" 
                                                       value="@norole" id="auto-kick-exempt-norole"
                                                       ${config.settings?.autoKick?.exemptRoles?.includes('@norole') ? 'checked' : ''}>
                                                <label class="form-check-label d-flex align-items-center" for="auto-kick-exempt-norole">
                                                    <span class="role-color-dot me-2" style="background-color: #808080; 
                                                          width: 12px; height: 12px; border-radius: 50%; display: inline-block;"></span>
                                                    <em>No Role (Users with no roles)</em>
                                                </label>
                                            </div>
                                            <hr class="my-2">
                                            ${this.availableRoles.map(role => 
                                                `<div class="form-check">
                                                    <input class="form-check-input auto-kick-exempt-role-checkbox" type="checkbox" 
                                                           value="${role.id}" id="auto-kick-exempt-${role.id}"
                                                           ${config.settings?.autoKick?.exemptRoles?.includes(role.id) ? 'checked' : ''}>
                                                    <label class="form-check-label d-flex align-items-center" for="auto-kick-exempt-${role.id}">
                                                        <span class="role-color-dot me-2" style="background-color: ${role.color}; 
                                                              width: 12px; height: 12px; border-radius: 50%; display: inline-block;"></span>
                                                        ${role.name}${role.managed ? ' (Bot Role)' : ''}
                                                    </label>
                                                </div>`
                                            ).join('')}
                                        </div>
                                    </div>
                                    <select class="form-select d-none" id="auto-kick-exempt-roles" multiple>
                                        <option value="@norole" ${config.settings?.autoKick?.exemptRoles?.includes('@norole') ? 'selected' : ''}>No Role</option>
                                        ${this.availableRoles.map(role => 
                                            `<option value="${role.id}" ${config.settings?.autoKick?.exemptRoles?.includes(role.id) ? 'selected' : ''}>
                                                ${role.name}
                                            </option>`
                                        ).join('')}
                                    </select>
                                    <div class="form-text">Users with these roles will never be auto-kicked</div>
                                </div>
                            </div>
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
    
    createPurgePluginForm(config) {
        return `
            <div class="card-header d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center flex-grow-1">
                    <h6 class="mb-0 me-3"><i class="fas fa-trash-alt"></i> Purge Plugin</h6>
                    <button class="btn btn-sm btn-outline-secondary collapse-toggle collapsed" type="button" data-bs-toggle="collapse" 
                            data-bs-target="#purge-config" aria-expanded="false" aria-controls="purge-config"
                            title="Toggle configuration section">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info ms-2 reload-plugin-btn" type="button" 
                            data-plugin="purge" title="Reload plugin">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <div class="ms-auto me-3">
                        <span class="badge bg-secondary">/purge</span>
                    </div>
                </div>
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="purge-enabled" 
                           ${config.enabled !== false ? 'checked' : ''}>
                    <label class="form-check-label" for="purge-enabled">Enabled</label>
                </div>
            </div>
            <div class="collapse" id="purge-config">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h6>Logging</h6>
                            <div class="mb-3">
                                <label for="purge-log-channel-id" class="form-label">Log Channel</label>
                                <select class="form-select" id="purge-log-channel-id">
                                    <option value="">Select a channel...</option>
                                    ${this.availableChannels.map(channel => 
                                        `<option value="${channel.id}" ${config.logging?.channelId === channel.id ? 'selected' : ''}>
                                            ${channel.category} / #${channel.name}
                                        </option>`
                                    ).join('')}
                                </select>
                                <div class="form-text">Channel where purge actions will be logged</div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <h6>Auto-Purge</h6>
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" id="purge-auto-enabled" 
                                       ${config.autoPurge?.enabled ? 'checked' : ''}>
                                <label class="form-check-label" for="purge-auto-enabled">
                                    Enable Auto-Purge
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row mt-3">
                        <div class="col-md-12">
                            <h6>Auto-Purge Schedules</h6>
                            <div id="purge-schedules-container">
                                ${this.createPurgeSchedules(config.autoPurge?.schedules || [])}
                            </div>
                            <button type="button" class="btn btn-sm btn-success mt-2" onclick="dashboard.addPurgeSchedule()">
                                <i class="fas fa-plus"></i> Add Schedule
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    createModerationPluginForm(config) {
        return `
            <div class="card-header d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center flex-grow-1">
                    <h6 class="mb-0 me-3"><i class="fas fa-shield-alt"></i> Moderation Plugin</h6>
                    <button class="btn btn-sm btn-outline-secondary collapse-toggle collapsed" type="button" data-bs-toggle="collapse" 
                            data-bs-target="#moderation-config" aria-expanded="false" aria-controls="moderation-config"
                            title="Toggle configuration section">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info ms-2 reload-plugin-btn" type="button" 
                            data-plugin="moderation" title="Reload plugin">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <div class="ms-auto me-3">
                        <span class="badge bg-secondary">/mod</span>
                        <span class="badge bg-secondary ms-1">/modtest</span>
                    </div>
                </div>
                <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" id="moderation-enabled" 
                           ${config.enabled !== false ? 'checked' : ''}>
                    <label class="form-check-label" for="moderation-enabled">Enabled</label>
                </div>
            </div>
            <div class="collapse" id="moderation-config">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h6>Logging</h6>
                            <div class="mb-3">
                                <label for="moderation-log-channel-id" class="form-label">Log Channel</label>
                                <select class="form-select" id="moderation-log-channel-id">
                                    <option value="">Select a channel...</option>
                                    ${this.availableChannels.map(channel => 
                                        `<option value="${channel.id}" ${config.logging?.channelId === channel.id ? 'selected' : ''}>
                                            ${channel.category} / #${channel.name}
                                        </option>`
                                    ).join('')}
                                </select>
                                <div class="form-text">Channel where moderation actions will be logged</div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <h6>Permissions</h6>
                            <div class="mb-3">
                                <label for="moderator-role-ids" class="form-label">Moderator Roles</label>
                                <div class="dropdown">
                                    <button class="btn btn-outline-secondary dropdown-toggle w-100 text-start" type="button" 
                                            id="moderator-roles-dropdown" data-bs-toggle="dropdown" data-bs-auto-close="false" aria-expanded="false">
                                        <span id="moderator-roles-text">Select roles...</span>
                                    </button>
                                    <div class="dropdown-menu w-100 p-2" aria-labelledby="moderator-roles-dropdown" 
                                         style="max-height: 300px; overflow-y: auto;">
                                        ${this.availableRoles.map(role => 
                                            `<div class="form-check">
                                                <input class="form-check-input moderator-role-checkbox" type="checkbox" 
                                                       value="${role.id}" id="moderator-${role.id}"
                                                       ${config.roles?.moderatorRoleIds?.includes(role.id) ? 'checked' : ''}>
                                                <label class="form-check-label d-flex align-items-center" for="moderator-${role.id}">
                                                    <span class="role-color-dot me-2" style="background-color: ${role.color}; 
                                                          width: 12px; height: 12px; border-radius: 50%; display: inline-block;"></span>
                                                    ${role.name}${role.managed ? ' (Bot Role)' : ''}
                                                </label>
                                            </div>`
                                        ).join('')}
                                    </div>
                                </div>
                                <select class="form-select d-none" id="moderator-role-ids" multiple>
                                    ${this.availableRoles.map(role => 
                                        `<option value="${role.id}" ${config.roles?.moderatorRoleIds?.includes(role.id) ? 'selected' : ''}>
                                            ${role.name}
                                        </option>`
                                    ).join('')}
                                </select>
                                <div class="form-text">Select roles that can use moderation commands</div>
                            </div>
                        </div>
                    </div>
                    <div class="row mt-4">
                        <div class="col-12">
                            <h6>Moderation Actions</h6>
                            <div class="form-text mb-3">Enable or disable specific moderation commands</div>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-check mb-2">
                                        <input class="form-check-input" type="checkbox" id="action-timeout" 
                                               ${config.actions?.timeout !== false ? 'checked' : ''}>
                                        <label class="form-check-label" for="action-timeout">
                                            <strong>Timeout</strong> - Temporarily restrict users
                                        </label>
                                    </div>
                                    <div class="form-check mb-2">
                                        <input class="form-check-input" type="checkbox" id="action-kick" 
                                               ${config.actions?.kick !== false ? 'checked' : ''}>
                                        <label class="form-check-label" for="action-kick">
                                            <strong>Kick</strong> - Remove users from server
                                        </label>
                                    </div>
                                    <div class="form-check mb-2">
                                        <input class="form-check-input" type="checkbox" id="action-ban" 
                                               ${config.actions?.ban !== false ? 'checked' : ''}>
                                        <label class="form-check-label" for="action-ban">
                                            <strong>Ban</strong> - Permanently ban users
                                        </label>
                                    </div>
                                    <div class="form-check mb-2">
                                        <input class="form-check-input" type="checkbox" id="action-unban" 
                                               ${config.actions?.unban !== false ? 'checked' : ''}>
                                        <label class="form-check-label" for="action-unban">
                                            <strong>Unban</strong> - Remove user bans
                                        </label>
                                    </div>
                                    <div class="form-check mb-2">
                                        <input class="form-check-input" type="checkbox" id="action-warn" 
                                               ${config.actions?.warn !== false ? 'checked' : ''}>
                                        <label class="form-check-label" for="action-warn">
                                            <strong>Warn</strong> - Issue warnings to users
                                        </label>
                                    </div>
                                    <div class="form-check mb-2">
                                        <input class="form-check-input" type="checkbox" id="action-slowmode" 
                                               ${config.actions?.slowmode !== false ? 'checked' : ''}>
                                        <label class="form-check-label" for="action-slowmode">
                                            <strong>Slowmode</strong> - Set channel rate limits
                                        </label>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-check mb-2">
                                        <input class="form-check-input" type="checkbox" id="action-addrole" 
                                               ${config.actions?.addrole !== false ? 'checked' : ''}>
                                        <label class="form-check-label" for="action-addrole">
                                            <strong>Add Role</strong> - Assign roles to users
                                        </label>
                                    </div>
                                    <div class="form-check mb-2">
                                        <input class="form-check-input" type="checkbox" id="action-removerole" 
                                               ${config.actions?.removerole !== false ? 'checked' : ''}>
                                        <label class="form-check-label" for="action-removerole">
                                            <strong>Remove Role</strong> - Remove roles from users
                                        </label>
                                    </div>
                                    <div class="form-check mb-2">
                                        <input class="form-check-input" type="checkbox" id="action-nickname" 
                                               ${config.actions?.nickname !== false ? 'checked' : ''}>
                                        <label class="form-check-label" for="action-nickname">
                                            <strong>Nickname</strong> - Change user nicknames
                                        </label>
                                    </div>
                                    <div class="form-check mb-2">
                                        <input class="form-check-input" type="checkbox" id="action-purgemsg" 
                                               ${config.actions?.purgemsg !== false ? 'checked' : ''}>
                                        <label class="form-check-label" for="action-purgemsg">
                                            <strong>Purge Messages</strong> - Bulk delete messages
                                        </label>
                                    </div>
                                    <div class="form-check mb-2">
                                        <input class="form-check-input" type="checkbox" id="action-pin" 
                                               ${config.actions?.pin !== false ? 'checked' : ''}>
                                        <label class="form-check-label" for="action-pin">
                                            <strong>Pin Message</strong> - Pin messages to channel
                                        </label>
                                    </div>
                                    <div class="form-check mb-2">
                                        <input class="form-check-input" type="checkbox" id="action-unpin" 
                                               ${config.actions?.unpin !== false ? 'checked' : ''}>
                                        <label class="form-check-label" for="action-unpin">
                                            <strong>Unpin Message</strong> - Unpin messages from channel
                                        </label>
                                    </div>
                                    <div class="form-check mb-2">
                                        <input class="form-check-input" type="checkbox" id="action-userinfo" 
                                               ${config.actions?.userinfo !== false ? 'checked' : ''}>
                                        <label class="form-check-label" for="action-userinfo">
                                            <strong>User Info</strong> - Display user details and history
                                        </label>
                                    </div>
                                    <div class="form-check mb-2">
                                        <input class="form-check-input" type="checkbox" id="action-serverstats" 
                                               ${config.actions?.serverstats !== false ? 'checked' : ''}>
                                        <label class="form-check-label" for="action-serverstats">
                                            <strong>Server Stats</strong> - Display server statistics
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="row mt-4">
                        <div class="col-12">
                            <h6>Moderation Exemptions</h6>
                            <div class="form-text mb-3">Users with exempt roles and messages in exempt channels cannot be moderated</div>
                            <div class="row">
                                <div class="col-md-6">
                                    <label class="form-label">Exempt Roles</label>
                                    <div class="dropdown">
                                        <button class="btn btn-outline-secondary dropdown-toggle w-100 text-start" type="button" 
                                                id="moderation-exempt-roles-dropdown" data-bs-toggle="dropdown" data-bs-auto-close="false" aria-expanded="false">
                                            <span id="moderation-exempt-roles-text">Select roles...</span>
                                        </button>
                                        <div class="dropdown-menu w-100 p-2" style="max-height: 300px; overflow-y: auto;">
                                            ${this.availableRoles.map(role => 
                                                `<div class="form-check">
                                                    <input class="form-check-input moderation-exempt-role-checkbox" type="checkbox" 
                                                           value="${role.id}" id="moderation-exempt-${role.id}"
                                                           ${config.exemptRoles?.includes(role.id) ? 'checked' : ''}>
                                                    <label class="form-check-label d-flex align-items-center" for="moderation-exempt-${role.id}">
                                                        <span class="role-color-dot me-2" style="background-color: ${role.color}; 
                                                              width: 12px; height: 12px; border-radius: 50%; display: inline-block;"></span>
                                                        ${role.name}${role.managed ? ' (Bot Role)' : ''}
                                                    </label>
                                                </div>`
                                            ).join('')}
                                        </div>
                                    </div>
                                    <select id="moderation-exempt-roles" multiple style="display: none;">
                                        ${config.exemptRoles?.map(roleId => {
                                            return `<option value="${roleId}" selected></option>`;
                                        }).join('') || ''}
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Exempt Channels</label>
                                    <div class="dropdown">
                                        <button class="btn btn-outline-secondary dropdown-toggle w-100 text-start" type="button" 
                                                id="moderation-exempt-channels-dropdown" data-bs-toggle="dropdown" data-bs-auto-close="false" aria-expanded="false">
                                            <span id="moderation-exempt-channels-text">Select channels...</span>
                                        </button>
                                        <div class="dropdown-menu w-100 p-2" style="max-height: 300px; overflow-y: auto;">
                                            ${this.availableChannels.map(channel => 
                                                `<div class="form-check">
                                                    <input class="form-check-input moderation-exempt-channel-checkbox" type="checkbox" 
                                                           value="${channel.id}" id="moderation-exempt-channel-${channel.id}"
                                                           ${config.exemptChannels?.includes(channel.id) ? 'checked' : ''}>
                                                    <label class="form-check-label" for="moderation-exempt-channel-${channel.id}">
                                                        ${channel.category ? `${channel.category} / ` : ''}#${channel.name}
                                                    </label>
                                                </div>`
                                            ).join('')}
                                        </div>
                                    </div>
                                    <select id="moderation-exempt-channels" multiple style="display: none;">
                                        ${config.exemptChannels?.map(channelId => {
                                            return `<option value="${channelId}" selected></option>`;
                                        }).join('') || ''}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="row mt-4">
                        <div class="col-12">
                            <h6>Auto-Moderation</h6>
                            <div class="form-text mb-3">Automatic detection and action on rule violations</div>
                            
                            <div class="form-check form-switch mb-3">
                                <input class="form-check-input" type="checkbox" id="automod-enabled" 
                                       ${config.autoModeration?.enabled === true ? 'checked' : ''}>
                                <label class="form-check-label" for="automod-enabled">
                                    <strong>Enable Auto-Moderation</strong>
                                </label>
                            </div>
                            
                            <div id="automod-settings" style="display: ${config.autoModeration?.enabled === true ? 'block' : 'none'};">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-header">
                                                <h6 class="mb-0">Spam Detection</h6>
                                            </div>
                                            <div class="card-body">
                                                <div class="form-check form-switch mb-2">
                                                    <input class="form-check-input" type="checkbox" id="spam-enabled" 
                                                           ${config.autoModeration?.spam?.enabled !== false ? 'checked' : ''}>
                                                    <label class="form-check-label" for="spam-enabled">Enable</label>
                                                </div>
                                                <div class="mb-2">
                                                    <label for="spam-max-messages" class="form-label">Max Messages</label>
                                                    <input type="number" class="form-control" id="spam-max-messages" 
                                                           value="${config.autoModeration?.spam?.maxMessages || 5}" min="2" max="20">
                                                </div>
                                                <div class="mb-2">
                                                    <label for="spam-time-window" class="form-label">Time Window (seconds)</label>
                                                    <input type="number" class="form-control" id="spam-time-window" 
                                                           value="${config.autoModeration?.spam?.timeWindow || 10}" min="5" max="60">
                                                </div>
                                                <div class="mb-2">
                                                    <label for="spam-action" class="form-label">Action</label>
                                                    <select class="form-select" id="spam-action">
                                                        <option value="warn" ${config.autoModeration?.spam?.action === 'warn' ? 'selected' : ''}>Warn</option>
                                                        <option value="timeout" ${config.autoModeration?.spam?.action === 'timeout' ? 'selected' : ''}>Timeout</option>
                                                        <option value="kick" ${config.autoModeration?.spam?.action === 'kick' ? 'selected' : ''}>Kick</option>
                                                    </select>
                                                </div>
                                                <div class="mb-2">
                                                    <label for="spam-duration" class="form-label">Timeout Duration (seconds)</label>
                                                    <input type="number" class="form-control" id="spam-duration" 
                                                           value="${config.autoModeration?.spam?.duration || 300}" min="60" max="2419200">
                                                </div>
                                                <div class="mb-2">
                                                    <label for="spam-exempt-roles" class="form-label">Exempt Roles</label>
                                                    <div class="dropdown">
                                                        <button class="btn btn-outline-secondary dropdown-toggle w-100 text-start" type="button" 
                                                                id="spam-exempt-roles-dropdown" data-bs-toggle="dropdown" data-bs-auto-close="false" aria-expanded="false">
                                                            <span id="spam-exempt-roles-text">Select roles...</span>
                                                        </button>
                                                        <div class="dropdown-menu w-100 p-2" aria-labelledby="spam-exempt-roles-dropdown" 
                                                             style="max-height: 200px; overflow-y: auto;">
                                                            ${this.availableRoles.map(role => 
                                                                `<div class="form-check">
                                                                    <input class="form-check-input spam-exempt-role-checkbox" type="checkbox" 
                                                                           value="${role.id}" id="spam-exempt-role-${role.id}"
                                                                           ${config.autoModeration?.spam?.exemptRoles?.includes(role.id) ? 'checked' : ''}>
                                                                    <label class="form-check-label d-flex align-items-center" for="spam-exempt-role-${role.id}">
                                                                        <span class="role-color-dot me-2" style="background-color: ${role.color}; 
                                                                              width: 12px; height: 12px; border-radius: 50%; display: inline-block;"></span>
                                                                        ${role.name}${role.managed ? ' (Bot Role)' : ''}
                                                                    </label>
                                                                </div>`
                                                            ).join('')}
                                                        </div>
                                                    </div>
                                                    <div class="form-text">Roles exempt from spam detection</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-header">
                                                <h6 class="mb-0">Caps Detection</h6>
                                            </div>
                                            <div class="card-body">
                                                <div class="form-check form-switch mb-2">
                                                    <input class="form-check-input" type="checkbox" id="caps-enabled" 
                                                           ${config.autoModeration?.caps?.enabled !== false ? 'checked' : ''}>
                                                    <label class="form-check-label" for="caps-enabled">Enable</label>
                                                </div>
                                                <div class="mb-2">
                                                    <label for="caps-threshold" class="form-label">Caps Threshold (%)</label>
                                                    <input type="number" class="form-control" id="caps-threshold" 
                                                           value="${config.autoModeration?.caps?.threshold || 70}" min="50" max="100">
                                                </div>
                                                <div class="mb-2">
                                                    <label for="caps-min-length" class="form-label">Min Message Length</label>
                                                    <input type="number" class="form-control" id="caps-min-length" 
                                                           value="${config.autoModeration?.caps?.minLength || 10}" min="5" max="50">
                                                </div>
                                                <div class="mb-2">
                                                    <label for="caps-action" class="form-label">Action</label>
                                                    <select class="form-select" id="caps-action">
                                                        <option value="warn" ${config.autoModeration?.caps?.action === 'warn' ? 'selected' : ''}>Warn</option>
                                                        <option value="delete" ${config.autoModeration?.caps?.action === 'delete' ? 'selected' : ''}>Delete Message</option>
                                                        <option value="timeout" ${config.autoModeration?.caps?.action === 'timeout' ? 'selected' : ''}>Timeout</option>
                                                    </select>
                                                </div>
                                                <div class="mb-2">
                                                    <label for="caps-exempt-roles" class="form-label">Exempt Roles</label>
                                                    <div class="dropdown">
                                                        <button class="btn btn-outline-secondary dropdown-toggle w-100 text-start" type="button" 
                                                                id="caps-exempt-roles-dropdown" data-bs-toggle="dropdown" data-bs-auto-close="false" aria-expanded="false">
                                                            <span id="caps-exempt-roles-text">Select roles...</span>
                                                        </button>
                                                        <div class="dropdown-menu w-100 p-2" aria-labelledby="caps-exempt-roles-dropdown" 
                                                             style="max-height: 200px; overflow-y: auto;">
                                                            ${this.availableRoles.map(role => 
                                                                `<div class="form-check">
                                                                    <input class="form-check-input caps-exempt-role-checkbox" type="checkbox" 
                                                                           value="${role.id}" id="caps-exempt-role-${role.id}"
                                                                           ${config.autoModeration?.caps?.exemptRoles?.includes(role.id) ? 'checked' : ''}>
                                                                    <label class="form-check-label d-flex align-items-center" for="caps-exempt-role-${role.id}">
                                                                        <span class="role-color-dot me-2" style="background-color: ${role.color}; 
                                                                              width: 12px; height: 12px; border-radius: 50%; display: inline-block;"></span>
                                                                        ${role.name}${role.managed ? ' (Bot Role)' : ''}
                                                                    </label>
                                                                </div>`
                                                            ).join('')}
                                                        </div>
                                                    </div>
                                                    <div class="form-text">Roles exempt from caps detection</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="row mt-3">
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-header">
                                                <h6 class="mb-0">Link Detection</h6>
                                            </div>
                                            <div class="card-body">
                                                <div class="form-check form-switch mb-2">
                                                    <input class="form-check-input" type="checkbox" id="links-enabled" 
                                                           ${config.autoModeration?.links?.enabled === true ? 'checked' : ''}>
                                                    <label class="form-check-label" for="links-enabled">Enable</label>
                                                </div>
                                                <div class="mb-2">
                                                    <label for="links-whitelist" class="form-label">Whitelisted Domains</label>
                                                    <textarea class="form-control" id="links-whitelist" rows="3" 
                                                              placeholder="discord.gg, youtube.com, github.com">${config.autoModeration?.links?.whitelist?.join(', ') || ''}</textarea>
                                                    <div class="form-text">Comma-separated list of allowed domains</div>
                                                </div>
                                                <div class="mb-2">
                                                    <label for="links-action" class="form-label">Action</label>
                                                    <select class="form-select" id="links-action">
                                                        <option value="warn" ${config.autoModeration?.links?.action === 'warn' ? 'selected' : ''}>Warn</option>
                                                        <option value="delete" ${config.autoModeration?.links?.action === 'delete' ? 'selected' : ''}>Delete Message</option>
                                                        <option value="timeout" ${config.autoModeration?.links?.action === 'timeout' ? 'selected' : ''}>Timeout</option>
                                                    </select>
                                                </div>
                                                <div class="mb-2">
                                                    <label for="links-exempt-roles" class="form-label">Exempt Roles</label>
                                                    <div class="dropdown">
                                                        <button class="btn btn-outline-secondary dropdown-toggle w-100 text-start" type="button" 
                                                                id="links-exempt-roles-dropdown" data-bs-toggle="dropdown" data-bs-auto-close="false" aria-expanded="false">
                                                            <span id="links-exempt-roles-text">Select roles...</span>
                                                        </button>
                                                        <div class="dropdown-menu w-100 p-2" aria-labelledby="links-exempt-roles-dropdown" 
                                                             style="max-height: 200px; overflow-y: auto;">
                                                            ${this.availableRoles.map(role => 
                                                                `<div class="form-check">
                                                                    <input class="form-check-input links-exempt-role-checkbox" type="checkbox" 
                                                                           value="${role.id}" id="links-exempt-role-${role.id}"
                                                                           ${config.autoModeration?.links?.exemptRoles?.includes(role.id) ? 'checked' : ''}>
                                                                    <label class="form-check-label d-flex align-items-center" for="links-exempt-role-${role.id}">
                                                                        <span class="role-color-dot me-2" style="background-color: ${role.color}; 
                                                                              width: 12px; height: 12px; border-radius: 50%; display: inline-block;"></span>
                                                                        ${role.name}${role.managed ? ' (Bot Role)' : ''}
                                                                    </label>
                                                                </div>`
                                                            ).join('')}
                                                        </div>
                                                    </div>
                                                    <div class="form-text">Roles exempt from link detection</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="card">
                                            <div class="card-header">
                                                <h6 class="mb-0">Profanity Detection</h6>
                                            </div>
                                            <div class="card-body">
                                                <div class="form-check form-switch mb-2">
                                                    <input class="form-check-input" type="checkbox" id="profanity-enabled" 
                                                           ${config.autoModeration?.profanity?.enabled === true ? 'checked' : ''}>
                                                    <label class="form-check-label" for="profanity-enabled">Enable</label>
                                                </div>
                                                <div class="mb-2">
                                                    <label for="profanity-words" class="form-label">Custom Words</label>
                                                    <textarea class="form-control" id="profanity-words" rows="3" 
                                                              placeholder="word1, word2, word3">${config.autoModeration?.profanity?.customWords?.join(', ') || ''}</textarea>
                                                    <div class="form-text">Comma-separated list of custom blocked words</div>
                                                </div>
                                                <div class="mb-2">
                                                    <label for="profanity-action" class="form-label">Action</label>
                                                    <select class="form-select" id="profanity-action">
                                                        <option value="warn" ${config.autoModeration?.profanity?.action === 'warn' ? 'selected' : ''}>Warn</option>
                                                        <option value="delete" ${config.autoModeration?.profanity?.action === 'delete' ? 'selected' : ''}>Delete Message</option>
                                                        <option value="timeout" ${config.autoModeration?.profanity?.action === 'timeout' ? 'selected' : ''}>Timeout</option>
                                                    </select>
                                                </div>
                                                <div class="mb-2">
                                                    <label for="profanity-exempt-roles" class="form-label">Exempt Roles</label>
                                                    <div class="dropdown">
                                                        <button class="btn btn-outline-secondary dropdown-toggle w-100 text-start" type="button" 
                                                                id="profanity-exempt-roles-dropdown" data-bs-toggle="dropdown" data-bs-auto-close="false" aria-expanded="false">
                                                            <span id="profanity-exempt-roles-text">Select roles...</span>
                                                        </button>
                                                        <div class="dropdown-menu w-100 p-2" aria-labelledby="profanity-exempt-roles-dropdown" 
                                                             style="max-height: 200px; overflow-y: auto;">
                                                            ${this.availableRoles.map(role => 
                                                                `<div class="form-check">
                                                                    <input class="form-check-input profanity-exempt-role-checkbox" type="checkbox" 
                                                                           value="${role.id}" id="profanity-exempt-role-${role.id}"
                                                                           ${config.autoModeration?.profanity?.exemptRoles?.includes(role.id) ? 'checked' : ''}>
                                                                    <label class="form-check-label d-flex align-items-center" for="profanity-exempt-role-${role.id}">
                                                                        <span class="role-color-dot me-2" style="background-color: ${role.color}; 
                                                                              width: 12px; height: 12px; border-radius: 50%; display: inline-block;"></span>
                                                                        ${role.name}${role.managed ? ' (Bot Role)' : ''}
                                                                    </label>
                                                                </div>`
                                                            ).join('')}
                                                        </div>
                                                    </div>
                                                    <div class="form-text">Roles exempt from profanity detection</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="row mt-3">
                                    <div class="col-12">
                                        <div class="card">
                                            <div class="card-header">
                                                <h6 class="mb-0">Exemptions</h6>
                                            </div>
                                            <div class="card-body">
                                                <div class="row">
                                                    <div class="col-md-6">
                                                        <label for="exempt-roles" class="form-label">Exempt Roles</label>
                                                        <div class="dropdown">
                                                            <button class="btn btn-outline-secondary dropdown-toggle w-100 text-start" type="button" 
                                                                    id="exempt-roles-dropdown" data-bs-toggle="dropdown" data-bs-auto-close="false" aria-expanded="false">
                                                                <span id="exempt-roles-text">Select roles...</span>
                                                            </button>
                                                            <div class="dropdown-menu w-100 p-2" aria-labelledby="exempt-roles-dropdown" 
                                                                 style="max-height: 300px; overflow-y: auto;">
                                                                ${this.availableRoles.map(role => 
                                                                    `<div class="form-check">
                                                                        <input class="form-check-input exempt-role-checkbox" type="checkbox" 
                                                                               value="${role.id}" id="exempt-role-${role.id}"
                                                                               ${config.autoModeration?.exemptRoles?.includes(role.id) ? 'checked' : ''}>
                                                                        <label class="form-check-label d-flex align-items-center" for="exempt-role-${role.id}">
                                                                            <span class="role-color-dot me-2" style="background-color: ${role.color}; 
                                                                                  width: 12px; height: 12px; border-radius: 50%; display: inline-block;"></span>
                                                                            ${role.name}${role.managed ? ' (Bot Role)' : ''}
                                                                        </label>
                                                                    </div>`
                                                                ).join('')}
                                                            </div>
                                                        </div>
                                                        <select class="form-select d-none" id="exempt-roles" multiple>
                                                            ${this.availableRoles.map(role => 
                                                                `<option value="${role.id}" ${config.autoModeration?.exemptRoles?.includes(role.id) ? 'selected' : ''}>
                                                                    ${role.name}
                                                                </option>`
                                                            ).join('')}
                                                        </select>
                                                        <div class="form-text">Roles exempt from auto-moderation</div>
                                                    </div>
                                                    <div class="col-md-6">
                                                        <label for="exempt-channels" class="form-label">Exempt Channels</label>
                                                        <div class="dropdown">
                                                            <button class="btn btn-outline-secondary dropdown-toggle w-100 text-start" type="button" 
                                                                    id="exempt-channels-dropdown" data-bs-toggle="dropdown" data-bs-auto-close="false" aria-expanded="false">
                                                                <span id="exempt-channels-text">Select channels...</span>
                                                            </button>
                                                            <div class="dropdown-menu w-100 p-2" aria-labelledby="exempt-channels-dropdown" 
                                                                 style="max-height: 300px; overflow-y: auto;">
                                                                ${this.availableChannels.map(channel => 
                                                                    `<div class="form-check">
                                                                        <input class="form-check-input exempt-channel-checkbox" type="checkbox" 
                                                                               value="${channel.id}" id="exempt-channel-${channel.id}"
                                                                               ${config.autoModeration?.exemptChannels?.includes(channel.id) ? 'checked' : ''}>
                                                                        <label class="form-check-label" for="exempt-channel-${channel.id}">
                                                                            ${channel.category} / #${channel.name}
                                                                        </label>
                                                                    </div>`
                                                                ).join('')}
                                                            </div>
                                                        </div>
                                                        <select class="form-select d-none" id="exempt-channels" multiple>
                                                            ${this.availableChannels.map(channel => 
                                                                `<option value="${channel.id}" ${config.autoModeration?.exemptChannels?.includes(channel.id) ? 'selected' : ''}>
                                                                    ${channel.category} / #${channel.name}
                                                                </option>`
                                                            ).join('')}
                                                        </select>
                                                        <div class="form-text">Channels exempt from auto-moderation</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
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
                <div class="d-flex align-items-center flex-grow-1">
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
                    <div class="ms-auto me-3">
                        <span class="badge bg-secondary">Plugin Commands</span>
                    </div>
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
            
            // Get selected options from multi-select
            const verifierSelect = document.getElementById('verifier-role-ids');
            const selectedOptions = Array.from(verifierSelect?.selectedOptions || []);
            this.config.plugins.verification.roles.verifierRoleIds = selectedOptions.map(option => option.value);
            
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
            this.config.plugins.verification.settings.screenshotCount = parseInt(document.getElementById('screenshot-count')?.value);
            this.config.plugins.verification.settings.requireCharacterName = document.getElementById('require-character-name')?.checked !== false;
            this.config.plugins.verification.settings.requireGuildName = document.getElementById('require-guild-name')?.checked !== false;
            
            // Update auto-kick settings
            if (!this.config.plugins.verification.settings.autoKick) {
                this.config.plugins.verification.settings.autoKick = {};
            }
            this.config.plugins.verification.settings.autoKick.enabled = document.getElementById('auto-kick-enabled')?.checked || false;
            this.config.plugins.verification.settings.autoKick.time = parseInt(document.getElementById('auto-kick-time')?.value) || 24;
            this.config.plugins.verification.settings.autoKick.unit = document.getElementById('auto-kick-unit')?.value || 'hours';
            
            // Update auto-kick subject roles
            this.config.plugins.verification.settings.autoKick.subjectRoles = 
                Array.from(document.querySelectorAll('.auto-kick-subject-role-checkbox:checked'))
                    .map(cb => cb.value);
            
            // Update auto-kick exempt roles
            this.config.plugins.verification.settings.autoKick.exemptRoles = 
                Array.from(document.querySelectorAll('.auto-kick-exempt-role-checkbox:checked'))
                    .map(cb => cb.value);
        }
        
        // Update purge plugin (preserve existing settings)
        const purgeEnabled = document.getElementById('purge-enabled');
        if (purgeEnabled) {
            if (!this.config.plugins.purge) {
                this.config.plugins.purge = {};
            }
            
            this.config.plugins.purge.enabled = purgeEnabled.checked;
            
            // Update logging settings
            if (!this.config.plugins.purge.logging) {
                this.config.plugins.purge.logging = {};
            }
            this.config.plugins.purge.logging.channelId = document.getElementById('purge-log-channel-id')?.value || '';
            
            // Update auto-purge settings
            if (!this.config.plugins.purge.autoPurge) {
                this.config.plugins.purge.autoPurge = {};
            }
            this.config.plugins.purge.autoPurge.enabled = document.getElementById('purge-auto-enabled')?.checked || false;
            
            // Update schedules
            const schedules = [];
            document.querySelectorAll('.purge-schedule').forEach((scheduleElement, index) => {
                // Get selected channels
                const channelCheckboxes = document.querySelectorAll(`.schedule-channel-checkbox[data-schedule-index="${index}"]:checked`);
                const channelIds = Array.from(channelCheckboxes).map(cb => cb.value);
                
                const frequency = document.getElementById(`schedule-${index}-frequency`)?.value || 'daily';
                const time = document.getElementById(`schedule-${index}-time`)?.value || '00:00';
                
                let cron = '';
                const [hours, minutes] = time.split(':');
                
                // Convert calendar format to cron
                if (frequency === 'daily') {
                    cron = `${minutes} ${hours} * * *`;
                } else if (frequency === 'weekly') {
                    const dayCheckboxes = document.querySelectorAll(`input[id^="schedule-${index}-day-"]:checked`);
                    const days = Array.from(dayCheckboxes).map(cb => cb.value).join(',');
                    cron = `${minutes} ${hours} * * ${days || '0'}`;
                } else if (frequency === 'monthly') {
                    const dayOfMonth = document.getElementById(`schedule-${index}-day-of-month`)?.value || '1';
                    cron = `${minutes} ${hours} ${dayOfMonth} * *`;
                } else if (frequency === 'custom') {
                    cron = document.getElementById(`schedule-${index}-cron`)?.value || '0 0 * * *';
                }
                
                const schedule = {
                    enabled: document.getElementById(`schedule-${index}-enabled`)?.checked || false,
                    name: document.getElementById(`schedule-${index}-name`)?.value || '',
                    channelIds: channelIds,
                    messageCount: parseInt(document.getElementById(`schedule-${index}-count`)?.value) || 0,
                    frequency: frequency,
                    time: time,
                    cron: cron,
                    timezone: document.getElementById(`schedule-${index}-timezone`)?.value || ''
                };
                
                // Add frequency-specific fields
                if (frequency === 'weekly') {
                    const dayCheckboxes = document.querySelectorAll(`input[id^="schedule-${index}-day-"]:checked`);
                    schedule.daysOfWeek = Array.from(dayCheckboxes).map(cb => parseInt(cb.value));
                } else if (frequency === 'monthly') {
                    schedule.dayOfMonth = parseInt(document.getElementById(`schedule-${index}-day-of-month`)?.value) || 1;
                }
                
                schedules.push(schedule);
            });
            this.config.plugins.purge.autoPurge.schedules = schedules;
        }
        
        // Update moderation plugin (preserve existing settings)
        const moderationEnabled = document.getElementById('moderation-enabled');
        if (moderationEnabled) {
            if (!this.config.plugins.moderation) {
                this.config.plugins.moderation = {};
            }
            
            this.config.plugins.moderation.enabled = moderationEnabled.checked;
            
            // Update logging settings
            if (!this.config.plugins.moderation.logging) {
                this.config.plugins.moderation.logging = {};
            }
            this.config.plugins.moderation.logging.channelId = document.getElementById('moderation-log-channel-id')?.value || '';
            
            // Update roles settings
            if (!this.config.plugins.moderation.roles) {
                this.config.plugins.moderation.roles = {};
            }
            
            // Get selected moderator roles from multi-select
            const moderatorSelect = document.getElementById('moderator-role-ids');
            const selectedModerator = Array.from(moderatorSelect?.selectedOptions || []);
            this.config.plugins.moderation.roles.moderatorRoleIds = selectedModerator.map(option => option.value);
            
            // Update actions settings
            if (!this.config.plugins.moderation.actions) {
                this.config.plugins.moderation.actions = {};
            }
            
            this.config.plugins.moderation.actions.timeout = document.getElementById('action-timeout')?.checked !== false;
            this.config.plugins.moderation.actions.kick = document.getElementById('action-kick')?.checked !== false;
            this.config.plugins.moderation.actions.ban = document.getElementById('action-ban')?.checked !== false;
            this.config.plugins.moderation.actions.unban = document.getElementById('action-unban')?.checked !== false;
            this.config.plugins.moderation.actions.warn = document.getElementById('action-warn')?.checked !== false;
            this.config.plugins.moderation.actions.slowmode = document.getElementById('action-slowmode')?.checked !== false;
            this.config.plugins.moderation.actions.addrole = document.getElementById('action-addrole')?.checked !== false;
            this.config.plugins.moderation.actions.removerole = document.getElementById('action-removerole')?.checked !== false;
            this.config.plugins.moderation.actions.nickname = document.getElementById('action-nickname')?.checked !== false;
            this.config.plugins.moderation.actions.purgemsg = document.getElementById('action-purgemsg')?.checked !== false;
            this.config.plugins.moderation.actions.pin = document.getElementById('action-pin')?.checked !== false;
            this.config.plugins.moderation.actions.unpin = document.getElementById('action-unpin')?.checked !== false;
            this.config.plugins.moderation.actions.userinfo = document.getElementById('action-userinfo')?.checked !== false;
            this.config.plugins.moderation.actions.serverstats = document.getElementById('action-serverstats')?.checked !== false;
            
            // Moderation exemptions
            this.config.plugins.moderation.exemptRoles = 
                Array.from(document.querySelectorAll('.moderation-exempt-role-checkbox:checked'))
                    .map(cb => cb.value);
            this.config.plugins.moderation.exemptChannels = 
                Array.from(document.querySelectorAll('.moderation-exempt-channel-checkbox:checked'))
                    .map(cb => cb.value);
            
            // Update auto-moderation settings
            if (!this.config.plugins.moderation.autoModeration) {
                this.config.plugins.moderation.autoModeration = {};
            }
            
            this.config.plugins.moderation.autoModeration.enabled = document.getElementById('automod-enabled')?.checked === true;
            
            // Spam detection settings
            if (!this.config.plugins.moderation.autoModeration.spam) {
                this.config.plugins.moderation.autoModeration.spam = {};
            }
            this.config.plugins.moderation.autoModeration.spam.enabled = document.getElementById('spam-enabled')?.checked !== false;
            this.config.plugins.moderation.autoModeration.spam.maxMessages = parseInt(document.getElementById('spam-max-messages')?.value) || 5;
            this.config.plugins.moderation.autoModeration.spam.timeWindow = parseInt(document.getElementById('spam-time-window')?.value) || 10;
            this.config.plugins.moderation.autoModeration.spam.action = document.getElementById('spam-action')?.value || 'timeout';
            this.config.plugins.moderation.autoModeration.spam.duration = parseInt(document.getElementById('spam-duration')?.value) || 300;
            
            // Caps detection settings
            if (!this.config.plugins.moderation.autoModeration.caps) {
                this.config.plugins.moderation.autoModeration.caps = {};
            }
            this.config.plugins.moderation.autoModeration.caps.enabled = document.getElementById('caps-enabled')?.checked !== false;
            this.config.plugins.moderation.autoModeration.caps.threshold = parseInt(document.getElementById('caps-threshold')?.value) || 70;
            this.config.plugins.moderation.autoModeration.caps.minLength = parseInt(document.getElementById('caps-min-length')?.value) || 10;
            this.config.plugins.moderation.autoModeration.caps.action = document.getElementById('caps-action')?.value || 'warn';
            
            // Links detection settings
            if (!this.config.plugins.moderation.autoModeration.links) {
                this.config.plugins.moderation.autoModeration.links = {};
            }
            this.config.plugins.moderation.autoModeration.links.enabled = document.getElementById('links-enabled')?.checked === true;
            this.config.plugins.moderation.autoModeration.links.action = document.getElementById('links-action')?.value || 'delete';
            const linksWhitelist = document.getElementById('links-whitelist')?.value.trim();
            this.config.plugins.moderation.autoModeration.links.whitelist = linksWhitelist ? 
                linksWhitelist.split(',').map(s => s.trim()).filter(s => s) : [];
            
            // Profanity detection settings
            if (!this.config.plugins.moderation.autoModeration.profanity) {
                this.config.plugins.moderation.autoModeration.profanity = {};
            }
            this.config.plugins.moderation.autoModeration.profanity.enabled = document.getElementById('profanity-enabled')?.checked === true;
            this.config.plugins.moderation.autoModeration.profanity.action = document.getElementById('profanity-action')?.value || 'warn';
            const profanityWords = document.getElementById('profanity-words')?.value.trim();
            this.config.plugins.moderation.autoModeration.profanity.customWords = profanityWords ? 
                profanityWords.split(',').map(s => s.trim()).filter(s => s) : [];
            
            // Individual action exempt roles
            this.config.plugins.moderation.autoModeration.spam.exemptRoles = 
                Array.from(document.querySelectorAll('.spam-exempt-role-checkbox:checked'))
                    .map(cb => cb.value);
            
            this.config.plugins.moderation.autoModeration.caps.exemptRoles = 
                Array.from(document.querySelectorAll('.caps-exempt-role-checkbox:checked'))
                    .map(cb => cb.value);
            
            this.config.plugins.moderation.autoModeration.links.exemptRoles = 
                Array.from(document.querySelectorAll('.links-exempt-role-checkbox:checked'))
                    .map(cb => cb.value);
            
            this.config.plugins.moderation.autoModeration.profanity.exemptRoles = 
                Array.from(document.querySelectorAll('.profanity-exempt-role-checkbox:checked'))
                    .map(cb => cb.value);
            
            // Exemption settings
            const exemptRolesSelect = document.getElementById('exempt-roles');
            const exemptChannelsSelect = document.getElementById('exempt-channels');
            
            this.config.plugins.moderation.autoModeration.exemptRoles = exemptRolesSelect ? 
                Array.from(exemptRolesSelect.selectedOptions).map(option => option.value) : [];
            this.config.plugins.moderation.autoModeration.exemptChannels = exemptChannelsSelect ? 
                Array.from(exemptChannelsSelect.selectedOptions).map(option => option.value) : [];
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
        
        // Load moderation logs if showing that section
        if (sectionName === 'moderation-logs') {
            this.loadModerationLogs();
        }
    }
    
    createPurgeSchedules(schedules) {
        return schedules.map((schedule, index) => this.createPurgeScheduleForm(schedule, index)).join('');
    }
    
    createPurgeScheduleForm(schedule, index) {
        const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const timezones = [
            'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
            'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome',
            'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata', 'Australia/Sydney',
            'UTC'
        ];
        
        // Add detected timezone if not in list
        if (!timezones.includes(detectedTimezone)) {
            timezones.unshift(detectedTimezone);
        }
        
        const selectedChannels = schedule.channelIds || (schedule.channelId ? [schedule.channelId] : []);
        
        return `
            <div class="card mb-3 purge-schedule" data-schedule-index="${index}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h6 class="mb-0">Schedule ${index + 1}</h6>
                        <div>
                            <div class="form-check form-switch d-inline-block me-3">
                                <input class="form-check-input" type="checkbox" 
                                       id="schedule-${index}-enabled" 
                                       ${schedule.enabled !== false ? 'checked' : ''}>
                                <label class="form-check-label" for="schedule-${index}-enabled">Enabled</label>
                            </div>
                            <button type="button" class="btn btn-sm btn-outline-danger" 
                                    onclick="dashboard.removePurgeSchedule(${index})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label for="schedule-${index}-name" class="form-label">Schedule Name</label>
                                <input type="text" class="form-control" id="schedule-${index}-name" 
                                       value="${schedule.name || ''}" 
                                       placeholder="Daily cleanup, Weekly purge, etc.">
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Channels</label>
                                <div class="dropdown">
                                    <button class="btn btn-outline-secondary dropdown-toggle w-100 text-start" type="button" 
                                            id="schedule-${index}-channels-dropdown" data-bs-toggle="dropdown" data-bs-auto-close="false" aria-expanded="false">
                                        <span id="schedule-${index}-channels-text">
                                            ${selectedChannels.length > 0 ? `${selectedChannels.length} channel(s) selected` : 'Select channels...'}
                                        </span>
                                    </button>
                                    <div class="dropdown-menu w-100 p-2" aria-labelledby="schedule-${index}-channels-dropdown" 
                                         style="max-height: 300px; overflow-y: auto;">
                                        ${this.availableChannels.map(channel => {
                                            const isSelected = selectedChannels.includes(channel.id);
                                            return `
                                                <div class="form-check">
                                                    <input class="form-check-input schedule-channel-checkbox" type="checkbox" 
                                                           value="${channel.id}" id="schedule-${index}-channel-${channel.id}"
                                                           data-schedule-index="${index}" ${isSelected ? 'checked' : ''}>
                                                    <label class="form-check-label" for="schedule-${index}-channel-${channel.id}">
                                                        ${channel.category} / #${channel.name}
                                                    </label>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                                <div class="form-text">Select one or more channels where messages will be purged</div>
                            </div>
                            <div class="mb-3">
                                <label for="schedule-${index}-count" class="form-label">Message Count</label>
                                <input type="number" class="form-control" id="schedule-${index}-count" 
                                       value="${schedule.messageCount || 0}" 
                                       min="0" max="1000"
                                       placeholder="0 for all messages">
                                <div class="form-text">0 = all messages, or specify a number (1-1000)</div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="mb-3">
                                <label class="form-label">Schedule</label>
                                <div class="row">
                                    <div class="col-6">
                                        <label for="schedule-${index}-frequency" class="form-label">Frequency</label>
                                        <select class="form-control" id="schedule-${index}-frequency" onchange="dashboard.updateScheduleOptions(${index})">
                                            <option value="daily" ${(schedule.frequency || 'daily') === 'daily' ? 'selected' : ''}>Daily</option>
                                            <option value="weekly" ${schedule.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                                            <option value="monthly" ${schedule.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                                            <option value="custom" ${schedule.frequency === 'custom' ? 'selected' : ''}>Custom Cron</option>
                                        </select>
                                    </div>
                                    <div class="col-6">
                                        <label for="schedule-${index}-time" class="form-label">Time</label>
                                        <input type="time" class="form-control" id="schedule-${index}-time" 
                                               value="${schedule.time || '00:00'}">
                                    </div>
                                </div>
                                
                                <div id="schedule-${index}-weekly-options" class="mt-2" style="display: ${schedule.frequency === 'weekly' ? 'block' : 'none'}">
                                    <label class="form-label">Days of Week</label>
                                    <div class="d-flex flex-wrap gap-2">
                                        ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, dayIndex) => {
                                            const isSelected = schedule.daysOfWeek && schedule.daysOfWeek.includes(dayIndex);
                                            return `
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" value="${dayIndex}" 
                                                           id="schedule-${index}-day-${dayIndex}" ${isSelected ? 'checked' : ''}>
                                                    <label class="form-check-label" for="schedule-${index}-day-${dayIndex}">
                                                        ${day.substring(0, 3)}
                                                    </label>
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                                
                                <div id="schedule-${index}-monthly-options" class="mt-2" style="display: ${schedule.frequency === 'monthly' ? 'block' : 'none'}">
                                    <label for="schedule-${index}-day-of-month" class="form-label">Day of Month</label>
                                    <input type="number" class="form-control" id="schedule-${index}-day-of-month" 
                                           value="${schedule.dayOfMonth || 1}" min="1" max="31">
                                </div>
                                
                                <div id="schedule-${index}-custom-options" class="mt-2" style="display: ${schedule.frequency === 'custom' ? 'block' : 'none'}">
                                    <label for="schedule-${index}-cron" class="form-label">Cron Expression</label>
                                    <input type="text" class="form-control" id="schedule-${index}-cron" 
                                           value="${schedule.cron || '0 0 * * *'}" 
                                           placeholder="0 0 * * * (daily at midnight)">
                                    <div class="form-text">
                                        <a href="https://crontab.guru/" target="_blank">Cron expression generator</a>
                                    </div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label for="schedule-${index}-timezone" class="form-label">Timezone</label>
                                <select class="form-select" id="schedule-${index}-timezone">
                                    ${timezones.map(tz => {
                                        const isSelected = schedule.timezone === tz || (!schedule.timezone && tz === detectedTimezone);
                                        const displayName = tz === detectedTimezone ? `${tz} (Detected)` : tz;
                                        return `<option value="${tz}" ${isSelected ? 'selected' : ''}>${displayName}</option>`;
                                    }).join('')}
                                </select>
                                <div class="form-text">Timezone for the schedule</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    addPurgeSchedule() {
        const container = document.getElementById('purge-schedules-container');
        const scheduleCount = container.children.length;
        
        const newSchedule = {
            enabled: true,
            name: '',
            channelIds: [],
            messageCount: 0,
            frequency: 'daily',
            time: '00:00',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
        
        const scheduleHtml = this.createPurgeScheduleForm(newSchedule, scheduleCount);
        container.insertAdjacentHTML('beforeend', scheduleHtml);
        
        // Add event listeners for the new schedule
        this.setupScheduleEventListeners(scheduleCount);
        
        // Mark as changed
        this.updateConfigFromForm();
        this.checkForChanges();
    }
    
    setupScheduleEventListeners(index) {
        // Add event listeners for channel checkboxes
        document.querySelectorAll(`.schedule-channel-checkbox[data-schedule-index="${index}"]`).forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateChannelSelection(index);
                this.updateConfigFromForm();
                this.checkForChanges();
            });
        });
    }
    
    updateChannelSelection(index) {
        const checkboxes = document.querySelectorAll(`.schedule-channel-checkbox[data-schedule-index="${index}"]`);
        const selectedChannels = Array.from(checkboxes).filter(cb => cb.checked);
        const text = document.getElementById(`schedule-${index}-channels-text`);
        
        if (selectedChannels.length === 0) {
            text.textContent = 'Select channels...';
        } else if (selectedChannels.length === 1) {
            const channelId = selectedChannels[0].value;
            const channel = this.availableChannels.find(c => c.id === channelId);
            text.textContent = channel ? `#${channel.name}` : '1 channel selected';
        } else {
            text.textContent = `${selectedChannels.length} channels selected`;
        }
    }
    
    updateScheduleOptions(index) {
        const frequency = document.getElementById(`schedule-${index}-frequency`).value;
        
        // Hide all option divs
        document.getElementById(`schedule-${index}-weekly-options`).style.display = 'none';
        document.getElementById(`schedule-${index}-monthly-options`).style.display = 'none';
        document.getElementById(`schedule-${index}-custom-options`).style.display = 'none';
        
        // Show relevant options
        if (frequency === 'weekly') {
            document.getElementById(`schedule-${index}-weekly-options`).style.display = 'block';
        } else if (frequency === 'monthly') {
            document.getElementById(`schedule-${index}-monthly-options`).style.display = 'block';
        } else if (frequency === 'custom') {
            document.getElementById(`schedule-${index}-custom-options`).style.display = 'block';
        }
        
        // Mark as changed
        this.updateConfigFromForm();
        this.checkForChanges();
    }
    
    removePurgeSchedule(index) {
        const scheduleElement = document.querySelector(`[data-schedule-index="${index}"]`);
        if (scheduleElement) {
            scheduleElement.remove();
            
            // Re-index remaining schedules
            document.querySelectorAll('.purge-schedule').forEach((element, newIndex) => {
                element.setAttribute('data-schedule-index', newIndex);
                element.querySelector('h6').textContent = `Schedule ${newIndex + 1}`;
                
                // Update all IDs and names in the element
                const inputs = element.querySelectorAll('input, select');
                inputs.forEach(input => {
                    const id = input.id;
                    if (id.includes('schedule-')) {
                        const newId = id.replace(/schedule-\d+/, `schedule-${newIndex}`);
                        input.id = newId;
                        const label = element.querySelector(`label[for="${id}"]`);
                        if (label) label.setAttribute('for', newId);
                    }
                });
                
                // Update remove button onclick
                const removeBtn = element.querySelector('.btn-outline-danger');
                if (removeBtn) {
                    removeBtn.setAttribute('onclick', `dashboard.removePurgeSchedule(${newIndex})`);
                }
            });
            
            // Mark as changed
            this.updateConfigFromForm();
            this.checkForChanges();
        }
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

    async loadModerationLogs(filters = {}) {
        try {
            const params = new URLSearchParams();
            if (filters.userId) params.append('userId', filters.userId);
            if (filters.action) params.append('action', filters.action);
            if (filters.moderator) params.append('moderator', filters.moderator);
            if (filters.hours) params.append('hours', filters.hours);

            const response = await fetch(`/api/moderation/logs?${params}`);
            const data = await response.json();

            if (data.success) {
                this.displayModerationLogs(data.logs);
            } else {
                this.displayModerationLogsError(data.message || 'Failed to load moderation logs');
            }
        } catch (error) {
            console.error('Error loading moderation logs:', error);
            this.displayModerationLogsError('Error loading moderation logs');
        }
    }

    displayModerationLogs(logs) {
        const container = document.getElementById('logs-container');
        
        if (logs.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-info-circle fa-2x mb-2"></i>
                    <p>No moderation logs found matching the current filters.</p>
                </div>
            `;
            return;
        }

        const logsHtml = logs.map(log => {
            const actionEmojis = {
                timeout: "🔇", kick: "👢", ban: "🔨", unban: "✅", warn: "⚠️",
                slowmode: "🐌", addrole: "➕", removerole: "➖", nickname: "📝",
                purgemsg: "🗑️", pin: "📌", unpin: "📌"
            };
            
            const emoji = actionEmojis[log.action] || "🛡️";
            const actionName = log.action.charAt(0).toUpperCase() + log.action.slice(1);
            const timestamp = new Date(log.timestamp).toLocaleString();
            
            let extraInfo = '';
            if (log.duration) extraInfo += ` (${log.duration} min)`;
            if (log.role) extraInfo += ` (${log.role})`;
            if (log.channel) extraInfo += ` in ${log.channel}`;
            if (log.count) extraInfo += ` (${log.count} messages)`;
            
            return `
                <div class="card mb-2">
                    <div class="card-body py-2">
                        <div class="row align-items-center">
                            <div class="col-md-1 text-center">
                                <span class="fs-4">${emoji}</span>
                            </div>
                            <div class="col-md-2">
                                <strong>${actionName}</strong>${extraInfo}
                            </div>
                            <div class="col-md-3">
                                <small class="text-muted">Target:</small><br>
                                ${log.targetUser ? 
                                    `<strong>${log.targetUser.displayName}</strong><br><small class="text-muted">${log.targetUser.id}</small>` : 
                                    `<code>${log.userId}</code>`
                                }
                            </div>
                            <div class="col-md-3">
                                <small class="text-muted">Moderator:</small><br>
                                ${log.moderator.displayName || log.moderator.tag}
                            </div>
                            <div class="col-md-3">
                                <small class="text-muted">Time:</small><br>
                                ${timestamp}
                            </div>
                        </div>
                        ${log.reason ? `
                            <div class="row mt-1">
                                <div class="col-md-11 offset-md-1">
                                    <small class="text-muted">Reason:</small> ${log.reason}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="mb-3">
                <small class="text-muted">Showing ${logs.length} log entries</small>
            </div>
            ${logsHtml}
        `;
    }

    displayModerationLogsError(message) {
        const container = document.getElementById('logs-container');
        container.innerHTML = `
            <div class="text-center text-danger">
                <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                <p>${message}</p>
            </div>
        `;
    }

    setupModerationLogsEventListeners() {
        // Refresh logs button
        document.getElementById('refresh-logs')?.addEventListener('click', () => {
            this.loadModerationLogs();
        });

        // Apply filters button
        document.getElementById('apply-filters')?.addEventListener('click', () => {
            const filters = {
                userId: document.getElementById('filter-user')?.value.trim(),
                action: document.getElementById('filter-action')?.value,
                moderator: document.getElementById('filter-moderator')?.value.trim(),
                hours: document.getElementById('filter-hours')?.value
            };
            
            // Remove empty filters
            Object.keys(filters).forEach(key => {
                if (!filters[key]) delete filters[key];
            });
            
            this.loadModerationLogs(filters);
        });

        // Clear filters button
        document.getElementById('clear-filters')?.addEventListener('click', () => {
            document.getElementById('filter-user').value = '';
            document.getElementById('filter-action').value = '';
            document.getElementById('filter-moderator').value = '';
            document.getElementById('filter-hours').value = '';
            this.loadModerationLogs();
        });

        // Enter key support for text inputs
        ['filter-user', 'filter-moderator'].forEach(id => {
            document.getElementById(id)?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    document.getElementById('apply-filters').click();
                }
            });
        });
    }
}

// Initialize dashboard when DOM is loaded
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new BotDashboard();
});