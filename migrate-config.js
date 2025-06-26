const fs = require('fs');
const path = require('path');

function migrateConfig() {
    const oldConfigPath = path.join(__dirname, 'config.json');
    const newConfigPath = path.join(__dirname, 'config.new.json');
    
    if (!fs.existsSync(oldConfigPath)) {
        console.error('config.json not found!');
        return;
    }
    
    try {
        const oldConfig = JSON.parse(fs.readFileSync(oldConfigPath, 'utf8'));
        
        const newConfig = {
            token: oldConfig.token,
            clientId: oldConfig.clientId,
            guildId: oldConfig.guildId,
            plugins: {
                verification: {
                    enabled: true,
                    verifyChannelId: oldConfig.verifyChannelId,
                    verifyCommandChannelId: oldConfig.verifyCommandChannelId,
                    logChannelId: oldConfig.logChannelId,
                    howToVerifyID: oldConfig.howToVerifyID,
                    atreidesRoleId: oldConfig.atreidesRoleId,
                    verifierRoleIds: oldConfig.verifierRoleIds,
                    approvalMessage: oldConfig.approvalMessage,
                    denialMessagePrefix: oldConfig.denialMessagePrefix,
                    debugMode: oldConfig.debugMode || false
                }
            }
        };
        
        fs.writeFileSync(newConfigPath, JSON.stringify(newConfig, null, 2));
        console.log('Config migrated successfully to config.new.json');
        console.log('Please review the new config and rename it to config.json when ready.');
        
    } catch (error) {
        console.error('Error migrating config:', error);
    }
}

migrateConfig();