# Troubleshooting Guide

This guide covers common issues and solutions for the Modular Discord Bot framework and its plugins.

## General Bot Issues

### Bot not responding to commands

- Verify bot has necessary permissions in the channel
- Check that slash commands are properly deployed (happens automatically on startup)
- Ensure bot is online and process is running (`pm2 list` to check status)
- Run `node check-config.js` to validate your configuration
- Check that the relevant plugin is enabled in config.json
- Try using the manual plugin reload button in the web interface
- Check the web dashboard for any error messages or warnings

### Bot crashes on startup

- Check console logs for specific error messages
- Verify all required dependencies are installed (`npm install`)
- Ensure config.json exists and has valid JSON syntax
- Check that bot token, client ID, and guild ID are correctly set
- Verify Discord application has proper permissions and intents enabled

### Configuration changes not taking effect

- Use the web interface to make changes (automatically triggers hot-reload)
- Try manually clicking the plugin reload button
- Check console logs for reload errors
- Restart the bot if hot-reload continues to fail (`pm2 restart bot`)
- Verify configuration syntax is valid JSON

## Web Interface Issues

### Web interface not accessible

- Verify `enableUI` is set to `true` in config.json
- Check that the configured `uiPort` is not in use by another application
- Ensure no firewall is blocking the port
- Check browser console for JavaScript errors
- Verify the bot process is running and UI server started successfully

### Authentication issues

- Ensure Discord OAuth2 settings are correctly configured (see AUTHENTICATION_SETUP.md)
- Verify `allowedRoleIds` contains your Discord role IDs
- Check that `clientSecret` and `sessionSecret` are properly set
- Confirm you're a member of the configured Discord server
- Try disabling authentication temporarily by setting `uiAuth.enabled: false`

### Channel/Role dropdowns empty

- Click "Refresh Channels & Roles" button to reload from Discord
- Verify bot is connected to Discord server
- Check that bot has proper permissions to read channels and roles
- Ensure guild ID is correctly configured in bot settings
- Monitor browser console for API errors

### Plugin reload failures

- Check the browser console and bot logs for specific error messages
- Verify the plugin configuration is valid JSON
- Try saving configuration changes instead of manual reload
- Restart the bot if hot-reload continues to fail
- Check file permissions on the plugin directory

## Verification Plugin Issues

### Approval buttons not working

- Confirm admin roles are correctly configured in `verifierRoleIds`
- Verify bot has "Manage Roles" permission
- Check console logs for error messages
- Ensure the verified role exists and bot can assign it

### Screenshot validation failing

- Verify uploaded files are valid image formats (PNG, JPG, GIF, WebP)
- Check file sizes aren't exceeding Discord's limits (8MB non-Nitro, 50MB Nitro)
- Monitor logs for specific validation errors
- Ensure all required screenshots are provided

### User notifications not working

- Verify users have DMs enabled from server members
- Check the Discord log channel for DM failure warnings
- Ensure `approvalMessage` and `denialMessagePrefix` are properly set in config.json
- Monitor file logs for DM delivery confirmations

### Verification denials not working

- Verify the denial reason modal appears when clicking "Deny Verification"
- Check that denied users cannot be approved until resubmission
- Ensure denial reasons are being logged properly
- Monitor logs for modal submission errors

### Nickname updates not working

- Ensure bot has "Manage Nicknames" permission
- Verify bot's role is higher than the user's highest role in the server hierarchy
- Check if the user is the server owner (nicknames cannot be changed for server owners)
- Monitor logs for specific permission errors

### Auto-moderation not working

- Ensure bot has "Manage Messages" permission in verification channel
- Verify `verifyCommandChannelId` is correctly set in config
- Check if bot can send DMs to users
- Monitor logs for permission errors

### Image upload errors

- Check Discord file size limits (8MB for non-Nitro users, 50MB for Nitro)
- Verify supported image formats are being used
- Monitor logs for specific upload validation errors
- Test with different image formats and sizes

### Verification embeds not displaying

- Verify bot has "Embed Links" permission
- Check that both screenshots are valid URLs
- Monitor logs for embed creation errors
- Ensure verification channel allows embeds

## Purge Plugin Issues

### Purge command not working

- Verify user has "Manage Messages" permission in the target channel
- Check that bot has "Manage Messages" permission in the target channel
- Ensure channel exists and bot can access it
- Monitor logs for permission or rate limit errors
- Try with smaller message counts if timing out

### Auto-purge schedules not running

