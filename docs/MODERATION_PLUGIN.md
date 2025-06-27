# Moderation Plugin (`/mod`)

A comprehensive moderation system for Discord servers with manual moderation commands, auto-moderation detection, and extensive configuration options.

## Features

### Core Moderation Actions
- **User Management**: Timeout, kick, ban, unban, and warn users
- **Role Management**: Add and remove roles from users with hierarchy validation
- **Nickname Management**: Change or clear user nicknames
- **Message Management**: Bulk delete messages, pin/unpin messages
- **Channel Management**: Set slowmode with configurable duration
- **Utility Commands**: User information and server statistics

### Advanced Auto-Moderation
- **Spam Detection**: Automatic detection based on message count and time windows
- **Caps Detection**: Configurable threshold for excessive capital letters
- **Link Detection**: Whitelist system for allowed domains
- **Profanity Detection**: Custom word filtering with configurable actions
- **Smart Exemptions**: Role and channel-based exemptions from auto-moderation

### Administrative Features
- **Granular Permissions**: Individual command enable/disable toggles
- **Comprehensive Logging**: All actions logged with detailed information
- **Role Hierarchy**: Respects Discord role hierarchy for safety
- **Hot Configuration**: Real-time configuration updates without restart
- **Moderation History**: Automatic tracking of recent actions per user (last 10 actions)

## Configuration

### Example Configuration

```json
{
  "moderation": {
    "enabled": true,
    "logging": {
      "channelId": "MODERATION_LOG_CHANNEL_ID"
    },
    "roles": {
      "moderatorRoleIds": ["MODERATOR_ROLE_ID_1", "MODERATOR_ROLE_ID_2"]
    },
    "actions": {
      "timeout": true,
      "kick": true,
      "ban": true,
      "unban": true,
      "warn": true,
      "slowmode": true,
      "addrole": true,
      "removerole": true,
      "nickname": true,
      "purgemsg": true,
      "pin": true,
      "unpin": true
    },
    "autoModeration": {
      "enabled": false,
      "spam": {
        "enabled": true,
        "maxMessages": 5,
        "timeWindow": 10,
        "action": "timeout",
        "duration": 300
      },
      "caps": {
        "enabled": true,
        "threshold": 70,
        "minLength": 10,
        "action": "warn"
      },
      "links": {
        "enabled": false,
        "whitelist": ["discord.gg", "youtube.com", "github.com"],
        "action": "delete"
      },
      "profanity": {
        "enabled": false,
        "customWords": ["word1", "word2"],
        "action": "warn"
      },
      "exemptRoles": ["MODERATOR_ROLE_ID", "TRUSTED_ROLE_ID"],
      "exemptChannels": ["EXEMPT_CHANNEL_ID"]
    }
  }
}
```

### Configuration Options

#### Basic Settings
- **enabled**: Enable/disable the entire moderation plugin
- **logging.channelId**: Channel for moderation action logs
- **roles.moderatorRoleIds**: Array of role IDs that can use moderation commands

#### Action Toggles
Each moderation command can be individually enabled or disabled:
- **timeout**: Temporary user restrictions
- **kick**: Remove users from server
- **ban/unban**: Permanent user restrictions
- **warn**: Issue warnings to users
- **slowmode**: Channel rate limiting
- **addrole/removerole**: Role management
- **nickname**: Nickname changes
- **purgemsg**: Bulk message deletion
- **pin/unpin**: Message pinning
- **userinfo**: User information display
- **serverstats**: Server statistics display

#### Moderation Exemptions
Control which users and channels are exempt from moderation:
- **exemptRoles**: Array of role IDs that cannot be targeted by moderation commands
- **exemptChannels**: Array of channel IDs where moderation commands cannot be used

#### Auto-Moderation Settings

**Spam Detection:**
- **maxMessages**: Maximum messages allowed in time window (2-20)
- **timeWindow**: Time window in seconds (5-60)
- **action**: Action to take (warn, timeout, kick)
- **duration**: Timeout duration in seconds (60-2419200)

**Caps Detection:**
- **threshold**: Percentage of caps required to trigger (50-100)
- **minLength**: Minimum message length to check (5-50)
- **action**: Action to take (warn, delete, timeout)

**Link Detection:**
- **whitelist**: Array of allowed domain patterns
- **action**: Action to take (warn, delete, timeout)

**Profanity Detection:**
- **customWords**: Array of custom blocked words
- **action**: Action to take (warn, delete, timeout)

