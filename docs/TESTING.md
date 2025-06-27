# Testing Guide

Comprehensive testing procedures for the Modular Discord Bot framework and its plugins.

## Pre-Testing Setup

### Configuration Validation

Before running tests, ensure your configuration is correct:

```bash
node check-config.js
```

This will validate:
- All required configuration values are set
- Channel IDs and role IDs exist and are accessible
- Plugin configurations are properly formatted
- Bot permissions are sufficient

### Test Environment

1. **Test Server**: Use a dedicated Discord server for testing
2. **Test Channels**: Create specific channels for each plugin test
3. **Test Roles**: Set up test roles with appropriate permissions
4. **Bot Permissions**: Ensure bot has all required permissions
5. **User Accounts**: Use multiple test accounts to simulate different scenarios

## Core Framework Testing

### Bot Startup and Connectivity

1. **Start Bot**: `node index.js` or `pm2 start index.js --name bot`
2. **Verify Console Output**:
   - Plugin loading messages
   - Command deployment success
   - "Bot is ready!" message
   - UI server startup (if enabled)

3. **Check Bot Status**:
   - Bot appears online in Discord
   - Slash commands are available in test server
   - Web interface accessible (if enabled)

### Plugin System Testing

1. **Plugin Loading**:
   - Verify all enabled plugins load successfully
   - Check plugin-specific configuration messages
   - Confirm commands are registered for each plugin

2. **Hot-Reload Testing**:
   - Make configuration changes via web interface
   - Verify plugins reload without bot restart
   - Check that changes take effect immediately

3. **Plugin Enable/Disable**:
   - Toggle plugins on/off via web interface
   - Verify commands appear/disappear appropriately
   - Test that disabled plugins don't respond to commands

## Web Interface Testing

### Basic Functionality

1. **Access Dashboard**: Navigate to `http://localhost:3000`
2. **Authentication** (if enabled):
   - Test Discord OAuth2 login flow
   - Verify role-based access restrictions
   - Test session persistence

3. **Configuration Management**:
   - Test all form inputs and dropdowns
   - Verify save functionality
   - Check change detection (save button activation)

### Channel and Role Dropdowns

1. **Channel Loading**:
   - Verify channels populate correctly
   - Check channel categorization and sorting
   - Test "Refresh Channels & Roles" button

2. **Role Selection**:
   - Test single role dropdowns (verified role)
   - Test multi-select role dropdown (verifier roles)
   - Verify role colors and indicators display correctly

3. **Dynamic Updates**:
   - Add/remove channels in Discord, then refresh
   - Add/remove roles in Discord, then refresh
   - Verify dropdown options update accordingly

## Verification Plugin Testing

### Basic Verification Flow

1. **Command Availability**:
   - Verify `/verify` command appears in designated channel
   - Check command parameters match configuration
   - Test command in wrong channel (should fail)

2. **Screenshot Requirements Testing**:

   **0 Screenshots (Text-only)**:
   ```
   /verify character:TestChar guild:TestGuild
   ```
   - Verify no screenshot parameters required
   - Check submission works without images

   **1 Screenshot**:
   ```
   /verify character:TestChar guild:TestGuild screenshot1:[image]
   ```
   - Test with valid image formats (PNG, JPG, GIF, WebP)
   - Test with invalid file types (should fail)

   **2 Screenshots**:
   ```
   /verify character:TestChar guild:TestGuild screenshot1:[image1] screenshot2:[image2]
   ```
   - Test with both screenshots provided
   - Test with only one screenshot (should fail)
   - Verify dual-embed display

3. **Field Requirements Testing**:
   - Test with character name required/optional
   - Test with guild name required/optional
   - Verify command structure updates when settings change

### Image Validation Testing

1. **Valid Formats**:
   - PNG files (.png)
   - JPEG files (.jpg, .jpeg)
   - GIF files (.gif)
   - WebP files (.webp)

2. **Invalid Formats** (should be rejected):
   - Text files (.txt)
   - PDF files (.pdf)
   - Video files (.mp4)
   - Audio files (.mp3)

3. **File Size Testing**:
   - Test files under 8MB (non-Nitro limit)
   - Test files under 50MB (Nitro limit)
   - Test oversized files (should fail gracefully)

### Admin Approval Testing

1. **Approval Process**:
   - Submit verification request
   - Verify embed appears in admin channel
   - Test "Approve Verification" button
   - Check user receives approval message
   - Verify user gets verified role