- Verify auto-purge is enabled in plugin configuration
- Check cron expression syntax (use https://crontab.guru/ for validation)
- Ensure timezone is correctly configured
- Verify target channels exist and bot has permissions
- Monitor logs for auto-purge execution attempts
- Check that schedules are enabled individually

### Purge operations timing out

- Try smaller message counts for manual purges
- Check for network connectivity issues
- Monitor Discord API status for outages
- Verify bot isn't being rate limited
- Check logs for specific timeout errors

### Old messages not being deleted

- This is expected behavior - Discord only allows bulk deletion of messages newer than 14 days
- Old messages are deleted individually with delays to avoid rate limits
- Large purges of old messages will take significantly longer
- Monitor logs to see progress of individual deletions

### Permission errors during purge

- Verify bot has "Manage Messages" in target channel
- Check that bot's role hierarchy allows message management
- Ensure channel permissions haven't changed since configuration
- Try manual purge to test permissions before scheduling auto-purge

## Logging Issues

### Logging not working

- Run `node check-config.js` to verify log channel configuration
- Verify bot has "Send Messages" permission in log channel
- Check `bot.log` file in the root directory for file-based logs
- Ensure verification events are marked with `[VERIFICATION]` prefix in logs

### DMs not being sent

- Verify users have DMs enabled from server members
- Check if public reply fallback is working
- Monitor logs for DM failure events

### Discord channel logs missing

- Verify log channel ID is correctly configured
- Check bot permissions in the log channel
- Ensure the log channel exists and bot can access it
- Monitor file logs to see if events are being processed

## Performance Issues

### Bot running slowly

- Check system resources (CPU, memory usage)
- Monitor for excessive plugin reloading
- Review auto-purge schedules for overlapping operations
- Check for network latency issues with Discord API

## Moderation Plugin Issues

### Commands not working

**Commands appear disabled or not responding:**
- Verify the moderation plugin is enabled in configuration
- Check that specific actions are enabled in the action toggles
- Ensure bot has required permissions (see permission checklist below)
- Confirm user has moderator role or appropriate Discord permissions
- Check logs for permission or configuration errors

**Permission errors:**
- Verify bot has all required permissions in target channels
- Check bot's role position in server hierarchy
- Ensure bot role is above roles it needs to manage
- Confirm user has permission to perform the requested action

### Role Management Issues

**Cannot add/remove roles:**
- Check bot's role position in server hierarchy (must be above target role)
- Verify "Manage Roles" permission for the bot
- Ensure target role exists and is assignable
- Check that user isn't already assigned/unassigned the role
- Verify moderator's role hierarchy allows the action

**Role hierarchy errors:**
- Bot's highest role must be above any role it manages
- Moderator's highest role must be above the target user's highest role
- Server owner cannot have roles managed by bots
- Check role positions in Server Settings > Roles

### User Management Issues

**Timeout command failing:**
- Verify "Moderate Members" permission for bot
- Check timeout duration is within valid range (1-40320 minutes)
- Ensure target user doesn't have higher role than moderator
- Verify user is not already timed out

**Kick/Ban commands not working:**
- Check "Kick Members" and "Ban Members" permissions
- Verify role hierarchy (cannot target equal/higher roles)
- Ensure user exists in the server
- Check if user has administrative immunity

**Unban command failing:**
- Verify user is actually banned (check Discord ban list)
- Ensure bot has "Ban Members" permission
- Check that user ID is correct (18-digit Discord ID)
- Verify ban exists in the server's ban list

### Message Management Issues

**Bulk message deletion failing:**
- Check "Manage Messages" permission in target channel
- Verify messages are newer than 14 days (Discord limitation)
- Ensure message count is within range (1-100)
- Check that target channel is accessible

**Pin/Unpin commands not working:**
- Verify "Manage Messages" permission
- Check that message ID is correct and exists
- Ensure message is in the specified channel
- Verify message isn't already pinned/unpinned

### Auto-Moderation Issues

**Auto-moderation not triggering:**
- Verify auto-moderation is enabled in configuration
- Check that specific detection types are enabled
- Ensure users/channels are not in exemption lists
- Verify bot has "Read Messages" and "Read Message History" permissions
- Check thresholds and minimum requirements are properly configured

**Spam detection not working:**
- Verify spam detection is enabled
- Check message count and time window settings
- Test with messages exceeding the threshold
- Ensure action is configured (warn/timeout/kick)
- Check exemption lists for user/channel exclusions

**Caps detection issues:**
- Verify caps detection is enabled
- Check threshold percentage (50-100%)
- Ensure messages meet minimum length requirement
- Test with messages exceeding caps threshold
- Verify action is configured

**Link detection problems:**
- Check that link detection is enabled
- Verify whitelist is properly configured
- Test with both whitelisted and non-whitelisted links
- Ensure action is configured for violations
- Check URL format recognition

**Profanity detection not working:**
- Verify profanity detection is enabled
- Check custom word list configuration
- Test with exact word matches
- Verify action is configured
- Check for case sensitivity and partial matching

### Configuration Issues

**Action toggles not working:**
- Verify changes are saved in web interface
- Check that hot-reload completed successfully
- Try manual plugin reload if changes don't take effect
- Restart bot if persistent issues occur

**Auto-moderation settings not saving:**
- Check JSON syntax in configuration
- Verify all required fields are present
- Use web interface for configuration (validates automatically)
- Check browser console for JavaScript errors

**Exemption lists not working:**
- Verify role/channel IDs are correct
- Check that exempted users/channels are actually bypassing detection
- Ensure exemption lists are properly formatted arrays
- Test with known exempt and non-exempt entities

### Logging Issues

**Moderation actions not logged:**
- Verify log channel is configured and accessible
- Check bot has "Send Messages" permission in log channel
- Ensure log channel exists and bot can access it
- Monitor file logs for `[MODERATION]` prefix entries

**Log formatting issues:**
- Check that embeds are enabled in log channel
- Verify bot has "Embed Links" permission
- Monitor for log message truncation or formatting errors
- Check emoji rendering in log channel

### Permission Checklist

**Required Bot Permissions:**
- [x] View Channels (basic functionality)
- [x] Send Messages (responses and logging)
- [x] Read Message History (auto-moderation)
- [x] Moderate Members (timeout functionality)
- [x] Kick Members (kick functionality)
- [x] Ban Members (ban/unban functionality)
- [x] Manage Roles (role management)
- [x] Manage Nicknames (nickname changes)
- [x] Manage Messages (purging/pinning)
- [x] Embed Links (rich embeds)

**Role Configuration Checklist:**
- [x] Bot role is above roles it needs to manage
- [x] Moderator roles are configured in plugin settings
- [x] Users have appropriate moderator roles
- [x] Role hierarchy is properly structured
- [x] No circular role dependencies

### Performance Issues

**Auto-moderation causing lag:**
- Reduce detection sensitivity/thresholds
- Add more channels/roles to exemption lists
- Check for excessive message volume in monitored channels
- Monitor bot CPU and memory usage

**Bulk operations timing out:**
- Use smaller batch sizes for message operations
- Check for network connectivity issues
- Monitor Discord API rate limits
- Verify bot isn't being rate limited

### High memory usage

- Restart bot process if memory usage is excessive
- Check for memory leaks in custom plugins
- Monitor plugin loading/unloading cycles
- Consider reducing auto-purge frequency for large channels

### Rate limiting issues

- Reduce frequency of API calls (auto-purge schedules, etc.)
- Check for excessive manual operations
- Monitor Discord API rate limit headers in logs
- Implement longer delays between operations if needed

## Configuration Issues

### Config.json errors

- Validate JSON syntax using online JSON validators
- Check for missing commas, brackets, or quotes
- Ensure all required fields are present
- Use the web interface to make changes (validates automatically)

### Plugin not loading

- Check plugin directory structure and file names
- Verify plugin extends the base Plugin class correctly
- Monitor startup logs for plugin loading errors
- Ensure plugin configuration section exists in config.json

### Hot-reload failures

- Check console logs for specific reload errors
- Verify configuration changes are valid
- Try manual plugin reload buttons
- Restart bot if persistent issues occur

## Getting Help

### Log Analysis

Always check these log sources when troubleshooting:

1. **Console Output**: Real-time bot activity and errors
2. **bot.log**: Comprehensive file-based logging
3. **Browser Console**: Web interface JavaScript errors
4. **Discord Logs**: Plugin-specific channel logging

### Useful Commands

```bash
# Check bot status
pm2 list

# View real-time logs
pm2 logs bot

# Restart bot
pm2 restart bot

# Validate configuration
node check-config.js

# Stop bot
pm2 stop bot
```

### Common File Locations

- **Main Config**: `/config.json`
- **Bot Logs**: `/bot.log`
- **Plugin Directory**: `/src/plugins/`
- **Web Interface**: `http://localhost:3000`

### Discord Developer Tools

- **Application Dashboard**: https://discord.com/developers/applications
- **Bot Permissions Calculator**: Use OAuth2 URL Generator
- **Server Settings**: Check bot role hierarchy and channel permissions

If issues persist after trying these solutions, check the bot logs for specific error messages and consider restarting the bot process.