**Exemptions:**
- **exemptRoles**: Role IDs exempt from auto-moderation
- **exemptChannels**: Channel IDs exempt from auto-moderation

## Usage

### For Moderators

#### User Management Commands

**Timeout a user:**
```
/mod timeout user:@user duration:60 reason:Spamming in chat
```

**Kick a user:**
```
/mod kick user:@user reason:Inappropriate behavior
```

**Ban a user:**
```
/mod ban user:@user reason:Breaking server rules delete_messages:1
```

**Unban a user:**
```
/mod unban user_id:123456789012345678 reason:Appeal approved
```

**Warn a user:**
```
/mod warn user:@user reason:Please follow the rules
```

#### Role Management Commands

**Add a role to a user:**
```
/mod addrole user:@user role:@TrustedMember reason:Promoted for good behavior
```

**Remove a role from a user:**
```
/mod removerole user:@user role:@TrustedMember reason:Temporary removal
```

#### Nickname Management

**Change a user's nickname:**
```
/mod nickname user:@user nickname:NewNickname reason:Inappropriate name
```

**Clear a user's nickname:**
```
/mod nickname user:@user reason:Clearing inappropriate nickname
```

#### Message Management Commands

**Bulk delete messages:**
```
/mod purgemsg count:50
/mod purgemsg count:20 user:@spammer
/mod purgemsg count:10 channel:#off-topic
```

**Pin a message:**
```
/mod pin message_id:123456789012345678
/mod pin message_id:123456789012345678 channel:#announcements
```

**Unpin a message:**
```
/mod unpin message_id:123456789012345678
```

#### Channel Management

**Set slowmode:**
```
/mod slowmode seconds:30
/mod slowmode seconds:0 channel:#general
```

#### Utility Commands

**Get user information:**
```
/mod userinfo user:@username
```
- Displays comprehensive user details, server information, roles, and permissions
- Shows recent moderation history (up to 5 most recent actions)
- Includes timestamps and moderator information for each action

**View server statistics:**
```
/mod serverstats
```
- Displays server member counts, activity levels, and structure information
- Shows moderation plugin status and configuration summary

### For Administrators

#### Web Interface Configuration

1. **Access Dashboard**: Navigate to your bot's web interface
2. **Enable Plugin**: Toggle the moderation plugin enabled switch
3. **Configure Logging**: Select a log channel for moderation actions
4. **Set Moderator Roles**: Choose which roles can use moderation commands
5. **Action Toggles**: Enable/disable specific moderation commands
6. **Auto-Moderation**: Configure automatic detection and responses

#### Permission Requirements

