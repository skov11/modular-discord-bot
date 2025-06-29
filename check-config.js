const fs = require('fs');
const path = require('path');

function checkConfig() {
    console.log('Discord Bot Configuration Checker\n');
    
    const configPath = path.join(__dirname, 'config.json');
    
    if (!fs.existsSync(configPath)) {
        console.error('❌ config.json not found!');
        console.log('Please create a config.json file based on config.example.json');
        return;
    }
    
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        
        console.log('Bot Configuration:');
        console.log(`  Token: ${config.bot?.token ? '✅ Set' : '❌ Missing'}`);
        console.log(`  Client ID: ${config.bot?.clientId ? '✅ Set' : '❌ Missing'}`);
        console.log(`  Guild ID: ${config.bot?.guildId ? '✅ Set' : '❌ Missing'}`);
        console.log(`  Enable UI: ${config.bot?.enableUI ? '✅ Enabled' : '⚠️ Disabled'}`);
        console.log(`  UI Port: ${config.bot?.uiPort || '⚠️ Default (3000)'}`);
        
        if (config.bot?.uiAuth) {
            console.log('\n  UI Authentication:');
            console.log(`    Enabled: ${config.bot.uiAuth.enabled ? '✅ Enabled' : '⚠️ Disabled'}`);
            if (config.bot.uiAuth.enabled) {
                console.log(`    Client Secret: ${config.bot.uiAuth.clientSecret && config.bot.uiAuth.clientSecret !== 'your_discord_client_secret_here' ? '✅ Set' : '❌ Missing'}`);
                console.log(`    Session Secret: ${config.bot.uiAuth.sessionSecret && config.bot.uiAuth.sessionSecret !== 'your_session_secret_here' ? '✅ Set' : '❌ Missing'}`);
                console.log(`    Allowed Roles: ${config.bot.uiAuth.allowedRoleIds && config.bot.uiAuth.allowedRoleIds.length > 0 ? '✅ Set (' + config.bot.uiAuth.allowedRoleIds.length + ' roles)' : '❌ Missing'}`);
                console.log(`    Redirect URI: ${config.bot.uiAuth.redirectUri ? '✅ Set' : '❌ Missing'}`);
            }
        } else {
            console.log('\n  ⚠️ UI Authentication not configured (UI will be publicly accessible)');
        }
        
        if (config.plugins) {
            console.log('\nPlugin Configuration:');
            
            if (config.plugins.verification) {
                const verif = config.plugins.verification;
                console.log('\n  Verification Plugin:');
                console.log(`    Enabled: ${verif.enabled !== false ? '✅' : '❌'}`);
                
                console.log('\n    Channels:');
                console.log(`      Verify Channel ID: ${verif.channels?.verifyChannelId ? '✅ Set' : '❌ Missing'}`);
                console.log(`      Verify Command Channel ID: ${verif.channels?.verifyCommandChannelId ? '✅ Set' : '❌ Missing'}`);
                console.log(`      Log Channel ID: ${verif.channels?.logChannelId ? '✅ Set' : '⚠️ Optional - Not set'}`);
                console.log(`      How To Verify Channel ID: ${verif.channels?.howToVerifyID ? '✅ Set' : '⚠️ Optional - Not set'}`);
                
                console.log('\n    Roles:');
                console.log(`      Verified Role ID: ${verif.roles?.verifiedRoleId ? '✅ Set' : '❌ Missing'}`);
                console.log(`      Verifier Role IDs: ${verif.roles?.verifierRoleIds && verif.roles.verifierRoleIds.length > 0 ? '✅ Set' : '❌ Missing'}`);
                
                console.log('\n    Messages:');
                console.log(`      Approval Message: ${verif.messages?.approvalMessage ? '✅ Set' : '⚠️ Using default'}`);
                console.log(`      Denial Message Prefix: ${verif.messages?.denialMessagePrefix ? '✅ Set' : '⚠️ Using default'}`);
                
                console.log('\n    Settings:');
                console.log(`      Debug Mode: ${verif.settings?.debugMode ? '⚠️ Enabled' : '✅ Disabled'}`);
                console.log(`      Screenshot Count: ${verif.settings?.screenshotCount ?? '⚠️ Not set (defaults to 0)'}`);
                console.log(`      Require Character Name: ${verif.settings?.requireCharacterName !== false ? '✅ Yes' : '❌ No'}`);
                console.log(`      Require Guild Name: ${verif.settings?.requireGuildName !== false ? '✅ Yes' : '❌ No'}`);
            } else {
                console.log('\n  ❌ Verification plugin configuration not found');
            }
        } else {
            console.log('\n❌ No plugins configuration found');
        }
        
        console.log('\n💡 Tips:');
        console.log('- Make sure all channel IDs are valid and the bot has access to them');
        console.log('- Ensure role IDs exist in your Discord server');
        console.log('- The bot needs appropriate permissions in all configured channels');
        console.log('- Run the bot with debugMode: true to see more detailed logs');
        
    } catch (error) {
        console.error('❌ Error reading config.json:', error.message);
    }
}

checkConfig();