2. **Denial Process**:
   - Test "Deny Verification" button
   - Verify denial reason modal appears
   - Submit denial with reason
   - Check user receives denial message with reason
   - Verify user doesn't get verified role

3. **Resubmission Control**:
   - Deny a user's verification
   - Attempt to approve the same request (should fail)
   - Have user resubmit verification
   - Verify new submission can be approved

### Permission Testing

1. **User Permissions**:
   - Test with users who have verifier roles
   - Test with users who don't have verifier roles
   - Verify only authorized users can approve/deny

2. **Bot Permissions**:
   - Test role assignment (requires Manage Roles)
   - Test nickname updates (requires Manage Nicknames)
   - Test message deletion (requires Manage Messages)

### Auto-Moderation Testing

1. **Message Guidance**:
   - Send non-command message in verification channel
   - Verify DM guidance is sent
   - Check original message is deleted
   - Test with user who has DMs disabled

2. **Duplicate Prevention**:
   - Submit verification request
   - Attempt to submit another while first is pending
   - Verify duplicate is rejected

## Purge Plugin Testing

### Manual Purge Commands

1. **Basic Purge**:
   ```
   /purge count:10
   ```
   - Create 15+ test messages in channel
   - Run command
   - Verify 10 messages are deleted
   - Check logs for confirmation

2. **All Messages Purge**:
   ```
   /purge count:0
   ```
   - Create multiple test messages
   - Run command
   - Verify all messages are deleted
   - Monitor for proper handling of bulk vs individual deletes

3. **Channel Targeting**:
   ```
   /purge count:5 channel:#test-channel
   ```
   - Run command from different channel
   - Verify messages deleted from target channel
   - Check permissions in both channels

4. **With Reason**:
   ```
   /purge count:3 reason:Testing cleanup
   ```
   - Verify reason appears in logs
   - Check both file and Discord channel logging

### Permission Testing

1. **User Permissions**:
   - Test with user who has Manage Messages
   - Test with user who doesn't have permission
   - Verify appropriate error messages

2. **Bot Permissions**:
   - Test in channel where bot has Manage Messages
   - Test in channel where bot lacks permission
   - Verify graceful failure and error reporting

### Auto-Purge Testing

1. **Schedule Configuration**:
   - Add new auto-purge schedule via web interface
   - Configure channel, count, and cron expression
   - Set timezone and enable schedule

2. **Immediate Testing**:
   - Create schedule for next minute
   - Add test messages to target channel
   - Wait for scheduled execution
   - Verify messages are deleted and logged

3. **Multiple Schedules**:
   - Configure multiple schedules for different channels
   - Test overlapping schedules
   - Verify each executes independently

### Rate Limit Testing

1. **Large Message Counts**:
   - Create 200+ messages in a channel
   - Purge with count:0
   - Monitor for rate limit handling
   - Verify operation completes without errors

2. **Old Message Handling**:
   - Use messages older than 14 days (if available)
   - Run purge command
   - Verify individual deletion with delays
   - Check logs for bulk vs individual delete records

## Moderation Plugin Testing

### Basic Moderation Commands

1. **Timeout Command**:
   ```
   /mod timeout user:@testuser duration:5 reason:Testing timeout
   ```
   - Verify user receives timeout status
   - Check timeout duration is correct
   - Test with various duration values (1-40320 minutes)
   - Verify removal of timeout after duration expires

2. **Kick Command**:
   ```
   /mod kick user:@testuser reason:Testing kick functionality
   ```
   - Verify user is removed from server
   - Check kick appears in Discord audit log
   - Test with and without reason

3. **Ban/Unban Commands**:
   ```
   /mod ban user:@testuser reason:Testing ban delete_messages:1
   /mod unban user_id:123456789012345678 reason:Testing unban
   ```
   - Verify user is banned from server
   - Check message deletion works (0-7 days)
   - Test unban with user ID
   - Verify ban/unban appears in audit log

4. **Warn Command**:
   ```
   /mod warn user:@testuser reason:Testing warning system
   ```
   - Verify warning embed is displayed
   - Check DM is sent to user (if possible)
   - Test with users who have DMs disabled

5. **Slowmode Command**:
   ```
   /mod slowmode seconds:30
   /mod slowmode seconds:0 channel:#test-channel
   ```
   - Verify slowmode is applied correctly
   - Test removal (seconds:0)
   - Test in different channels

### Role Management Commands