**Bot Permissions:**
- **Moderate Members**: For timeout functionality
- **Kick Members**: For kick functionality
- **Ban Members**: For ban/unban functionality
- **Manage Roles**: For role management (below bot's highest role)
- **Manage Nicknames**: For nickname changes
- **Manage Messages**: For message deletion and pinning
- **Read Message History**: For message purging
- **Send Messages**: For responses and logging

**User Permissions:**
- Users with configured moderator roles can use all enabled commands
- Users without moderator roles but with "Moderate Members" permission can use commands
- Role hierarchy is enforced (cannot target users with equal or higher roles)

## Auto-Moderation

### Spam Detection

Automatically detects users sending too many messages in a short time period.

**Configuration Example:**
```json
"spam": {
  "enabled": true,
  "maxMessages": 5,
  "timeWindow": 10,
  "action": "timeout",
  "duration": 300
}
```

**How it works:**
- Tracks message count per user in the specified time window
- Takes action when threshold is exceeded
- Resets counter after time window expires

### Caps Detection

Detects messages with excessive capital letters.

**Configuration Example:**
```json
"caps": {
  "enabled": true,
  "threshold": 70,
  "minLength": 10,
  "action": "warn"
}
```

**How it works:**
- Calculates percentage of capital letters in message
- Only applies to messages longer than `minLength`
- Takes action when threshold percentage is exceeded

### Link Detection

Controls sharing of links with whitelist functionality.

**Configuration Example:**
```json
"links": {
  "enabled": true,
  "whitelist": ["discord.gg", "youtube.com", "github.com"],
  "action": "delete"
}
```

**How it works:**
- Scans messages for URLs and links
- Checks against whitelist patterns
- Takes action on non-whitelisted links

### Profanity Detection

Filters custom words and phrases.

**Configuration Example:**
```json
"profanity": {
  "enabled": true,
  "customWords": ["badword1", "badword2"],
  "action": "warn"
}
```

**How it works:**
- Scans messages for configured words
- Supports partial word matching
- Takes action when matches are found

### Exemption System

The moderation plugin supports two levels of exemptions:

#### 1. Moderation Exemptions (Manual Commands)
Prevent moderation commands from being used on specific users or in specific channels.

**Configuration Example:**
```json
"moderation": {
  "exemptRoles": ["ADMIN_ROLE_ID", "TRUSTED_ROLE_ID"],
  "exemptChannels": ["STAFF_CHANNEL_ID", "BOT_COMMANDS_ID"]
}
```

**How it works:**
- Users with exempt roles cannot be targeted by any `/mod` commands
- `/mod` commands cannot be used in exempt channels
- Provides protection for staff and trusted members
- Prevents accidental moderation of privileged users

#### 2. Auto-Moderation Exemptions
Exclude specific roles or channels from automatic detection systems.

**Configuration Example:**
```json
"autoModeration": {
  "exemptRoles": ["MODERATOR_ROLE_ID", "TRUSTED_ROLE_ID"],
  "exemptChannels": ["STAFF_CHANNEL_ID", "BOT_COMMANDS_ID"]
}
```

**How it works:**
- Users with exempt roles bypass all auto-moderation detection
- Messages in exempt channels are ignored by auto-moderation
- Manual moderation commands still work normally

## Logging

### Discord Channel Logging

All moderation actions are logged to the configured log channel with detailed information:

**Timeout Example:**
```
🔇 **TIMEOUT**
**Target:** Username#1234 (123456789012345678)
**Moderator:** ModeratorName#5678
**Reason:** Spamming in chat
**Duration:** 60 minutes
**Time:** 2024-01-15 14:30:25
```

**Role Management Example:**
```
➕ **ADDROLE**
**Target:** Username#1234 (123456789012345678)
**Moderator:** ModeratorName#5678
**Reason:** Promoted for good behavior
**Role:** TrustedMember
**Time:** 2024-01-15 14:30:25
```

### File Logging

All actions are also logged to the bot's log file with the `[MODERATION]` prefix for server administration and debugging.

## Security Features

### Role Hierarchy Enforcement
- Users cannot target members with roles equal to or higher than their own
- Prevents privilege escalation and abuse
- Respects Discord's built-in role hierarchy

### Permission Validation
- Checks both custom moderator roles and Discord permissions
- Validates bot permissions before attempting actions
- Graceful error handling for permission issues

### Action Validation
- Prevents self-targeting for most commands
- Validates user existence and server membership
- Checks for duplicate states (already banned, already has role, etc.)

### Rate Limiting Compliance
- Respects Discord's API rate limits
- Handles bulk operations efficiently
- Prevents spam of moderation actions

## Testing and Troubleshooting

For comprehensive testing procedures and troubleshooting guides, please refer to the dedicated documentation:

- **[Testing Guide](TESTING.md#moderation-plugin-testing)** - Complete testing procedures for all moderation features
- **[Troubleshooting Guide](TROUBLESHOOTING.md#moderation-plugin-issues)** - Solutions for common issues and problems

## Integration with Other Plugins

The moderation plugin works seamlessly with other bot plugins:

- **Verification Plugin**: Can moderate users during/after verification
- **Purge Plugin**: Complementary message management capabilities
- **Logging**: Unified logging system across all plugins
- **Web Interface**: Shared configuration and management interface

## Best Practices

### Configuration
- Start with conservative auto-moderation settings and adjust based on server needs
- Test new settings in staff channels before enabling server-wide
- Use exemptions for trusted users and staff channels to reduce false positives
- Regularly review and adjust thresholds based on server activity patterns

### Moderation
- Always provide clear, detailed reasons for moderation actions
- Use escalating consequences: warn → timeout → kick → ban
- Document patterns of behavior for repeat offenders
- Communicate rule changes and enforcement policies to the community

### Security
- Limit moderator roles to trusted members only
- Regularly audit moderator permissions and access
- Monitor moderation logs for potential abuse or inconsistencies
- Maintain proper role hierarchy structure to prevent privilege escalation

For detailed testing procedures and troubleshooting assistance, see the [Testing Guide](TESTING.md) and [Troubleshooting Guide](TROUBLESHOOTING.md).