1. **Add Role Command**:
   ```
   /mod addrole user:@testuser role:@TestRole reason:Testing role addition
   ```
   - Verify role is added to user
   - Test with various roles at different hierarchy levels
   - Check role hierarchy enforcement
   - Test with already assigned roles (should fail)

2. **Remove Role Command**:
   ```
   /mod removerole user:@testuser role:@TestRole reason:Testing role removal
   ```
   - Verify role is removed from user
   - Test with roles user doesn't have (should fail)
   - Check role hierarchy enforcement

### Nickname Management

1. **Change Nickname**:
   ```
   /mod nickname user:@testuser nickname:NewTestName reason:Testing nickname change
   ```
   - Verify nickname is changed
   - Test with special characters and unicode
   - Check Discord nickname length limits

2. **Clear Nickname**:
   ```
   /mod nickname user:@testuser reason:Clearing nickname
   ```
   - Verify nickname is cleared (empty nickname parameter)
   - Check user displays original username

### Message Management Commands

1. **Bulk Message Deletion**:
   ```
   /mod purgemsg count:10
   /mod purgemsg count:5 user:@spammer
   /mod purgemsg count:20 channel:#test-channel
   ```
   - Create test messages to delete
   - Verify correct number of messages deleted
   - Test user-specific filtering
   - Test in different channels
   - Check 14-day bulk delete limitation

2. **Pin/Unpin Messages**:
   ```
   /mod pin message_id:123456789012345678
   /mod unpin message_id:123456789012345678 channel:#test-channel
   ```
   - Test pinning existing messages
   - Verify message becomes pinned
   - Test unpinning messages
   - Test with invalid message IDs (should fail)

### Permission and Hierarchy Testing

1. **Role Hierarchy Validation**:
   - Test with users at same role level (should fail)
   - Test with users at higher role level (should fail)
   - Test with users at lower role level (should succeed)
   - Verify bot's role position affects capabilities

2. **Self-Target Prevention**:
   - Attempt to target self with various commands
   - Verify commands fail with appropriate error messages
   - Test timeout, kick, ban, role changes, nickname changes

3. **Permission Validation**:
   - Test with users who have moderator roles
   - Test with users who have Discord permissions but no moderator role
   - Test with users who have neither
   - Verify permission checks work correctly

### Auto-Moderation Testing

1. **Spam Detection**:
   - Configure spam settings (e.g., 5 messages in 10 seconds)
   - Send messages rapidly exceeding threshold
   - Verify detection triggers correctly
   - Test configured action (warn/timeout/kick)
   - Check exemptions work (exempt roles/channels)

2. **Caps Detection**:
   - Configure caps threshold (e.g., 70% caps, 10 char minimum)
   - Send messages with excessive capitals
   - Verify detection triggers correctly
   - Test with messages below minimum length
   - Test configured action (warn/delete/timeout)

3. **Link Detection**:
   - Configure whitelist (e.g., discord.gg, youtube.com)
   - Send messages with whitelisted links (should pass)
   - Send messages with non-whitelisted links (should trigger)
   - Test various URL formats
   - Test configured action (warn/delete/timeout)

4. **Profanity Detection**:
   - Configure custom word list
   - Send messages containing blocked words
   - Verify detection triggers correctly
   - Test partial word matching
   - Test configured action (warn/delete/timeout)

5. **Exemption Testing**:
   - Add roles to exempt list
   - Test auto-mod with exempt role users (should bypass)
   - Add channels to exempt list
   - Test auto-mod in exempt channels (should bypass)
   - Verify manual commands still work in exempt areas

### Configuration Testing

1. **Action Toggle Testing**:
   - Disable specific actions in web interface
   - Attempt to use disabled commands
   - Verify commands fail with appropriate message
   - Re-enable and verify commands work again

2. **Auto-Moderation Toggle**:
   - Enable/disable auto-moderation globally
   - Test individual detection type toggles
   - Verify settings changes take effect immediately
   - Test exemption list modifications

3. **Hot-Reload Testing**:
   - Make configuration changes via web interface
   - Verify changes take effect without restart
   - Test with multiple rapid changes
   - Check configuration persistence

### Logging and Audit Testing

1. **Discord Channel Logging**:
   - Configure moderation log channel
   - Perform various moderation actions
   - Verify detailed logs appear in channel
   - Check log formatting and emoji usage
   - Test with missing log channel (should not crash)

2. **File Logging**:
   - Check bot.log for moderation events
   - Verify `[MODERATION]` prefix is used
   - Test log rotation if applicable
   - Check error logging for failed actions

3. **Audit Trail**:
   - Verify all actions appear in Discord audit log
   - Check reasons are properly recorded
   - Test with actions that support audit log entries

### Error Handling and Edge Cases

1. **Invalid User/Role/Channel IDs**:
   - Test commands with non-existent users
   - Test with invalid role IDs
   - Test with inaccessible channels
   - Verify appropriate error messages

2. **Missing Permissions**:
   - Remove bot permissions mid-operation
   - Test various permission combinations
   - Verify graceful failure and error reporting

3. **Rate Limiting**:
   - Perform rapid moderation actions
   - Verify rate limit compliance
   - Check automatic retry mechanisms

4. **Large Scale Operations**:
   - Test bulk message deletion with thousands of messages
   - Test auto-moderation with high message volume
   - Monitor performance and memory usage

## Logging Testing

### File Logging

1. **Bot Log File** (`bot.log`):
   - Verify startup messages are logged
   - Check plugin loading/unloading events
   - Verify all plugin activities are categorized
   - Test log rotation if configured

2. **Plugin-Specific Logging**:
   - Verification events with `[VERIFICATION]` prefix
   - Purge events with `[PURGE]` prefix
   - Moderation events with `[MODERATION]` prefix
   - Debug information when debug mode enabled

### Discord Channel Logging

1. **Verification Logging**:
   - Configure log channel in verification plugin
   - Perform approval/denial actions
   - Verify appropriate messages sent to log channel

2. **Purge Logging**:
   - Configure log channel in purge plugin
   - Perform manual and auto purges
   - Check log messages include proper details

3. **Moderation Logging**:
   - Configure log channel in moderation plugin
   - Perform various moderation actions
   - Verify detailed action logs with emojis and metadata
   - Test auto-moderation event logging

## Error Handling Testing

### Network Issues

1. **Discord API Unavailable**:
   - Simulate network issues
   - Verify graceful degradation
   - Check error logging and user feedback

2. **Rate Limiting**:
   - Trigger rate limits with rapid commands
   - Verify bot respects rate limits
   - Check automatic retry mechanisms

### Configuration Errors

1. **Invalid Channel IDs**:
   - Set non-existent channel IDs
   - Verify error handling and logging
   - Test fallback behaviors

2. **Invalid Role IDs**:
   - Configure non-existent roles
   - Test role assignment failures
   - Verify appropriate error messages

3. **Permission Errors**:
   - Remove bot permissions mid-operation
   - Test various permission combinations
   - Verify error reporting and logging

## Performance Testing

### Load Testing

1. **Multiple Simultaneous Verifications**:
   - Submit multiple verification requests quickly
   - Verify all are processed correctly
   - Check for race conditions or conflicts

2. **Large Purge Operations**:
   - Test purging thousands of messages
   - Monitor memory usage and performance
   - Verify operation completes successfully

### Memory and Resource Testing

1. **Long-term Operation**:
   - Run bot for extended periods
   - Monitor memory usage over time
   - Check for memory leaks or resource exhaustion

2. **Plugin Reload Stress Testing**:
   - Perform rapid configuration changes
   - Test hot-reload performance
   - Verify stability under frequent reloads

## Test Automation

### Automated Test Suite

Consider creating automated tests for:

1. **Configuration Validation**:
   - JSON schema validation
   - Required field checking
   - Type validation

2. **API Response Testing**:
   - Web interface endpoints
   - Discord command processing
   - Error response handling

3. **Database/File Operations**:
   - Configuration file operations
   - Log file creation and rotation
   - Data persistence testing

### Continuous Integration

Set up CI/CD pipeline to:

1. **Run Tests on Code Changes**:
   - Syntax validation
   - Configuration schema validation
   - Unit tests for core functions

2. **Deployment Testing**:
   - Test bot startup in clean environment
   - Verify all dependencies are correctly specified
   - Test default configuration behavior

## Test Documentation

### Test Results

Document test results including:

1. **Test Environment Details**:
   - Discord server configuration
   - Bot permissions
   - Plugin configurations used

2. **Test Outcomes**:
   - Successful test cases
   - Failed test cases with error details
   - Performance metrics

3. **Issues Found**:
   - Bug reports with reproduction steps
   - Performance bottlenecks
   - User experience issues

### Test Maintenance

1. **Regular Testing Schedule**:
   - Test after each configuration change
   - Full test suite before major updates
   - Periodic testing of auto-purge schedules

2. **Test Environment Updates**:
   - Keep test Discord server updated
   - Refresh test data regularly
   - Update test procedures for new features